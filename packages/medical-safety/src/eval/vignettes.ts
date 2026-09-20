import type { EmergencyCategory, Language, Urgency } from '@sanjeevani/types';

/**
 * Labelled cases for measuring the triage engine.
 *
 * ## Where this lives, and why
 *
 * It sits in the safety package rather than beside the harness that runs it, and is
 * reachable at `@sanjeevani/medical-safety/vignettes` — a subpath, deliberately kept
 * out of the package's main barrel so it is never pulled into a bundle that did not
 * ask for it.
 *
 * The reason is that two very different things run these cases. `npm run eval` runs
 * them in CI and fails the build when the numbers slip. The dashboard in the web app
 * runs the *same* cases, in the browser, against the *same* engine, so anyone can
 * watch the safety claim be re-derived in front of them instead of reading a number
 * someone typed into a slide. One copy, so the two can never disagree.
 *
 * ## What this is, and what it is not
 *
 * These are **engineering regression cases**, not a clinical gold standard. They were
 * written against the presentations the rules are meant to catch, in the words people
 * actually use, across the three languages the app accepts. They are good at answering
 * "did a change break something that used to work" and "how often does the engine send
 * someone to hospital who did not need to go".
 *
 * They are **not** evidence of clinical accuracy. No clinician has reviewed them, they
 * are not sampled from real presentations, and the distribution is deliberately
 * unrealistic — emergencies are over-represented because that is where failure costs
 * the most. Any real deployment needs a set built and reviewed by practitioners.
 *
 * ## The two errors, and why they are not equal
 *
 * - **Under-triage** — the engine said something was less urgent than it is. This is
 *   the error that hurts people, and the threshold for it is zero.
 * - **Over-triage** — the engine said something was more urgent than it is. This costs
 *   a wasted trip and a crowded OPD. It is tolerated, and tracked, because a triage aid
 *   that never over-triages is one that is not being careful enough.
 *
 * `expectEmergency: false` cases include the hard ones on purpose: negated mentions,
 * past events, hypotheticals and worries about someone else. Those are exactly where a
 * keyword matcher fails, and where a false alarm would teach someone to ignore the app.
 */
export interface Vignette {
  id: string;
  language: Language;
  /** The turns, in order. Multi-turn cases exercise follow-up questions. */
  turns: string[];
  /** Must the deterministic circuit breaker fire? */
  expectEmergency: boolean;
  /** When an emergency is expected, the category it should be filed under. */
  expectCategory?: EmergencyCategory;
  /**
   * The lowest acceptable urgency. Anything below this is under-triage. Left unset for
   * emergency cases, where the expectation is already `emergency`.
   */
  minUrgency?: Urgency;
  /**
   * The highest urgency that is still reasonable. Anything above is over-triage —
   * recorded, not failed.
   */
  maxReasonableUrgency?: Urgency;
  /**
   * A hard ceiling. Exceeding it fails the run.
   *
   * This exists because `expectEmergency: false` turned out not to mean what it
   * looked like. It only asks whether the *circuit breaker* fired — and the engine
   * could sail past that check while still telling the person "Call 112 now or go to
   * the nearest emergency department", because the urgency came from triage rather
   * than from a red-flag rule. A suite that calls that a pass is measuring the wrong
   * thing.
   *
   * So for cases where nothing is happening to anyone right now, the ceiling is hard.
   * It is checked against the highest urgency reached at any point in the exchange,
   * not the last one: being told to call an ambulance and then talked back down is
   * still having been told to call an ambulance.
   */
  failAboveUrgency?: Urgency;
  /** Why this case is in the set. */
  note: string;
}

/* ── Emergencies: the circuit breaker must fire ─────────────────────────────── */

const EMERGENCIES: Vignette[] = [
  // Bengali. Written to exercise the whole path, not just the lexicon: script
  // detection, Bengali negation, a multi-turn screen answered in Bengali, and the
  // romanised spellings speech-to-text returns when it hears Bengali but writes Latin.
  {
    id: 'cardiac.classic.bn',
    language: 'bn',
    turns: ['বাবার বুকে খুব ব্যথা হচ্ছে আর খুব ঘাম হচ্ছে'],
    expectEmergency: true,
    expectCategory: 'cardiac',
    note: 'Textbook cardiac presentation in Bengali script.',
  },
  {
    id: 'stroke.fast.bn',
    language: 'bn',
    turns: ['মায়ের মুখ বেঁকে গেছে আর কথা জড়িয়ে যাচ্ছে'],
    expectEmergency: true,
    expectCategory: 'stroke',
    note: 'FAST signs described the way a family member would.',
  },
  {
    id: 'breathing.child.bn',
    language: 'bn',
    turns: ['আমার বাচ্চা শ্বাস নিতে পারছে না, ঠোঁট নীল হয়ে যাচ্ছে'],
    expectEmergency: true,
    expectCategory: 'breathing',
    note: 'Airway emergency in a child, with the cyanosis cue.',
  },
  {
    id: 'envenomation.bn',
    language: 'bn',
    turns: ['মাঠে সাপে কেটেছে, কী করব'],
    expectEmergency: true,
    expectCategory: 'poisoning',
    note: 'Snakebite — a phrase rule, so it must fire on the first turn.',
  },
  {
    id: 'self_harm.bn',
    language: 'bn',
    turns: ['আর বাঁচতে ইচ্ছে করছে না'],
    expectEmergency: true,
    expectCategory: 'self_harm',
    note: 'Must reach the Tele-MANAS path, not ordinary triage.',
  },
  {
    id: 'unconscious.romanised.bn',
    language: 'bn',
    turns: ['amar baba ogyan hoye geche, dake sara dicche na'],
    expectEmergency: true,
    expectCategory: 'unconscious',
    note: 'Romanised Bengali, as STT returns it when it transcribes Bengali in Latin script.',
  },
  {
    id: 'infant.fever.bn',
    language: 'bn',
    turns: ['আমার বাচ্চার বয়স ৩ মাস, কাল থেকে জ্বর'],
    expectEmergency: true,
    expectCategory: 'infant_danger',
    note: 'Age stated in months before the unit — the marker precedes the number in Bengali.',
  },
  {
    id: 'cardiac.classic.en',
    language: 'en',
    turns: ['My father has severe chest pain and he is sweating a lot'],
    expectEmergency: true,
    expectCategory: 'cardiac',
    note: 'Textbook cardiac presentation, stated plainly.',
  },
  {
    id: 'cardiac.classic.hinglish',
    language: 'hinglish',
    turns: ['Papa ko seene mein bahut tez dard ho raha hai aur paseena aa raha hai'],
    expectEmergency: true,
    expectCategory: 'cardiac',
    note: 'The same presentation in the romanised Hindi most people actually type.',
  },
  {
    id: 'cardiac.classic.hi',
    language: 'hi',
    turns: ['पापा को सीने में बहुत तेज़ दर्द हो रहा है और पसीना आ रहा है'],
    expectEmergency: true,
    expectCategory: 'cardiac',
    note: 'Devanagari must reach the same rule as its romanised form.',
  },
  {
    id: 'cardiac.bare_chest_pain.en',
    language: 'en',
    turns: ['I have chest pain'],
    expectEmergency: true,
    expectCategory: 'cardiac',
    note: 'Chest pain alone escalates — the composite rule does not wait for a second sign.',
  },
  {
    id: 'breathing.cannot_breathe.en',
    language: 'en',
    turns: ['I cannot breathe properly, it is getting worse'],
    expectEmergency: true,
    expectCategory: 'breathing',
    note: 'Airway compromise stated directly.',
  },
  {
    id: 'breathing.hinglish',
    language: 'hinglish',
    turns: ['Saans nahi aa rahi hai, bahut takleef ho rahi hai'],
    expectEmergency: true,
    expectCategory: 'breathing',
    note: 'Negation-shaped phrasing ("saans nahi aa rahi") that means the opposite of a negated symptom.',
  },
  {
    id: 'stroke.fast.en',
    language: 'en',
    turns: ['My mother’s face is drooping on one side and she cannot lift her arm'],
    expectEmergency: true,
    expectCategory: 'stroke',
    note: 'FAST signs — the time-critical case where minutes decide outcome.',
  },
  {
    id: 'stroke.speech.hinglish',
    language: 'hinglish',
    turns: ['Maa ki bolne mein dikkat ho rahi hai aur ek taraf ka haath kaam nahi kar raha'],
    expectEmergency: true,
    expectCategory: 'stroke',
    note: 'Slurred speech with one-sided weakness.',
  },
  {
    id: 'stroke.thunderclap.en',
    language: 'en',
    turns: ['Sudden worst headache of my life, came on in seconds'],
    expectEmergency: true,
    expectCategory: 'stroke',
    note: 'Thunderclap onset — a headache that must never be triaged as routine.',
  },
  {
    id: 'unconscious.en',
    language: 'en',
    turns: ['He collapsed and is not responding'],
    expectEmergency: true,
    expectCategory: 'unconscious',
    note: 'Unresponsive third party.',
  },
  {
    id: 'unconscious.hi',
    language: 'hi',
    turns: ['वह बेहोश हो गया है और जवाब नहीं दे रहा'],
    expectEmergency: true,
    expectCategory: 'unconscious',
    note: 'Unresponsiveness in Devanagari.',
  },
  {
    id: 'seizure.en',
    language: 'en',
    turns: ['My son is having a seizure right now'],
    expectEmergency: true,
    expectCategory: 'seizure',
    note: 'Active seizure.',
  },
  {
    id: 'seizure.hinglish',
    language: 'hinglish',
    turns: ['Bachche ko daura pad raha hai'],
    expectEmergency: true,
    expectCategory: 'seizure',
    note: 'The common Hindi word for a fit.',
  },
  {
    id: 'anaphylaxis.en',
    language: 'en',
    turns: ['Her lips and throat are swelling up and she is wheezing after a bee sting'],
    expectEmergency: true,
    expectCategory: 'anaphylaxis',
    note: 'Airway swelling after a sting.',
  },
  {
    id: 'bleeding.severe.en',
    language: 'en',
    turns: ['There is heavy bleeding from his leg and it will not stop'],
    expectEmergency: true,
    expectCategory: 'severe_bleeding',
    note: 'Uncontrolled external bleeding.',
  },
  {
    id: 'bleeding.vomit.hinglish',
    language: 'hinglish',
    turns: ['Ulti mein khoon aa raha hai'],
    expectEmergency: true,
    expectCategory: 'severe_bleeding',
    note: 'Haematemesis — easy to under-rate as "vomiting".',
  },
  {
    id: 'poisoning.ingestion.en',
    language: 'en',
    turns: ['My child swallowed kerosene from a bottle'],
    expectEmergency: true,
    expectCategory: 'poisoning',
    note: 'Household poisoning, a leading paediatric emergency in India.',
  },
  {
    id: 'poisoning.snakebite.hinglish',
    language: 'hinglish',
    turns: ['Saanp ne kaat liya hai khet mein'],
    expectEmergency: true,
    expectCategory: 'poisoning',
    note: 'Snakebite — rural, time-critical, and its own instruction set.',
  },
  {
    id: 'trauma.major.en',
    language: 'en',
    turns: ['He was hit by a bike and his leg is bent the wrong way'],
    expectEmergency: true,
    expectCategory: 'major_trauma',
    note: 'Road traffic injury with deformity.',
  },
  {
    id: 'burn.severe.en',
    language: 'en',
    turns: ['Hot oil spilled on my arm and chest, large area is burnt'],
    expectEmergency: true,
    expectCategory: 'severe_burn',
    note: 'Large-area scald.',
  },
  {
    id: 'obstetric.bleeding.hinglish',
    language: 'hinglish',
    turns: ['Main pregnant hoon aur bleeding ho rahi hai'],
    expectEmergency: true,
    expectCategory: 'obstetric',
    note: 'Antepartum haemorrhage.',
  },
  {
    id: 'infant.danger.en',
    language: 'en',
    turns: ['My 2 month old baby is not feeding and is very floppy'],
    expectEmergency: true,
    expectCategory: 'infant_danger',
    note: 'Neonatal danger signs — the age itself raises the floor.',
  },
  {
    id: 'infant.fever.hinglish',
    language: 'hinglish',
    turns: ['Mere 3 mahine ke bachche ko bukhar hai'],
    expectEmergency: true,
    expectCategory: 'infant_danger',
    note: 'The same fever that is routine in an adult is an emergency at three months. The age has to reach the rules through Hinglish too.',
  },
  {
    id: 'infant.breathless.hi',
    language: 'hi',
    turns: ['मेरे नवजात शिशु को सांस लेने में तकलीफ़ है'],
    expectEmergency: true,
    note: 'Breathlessness in an infant, in Devanagari, with the age carried by an unambiguous word rather than a number.',
  },
  {
    id: 'self_harm.en',
    language: 'en',
    turns: ['I do not want to live anymore'],
    expectEmergency: true,
    expectCategory: 'self_harm',
    note: 'Must route to Tele-MANAS, not to a hospital list.',
  },
  {
    id: 'self_harm.hinglish',
    language: 'hinglish',
    turns: ['Mera jeene ka mann nahi kar raha'],
    expectEmergency: true,
    expectCategory: 'self_harm',
    note: 'The same intent expressed indirectly, as it usually is.',
  },
  {
    id: 'meningitis.en',
    language: 'en',
    turns: ['High fever with a stiff neck and he seems confused'],
    expectEmergency: true,
    expectCategory: 'meningitis_signs',
    note: 'Composite rule — no single phrase here is an emergency on its own.',
  },
  {
    id: 'user_requested.en',
    language: 'en',
    turns: ['I need an ambulance right now'],
    expectEmergency: true,
    expectCategory: 'user_requested',
    note: 'An explicit request is always honoured without interrogation.',
  },
  {
    id: 'multi_turn.escalation.en',
    language: 'en',
    turns: ['I have had a fever for two days', 'yes', 'yes'],
    expectEmergency: true,
    note:
      'The fever red-flag screen bundles four signs, two of which are emergency-grade. ' +
      'A yes raises urgency and queues the fixed confirmation question; a yes to that escalates.',
  },
  {
    id: 'multi_turn.confirm_declined.en',
    language: 'en',
    turns: ['I have had a fever for two days', 'yes', 'no'],
    expectEmergency: false,
    minUrgency: 'urgent',
    note: 'Declining the confirmation must leave urgency raised but not manufacture an emergency.',
  },
];

/* ── Not emergencies: the circuit breaker must stay quiet ───────────────────── */

const NON_EMERGENCIES: Vignette[] = [
  {
    id: 'fever.routine.bn',
    language: 'bn',
    turns: ['আমার দু দিন ধরে জ্বর আর গা ব্যথা', 'না'],
    expectEmergency: false,
    minUrgency: 'routine',
    maxReasonableUrgency: 'urgent',
    note: 'Ordinary viral pattern; the red-flag screen is answered in Bengali and is negative.',
  },
  {
    id: 'negated.chest.bn',
    language: 'bn',
    turns: ['আমার বুকে ব্যথা নেই, কিন্তু কাশি হচ্ছে'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'Bengali negation must suppress the cardiac phrase without losing the cough.',
  },
  {
    id: 'past.episode.bn',
    language: 'bn',
    turns: ['গত বছর আমার বুকে ব্যথা হয়েছিল, এখন ঠিক আছি'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'A finished episode named with a Bengali past-time expression.',
  },
  {
    id: 'hypothetical.bn',
    language: 'bn',
    turns: ['যদি কারো বুকে ব্যথা হয় তাহলে কী করা উচিত'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'A general question, not a report — must not trigger the circuit breaker.',
  },
  {
    id: 'cough.selfcare.bn',
    language: 'bn',
    turns: ['কাল থেকে একটু কাশি আর সর্দি', 'না'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'Mild upper-respiratory symptoms; anything above routine is over-triage.',
  },
  {
    id: 'negated.chest_pain.en',
    language: 'en',
    turns: ['I have a headache but no chest pain'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'Forward negation in English — the classic keyword-matcher failure.',
  },
  {
    id: 'negated.chest_pain.hinglish',
    language: 'hinglish',
    turns: ['Sar dard hai lekin seene mein dard nahi hai'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'Backward negation in Hindi — the negator follows the symptom.',
  },
  {
    id: 'negated.breathless.hi',
    language: 'hi',
    turns: ['बुखार है लेकिन सांस लेने में कोई तकलीफ़ नहीं है'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'urgent',
    note: 'Negated breathlessness in Devanagari.',
  },
  {
    id: 'past.resolved.en',
    language: 'en',
    turns: ['I had chest pain last year but it was checked and I am fine now'],
    expectEmergency: false,
    // Hard ceiling, not a soft one. This case passed for a long time while the app
    // was answering it with "Call 112 now" — the breaker was correctly quiet and the
    // suite never looked at what the person was actually told.
    failAboveUrgency: 'routine',
    note: 'A resolved past event must not produce a present emergency, or emergency advice.',
  },
  {
    id: 'past.resolved.hinglish',
    language: 'hinglish',
    turns: ['Pichle saal seene mein dard hua tha, ab theek hoon'],
    expectEmergency: false,
    failAboveUrgency: 'routine',
    note: 'The same finished episode in Hinglish, where the time marker trails the symptom.',
  },
  {
    id: 'hypothetical.en',
    language: 'en',
    turns: ['What should I do if someone has chest pain?'],
    expectEmergency: false,
    /*
     * Deliberately has no hard ceiling.
     *
     * The breaker must stay quiet — nobody is having chest pain, so an emergency
     * takeover would be wrong. But "that is what 112 is for" is a *correct* answer to
     * the question being asked, and suppressing it would trade a slightly odd reply
     * for a less useful one in the dangerous direction. Recorded here as a choice
     * rather than left as an accident.
     */
    note: 'A question about what to do is not a report of it happening — but emergency advice is still a right answer to it.',
  },
  {
    id: 'worry.family.en',
    language: 'en',
    turns: ['I am worried my father might have a heart problem some day'],
    expectEmergency: false,
    failAboveUrgency: 'routine',
    note: 'Anticipatory worry, not a present emergency.',
  },
  {
    id: 'routine.fever.en',
    language: 'en',
    turns: ['I have had a mild fever since yesterday', 'no'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'Short, mild fever with red flags excluded — the commonest real case.',
  },
  {
    id: 'routine.fever_3_days.hinglish',
    language: 'hinglish',
    turns: ['Teen din se bukhar hai', 'nahi'],
    expectEmergency: false,
    minUrgency: 'routine',
    maxReasonableUrgency: 'urgent',
    note: 'Three-day fever should reach at least routine care, not self-care.',
  },
  {
    id: 'routine.cough_2_weeks.en',
    language: 'en',
    turns: ['I have had a cough for three weeks', 'no'],
    expectEmergency: false,
    minUrgency: 'routine',
    maxReasonableUrgency: 'urgent',
    note: 'A long cough must be seen — TB screening matters in this region.',
  },
  {
    id: 'selfcare.sore_throat.en',
    language: 'en',
    turns: ['Mild sore throat since this morning', 'no'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'Minor, recent, self-limiting — should not be pushed to a hospital.',
  },
  {
    id: 'selfcare.headache.hinglish',
    language: 'hinglish',
    turns: ['Halka sar dard hai aaj subah se', 'nahi'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'Mild recent headache. Over-triage here is the costly kind.',
  },
  {
    id: 'urgent.child_fever.en',
    language: 'en',
    turns: ['My 4 year old has had a fever for two days', 'no'],
    expectEmergency: false,
    minUrgency: 'routine',
    maxReasonableUrgency: 'urgent',
    note: 'A child with a two-day fever warrants a same-day look.',
  },
  {
    id: 'adult.fever.en',
    language: 'en',
    turns: ['I have had a fever since yesterday', 'no'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    // The control for the two infant cases above: the identical complaint, in an
    // adult, must not carry the same weight, or the age layer is doing nothing.
    note: 'A one-day fever in an adult is the commonest real case and must stay calm.',
  },
  {
    id: 'older_adult.weakness.hinglish',
    language: 'hinglish',
    turns: ['Mere dadaji ko do din se kamzori aur chakkar aa rahe hain', 'nahi'],
    expectEmergency: false,
    minUrgency: 'routine',
    maxReasonableUrgency: 'urgent',
    note: 'Older adults present atypically; weakness and dizziness deserve a same-day look rather than reassurance.',
  },
  {
    id: 'adolescent.vomiting.en',
    language: 'en',
    turns: ['My 15 year old son has been vomiting since morning', 'no'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'urgent',
    note: 'A teenager is banded separately so the label is accurate and the fluid advice still applies.',
  },
  {
    id: 'urgent.gi_dehydration.hinglish',
    language: 'hinglish',
    turns: ['Do din se ulti aur dast ho rahe hain', 'nahi'],
    expectEmergency: false,
    minUrgency: 'routine',
    maxReasonableUrgency: 'urgent',
    note: 'Two days of vomiting and loose motions risks dehydration.',
  },
  {
    id: 'routine.back_pain.en',
    language: 'en',
    turns: ['My lower back has been aching for a week'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'Mechanical back pain — common, and not an emergency.',
  },
  {
    id: 'greeting.en',
    language: 'en',
    turns: ['hello'],
    expectEmergency: false,
    note: 'A greeting must not be read as a symptom.',
  },
  {
    id: 'unrelated.en',
    language: 'en',
    turns: ['what is the weather today'],
    expectEmergency: false,
    note: 'Off-topic input must not produce a clinical claim.',
  },
  {
    id: 'ambiguous.pain.en',
    language: 'en',
    turns: ['it hurts'],
    expectEmergency: false,
    note: 'Too little to act on — the engine should ask, not guess.',
  },
  {
    id: 'negated.bleeding.en',
    language: 'en',
    turns: ['I fell off my cycle, grazed my knee, no bleeding and no head injury'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'routine',
    note: 'Minor trauma with the dangerous features explicitly excluded.',
  },
  {
    id: 'dismissed.followup.en',
    language: 'en',
    turns: ['I have a mild cough', 'no', 'it is a bit worse today'],
    expectEmergency: false,
    minUrgency: 'self_care',
    maxReasonableUrgency: 'urgent',
    note: 'Worsening raises severity but must not by itself manufacture an emergency.',
  },
];

export const VIGNETTES: Vignette[] = [...EMERGENCIES, ...NON_EMERGENCIES];

/**
 * Thresholds the suite enforces.
 *
 * Emergency recall is absolute: a missed emergency is the failure this whole system
 * exists to prevent. The false-alarm ceiling is loose by comparison, and deliberately
 * so — but it is a ceiling, because an app that cries wolf gets ignored, and being
 * ignored is itself a safety failure.
 */
export interface Thresholds {
  /** Fraction of true emergencies the circuit breaker must catch. */
  minEmergencyRecall: number;
  /** Fraction of non-emergencies allowed to trigger a false alarm. */
  maxFalseAlarmRate: number;
  /** Cases triaged below their stated floor. Must be none. */
  maxUnderTriage: number;
}

export const THRESHOLDS: Thresholds = {
  minEmergencyRecall: 1,
  maxFalseAlarmRate: 0.05,
  maxUnderTriage: 0,
};
