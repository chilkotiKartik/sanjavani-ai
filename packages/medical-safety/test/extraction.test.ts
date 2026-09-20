import { describe, expect, it } from 'vitest';
import {
  detectLanguage,
  extractAge,
  extractDuration,
  extractSymptoms,
  guardAssistantText,
  normalizeText,
  parseSeverityAnswer,
  parseYesNo,
  phoneticKey,
  resolveReplyLanguage,
} from '../src';

const codes = (text: string) => extractSymptoms(text).affirmed.map((s) => s.code).sort();

describe('text normalisation', () => {
  it('flattens romanised spelling variants', () => {
    expect(phoneticKey('bukhaaar')).toBe(phoneticKey('bukhar'));
    expect(phoneticKey('nahin')).toBe(phoneticKey('nahi'));
    expect(phoneticKey('zyada')).toBe(phoneticKey('jyada'));
  });

  it('converts Devanagari digits and keeps clause boundaries', () => {
    expect(normalizeText('२ दिन से, बुखार')).toBe('2 दिन से | बुखार');
  });
});

describe('symptom extraction', () => {
  it('understands the core Hinglish example', () => {
    const { affirmed } = extractSymptoms('Mujhe do din se bahut tez bukhar hai aur body pain ho raha hai.');
    expect(affirmed.map((s) => s.code).sort()).toEqual(['body_ache', 'fever']);
    expect(affirmed.find((s) => s.code === 'fever')?.severity).toBe('severe');
  });

  it('handles Devanagari', () => {
    expect(codes('मुझे बुखार और खांसी है')).toEqual(['cough', 'fever']);
  });

  it('handles English with spelling variety', () => {
    expect(codes('I have a stomach ache and loose motions')).toEqual(['abdominal_pain', 'diarrhea']);
  });

  it('respects English and Hindi negation', () => {
    const en = extractSymptoms('no fever, but my stomach hurts');
    expect(en.negated).toContain('fever');
    expect(en.affirmed.map((s) => s.code)).toEqual(['abdominal_pain']);
    const hi = extractSymptoms('bukhar nahi hai, khansi hai');
    expect(hi.negated).toContain('fever');
    expect(hi.affirmed.map((s) => s.code)).toEqual(['cough']);
  });

  it('reads severity from temperatures and pain scales', () => {
    expect(extractSymptoms('fever of 103').affirmed[0]?.severity).toBe('severe');
    expect(extractSymptoms('headache, 8 out of 10').affirmed[0]?.severity).toBe('severe');
    expect(extractSymptoms('halka sir dard').affirmed[0]?.severity).toBe('mild');
  });

  it('recognises animal bites', () => {
    expect(codes('kutte ne kaat liya')).toEqual(['animal_bite']);
  });
});

describe('duration', () => {
  it.each([
    ['do din se bukhar', 48],
    ['for two days', 48],
    ['3 hafte se khansi', 504],
    ['since yesterday', 24],
    ['कल से सिर दर्द', 24],
    ['दो दिन से', 48],
    ['subah se ulti', 6],
    ['for a week', 168],
    ['3-4 days', 96],
  ])('parses "%s" as %d hours', (text, hours) => {
    expect(extractDuration(text)?.hours).toBe(hours);
  });

  it('does not treat age as duration', () => {
    expect(extractDuration('meri 2 saal ki beti')).toBeNull();
  });

  it('keeps short units as duration even with "ki"', () => {
    expect(extractDuration('2 din ki khansi')?.hours).toBe(48);
  });
});

describe('age and subject', () => {
  it.each([
    ['meri 2 saal ki beti ko bukhar hai', 'child'],
    ['my 70 year old father', 'older_adult'],
    ['navjaat shishu ko bukhar', 'infant'],
    ['3 mahine ka baby', 'infant'],
    ['mujhe bukhar hai', 'adult'],
    ['dadi ko chakkar aa rahe hain', 'older_adult'],
    ['I am 34', 'adult'],
  ])('"%s" → %s', (text, group) => {
    expect(extractAge(text).ageGroup).toBe(group);
  });
});

describe('short answers', () => {
  it.each([
    ['haan', 'yes'],
    ['ji haan', 'yes'],
    ['yes', 'yes'],
    ['हाँ', 'yes'],
    ['nahi', 'no'],
    ['no, nothing like that', 'no'],
    ['नहीं', 'no'],
    ['ji nahi', 'no'],
    ['I went to the market yesterday and bought vegetables', null],
  ])('"%s" → %s', (text, expected) => {
    expect(parseYesNo(text)).toBe(expected);
  });

  it('parses severity answers', () => {
    expect(parseSeverityAnswer('bahut tez')).toBe('severe');
    expect(parseSeverityAnswer('mild')).toBe('mild');
    expect(parseSeverityAnswer('मध्यम')).toBe('moderate');
    expect(parseSeverityAnswer('7')).toBe('severe');
  });
});

describe('Bengali extraction', () => {
  it('reads symptoms, duration and subject from one Bengali sentence', () => {
    expect(codes('আমার তিন দিন ধরে খুব জ্বর আর মাথা ব্যথা')).toEqual(['fever', 'headache']);
    expect(extractDuration('আমার তিন দিন ধরে জ্বর')?.hours).toBe(72);
    expect(extractAge('আমার বাচ্চার শ্বাস নিতে কষ্ট হচ্ছে').subject).toBe('child');
  });

  it('applies Bengali negation without losing the affirmed symptom', () => {
    const { affirmed, negated } = extractSymptoms('আমার জ্বর নেই কিন্তু কাশি হচ্ছে');
    expect(affirmed.map((s) => s.code)).toEqual(['cough']);
    expect(negated).toContain('fever');
  });

  it('keeps a lexicon phrase that contains its own negator', () => {
    // "ghum hocche na" is insomnia, not a denial of sleep.
    expect(codes('রাতে ঘুম হচ্ছে না')).toContain('insomnia');
  });

  it('answers yes and no in Bengali', () => {
    expect(parseYesNo('হ্যাঁ')).toBe('yes');
    expect(parseYesNo('না')).toBe('no');
    expect(parseYesNo('নেই')).toBe('no');
  });

  /*
   * Bengali puts the age marker before the number ("boyos 6 mash"), where Hindi puts
   * it after ("6 mahine ka"). Reading the unit matters: six months read as six years
   * moves a baby out of the infant band and switches off every infant rule.
   */
  it('reads an age stated with the marker first, in the unit given', () => {
    expect(extractAge('ওর বয়স ৬ মাস')).toMatchObject({ ageGroup: 'infant' });
    expect(extractAge('ওর বয়স ২ বছর')).toMatchObject({ ageGroup: 'child', years: 2 });
    expect(extractAge('umar 6 mahine hai')).toMatchObject({ ageGroup: 'infant' });
  });

  it('does not put Bengali fever on a Hindi speaker’s card', () => {
    // Bengali "jor" and Hindi "zor" (as in "zor ka dard") share a phonetic key.
    expect(codes('bahut zor se sir dard')).toEqual(['headache']);
  });
});

describe('language detection', () => {
  it.each([
    ['Mujhe do din se bukhar hai', 'hinglish'],
    ['मुझे बुखार है', 'hi'],
    ['I have had a headache since morning', 'en'],
    ['kutte ne kaat liya', 'hinglish'],
    ['Mere papa ko chest pain ho raha hai', 'hinglish'],
  ])('"%s" → %s', (text, lang) => {
    expect(detectLanguage(text).language).toBe(lang);
  });

  it('treats Hindi STT output in Latin script as Hinglish', () => {
    expect(detectLanguage('theek', 'hi').language).toBe('hinglish');
  });

  it('keeps the previous language for ambiguous short replies', () => {
    expect(resolveReplyLanguage('auto', detectLanguage('ok'), 'hi')).toBe('hi');
    expect(resolveReplyLanguage('auto', detectLanguage('मुझे खांसी भी है'), 'en')).toBe('hi');
    expect(resolveReplyLanguage('en', detectLanguage('मुझे खांसी है'), 'hi')).toBe('en');
  });

  it.each([
    ['আমার জ্বর হয়েছে', 'bn'],
    ['বাবার বুকে ব্যথা হচ্ছে', 'bn'],
    ['amar tin din dhore khub jor', 'bn'],
  ])('reads Bengali: "%s" → %s', (text, lang) => {
    expect(detectLanguage(text).language).toBe(lang);
  });

  it('honours a Bengali STT code even when the transcript is Latin script', () => {
    expect(detectLanguage('thik', 'bn').language).toBe('bn');
  });

  /*
   * The expensive mistake is the other direction. Hindi and Bengali share a lot of
   * vocabulary, and answering an ordinary Hinglish speaker in a script they may not
   * read is worse than missing romanised Bengali, so a tie goes to Hinglish.
   */
  it('does not mistake Hinglish for romanised Bengali', () => {
    for (const text of ['mujhe do din se bukhar hai', 'pet mein bahut dard ho raha hai', 'kutte ne kaat liya']) {
      expect(detectLanguage(text).language).toBe('hinglish');
    }
  });
});

describe('output guard', () => {
  it('accepts safe guidance', () => {
    expect(guardAssistantText('Please see a doctor today. Call 112 if breathing gets hard.', { urgency: 'urgent' }).ok).toBe(true);
  });

  it.each([
    ['As a doctor, I recommend rest.', 'claims_to_be_doctor'],
    ['You have dengue.', 'definitive_diagnosis'],
    ['Take 500 mg twice a day.', 'medication_dosing'],
    ['Start azithromycin tonight.', 'prescribes_medication'],
    ['There is no need to see a doctor.', 'discourages_care'],
    ['Call 1800 999 0000 for help.', 'unverified_phone_number'],
    ['Call 102 now.', 'unverified_phone_number'],
  ])('rejects "%s" (%s)', (text, violation) => {
    const result = guardAssistantText(text, { urgency: 'routine', allowedNumbers: [] });
    expect(result.ok).toBe(false);
    expect(result.violations).toContain(violation);
  });

  it('allows verified facility numbers in any format', () => {
    const r = guardAssistantText('You can call them on 0124 458 8888.', { urgency: 'urgent', allowedNumbers: ['+91 124 458 8888'] });
    expect(r.ok).toBe(true);
  });

  it('does not mistake temperatures or durations for phone numbers', () => {
    expect(guardAssistantText('If the fever goes above 103, or lasts 3 days, see a doctor.', { urgency: 'routine' }).ok).toBe(true);
  });
});

/*
 * Who the conversation is about, and how old they are.
 *
 * These are two different facts and the app must not confuse them. "My son" says who;
 * it does not say six rather than thirty-six, and a system that assumed the former
 * would quietly apply paediatric thresholds to an adult — or, worse, adult thresholds
 * to a child when the relationship word happened to be missing.
 */
describe('subject and age', () => {
  it('reads the relationship without inventing an age', () => {
    const son = extractAge('mere bete ko bukhar hai');
    expect(son.subject).toBe('child');
    // "Beta" can be six or thirty-six. The band stays unknown so the app asks.
    expect(son.ageGroup).toBe('unknown');

    const father = extractAge('my father has chest pain');
    expect(father.subject).toBe('parent');
    expect(father.ageGroup).toBe('unknown');
  });

  it('lets someone else win over a possessive that refers to the speaker', () => {
    // "Mere" is a self word and the sentence is plainly about the child. Reading the
    // possessive as the patient is the dangerous direction to be wrong in.
    const r = extractAge('mere bachche ko bahut tez bukhar hai');
    expect(r.subject).toBe('child');
    expect(r.ageGroup).toBe('child');
  });

  it('uses only unambiguous words to set a band', () => {
    expect(extractAge('my newborn baby is not feeding').ageGroup).toBe('infant');
    expect(extractAge('नवजात शिशु को बुखार है').ageGroup).toBe('infant');
    expect(extractAge('my grandmother is dizzy').ageGroup).toBe('older_adult');
  });

  it('bands a stated age, including the adolescent range', () => {
    expect(extractAge('my 6 month old has a fever').ageGroup).toBe('infant');
    expect(extractAge('she is 8 years old').ageGroup).toBe('child');
    expect(extractAge('my son is 15 years old').ageGroup).toBe('adolescent');
    expect(extractAge('he is 30 years old').ageGroup).toBe('adult');
    expect(extractAge('my father is 72 years old').ageGroup).toBe('older_adult');
  });

  it('puts the band boundaries on the cautious side', () => {
    // Twelve is still a child; eighteen is an adult; sixty is already an older adult.
    expect(extractAge('aged 12').ageGroup).toBe('child');
    expect(extractAge('aged 17').ageGroup).toBe('adolescent');
    expect(extractAge('aged 18').ageGroup).toBe('adult');
    expect(extractAge('aged 60').ageGroup).toBe('older_adult');
  });

  it('treats an unqualified first person as an adult speaking for themselves', () => {
    const r = extractAge('mujhe do din se bukhar hai');
    expect(r.subject).toBe('self');
    expect(r.ageGroup).toBe('adult');
  });
});
