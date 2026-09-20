import { randomBytes } from 'node:crypto';
import { GURUGRAM_FACILITIES, InMemoryFacilityCache } from '@sanjeevani/maps';
import { DISAGREEMENT_VERDICTS } from '@sanjeevani/types';
import type {
  ConversationRecord,
  MessageRecord,
  ReviewCaseRecord,
  ReviewInput,
  SessionRecord,
  Store,
  SymptomEventRecord,
  TriageRecord,
  UserRecord,
} from './types';

/**
 * Queue order: consequence first.
 *
 * A reviewer's time is the scarcest input to this whole exercise, so the queue puts
 * the decisions in front of them where being wrong costs the most — emergencies, then
 * anything the engine itself was unsure of, then the newest.
 *
 * That makes the queue a deliberately biased sample, and the agreement rate computed
 * over it is therefore *not* an estimate of how often the rules are right in general.
 * It is a floor, measured on the hardest cases. The API says so, the console says so,
 * and SAFETY.md says so — measuring the easy cases instead would produce a better
 * number and a worse programme.
 */
const CONFIDENCE_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2 };

function queuePriority(a: ReviewCaseRecord, b: ReviewCaseRecord): number {
  if (a.emergency !== b.emergency) return a.emergency ? -1 : 1;
  const byConfidence = (CONFIDENCE_ORDER[a.confidence] ?? 3) - (CONFIDENCE_ORDER[b.confidence] ?? 3);
  if (byConfidence !== 0) return byConfidence;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

/** cuid-shaped ids so route validation behaves the same as with Postgres. */
function id(): string {
  return `c${Date.now().toString(36)}${randomBytes(12).toString('hex')}`.slice(0, 25);
}

/**
 * In-process store for demo mode and tests. Same contract as the Postgres store;
 * data disappears on restart, which is exactly what an anonymous demo wants.
 */
export function createMemoryStore(): Store {
  const users = new Map<string, UserRecord>();
  const sessions = new Map<string, SessionRecord>();
  const conversations = new Map<string, ConversationRecord>();
  const messages = new Map<string, MessageRecord[]>();
  const symptoms = new Map<string, Map<string, SymptomEventRecord>>();
  const triage = new Map<string, (TriageRecord & { id: string; createdAt: Date })[]>();
  /** Every decision ever made, so the queue can scan without walking conversations. */
  const triageById = new Map<string, ReviewCaseRecord>();
  /**
   * Reviews outlive the decisions they judge, exactly as in Postgres: `dropConversation`
   * clears the triage row and nulls the link, and the snapshot on the review remains.
   */
  const reviews: (Omit<ReviewInput, 'triageResultId'> & { id: string; createdAt: Date; triageResultId: string | null })[] = [];
  const emergencies: { category: string | null; action: string; createdAt: Date; userId: string | null; conversationId: string | null }[] = [];
  const feedback: { helpful: boolean; createdAt: Date; userId: string | null; conversationId: string | null }[] = [];

  const dropConversation = (cid: string) => {
    conversations.delete(cid);
    messages.delete(cid);
    symptoms.delete(cid);
    for (const t of triage.get(cid) ?? []) {
      triageById.delete(t.id);
      for (const r of reviews) if (r.triageResultId === t.id) r.triageResultId = null;
    }
    triage.delete(cid);
    for (const e of emergencies) if (e.conversationId === cid) e.conversationId = null;
    for (const f of feedback) if (f.conversationId === cid) f.conversationId = null;
  };

  return {
    kind: 'memory',
    health: async () => true,
    close: async () => undefined,

    users: {
      async create(input) {
        const user: UserRecord = {
          id: id(),
          anonymous: input.anonymous,
          role: input.role ?? 'USER',
          languagePreference: input.languagePreference ?? 'auto',
          createdAt: new Date(),
        };
        users.set(user.id, user);
        return user;
      },
      findById: async (uid) => users.get(uid) ?? null,
      touch: async () => undefined,
      async delete(uid) {
        users.delete(uid);
        for (const [sid, s] of sessions) if (s.userId === uid) sessions.delete(sid);
        for (const [cid, c] of conversations) if (c.userId === uid) dropConversation(cid);
      },
    },

    sessions: {
      async create(input) {
        const session: SessionRecord = { id: id(), revokedAt: null, ...input };
        sessions.set(session.id, session);
        return session;
      },
      findByTokenHash: async (hash) => [...sessions.values()].find((s) => s.tokenHash === hash) ?? null,
      async revoke(sid) {
        const s = sessions.get(sid);
        if (s) s.revokedAt = new Date();
      },
    },

    conversations: {
      async create(input) {
        const now = new Date();
        const c: ConversationRecord = {
          id: id(),
          userId: input.userId,
          language: input.language,
          phase: 'greeting',
          urgency: null,
          emergency: false,
          stateCiphertext: null,
          turnCount: 0,
          areaGeohash: null,
          createdAt: now,
          updatedAt: now,
          expiresAt: input.expiresAt,
        };
        conversations.set(c.id, c);
        return c;
      },
      async findForUser(cid, uid) {
        const c = conversations.get(cid);
        return c && c.userId === uid ? { ...c } : null;
      },
      async listForUser(uid, limit) {
        return [...conversations.values()]
          .filter((c) => c.userId === uid && c.turnCount > 0)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, limit)
          .map((c) => ({ ...c, symptomCodes: [...(symptoms.get(c.id)?.keys() ?? [])] }));
      },
      async persistTurn(input) {
        const c = conversations.get(input.conversationId);
        if (!c) throw new Error('Conversation not found');
        Object.assign(c, input.conversationPatch, { updatedAt: new Date() });
        const list = messages.get(c.id) ?? [];
        const now = Date.now();
        list.push({ ...input.userMessage, id: id(), conversationId: c.id, createdAt: new Date(now) });
        const assistant: MessageRecord = { ...input.assistantMessage, id: id(), conversationId: c.id, createdAt: new Date(now + 1) };
        list.push(assistant);
        messages.set(c.id, list);
        const sym = symptoms.get(c.id) ?? new Map<string, SymptomEventRecord>();
        for (const s of input.symptoms) {
          const prev = sym.get(s.code);
          sym.set(s.code, { ...s, createdAt: prev?.createdAt ?? new Date() });
        }
        symptoms.set(c.id, sym);
        if (input.triage) {
          const row = { ...input.triage, id: id(), conversationId: c.id, createdAt: new Date() };
          const t = triage.get(c.id) ?? [];
          t.push(row);
          triage.set(c.id, t);
          const { conversationId: _omitted, ...forReview } = row;
          triageById.set(row.id, forReview);
        }
        if (input.emergency) {
          emergencies.push({ category: input.emergency.category, action: 'DETECTED', createdAt: new Date(), userId: c.userId, conversationId: c.id });
        }
        return { assistantMessageId: assistant.id };
      },
      async delete(cid, uid) {
        const c = conversations.get(cid);
        if (!c || c.userId !== uid) return false;
        dropConversation(cid);
        return true;
      },
      async deleteAllForUser(uid) {
        let n = 0;
        for (const [cid, c] of conversations) {
          if (c.userId === uid) {
            dropConversation(cid);
            n++;
          }
        }
        return n;
      },
      async purgeExpired(now) {
        let n = 0;
        for (const [cid, c] of conversations) {
          if (c.expiresAt < now) {
            dropConversation(cid);
            n++;
          }
        }
        return n;
      },
      async updateState(cid, stateCiphertext, phase) {
        const c = conversations.get(cid);
        if (c) Object.assign(c, { stateCiphertext, phase, updatedAt: new Date() });
      },
    },

    messages: {
      listRecent: async (cid, limit) => (messages.get(cid) ?? []).slice(-limit),
    },
    symptoms: {
      list: async (cid) => [...(symptoms.get(cid)?.values() ?? [])],
    },
    triage: {
      latest: async (cid) => triage.get(cid)?.at(-1) ?? null,
    },
    reviews: {
      async queue(reviewerId, limit) {
        const seen = new Set(reviews.filter((r) => r.reviewerId === reviewerId).map((r) => r.triageResultId));
        const open = [...triageById.values()].filter((c) => !seen.has(c.id)).sort(queuePriority);
        return { cases: open.slice(0, limit), remaining: Math.max(0, open.length - limit) };
      },
      async caseById(triageResultId) {
        return triageById.get(triageResultId) ?? null;
      },
      async add(input) {
        // Mirrors the unique constraint: one review per reviewer per decision.
        if (reviews.some((r) => r.triageResultId === input.triageResultId && r.reviewerId === input.reviewerId)) {
          return { created: false };
        }
        reviews.push({ ...input, id: id(), createdAt: new Date() });
        return { created: true };
      },
      async stats() {
        const byVerdict: Record<string, number> = {};
        const contested = new Map<string, number>();
        for (const r of reviews) {
          byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;
          if ((DISAGREEMENT_VERDICTS as readonly string[]).includes(r.verdict)) {
            for (const ruleId of new Set(r.snapshot.rationale)) contested.set(ruleId, (contested.get(ruleId) ?? 0) + 1);
          }
        }
        const reviewed = new Set(reviews.map((r) => r.triageResultId));
        return {
          total: reviews.length,
          byVerdict,
          contestedRules: [...contested.entries()]
            .map(([ruleId, disagreements]) => ({ ruleId, disagreements }))
            .sort((a, b) => b.disagreements - a.disagreements || a.ruleId.localeCompare(b.ruleId))
            .slice(0, 10),
          pending: [...triageById.keys()].filter((tid) => !reviewed.has(tid)).length,
        };
      },
    },
    emergencies: {
      async add(input) {
        emergencies.push({ ...input, createdAt: new Date() });
      },
      async countByCategory(since) {
        const out: Record<string, number> = {};
        for (const e of emergencies) {
          if (e.createdAt >= since && e.action === 'DETECTED') out[e.category ?? 'unknown'] = (out[e.category ?? 'unknown'] ?? 0) + 1;
        }
        return out;
      },
    },
    feedback: {
      async add(input) {
        feedback.push({ helpful: input.helpful, createdAt: new Date(), userId: input.userId, conversationId: input.conversationId });
      },
      async stats(since) {
        const rows = feedback.filter((f) => f.createdAt >= since);
        return { total: rows.length, helpful: rows.filter((f) => f.helpful).length };
      },
    },
    audit: {
      add: async () => undefined,
    },
    facilities: {
      listCurated: async (regionId) => GURUGRAM_FACILITIES.filter((f) => f.regionId === regionId),
    },
    facilityCache: new InMemoryFacilityCache(),
  };
}
