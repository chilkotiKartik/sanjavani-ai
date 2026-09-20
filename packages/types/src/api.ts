import { z } from 'zod';
import { REVIEW_VERDICTS } from './constants';
import {
  ageGroupSchema,
  confidenceSchema,
  emergencyCategorySchema,
  emergencyContactSchema,
  facilityTypeSchema,
  geoPointSchema,
  languageSchema,
  rankedFacilitySchema,
  severitySchema,
  specialtySchema,
  triageResultSchema,
  urgencySchema,
} from './domain';

export const languagePreferenceSchema = z.enum(['auto', 'en', 'hi', 'hinglish', 'bn']);
export type LanguagePreference = z.infer<typeof languagePreferenceSchema>;

export const clientLocationSchema = geoPointSchema.extend({
  accuracyMeters: z.number().nonnegative().max(100_000).optional(),
  /** "demo" when the user chose the demo location instead of sharing GPS. */
  origin: z.enum(['gps', 'demo', 'manual']).default('gps'),
});
export type ClientLocation = z.infer<typeof clientLocationSchema>;

export const createConversationRequestSchema = z.object({
  languagePreference: languagePreferenceSchema.default('auto'),
});
export type CreateConversationRequest = z.infer<typeof createConversationRequestSchema>;

export const turnRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Please say or type something.')
    .max(1000, 'That message is too long.'),
  inputMode: z.enum(['voice', 'text', 'quick_reply']).default('text'),
  /** Language code reported by the speech-to-text engine, if any (ISO 639-1/3). */
  sttLanguage: z.string().max(8).optional(),
  languagePreference: languagePreferenceSchema.default('auto'),
  location: clientLocationSchema.optional(),
});
export type TurnRequest = z.infer<typeof turnRequestSchema>;

export const conversationPhaseSchema = z.enum([
  'greeting',
  'follow_up',
  'advice',
  'emergency',
  'clarify',
  'facility_search',
  'closing',
]);
export type ConversationPhase = z.infer<typeof conversationPhaseSchema>;

export const intentSchema = z.enum([
  'symptom_report',
  'follow_up_answer',
  'find_facility',
  'directions',
  'greeting',
  'thanks',
  'reset',
  'unrelated',
]);
export type Intent = z.infer<typeof intentSchema>;

export const quickReplySchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type QuickReply = z.infer<typeof quickReplySchema>;

export const emergencyPayloadSchema = z.object({
  category: emergencyCategorySchema,
  headline: z.string(),
  instructions: z.array(z.string()).max(6),
  contacts: z.array(emergencyContactSchema),
  matchedRuleIds: z.array(z.string()),
});
export type EmergencyPayload = z.infer<typeof emergencyPayloadSchema>;

export const facilitiesStatusSchema = z.enum([
  'ok',
  'not_needed',
  'needs_location',
  'none_found',
  'unavailable',
]);
export type FacilitiesStatus = z.infer<typeof facilitiesStatusSchema>;

export const degradationSchema = z.enum([
  'ai_unavailable',
  'ai_invalid_output',
  'maps_unavailable',
  'routing_estimated',
  'persistence_unavailable',
  /**
   * Hospitals came from the directory bundled with the app rather than a live search.
   *
   * Distinct from `maps_unavailable`, which means no hospitals at all. This says there
   * *are* results and they are a snapshot: verified on a recorded date, small, regional,
   * and possibly out of date. Somewhere between that and silence is the failure mode
   * this code exists to prevent — showing a cached hospital as though it were current.
   */
  'facilities_offline',
]);
export type Degradation = z.infer<typeof degradationSchema>;

/**
 * One stage of the turn pipeline, as it actually ran.
 *
 * Carries stage names, outcomes and timings only — never symptoms, never message
 * text, never anything clinical. It exists so a user (or a reviewer) can see that
 * the emergency check really did run before generation, rather than being told so.
 */
export const traceStageSchema = z.object({
  stage: z.enum([
    'language',
    'extraction',
    'emergency_check',
    'intent',
    'ai_understanding',
    'follow_up',
    'triage',
    'facilities',
    'phrasing',
    'output_guard',
  ]),
  /** false when the stage was not needed on this turn. */
  ran: z.boolean(),
  ms: z.number().nonnegative(),
  /** A short, non-clinical outcome label, e.g. "rules", "gemini", "2 found", "clear". */
  detail: z.string().max(40).nullable(),
});
export type TraceStage = z.infer<typeof traceStageSchema>;

export const turnResponseSchema = z.object({
  conversationId: z.string(),
  turnId: z.string(),
  phase: conversationPhaseSchema,
  intent: intentSchema,
  language: languageSchema,
  reply: z.object({
    /** What appears as caption text. */
    display: z.string(),
    /** What is spoken — shorter, no symbols or lists. */
    speech: z.string(),
  }),
  triage: triageResultSchema.nullable(),
  emergency: emergencyPayloadSchema.nullable(),
  facilities: z.array(rankedFacilitySchema),
  facilitiesStatus: facilitiesStatusSchema,
  quickReplies: z.array(quickReplySchema),
  degraded: z.array(degradationSchema),
  disclaimer: z.string(),
  /** How this answer was produced. Safe to show; contains no clinical content. */
  trace: z.array(traceStageSchema),
  totalMs: z.number().nonnegative(),
});
export type TurnResponse = z.infer<typeof turnResponseSchema>;

export const facilitiesQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  type: facilityTypeSchema.default('hospital'),
  specialty: specialtySchema.optional(),
  urgency: urgencySchema.default('routine'),
  limit: z.coerce.number().int().min(1).max(10).default(5),
  language: languageSchema.default('en'),
});
export type FacilitiesQuery = z.infer<typeof facilitiesQuerySchema>;

export const facilitiesResponseSchema = z.object({
  facilities: z.array(rankedFacilitySchema),
  status: facilitiesStatusSchema,
  provider: z.enum(['google_places', 'curated_directory']),
  attribution: z.string(),
});
export type FacilitiesResponse = z.infer<typeof facilitiesResponseSchema>;

export const speakRequestSchema = z.object({
  text: z.string().trim().min(1).max(800),
  language: languageSchema.default('en'),
});
export type SpeakRequest = z.infer<typeof speakRequestSchema>;

export const transcriptionResponseSchema = z.object({
  text: z.string(),
  languageCode: z.string().nullable(),
  languageProbability: z.number().nullable(),
  provider: z.string(),
});
export type TranscriptionResponse = z.infer<typeof transcriptionResponseSchema>;

export const feedbackRequestSchema = z.object({
  helpful: z.boolean(),
  category: z.enum(['voice', 'triage', 'facilities', 'accessibility', 'language', 'other']).default('other'),
  comment: z.string().trim().max(600).optional(),
  conversationId: z.string().max(64).optional(),
});
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

export const emergencyActionRequestSchema = z.object({
  action: z.enum(['call_initiated', 'location_shared', 'directions_opened', 'dismissed']),
  conversationId: z.string().max(64).optional(),
  category: emergencyCategorySchema.optional(),
  contactNumber: z.string().max(16).optional(),
});
export type EmergencyActionRequest = z.infer<typeof emergencyActionRequestSchema>;

export const capabilitiesSchema = z.object({
  demoMode: z.boolean(),
  stt: z.enum(['elevenlabs', 'gemini', 'browser']),
  tts: z.enum(['elevenlabs', 'gemini', 'browser']),
  ai: z.enum(['anthropic', 'gemini', 'rules']),
  maps: z.enum(['google_places', 'curated_directory']),
  routing: z.enum(['google_routes', 'haversine_estimate']),
  persistence: z.enum(['postgres', 'memory']),
  region: z.object({
    id: z.string(),
    name: z.string(),
    center: geoPointSchema,
    demoLocation: geoPointSchema,
    demoLocationLabel: z.string(),
  }),
  emergencyContacts: z.array(emergencyContactSchema),
  retentionDays: z.number().int(),
});
export type Capabilities = z.infer<typeof capabilitiesSchema>;

export const sessionResponseSchema = z.object({
  userId: z.string(),
  anonymous: z.boolean(),
  expiresAt: z.string(),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const conversationSummarySchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  updatedAt: z.string(),
  language: languageSchema,
  urgency: urgencySchema.nullable(),
  emergency: z.boolean(),
  symptomCodes: z.array(z.string()),
  turnCount: z.number().int(),
});
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const conversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  createdAt: z.string(),
});
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export const symptomTimelineEntrySchema = z.object({
  code: z.string(),
  severity: z.string(),
  firstReportedAt: z.string(),
  reportedDurationHours: z.number().nullable(),
});
export type SymptomTimelineEntry = z.infer<typeof symptomTimelineEntrySchema>;

export const conversationDetailSchema = conversationSummarySchema.extend({
  messages: z.array(conversationMessageSchema),
  latestTriage: triageResultSchema.nullable(),
  timeline: z.array(symptomTimelineEntrySchema),
});
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ─── Clinician review ────────────────────────────────────────────────────────────

export const reviewVerdictSchema = z.enum(REVIEW_VERDICTS);

/**
 * One decision, as a reviewer sees it.
 *
 * This is the whole contract, and what it leaves out is the point: there is no message
 * text, no free-text symptom description, no location, no conversation id and no
 * patient user id. A reviewer is shown exactly the structured facts the rules acted on
 * and nothing else.
 *
 * That is a privacy guarantee, and it is also the methodologically correct thing to
 * show. The question being asked is "given these inputs, was this decision right?" —
 * not "what was wrong with this person?", which no one can answer from a transcript
 * and which this product has no business inviting anyone to try.
 */
export const reviewCaseSchema = z.object({
  /** The triage decision's id. Stable for as long as the conversation is retained. */
  id: z.string(),
  decidedAt: z.string(),
  language: languageSchema,
  urgency: urgencySchema,
  emergency: z.boolean(),
  emergencyCategory: emergencyCategorySchema.nullable(),
  specialty: specialtySchema,
  confidence: confidenceSchema,
  /** "rules" or "rules+ai" — whether a model contributed to the understanding. */
  source: z.string(),
  ageGroup: ageGroupSchema,
  durationHours: z.number().nullable(),
  symptoms: z.array(z.object({ code: z.string(), severity: severitySchema })),
  /** Rule identifiers, the same ones the app shows the user under "why this advice". */
  rationale: z.array(z.string()),
});
export type ReviewCase = z.infer<typeof reviewCaseSchema>;

export const reviewQueueResponseSchema = z.object({
  cases: z.array(reviewCaseSchema),
  /** Decisions still unreviewed by this reviewer, beyond the ones returned. */
  remaining: z.number(),
});
export type ReviewQueueResponse = z.infer<typeof reviewQueueResponseSchema>;

export const submitReviewRequestSchema = z
  .object({
    verdict: reviewVerdictSchema,
    /** Required when the verdict is an urgency error, rejected otherwise. */
    suggestedUrgency: urgencySchema.optional(),
    /**
     * The reviewer's own words about the decision. Capped because this is a note on a
     * rule, not a case history — and because the reviewer is never shown the patient's
     * words, there is nothing of theirs that could be pasted in here.
     */
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => (v.verdict === 'URGENCY_TOO_LOW' || v.verdict === 'URGENCY_TOO_HIGH' ? v.suggestedUrgency !== undefined : true), {
    message: 'suggestedUrgency is required when the verdict is an urgency error.',
    path: ['suggestedUrgency'],
  })
  .refine((v) => (v.verdict === 'URGENCY_TOO_LOW' || v.verdict === 'URGENCY_TOO_HIGH' ? true : v.suggestedUrgency === undefined), {
    message: 'suggestedUrgency only applies to an urgency error.',
    path: ['suggestedUrgency'],
  });
export type SubmitReviewRequest = z.infer<typeof submitReviewRequestSchema>;

export const reviewStatsSchema = z.object({
  total: z.number(),
  /** Reviews whose verdict was AGREE, over all reviews. Null until any exist. */
  agreementRate: z.number().nullable(),
  byVerdict: z.record(reviewVerdictSchema, z.number()),
  /** Rule identifiers most often present on a disagreed-with decision, worst first. */
  contestedRules: z.array(z.object({ ruleId: z.string(), disagreements: z.number() })),
  /** Decisions nobody has reviewed yet. */
  pending: z.number(),
});
export type ReviewStats = z.infer<typeof reviewStatsSchema>;
