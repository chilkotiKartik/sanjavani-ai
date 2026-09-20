/**
 * The shared vocabularies, with no dependencies at all.
 *
 * These live apart from `domain.ts` on purpose. That module builds Zod schemas from
 * them, and importing anything out of it pulls the whole Zod runtime along — around
 * 120 KB gzipped. The browser needs the lists (to render filter chips) but never needs
 * to validate anything, so it imports `@sanjeevani/types/constants` and pays nothing.
 *
 * There is still exactly one source of truth: `domain.ts` derives its enums from here.
 */

/**
 * Languages the app accepts and answers in.
 *
 * `hinglish` is Hindi spoken or typed in Latin script with English mixed in, which is
 * how a very large number of people actually write — it is a first-class language
 * here, not a fallback for failing to detect Hindi.
 *
 * Adding one is additive: symptom phrases go into the lexicon so it is understood, the
 * safety-critical content gets translated so the dangerous moments land in the right
 * language, and everything else falls back to English until someone writes it. The
 * app reports which language it is actually answering in rather than pretending.
 */
export const LANGUAGES = ['en', 'hi', 'hinglish', 'bn'] as const;
export const URGENCY_LEVELS = ['self_care', 'routine', 'urgent', 'emergency'] as const;
export const FACILITY_TYPES = [
  'emergency_department',
  'hospital',
  'clinic',
  'pharmacy',
  'diagnostic_lab',
] as const;
export const SPECIALTIES = [
  'emergency_medicine',
  'general_medicine',
  'pediatrics',
  'cardiology',
  'neurology',
  'pulmonology',
  'gastroenterology',
  'orthopedics',
  'ent',
  'ophthalmology',
  'dermatology',
  'obstetrics_gynecology',
  'dental',
  'psychiatry',
  'urology',
] as const;
export const SYMPTOM_CODES = [
  'fever',
  'chills',
  'body_ache',
  'fatigue',
  'headache',
  'cough',
  'sore_throat',
  'runny_nose',
  'breathlessness',
  'wheezing',
  'chest_pain',
  'palpitations',
  'abdominal_pain',
  'nausea',
  'vomiting',
  'diarrhea',
  'constipation',
  'loss_of_appetite',
  'dizziness',
  'fainting',
  'weakness',
  'numbness',
  'confusion',
  'seizure',
  'rash',
  'itching',
  'swelling',
  'ear_pain',
  'eye_pain',
  'eye_redness',
  'blurred_vision',
  'toothache',
  'back_pain',
  'joint_pain',
  'neck_stiffness',
  'injury',
  'burn',
  'bleeding',
  'painful_urination',
  'blood_in_urine',
  'blood_in_stool',
  'blood_in_vomit',
  'dehydration',
  'animal_bite',
  'pregnancy_concern',
  'anxiety',
  'low_mood',
  'insomnia',
] as const;
export const SEVERITIES = ['mild', 'moderate', 'severe', 'unknown'] as const;
/**
 * Age bands, in order.
 *
 * `adolescent` exists so that a fourteen-year-old is not silently filed as either a
 * small child or an adult. It is not a different risk model — for specialty routing an
 * adolescent is treated as an adult, deliberately, because sending a sixteen-year-old
 * to a paediatric department that may not accept them is a worse failure than the
 * label being coarse. What it changes is what the app *says* about who it is advising,
 * and that fluid-loss advice written for children still applies.
 */
export const AGE_GROUPS = ['infant', 'child', 'adolescent', 'adult', 'older_adult', 'unknown'] as const;

/**
 * Who the conversation is about.
 *
 * `child` and `parent` are refinements of `other`, and they are worth distinguishing
 * because they change what is worth asking next — not because either implies an age.
 * "My son" can be six or thirty-six, so the relationship never sets an age band on its
 * own; it only tells the app that asking is worthwhile.
 */
export const SUBJECTS = ['self', 'child', 'parent', 'other', 'unknown'] as const;
export const EMERGENCY_CATEGORIES = [
  'cardiac',
  'breathing',
  'stroke',
  'unconscious',
  'major_trauma',
  'severe_bleeding',
  'seizure',
  'anaphylaxis',
  'poisoning',
  'self_harm',
  'severe_burn',
  'obstetric',
  'infant_danger',
  'meningitis_signs',
  'user_requested',
] as const;

/** The one type this module needs; declared here so it stays free of Zod. */
export type Urgency = (typeof URGENCY_LEVELS)[number];

export function urgencyRank(u: Urgency): number {
  return URGENCY_LEVELS.indexOf(u);
}

export function maxUrgency(...levels: Urgency[]): Urgency {
  return levels.reduce<Urgency>((acc, l) => (urgencyRank(l) > urgencyRank(acc) ? l : acc), 'self_care');
}

/**
 * How a clinician can disagree with a triage decision.
 *
 * Deliberately coarse. A reviewer working through a queue will give each case under a
 * minute, and a taxonomy finer than this buys detail nobody can act on: every value
 * here maps to a specific, findable place in the rule set — the urgency floor for a
 * symptom, the specialty mapping, or the follow-up questions that were never asked.
 *
 * The two urgency errors are kept apart rather than merged into "wrong urgency"
 * because they are not the same mistake. Under-triage is the one that hurts people and
 * is reported on its own everywhere it appears; over-triage costs a wasted trip and is
 * tolerated, tracked, and traded against the first.
 */
export const REVIEW_VERDICTS = ['AGREE', 'URGENCY_TOO_LOW', 'URGENCY_TOO_HIGH', 'WRONG_SPECIALTY', 'INSUFFICIENT'] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

/** Verdicts that say the rules got it wrong. `INSUFFICIENT` is a judgement about the
 * questions asked rather than the answer given, so it is counted on its own. */
export const DISAGREEMENT_VERDICTS = ['URGENCY_TOO_LOW', 'URGENCY_TOO_HIGH', 'WRONG_SPECIALTY'] as const;
