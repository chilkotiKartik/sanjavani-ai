'use client';

import type { ReviewCase, ReviewVerdict, Urgency } from '@sanjeevani/types';
import { URGENCY_LEVELS } from '@sanjeevani/types';
import { Button, SectionLabel, cn } from '@sanjeevani/ui';
import { useState } from 'react';
import { useApp } from '@/components/providers/app-provider';
import type { MessageKey } from '@/lib/i18n';
import { URGENCY_STYLE, durationLabel, specialtyLabel, symptomLabel } from '@/lib/present';

/**
 * The five ways a review can land, in the order a reviewer reaches for them.
 *
 * "Agree" is first and visually distinct because it is the common case and the one
 * that should take a single tap. The two urgency errors sit together, because the
 * question a clinician is actually asking is "was this the right level?" and splitting
 * them across the card would make that comparison harder than it needs to be.
 */
const VERDICTS: { value: ReviewVerdict; label: MessageKey; tone: 'agree' | 'error' | 'neutral' }[] = [
  { value: 'AGREE', label: 'revAgree', tone: 'agree' },
  { value: 'URGENCY_TOO_LOW', label: 'revTooLow', tone: 'error' },
  { value: 'URGENCY_TOO_HIGH', label: 'revTooHigh', tone: 'error' },
  { value: 'WRONG_SPECIALTY', label: 'revWrongSpecialty', tone: 'error' },
  { value: 'INSUFFICIENT', label: 'revInsufficient', tone: 'neutral' },
];

const needsUrgency = (v: ReviewVerdict) => v === 'URGENCY_TOO_LOW' || v === 'URGENCY_TOO_HIGH';

/** One labelled fact from the decision. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.8rem] text-[var(--ink-faint)]">{label}</dt>
      <dd className="truncate font-semibold text-[var(--ink)]">{value}</dd>
    </div>
  );
}

/**
 * One decision, and the five ways to judge it.
 *
 * What is *not* on this card is the point: there is no transcript, no conversation
 * link, nothing that identifies the person, and no way to ask for any of it. A
 * reviewer sees the structured facts the rules acted on — which is both all the API
 * will give them and the only thing the question "was this decision reasonable?" needs.
 *
 * The rule identifiers at the bottom are the same ones the app shows the person under
 * "why this advice". They are here untranslated and unglossed on purpose: a
 * disagreement is only actionable if it names the rule to go and change, and
 * `duration.fever_3_days` is a filename and a line number to whoever maintains the
 * lexicon in a way that "fever for three days" is not.
 */
export function CaseCard({
  reviewCase,
  onSubmit,
  busy,
}: {
  reviewCase: ReviewCase;
  onSubmit: (verdict: ReviewVerdict, suggestedUrgency: Urgency | null, note: string) => void;
  busy: boolean;
}) {
  const { t, uiLanguage } = useApp();
  const [verdict, setVerdict] = useState<ReviewVerdict | null>(null);
  const [suggested, setSuggested] = useState<Urgency | null>(null);
  const [note, setNote] = useState('');

  const style = URGENCY_STYLE[reviewCase.urgency];
  const duration = durationLabel(reviewCase.durationHours, uiLanguage);
  const ready = verdict !== null && (!needsUrgency(verdict) || suggested !== null);

  return (
    <article className="sv-card space-y-5 rounded-[var(--radius-lg)] border border-[var(--line)] p-5">
      <header className={cn('rounded-[var(--radius-md)] border-l-[6px] p-3', style.bg, style.ring)}>
        <p className={cn('text-[0.78rem] font-extrabold tracking-[0.14em] uppercase', style.fg)}>
          {t(`urgency_${reviewCase.urgency}`)}
          {reviewCase.emergency && ` · ${t('revEmergencyFlag')}`}
        </p>
        <p className="mt-1 text-[1.05rem] font-semibold text-[var(--ink)]">
          {specialtyLabel(reviewCase.specialty, uiLanguage)}
        </p>
      </header>

      <section>
        <SectionLabel>{t('revReported')}</SectionLabel>
        <ul className="mt-2 flex flex-wrap gap-2">
          {reviewCase.symptoms.length === 0 && <li className="text-[var(--ink-faint)]">—</li>}
          {reviewCase.symptoms.map((s) => (
            <li
              key={s.code}
              className="rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-3 py-1 text-[0.95rem] text-[var(--ink)]"
            >
              {symptomLabel(s.code, uiLanguage)}
              {s.severity !== 'unknown' && <span className="text-[var(--ink-faint)]"> · {t(`severity_${s.severity}`)}</span>}
            </li>
          ))}
        </ul>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label={t('revDuration')} value={duration ?? '—'} />
        <Fact label={t('revPatient')} value={t(`age_${reviewCase.ageGroup}` as MessageKey)} />
        <Fact label={t('revConfidence')} value={t(`confidence_${reviewCase.confidence}`)} />
        {/* Whether a model touched the understanding changes how a disagreement
            should be read, so it is shown rather than buried. */}
        <Fact label={t('revSource')} value={reviewCase.source} />
      </dl>

      <section>
        <SectionLabel>{t('revRules')}</SectionLabel>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {reviewCase.rationale.length === 0 && <li className="text-[var(--ink-faint)]">—</li>}
          {reviewCase.rationale.map((rule) => (
            <li key={rule} className="rounded bg-[var(--paper-sunk)] px-2 py-1 font-mono text-[0.8rem] text-[var(--ink-soft)]">
              {rule}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-[var(--line)] pt-4">
        <SectionLabel>{t('revVerdict')}</SectionLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {VERDICTS.map((option) => {
            const active = verdict === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setVerdict(option.value);
                  if (!needsUrgency(option.value)) setSuggested(null);
                }}
                className={cn(
                  'min-h-11 rounded-full border px-4 text-[0.95rem] font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]',
                  active
                    ? option.tone === 'agree'
                      ? 'border-[var(--sage)] bg-[var(--sage)] text-white'
                      : 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink)] hover:border-[var(--line-strong)]',
                )}
              >
                {t(option.label)}
              </button>
            );
          })}
        </div>

        {/* Asked only when the verdict is that the level was wrong — and then it is
            required, because "too low" without "too low than what" cannot move a rule. */}
        {verdict && needsUrgency(verdict) && (
          <div className="mt-3">
            <SectionLabel>{t('revShouldHaveBeen')}</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {URGENCY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={suggested === level}
                  onClick={() => setSuggested(level)}
                  className={cn(
                    'min-h-11 rounded-full border px-4 text-[0.95rem] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]',
                    suggested === level
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                      : 'border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink)]',
                  )}
                >
                  {t(`urgency_${level}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="mt-4 block">
          <span className="text-[0.8rem] text-[var(--ink-faint)]">{t('revNote')}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={t('revNotePlaceholder')}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--paper-raised)] p-3 text-[var(--ink)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
          />
        </label>

        <Button
          className="mt-3 w-full"
          size="lg"
          disabled={!ready || busy}
          onClick={() => verdict && onSubmit(verdict, suggested, note)}
        >
          {busy ? t('revSaving') : t('revSubmit')}
        </Button>
      </section>
    </article>
  );
}
