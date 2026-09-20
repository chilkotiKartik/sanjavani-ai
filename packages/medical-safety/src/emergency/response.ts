import { INDIA_EMERGENCY_CONTACTS } from '@sanjeevani/config';
import type { EmergencyCategory, EmergencyContact, EmergencyPayload, Language } from '@sanjeevani/types';
import { EMERGENCY_INSTRUCTIONS } from '../content/guidance';
import { EMERGENCY_CATEGORY_LABELS } from '../content/labels';
import { pick, type Localized } from '../content/localized';

const SPOKEN_OPENERS: Partial<Record<EmergencyCategory, Localized>> & { default: Localized } = {
  self_harm: {
    en: 'I’m really glad you told me. You deserve support right now. Please call Tele-MANAS on 1 4 4 1 6, or 1 1 2 if you are in immediate danger.',
    hi: 'आपने मुझे बताया, यह बहुत अच्छा किया। आपको अभी सहारा मिलना चाहिए। कृपया टेली-मानस 1 4 4 1 6 पर कॉल करें, और तुरंत खतरा हो तो 1 1 2 पर।',
    hinglish: 'Aapne mujhe bataya, ye bahut achha kiya. Aapko abhi sahara milna chahiye. Kripya Tele-MANAS 1 4 4 1 6 par call karein, aur turant khatra ho to 1 1 2 par.',
    bn: 'আপনি আমাকে বলেছেন, এটা খুব ভালো করেছেন। এই মুহূর্তে আপনার পাশে কারও থাকা দরকার। অনুগ্রহ করে টেলি-মানস ১ ৪ ৪ ১ ৬ নম্বরে ফোন করুন, আর তখনই বিপদ মনে হলে ১ ১ ২ নম্বরে।',
  },
  default: {
    en: 'This could be an emergency. Please call 1 1 2 right now.',
    hi: 'यह इमरजेंसी हो सकती है। कृपया अभी 1 1 2 पर कॉल करें।',
    hinglish: 'Ye emergency ho sakti hai. Kripya abhi 1 1 2 par call karein.',
    bn: 'এটা জরুরি অবস্থা হতে পারে। অনুগ্রহ করে এখনই ১ ১ ২ নম্বরে ফোন করুন।',
  },
};

const LOCAL_CONTACT_TEXT: Record<string, { label: Localized; description: Localized }> = {
  '112': {
    label: { en: 'Emergency 112', hi: 'इमरजेंसी 112', hinglish: 'Emergency 112', bn: 'জরুরি ১১২' },
    description: {
      en: 'National emergency number — police, fire and ambulance.',
      hi: 'राष्ट्रीय इमरजेंसी नंबर — पुलिस, फायर और एम्बुलेंस।',
      hinglish: 'National emergency number — police, fire aur ambulance.',
      bn: 'জাতীয় জরুরি নম্বর — পুলিশ, দমকল এবং অ্যাম্বুলেন্স।',
    },
  },
  '108': {
    label: { en: 'Ambulance 108', hi: 'एम्बुलेंस 108', hinglish: 'Ambulance 108', bn: 'অ্যাম্বুলেন্স ১০৮' },
    description: {
      en: 'Haryana ambulance helpline.',
      hi: 'हरियाणा एम्बुलेंस हेल्पलाइन।',
      hinglish: 'Haryana ambulance helpline.',
      bn: 'হরিয়ানা অ্যাম্বুলেন্স হেল্পলাইন।',
    },
  },
  '14416': {
    label: { en: 'Tele-MANAS 14416', hi: 'टेली-मानस 14416', hinglish: 'Tele-MANAS 14416', bn: 'টেলি-মানস ১৪৪১৬' },
    description: {
      en: 'Free, confidential mental health support, 24×7.',
      hi: 'मुफ़्त, गोपनीय मानसिक स्वास्थ्य सहायता, 24×7।',
      hinglish: 'Muft, gopniya mental health support, 24×7.',
      bn: 'বিনামূল্যে, গোপনীয় মানসিক স্বাস্থ্য সহায়তা, ২৪×৭।',
    },
  },
};

export function localizedContacts(language: Language, category: EmergencyCategory): EmergencyContact[] {
  const contacts = INDIA_EMERGENCY_CONTACTS.map((c) => {
    const local = LOCAL_CONTACT_TEXT[c.number];
    return {
      ...c,
      label: local?.label ? pick(local.label, language) : c.label,
      description: local?.description ? pick(local.description, language) : c.description,
    };
  });
  if (category === 'self_harm') {
    // Tele-MANAS first for self-harm, 112 stays available.
    return [...contacts].sort((a, b) => (a.number === '14416' ? -1 : b.number === '14416' ? 1 : 0)).map((c) => ({
      ...c,
      primary: c.number === '14416' || c.number === '112',
    }));
  }
  return contacts.filter((c) => c.number !== '14416');
}

export function buildEmergencyPayload(
  category: EmergencyCategory,
  instructionSet: string,
  matchedRuleIds: string[],
  language: Language,
): EmergencyPayload {
  const steps = EMERGENCY_INSTRUCTIONS[instructionSet] ?? EMERGENCY_INSTRUCTIONS[category] ?? EMERGENCY_INSTRUCTIONS.user_requested!;
  return {
    category,
    headline: pick(EMERGENCY_CATEGORY_LABELS[category], language),
    instructions: steps.map((s) => pick(s, language)).slice(0, 6),
    contacts: localizedContacts(language, category),
    matchedRuleIds,
  };
}

/** A short, calm spoken message. Digits are spaced so TTS reads "one one two", not "one hundred twelve". */
export function emergencySpeech(category: EmergencyCategory, instructionSet: string, language: Language): string {
  const opener = pick(SPOKEN_OPENERS[category] ?? SPOKEN_OPENERS.default, language);
  if (category === 'self_harm') return opener;
  const steps = (EMERGENCY_INSTRUCTIONS[instructionSet] ?? EMERGENCY_INSTRUCTIONS[category] ?? [])
    .slice(1, 3)
    .map((s) => pick(s, language));
  return [opener, ...steps].join(' ');
}
