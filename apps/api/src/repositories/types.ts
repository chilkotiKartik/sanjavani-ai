import type { CuratedFacilityRecord, FacilityCacheStore } from '@sanjeevani/maps';
import type { ReviewVerdict } from '@sanjeevani/types';

export type Role = 'USER' | 'REVIEWER' | 'ADMIN';

/**
 * Role ordering, used by `requireRole` so a check reads as a floor rather than an
 * equality test. An administrator can do a reviewer's work; the reverse is not true,
 * and nothing here lets a reviewer near the operator surface.
 */
export const ROLE_RANK: Record<Role, number> = { USER: 0, REVIEWER: 1, ADMIN: 2 };
export type EmergencyActionKind = 'DETECTED' | 'CALL_INITIATED' | 'LOCATION_SHARED' | 'DIRECTIONS_OPENED' | 'DISMISSED';

export interface UserRecord {
  id: string;
  anonymous: boolean;
  role: Role;
  languagePreference: string;
  createdAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface ConversationRecord {
  id: string;
  userId: string;
  language: string;
  phase: string;
  urgency: string | null;
  emergency: boolean;
  stateCiphertext: string | null;
  turnCount: number;
  areaGeohash: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT';
  contentCiphertext: string;
  inputMode: string | null;
  language: string;
  intent: string | null;
  createdAt: Date;
}

export interface SymptomEventRecord {
  code: string;
  severity: string;
  reportedDurationHours: number | null;
  createdAt: Date;
}

export interface TriageRecord {
  conversationId: string;
  urgency: string;
  emergency: boolean;
  emergencyCategory: string | null;
  specialty: string;
  facilityType: string;
  confidence: string;
  source: string;
  symptomCodes: string[];
  rationale: string[];
  /** Positionally matched to symptomCodes. */
  severities: string[];
  ageGroup: string;
  durationHours: number | null;
  language: string;
}

/**
 * A triage decision as the review queue serves it.
 *
 * Carries an id and nothing that identifies the person: no conversation id, no user
 * id, no text. See `reviewCaseSchema` in `@sanjeevani/types` for why.
 */
export interface ReviewCaseRecord extends Omit<TriageRecord, 'conversationId'> {
  id: string;
  createdAt: Date;
}

export interface ReviewInput {
  triageResultId: string;
  reviewerId: string;
  verdict: ReviewVerdict;
  suggestedUrgency: string | null;
  note: string | null;
  snapshot: Omit<TriageRecord, 'conversationId'>;
}

export interface ReviewStatsRecord {
  total: number;
  byVerdict: Record<string, number>;
  contestedRules: { ruleId: string; disagreements: number }[];
  pending: number;
}

export interface TurnPersistence {
  conversationId: string;
  conversationPatch: Pick<ConversationRecord, 'language' | 'phase' | 'urgency' | 'emergency' | 'stateCiphertext' | 'turnCount' | 'areaGeohash' | 'expiresAt'>;
  userMessage: Omit<MessageRecord, 'id' | 'createdAt' | 'conversationId'>;
  assistantMessage: Omit<MessageRecord, 'id' | 'createdAt' | 'conversationId'>;
  symptoms: { code: string; severity: string; reportedDurationHours: number | null }[];
  triage: Omit<TriageRecord, 'conversationId'> | null;
  emergency: { userId: string; category: string; ruleIds: string[] } | null;
}

export interface AuditInput {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  requestId?: string | null;
  ipHash?: string | null;
  metadata?: Record<string, string | number | boolean | null | string[]>;
}

export interface Store {
  readonly kind: 'postgres' | 'memory';
  health(): Promise<boolean>;
  close(): Promise<void>;

  users: {
    create(input: { anonymous: boolean; role?: Role; languagePreference?: string }): Promise<UserRecord>;
    findById(id: string): Promise<UserRecord | null>;
    touch(id: string): Promise<void>;
    delete(id: string): Promise<void>;
  };
  sessions: {
    create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<SessionRecord>;
    findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
    revoke(id: string): Promise<void>;
  };
  conversations: {
    create(input: { userId: string; language: string; expiresAt: Date }): Promise<ConversationRecord>;
    findForUser(id: string, userId: string): Promise<ConversationRecord | null>;
    listForUser(userId: string, limit: number): Promise<(ConversationRecord & { symptomCodes: string[] })[]>;
    persistTurn(input: TurnPersistence): Promise<{ assistantMessageId: string }>;
    delete(id: string, userId: string): Promise<boolean>;
    deleteAllForUser(userId: string): Promise<number>;
    purgeExpired(now: Date): Promise<number>;
    updateState(id: string, stateCiphertext: string, phase: string): Promise<void>;
  };
  messages: {
    listRecent(conversationId: string, limit: number): Promise<MessageRecord[]>;
  };
  symptoms: {
    list(conversationId: string): Promise<SymptomEventRecord[]>;
  };
  triage: {
    latest(conversationId: string): Promise<(TriageRecord & { createdAt: Date }) | null>;
  };
  reviews: {
    /** Unreviewed decisions for this reviewer, most useful first. */
    queue(reviewerId: string, limit: number): Promise<{ cases: ReviewCaseRecord[]; remaining: number }>;
    /** The decision itself, so a submission can be checked and snapshotted server-side. */
    caseById(triageResultId: string): Promise<ReviewCaseRecord | null>;
    add(input: ReviewInput): Promise<{ created: boolean }>;
    stats(): Promise<ReviewStatsRecord>;
  };
  emergencies: {
    add(input: { userId: string | null; conversationId: string | null; category: string | null; ruleIds: string[]; action: EmergencyActionKind }): Promise<void>;
    countByCategory(since: Date): Promise<Record<string, number>>;
  };
  feedback: {
    add(input: { userId: string | null; conversationId: string | null; helpful: boolean; category: string; comment: string | null }): Promise<void>;
    stats(since: Date): Promise<{ total: number; helpful: number }>;
  };
  audit: {
    add(input: AuditInput): Promise<void>;
  };
  facilities: {
    listCurated(regionId: string): Promise<CuratedFacilityRecord[]>;
  };
  facilityCache: FacilityCacheStore;
}
