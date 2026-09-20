-- Clinician review of triage decisions.
--
-- Adds the REVIEWER role, the verdict vocabulary, and a review table that deliberately
-- outlives the conversation it judged: `triageResultId` is nullable and set to NULL on
-- delete, while the snapshot columns keep the structured facts the reviewer actually
-- saw. See the comment on `ClinicalReview` in schema.prisma for why.

-- AlterEnum
-- Postgres cannot reorder enum values, and REVIEWER sits between USER and ADMIN
-- conceptually but not in storage order. Nothing depends on the ordinal, so it is
-- appended.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'REVIEWER';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ReviewVerdict" AS ENUM ('AGREE', 'URGENCY_TOO_LOW', 'URGENCY_TOO_HIGH', 'WRONG_SPECIALTY', 'INSUFFICIENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "clinical_reviews" (
    "id" TEXT NOT NULL,
    "triageResultId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "verdict" "ReviewVerdict" NOT NULL,
    "suggestedUrgency" TEXT,
    "note" TEXT,
    "snapshotUrgency" TEXT NOT NULL,
    "snapshotEmergency" BOOLEAN NOT NULL,
    "snapshotEmergencyCategory" TEXT,
    "snapshotSpecialty" TEXT NOT NULL,
    "snapshotConfidence" TEXT NOT NULL,
    "snapshotSource" TEXT NOT NULL,
    "snapshotSymptomCodes" TEXT[],
    "snapshotSeverities" TEXT[],
    "snapshotRationale" TEXT[],
    "snapshotAgeGroup" TEXT NOT NULL,
    "snapshotDurationHours" DOUBLE PRECISION,
    "snapshotLanguage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinical_reviews_triageResultId_reviewerId_key" ON "clinical_reviews"("triageResultId", "reviewerId");

-- CreateIndex
CREATE INDEX "clinical_reviews_createdAt_idx" ON "clinical_reviews"("createdAt");

-- CreateIndex
CREATE INDEX "clinical_reviews_verdict_createdAt_idx" ON "clinical_reviews"("verdict", "createdAt");

-- AlterTable
-- The review queue reads only this table, never `conversations` (where the encrypted
-- transcript lives), so the facts a reviewer is shown are stored beside the decision.
ALTER TABLE "triage_results" ADD COLUMN "severities" TEXT[];
ALTER TABLE "triage_results" ADD COLUMN "ageGroup" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "triage_results" ADD COLUMN "durationHours" DOUBLE PRECISION;
ALTER TABLE "triage_results" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';

-- CreateIndex
-- The queue scans triage decisions newest-first looking for unreviewed ones.
CREATE INDEX "triage_results_createdAt_idx" ON "triage_results"("createdAt");

-- AddForeignKey
ALTER TABLE "clinical_reviews" ADD CONSTRAINT "clinical_reviews_triageResultId_fkey" FOREIGN KEY ("triageResultId") REFERENCES "triage_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_reviews" ADD CONSTRAINT "clinical_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
