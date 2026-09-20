import {
  DISAGREEMENT_VERDICTS,
  reviewCaseSchema,
  submitReviewRequestSchema,
  type ReviewCase,
  type ReviewStats,
  type ReviewVerdict,
} from '@sanjeevani/types';
import { Router } from 'express';
import { z } from 'zod';
import type { Container } from '../container';
import { AppError } from '../lib/errors';
import { parseBody, parseId, parseQuery, sanitizeText } from '../lib/validate';
import { requireRole } from '../middleware/auth';
import type { ReviewCaseRecord } from '../repositories/types';

/**
 * Clinician review of triage decisions.
 *
 * ## What this is for
 *
 * `docs/SAFETY.md` says plainly that no clinician has reviewed the rules in
 * `triage/profiles.ts` and `emergency/rules.ts`, and that any real deployment needs
 * that review. This is the surface through which it happens: a clinician works a queue
 * of decisions the system actually made and says, one at a time, whether each was
 * reasonable. The result is a second axis of safety measurement — the vignette suite
 * says the rules behave as written, and this says whether what was written is right.
 *
 * ## What a reviewer can see, and why it is so little
 *
 * A case carries the structured clinical facts the rules acted on and nothing else:
 * no message text, no conversation id, no user id, no location, no timestamps finer
 * than the decision itself. The ciphertext is never decrypted for this path, and the
 * store's queue never reads the conversations table at all.
 *
 * That is a privacy decision, and it is also the right question to ask. "Given these
 * inputs, was this decision reasonable?" is answerable and actionable. "What was wrong
 * with this person?" is neither — nobody can diagnose from a transcript, and a product
 * that insists it is not a doctor has no business building a screen that invites a
 * clinician to try.
 *
 * ## What it is still not
 *
 * The queue is ordered by consequence, so it deliberately over-samples emergencies and
 * low-confidence decisions. The agreement rate it produces is therefore a floor
 * measured on the hardest cases, not an estimate of how often the rules are right in
 * general. The response says so, in the payload, so a number lifted from this endpoint
 * carries its own caveat.
 */
export function reviewRoutes(c: Container): Router {
  const router = Router();

  /**
   * Switched off entirely unless a reviewer key is configured, and 404 rather than 403
   * when it is — a deployment that has not set this up should not advertise that a
   * clinical review console exists behind the door.
   */
  const requireEnabled = (): void => {
    const key = c.config.REVIEWER_ACCESS_KEY;
    if (!key || key.length < 24) throw AppError.notFound('This endpoint does not exist.');
  };

  /** Maps a stored decision to the wire shape, and validates that it leaked nothing. */
  function toCase(record: ReviewCaseRecord): ReviewCase {
    const symptoms = record.symptomCodes.map((code, i) => ({
      code,
      // Older rows predate the severities column; `unknown` is the honest reading.
      severity: record.severities[i] ?? 'unknown',
    }));
    /*
     * Parsed on the way out, not just typed. The schema is a closed allow-list of
     * fields, so a column added to the store in future cannot reach a reviewer without
     * someone also adding it here — which is exactly the review this deserves.
     */
    return reviewCaseSchema.parse({
      id: record.id,
      decidedAt: record.createdAt.toISOString(),
      language: record.language,
      urgency: record.urgency,
      emergency: record.emergency,
      emergencyCategory: record.emergencyCategory,
      specialty: record.specialty,
      confidence: record.confidence,
      source: record.source,
      ageGroup: record.ageGroup,
      durationHours: record.durationHours,
      symptoms,
      rationale: record.rationale,
    });
  }

  router.get('/v1/review/queue', requireRole('REVIEWER'), async (req, res) => {
    requireEnabled();
    const { limit } = parseQuery(z.object({ limit: z.coerce.number().int().min(1).max(25).default(10) }), req.query);
    const { cases, remaining } = await c.store.reviews.queue(req.auth!.userId, limit);
    res.json({ cases: cases.map(toCase), remaining });
  });

  router.post('/v1/review/:id', requireRole('REVIEWER'), async (req, res) => {
    requireEnabled();
    const triageResultId = parseId(req.params.id);
    const raw = parseBody(submitReviewRequestSchema, req.body);
    // The note is a reviewer's own words, but it still goes through the same scrubbing
    // as any other free text before it is stored.
    const note = raw.note ? sanitizeText(raw.note) : null;

    /*
     * The snapshot is taken here, server-side, from the decision as stored — never
     * from anything the client sent. A review is evidence, and evidence a caller can
     * write for itself is not evidence.
     */
    const decision = await c.store.reviews.caseById(triageResultId);
    if (!decision) throw AppError.notFound('That decision is no longer available to review.');

    const { id: _id, createdAt: _createdAt, ...snapshot } = decision;
    const { created } = await c.store.reviews.add({
      triageResultId,
      reviewerId: req.auth!.userId,
      verdict: raw.verdict,
      suggestedUrgency: raw.suggestedUrgency ?? null,
      note: note && note.length > 0 ? note : null,
      snapshot,
    });

    // 409 rather than a silent overwrite: a second opinion from the same reviewer is
    // not a correction, and quietly replacing the first would lose a judgement.
    if (!created) throw AppError.conflict('You have already reviewed this decision.');

    /*
     * Audited with the verdict but never the note. The verdict is a category and is
     * what an operator needs to see; the note is a clinician's free text and belongs
     * in one place only.
     */
    await c.store.audit.add({
      userId: req.auth!.userId,
      action: 'review.submitted',
      resourceType: 'triage_result',
      resourceId: triageResultId,
      requestId: req.requestId,
      metadata: { verdict: raw.verdict },
    });

    res.status(201).json({ recorded: true });
  });

  router.get('/v1/review/stats', requireRole('REVIEWER'), async (_req, res) => {
    requireEnabled();
    const stats = await c.store.reviews.stats();
    const agreed = stats.byVerdict.AGREE ?? 0;
    const payload: ReviewStats = {
      total: stats.total,
      agreementRate: stats.total === 0 ? null : agreed / stats.total,
      byVerdict: stats.byVerdict as Record<ReviewVerdict, number>,
      contestedRules: stats.contestedRules,
      pending: stats.pending,
    };
    res.json({
      ...payload,
      /*
       * Travels with the number, deliberately. An agreement rate is the kind of figure
       * that ends up on a slide detached from how it was gathered, and this one was
       * gathered from a queue that puts emergencies first.
       */
      samplingNote:
        'Measured over a queue ordered by consequence, which over-samples emergencies and low-confidence decisions. Treat it as a floor on the hardest cases, not as a population estimate.',
      disagreementVerdicts: DISAGREEMENT_VERDICTS,
    });
  });

  return router;
}
