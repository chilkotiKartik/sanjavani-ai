'use client';

import { cn } from '@sanjeevani/ui';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUp, X } from 'lucide-react';
import { useCallback } from 'react';
import { useApp } from '@/components/providers/app-provider';
import { closeCheckIn, joinSymptoms, recordChange, type Change, type CheckIn } from '@/lib/checkins';
import { useCheckIns } from '@/lib/use-checkins';
import { useNow } from '@/lib/use-now';

const OPTIONS: { change: Change; label: 'ciBetter' | 'ciSame' | 'ciWorse'; icon: typeof ArrowDown; tone: string }[] = [
  { change: 'better', label: 'ciBetter', icon: ArrowDown, tone: 'border-[var(--sage)] text-[var(--sage-deep)] bg-[var(--sage-soft)]' },
  { change: 'same', label: 'ciSame', icon: ArrowRight, tone: 'border-[var(--line)] text-[var(--ink)] bg-[var(--paper-raised)]' },
  { change: 'worse', label: 'ciWorse', icon: ArrowUp, tone: 'border-[var(--u-urgent)] text-[var(--u-urgent)] bg-[var(--u-urgent-soft)]' },
];

/**
 * "How is it now?" — shown on the home screen when a check-in falls due.
 *
 * ## Why one question and three answers
 *
 * The person opening this is unwell and may be answering one-handed at 3am. Anything
 * that needs reading, scrolling or typing will simply not be answered, and an
 * unanswered follow-up is worse than none because it looks like care that was not
 * taken. So: the symptom in their own words, three large targets, done.
 *
 * ## Why "worse" hands over rather than deciding
 *
 * It starts a new conversation carrying the fact that things have deteriorated, and
 * lets the triage rules run on it. This component knows nothing clinical and must
 * not: deciding what "worse" means is exactly the judgement that belongs in the
 * engine, where it is tested.
 */
export function CheckInPrompt({ onWorse }: { onWorse: (checkIn: CheckIn) => void }) {
  const { t } = useApp();
  const all = useCheckIns();
  const now = useNow();

  const answer = useCallback(
    (checkIn: CheckIn, change: Change) => {
      recordChange(checkIn.id, change);
      if (change === 'worse') onWorse(checkIn);
    },
    [onWorse],
  );

  /*
   * Derived, not held in state. Both inputs are subscribed stores, so a check-in that
   * falls due while this screen is open appears on its own — which is the whole point
   * of a reminder.
   */
  const current = all.find((c) => c.status === 'pending' && c.dueAt <= now);
  if (!current) return null;

  const what = current.symptoms.length > 0 ? joinSymptoms(current.symptoms, t('ciAnd')) : t('ciTheProblem');

  return (
    <AnimatePresence>
      <motion.section
        key={current.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        aria-label={t('ciTitle')}
        className="sv-card relative rounded-[var(--radius-lg)] border border-[var(--line)] p-4"
      >
        <button
          type="button"
          onClick={() => closeCheckIn(current.id)}
          aria-label={t('ciDismiss')}
          className="absolute top-2 right-2 inline-flex size-9 items-center justify-center rounded-full text-[var(--ink-faint)] hover:bg-[var(--paper-sunk)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
        >
          <X className="size-4" aria-hidden />
        </button>

        <p className="pr-8 text-[0.7rem] font-bold tracking-[0.12em] text-[var(--ink-faint)] uppercase">{t('ciTitle')}</p>
        <h2 className="mt-1 font-display text-[1.25rem] leading-snug text-[var(--ink)]">{t('ciQuestion', { what })}</h2>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {OPTIONS.map(({ change, label, icon: Icon, tone }) => (
            <button
              key={change}
              type="button"
              onClick={() => answer(current, change)}
              className={cn(
                'sv-press flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border text-[0.9rem] font-semibold',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]',
                tone,
              )}
            >
              <Icon className="size-4.5" aria-hidden />
              {t(label)}
            </button>
          ))}
        </div>

        <p className="mt-2.5 text-[0.78rem] leading-relaxed text-[var(--ink-faint)]">{t('ciPrivacy')}</p>
      </motion.section>
    </AnimatePresence>
  );
}
