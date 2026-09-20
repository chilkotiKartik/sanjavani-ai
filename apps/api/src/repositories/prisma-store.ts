import type { CuratedFacilityRecord } from '@sanjeevani/maps';
import { createPrismaClient, type PrismaClient } from '@sanjeevani/db';
import type { Facility } from '@sanjeevani/types';
import { DISAGREEMENT_VERDICTS } from '@sanjeevani/types';
import type { ConversationRecord, ReviewCaseRecord, Store } from './types';


/**
 * Exactly the columns a reviewer may see. Listing them rather than taking the row
 * whole is the safety property: a future column on `triage_results` cannot start
 * appearing in the review console because someone added it to the schema.
 */
const REVIEW_CASE_SELECT = {
  id: true,
  createdAt: true,
  urgency: true,
  emergency: true,
  emergencyCategory: true,
  specialty: true,
  facilityType: true,
  confidence: true,
  source: true,
  symptomCodes: true,
  severities: true,
  rationale: true,
  ageGroup: true,
  durationHours: true,
  language: true,
} as const;

const CONFIDENCE_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2 };

function byConfidenceWithinPriority(a: ReviewCaseRecord, b: ReviewCaseRecord): number {
  if (a.emergency !== b.emergency) return a.emergency ? -1 : 1;
  const byConfidence = (CONFIDENCE_ORDER[a.confidence] ?? 3) - (CONFIDENCE_ORDER[b.confidence] ?? 3);
  return byConfidence !== 0 ? byConfidence : b.createdAt.getTime() - a.createdAt.getTime();
}

/** Prisma's unique-constraint error, without importing its error classes. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

export function createPrismaStore(connectionString: string, maxConnections?: number): Store & { client: PrismaClient } {
  const db = createPrismaClient({ connectionString, ...(maxConnections ? { maxConnections } : {}) });

  const store: Store & { client: PrismaClient } = {
    kind: 'postgres',
    client: db,

    async health() {
      try {
        await db.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },

    async close() {
      await db.$disconnect();
    },

    users: {
      async create(input) {
        return db.user.create({
          data: { anonymous: input.anonymous, role: input.role ?? 'USER', languagePreference: input.languagePreference ?? 'auto' },
        });
      },
      findById: (id) => db.user.findUnique({ where: { id } }),
      async touch(id) {
        await db.user.update({ where: { id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
      },
      async delete(id) {
        await db.user.delete({ where: { id } }).catch(() => undefined);
      },
    },

    sessions: {
      create: (input) => db.session.create({ data: input }),
      findByTokenHash: (tokenHash) => db.session.findUnique({ where: { tokenHash } }),
      async revoke(id) {
        await db.session.update({ where: { id }, data: { revokedAt: new Date() } }).catch(() => undefined);
      },
    },

    conversations: {
      create: (input) => db.conversation.create({ data: input }),
      findForUser: (id, userId) => db.conversation.findFirst({ where: { id, userId } }),
      async listForUser(userId, limit) {
        const rows = await db.conversation.findMany({
          where: { userId, turnCount: { gt: 0 } },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          include: { symptomEvents: { select: { code: true }, orderBy: { createdAt: 'asc' } } },
        });
        return rows.map(({ symptomEvents, ...c }) => ({ ...(c as ConversationRecord), symptomCodes: symptomEvents.map((s) => s.code) }));
      },
      async persistTurn(input) {
        return db.$transaction(async (tx) => {
          const conversation = await tx.conversation.update({
            where: { id: input.conversationId },
            data: input.conversationPatch,
            select: { userId: true },
          });
          await tx.conversationMessage.create({ data: { ...input.userMessage, conversationId: input.conversationId } });
          const assistant = await tx.conversationMessage.create({
            data: { ...input.assistantMessage, conversationId: input.conversationId },
            select: { id: true },
          });
          for (const s of input.symptoms) {
            await tx.symptomEvent.upsert({
              where: { conversationId_code: { conversationId: input.conversationId, code: s.code } },
              create: { conversationId: input.conversationId, ...s },
              update: { severity: s.severity, reportedDurationHours: s.reportedDurationHours },
            });
          }
          if (input.triage) await tx.triageResult.create({ data: { ...input.triage, conversationId: input.conversationId } });
          if (input.emergency) {
            await tx.emergencyEvent.create({
              data: {
                userId: conversation.userId,
                conversationId: input.conversationId,
                category: input.emergency.category,
                ruleIds: input.emergency.ruleIds,
                action: 'DETECTED',
              },
            });
          }
          return { assistantMessageId: assistant.id };
        });
      },
      async delete(id, userId) {
        const result = await db.conversation.deleteMany({ where: { id, userId } });
        return result.count > 0;
      },
      async deleteAllForUser(userId) {
        const result = await db.conversation.deleteMany({ where: { userId } });
        return result.count;
      },
      async purgeExpired(now) {
        const result = await db.conversation.deleteMany({ where: { expiresAt: { lt: now } } });
        await db.facilityCache.deleteMany({ where: { expiresAt: { lt: now } } });
        return result.count;
      },
      async updateState(id, stateCiphertext, phase) {
        await db.conversation.update({ where: { id }, data: { stateCiphertext, phase } });
      },
    },

    messages: {
      async listRecent(conversationId, limit) {
        const rows = await db.conversationMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        return rows.reverse();
      },
    },

    symptoms: {
      list: (conversationId) =>
        db.symptomEvent.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          select: { code: true, severity: true, reportedDurationHours: true, createdAt: true },
        }),
    },

    triage: {
      latest: (conversationId) => db.triageResult.findFirst({ where: { conversationId }, orderBy: { createdAt: 'desc' } }),
    },

    reviews: {
      /*
       * Queue order is consequence first — emergencies, then decisions the engine was
       * itself unsure of, then the newest. `select` is exhaustive on purpose: adding a
       * column to `triage_results` must not silently start leaking it to reviewers, and
       * `conversationId` is excluded so a case cannot be traced back to a transcript.
       *
       * The bias this ordering introduces is real and deliberate; see the note on
       * `queuePriority` in the memory store, which implements the same order.
       */
      async queue(reviewerId, limit) {
        const where = { reviews: { none: { reviewerId } } };
        const [rows, total] = await Promise.all([
          db.triageResult.findMany({
            where,
            orderBy: [{ emergency: 'desc' }, { createdAt: 'desc' }],
            take: limit * 4,
            select: REVIEW_CASE_SELECT,
          }),
          db.triageResult.count({ where }),
        ]);
        // Confidence is a string column, so its ordering is applied here rather than
        // in SQL; the over-fetch above gives this something representative to sort.
        const cases = rows.sort(byConfidenceWithinPriority).slice(0, limit);
        return { cases, remaining: Math.max(0, total - cases.length) };
      },

      caseById: (id) => db.triageResult.findUnique({ where: { id }, select: REVIEW_CASE_SELECT }),

      async add(input) {
        const { snapshot, ...rest } = input;
        try {
          await db.clinicalReview.create({
            data: {
              triageResultId: rest.triageResultId,
              reviewerId: rest.reviewerId,
              verdict: rest.verdict,
              suggestedUrgency: rest.suggestedUrgency,
              note: rest.note,
              snapshotUrgency: snapshot.urgency,
              snapshotEmergency: snapshot.emergency,
              snapshotEmergencyCategory: snapshot.emergencyCategory,
              snapshotSpecialty: snapshot.specialty,
              snapshotConfidence: snapshot.confidence,
              snapshotSource: snapshot.source,
              snapshotSymptomCodes: snapshot.symptomCodes,
              snapshotSeverities: snapshot.severities,
              snapshotRationale: snapshot.rationale,
              snapshotAgeGroup: snapshot.ageGroup,
              snapshotDurationHours: snapshot.durationHours,
              snapshotLanguage: snapshot.language,
            },
          });
          return { created: true };
        } catch (error) {
          // The unique index is the authority on "already reviewed", not a prior read —
          // two tabs submitting at once must not produce two rows.
          if (isUniqueViolation(error)) return { created: false };
          throw error;
        }
      },

      async stats() {
        const [grouped, disagreed, decisions, reviewedDecisions] = await Promise.all([
          db.clinicalReview.groupBy({ by: ['verdict'], _count: { _all: true } }),
          db.clinicalReview.findMany({ where: { verdict: { in: [...DISAGREEMENT_VERDICTS] } }, select: { snapshotRationale: true } }),
          db.triageResult.count(),
          db.triageResult.count({ where: { reviews: { some: {} } } }),
        ]);
        const contested = new Map<string, number>();
        for (const row of disagreed) {
          for (const ruleId of new Set(row.snapshotRationale)) contested.set(ruleId, (contested.get(ruleId) ?? 0) + 1);
        }
        return {
          total: grouped.reduce((sum, g) => sum + g._count._all, 0),
          byVerdict: Object.fromEntries(grouped.map((g) => [g.verdict, g._count._all])),
          contestedRules: [...contested.entries()]
            .map(([ruleId, disagreements]) => ({ ruleId, disagreements }))
            .sort((a, b) => b.disagreements - a.disagreements || a.ruleId.localeCompare(b.ruleId))
            .slice(0, 10),
          pending: decisions - reviewedDecisions,
        };
      },
    },

    emergencies: {
      async add(input) {
        await db.emergencyEvent.create({ data: input });
      },
      async countByCategory(since) {
        const rows = await db.emergencyEvent.groupBy({
          by: ['category'],
          where: { createdAt: { gte: since }, action: 'DETECTED' },
          _count: { _all: true },
        });
        return Object.fromEntries(rows.map((r) => [r.category ?? 'unknown', r._count._all]));
      },
    },

    feedback: {
      async add(input) {
        await db.feedback.create({ data: input });
      },
      async stats(since) {
        const [total, helpful] = await Promise.all([
          db.feedback.count({ where: { createdAt: { gte: since } } }),
          db.feedback.count({ where: { createdAt: { gte: since }, helpful: true } }),
        ]);
        return { total, helpful };
      },
    },

    audit: {
      async add(input) {
        await db.auditEvent.create({
          data: {
            userId: input.userId ?? null,
            action: input.action,
            resourceType: input.resourceType,
            resourceId: input.resourceId ?? null,
            requestId: input.requestId ?? null,
            ipHash: input.ipHash ?? null,
            metadata: input.metadata ?? {},
          },
        });
      },
    },

    facilities: {
      async listCurated(regionId) {
        const rows = await db.facility.findMany({ where: { regionId, active: true, source: 'CURATED_DIRECTORY' } });
        return rows.map(
          (r): CuratedFacilityRecord => ({
            slug: r.externalId,
            regionId: r.regionId,
            name: r.name,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            coordinatesApprox: r.coordinatesApprox,
            phone: r.phone,
            emergencyPhone: r.emergencyPhone,
            types: r.types as CuratedFacilityRecord['types'],
            verifiedSpecialties: r.verifiedSpecialties as CuratedFacilityRecord['verifiedSpecialties'],
            emergency24x7: r.emergency24x7,
            ownership: (r.ownership as CuratedFacilityRecord['ownership']) ?? null,
            website: r.website,
            sourceUrl: r.sourceUrl ?? '',
            sourceLabel: r.sourceUrl ? new URL(r.sourceUrl).hostname.replace(/^www\./, '') : 'Curated',
            verifiedOn: r.verifiedOn ?? '',
          }),
        );
      },
    },

    facilityCache: {
      async get(key) {
        const row = await db.facilityCache.findUnique({ where: { cacheKey: key } });
        if (!row || row.expiresAt < new Date()) return null;
        return row.payload as unknown as Facility[];
      },
      async set(key, value, ttlSeconds) {
        if (ttlSeconds <= 0) return;
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        const placeIds = value.map((f) => f.placeId).filter((p): p is string => Boolean(p));
        const payload = JSON.parse(JSON.stringify(value));
        await db.facilityCache.upsert({
          where: { cacheKey: key },
          create: { cacheKey: key, provider: value[0]?.source.provider ?? 'unknown', placeIds, payload, expiresAt },
          update: { placeIds, payload, expiresAt },
        });
      },
    },
  };
  return store;
}
