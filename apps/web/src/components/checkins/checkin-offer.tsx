'use client';

import type { TriageResult } from '@sanjeevani/types';
import { Button } from '@sanjeevani/ui';
import { BellRing, Check } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/components/providers/app-provider';
import { checkInInterval, createCheckIn } from '@/lib/checkins';
import { symptomLabel } from '@/lib/present';
import { useCheckIns } from '@/lib/use-checkins';

/**
 * Offers to come back and ask how things are.
 *
 * ## Why it is offered rather than assumed
 *
 * The advice already says "see a doctor if it has not improved in two days". This is
 * the app taking on the remembering, which is the part people are worst at when they
 * are unwell — and the people least likely to remember to escalate are the ones for
 * whom escalating matters most.
 *
 * But it is opt-in, because a reminder about an illness is not a neutral thing to
 * schedule on somebody's behalf, and because the whole record lives on their device.
 *
 * ## Never after an emergency
 *
 * `checkInInterval` returns null for an emergency, so nothing renders. Offering to
 * follow up in six hours to someone who has just been told to call 112 would read as
 * though waiting were one of the options.
 */
export function CheckInOffer({ triage, conversationId }: { triage: TriageResult; conversationId: string | null }) {
  const { t, uiLanguage } = useApp();
  const [done, setDone] = useState(false);
  const all = useCheckIns();

  const hours = checkInInterval(triage.urgency);
  if (hours === null) return null;

  /*
   * The confirmation is checked before the "already set" guard, and the order matters:
   * creating the check-in updates the store, which immediately makes `alreadySet`
   * true. Guarding first would unmount this the instant it was used, so the person
   * would press the button and watch it vanish with no acknowledgement — leaving them
   * unsure whether anything had happened.
   */
  if (done) {
    return (
      <p className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--sage-soft)] px-4 py-3 font-semibold text-[var(--sage-deep)]">
        <Check className="size-5 shrink-0" aria-hidden />
        {t('ciCreated', { hours })}
      </p>
    );
  }

  // Nothing to offer if this conversation already has one waiting.
  if (conversationId && all.some((c) => c.status === 'pending' && c.conversationId === conversationId)) return null;

  return (
    <div className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-4">
      <h2 className="flex items-center gap-2 font-bold text-[var(--ink)]">
        <BellRing className="size-5 shrink-0 text-[var(--sage)]" aria-hidden />
        {t('ciOffer')}
      </h2>
      <p className="mt-1.5 text-[0.92rem] leading-relaxed text-[var(--ink-soft)]">{t('ciOfferBody', { hours })}</p>
      <Button
        className="mt-3"
        onClick={() => {
          createCheckIn({
            urgency: triage.urgency,
            // Labels as the person saw them, already localised — nothing coded is stored.
            symptoms: triage.symptoms.map((s) => symptomLabel(s.code, uiLanguage)),
            conversationId,
          });
          setDone(true);
        }}
      >
        {t('ciOfferAction', { hours })}
      </Button>
    </div>
  );
}
