'use client';

import type { TurnResponse } from '@sanjeevani/types';
import { Button, Chip, SectionLabel, cn } from '@sanjeevani/ui';
import { CornerDownLeft, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useApp } from '@/components/providers/app-provider';
import { offlineTurn, resetOffline, warmOfflineEngine } from '@/lib/offline/offline-engine';

/*
 * Four phrases chosen to show the interesting behaviour rather than the easy case,
 * and all four are in the evaluation set or verified against the engine:
 *
 *   1. Hinglish chest pain          → fires. The composite rule, across a language mix.
 *   2. A finished episode           → clear. Past framing removes the present symptom.
 *   3. A mild fever in Hindi        → clear, and asks a follow-up instead.
 *   4. "heart attack", past tense   → fires anyway, on purpose. See the note below.
 */
const SUGGESTIONS = [
  'Seene mein bahut tez dard ho raha hai',
  'I had chest pain last year but it was checked and I am fine now',
  'मुझे दो दिन से हल्का बुखार है',
  'My father had a heart attack last year',
];

const URGENCY_TONE: Record<string, { bg: string; fg: string }> = {
  emergency: { bg: 'var(--u-emergency-soft)', fg: 'var(--u-emergency)' },
  urgent: { bg: 'var(--u-urgent-soft)', fg: 'var(--u-urgent)' },
  routine: { bg: 'var(--u-routine-soft)', fg: 'var(--u-routine)' },
  self_care: { bg: 'var(--u-selfcare-soft)', fg: 'var(--u-selfcare)' },
};

/**
 * A phrase in, the engine's real verdict out — computed in this browser.
 *
 * ## What is being demonstrated
 *
 * Two things that are easy to assert and hard to believe. First, that the emergency
 * check is deterministic and independent: no model is called here, no server is
 * reached, and the answer is identical every time. Second, that it survives how people
 * actually talk — Hindi, Hinglish, negation, past tense, hypotheticals.
 *
 * The suggested phrases are chosen to make that concrete: two that must fire, and two
 * that must *not*, including the past-tense heart attack and the hypothetical that a
 * keyword matcher would fail on.
 *
 * ## Why the trace is shown
 *
 * Being told "the safety check runs before the model" is a promise. The stage list,
 * with its timings, is the receipt — and it is the same trace the app shows a user
 * under "How this answer was produced".
 */
export function Probe() {
  const { t } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TurnResponse | null>(null);
  const [error, setError] = useState(false);

  const run = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(false);
    try {
      // A fresh conversation every time, so one probe never colours the next.
      const id = `probe-${Date.now().toString(36)}`;
      const response = await offlineTurn({ text: trimmed, inputMode: 'text', languagePreference: 'auto' }, id);
      resetOffline(id);
      setResult(response);
    } catch {
      setError(true);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const fired = Boolean(result?.emergency);
  const urgency = result?.triage?.urgency;
  const tone = urgency ? URGENCY_TONE[urgency] : undefined;

  return (
    <section aria-labelledby="dash-probe" onPointerEnter={() => warmOfflineEngine()}>
      <SectionLabel>
        <span id="dash-probe">{t('dashProbeTitle')}</span>
      </SectionLabel>
      <p className="mt-2 leading-relaxed text-[var(--ink-soft)]">{t('dashProbeIntro')}</p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => warmOfflineEngine()}
          placeholder={t('dashProbePlaceholder')}
          aria-label={t('dashProbePlaceholder')}
          maxLength={300}
          className="min-h-12 flex-1 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--paper-raised)] px-4 text-base text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus-visible:border-[var(--sage)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
        />
        <Button type="submit" disabled={busy || text.trim().length === 0} icon={<CornerDownLeft className="size-4" aria-hidden />}>
          {busy ? t('dashProbeRunning') : t('dashProbeRun')}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <Chip
            key={s}
            onClick={() => {
              setText(s);
              void run(s);
            }}
            className="text-[0.85rem]"
          >
            {s}
          </Chip>
        ))}
      </div>

      {error && <p className="mt-4 text-[var(--u-emergency)]">{t('dashProbeError')}</p>}

      {result && (
        <div className="mt-4 space-y-3">
          <div
            className={cn('sv-plate flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3')}
            style={{
              background: fired ? 'var(--u-emergency-soft)' : 'var(--sage-soft)',
              color: fired ? 'var(--u-emergency)' : 'var(--sage-deep)',
            }}
            role="status"
          >
            {fired ? <ShieldAlert className="size-5 shrink-0" aria-hidden /> : <ShieldCheck className="size-5 shrink-0" aria-hidden />}
            <span className="font-bold">
              {fired ? t('dashProbeFired', { category: result.emergency?.category ?? '' }) : t('dashProbeClear')}
            </span>
          </div>

          <dl className="sv-card grid grid-cols-2 divide-x divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] sm:grid-cols-4 sm:divide-y-0">
            <div className="px-4 py-3">
              <dt className="text-[0.7rem] font-bold tracking-[0.1em] text-[var(--ink-faint)] uppercase">{t('dashProbeLanguage')}</dt>
              <dd className="mt-1 font-semibold text-[var(--ink)]">{result.language}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[0.7rem] font-bold tracking-[0.1em] text-[var(--ink-faint)] uppercase">{t('dashProbeUrgency')}</dt>
              <dd className="mt-1 font-semibold" style={{ color: tone?.fg ?? 'var(--ink-faint)' }}>
                {urgency ?? t('dashProbeNotYet')}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[0.7rem] font-bold tracking-[0.1em] text-[var(--ink-faint)] uppercase">{t('dashProbeIntent')}</dt>
              <dd className="mt-1 font-semibold text-[var(--ink)]">{result.intent}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[0.7rem] font-bold tracking-[0.1em] text-[var(--ink-faint)] uppercase">{t('dashProbeTime')}</dt>
              <dd className="mt-1 font-semibold text-[var(--ink)] tabular-nums">{result.totalMs} ms</dd>
            </div>
          </dl>

          {/* The reply itself, so it is obvious this is the whole engine and not a classifier. */}
          <blockquote className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-4 leading-relaxed text-[var(--ink)]">
            {result.reply.display}
          </blockquote>

          <div className="sv-card overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)]">
            <h3 className="border-b border-[var(--line)] px-4 py-2.5 text-[0.7rem] font-bold tracking-[0.1em] text-[var(--ink-faint)] uppercase">
              {t('dashProbeTrace')}
            </h3>
            <ol className="divide-y divide-[var(--line)]">
              {result.trace.map((stage) => (
                <li key={stage.stage} className={cn('flex items-baseline gap-3 px-4 py-2', !stage.ran && 'opacity-45')}>
                  <span
                    aria-hidden
                    className={cn('size-1.5 shrink-0 rounded-full', stage.ran ? 'bg-[var(--sage)]' : 'bg-[var(--line-strong)]')}
                  />
                  <code className="font-mono text-[0.8rem] text-[var(--ink)]">{stage.stage}</code>
                  <span className="min-w-0 flex-1 truncate text-[0.8rem] text-[var(--ink-soft)]">{stage.detail ?? ''}</span>
                  <span className="shrink-0 text-[0.75rem] text-[var(--ink-faint)] tabular-nums">{stage.ran ? `${stage.ms}ms` : '—'}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <p className="mt-4 text-[0.85rem] leading-relaxed text-[var(--ink-faint)]">{t('dashProbeNote')}</p>
    </section>
  );
}
