'use client';

import type { EvalOutcome } from '@sanjeevani/ai/eval';
import { Button, SectionLabel, cn } from '@sanjeevani/ui';
import { AlertTriangle, Check, ChevronDown, Play, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedNumber } from '@/components/motion/primitives';
import { useApp } from '@/components/providers/app-provider';
import { runEvaluation, warmEval, type EvalRun } from '@/lib/offline/eval-client';

type Phase = 'idle' | 'running' | 'done' | 'failed';

/** One headline figure. */
function Stat({
  label,
  value,
  suffix,
  decimals = 0,
  tone,
  note,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  tone: 'good' | 'bad' | 'warn';
  note: string;
}) {
  const colour =
    tone === 'bad' ? 'var(--u-emergency)' : tone === 'warn' ? 'var(--u-urgent)' : 'var(--sage-deep)';
  return (
    <div className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-4">
      <div className="text-[0.7rem] font-bold tracking-[0.1em] text-[var(--ink-faint)] uppercase">{label}</div>
      <div className="mt-1.5 font-display text-[2rem] leading-none" style={{ color: colour }}>
        <AnimatedNumber value={value} decimals={decimals} />
        {suffix && <span className="text-[1.1rem]">{suffix}</span>}
      </div>
      <p className="mt-1.5 text-[0.8rem] leading-snug text-[var(--ink-faint)]">{note}</p>
    </div>
  );
}

/** One case in the expanded list. */
function CaseRow({ outcome }: { outcome: EvalOutcome }) {
  const { vignette, failure, overTriaged } = outcome;
  const bad = Boolean(failure);
  return (
    <li className="flex gap-3 px-4 py-2.5">
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
          bad ? 'bg-[var(--u-emergency)] text-white' : 'bg-[var(--sage-soft)] text-[var(--sage-deep)]',
        )}
      >
        {bad ? <X className="size-3.5" /> : <Check className="size-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <code className="font-mono text-[0.78rem] text-[var(--ink)]">{vignette.id}</code>
          {vignette.expectEmergency && (
            <span className="rounded-full bg-[var(--u-emergency-soft)] px-2 py-px text-[0.65rem] font-bold tracking-wide text-[var(--u-emergency)] uppercase">
              emergency
            </span>
          )}
          {overTriaged && (
            <span className="rounded-full bg-[var(--u-urgent-soft)] px-2 py-px text-[0.65rem] font-bold tracking-wide text-[var(--u-urgent)] uppercase">
              over-triaged
            </span>
          )}
        </div>
        {/* The words that were actually fed in. This is the part people want to see. */}
        <p className="mt-0.5 truncate text-[0.82rem] text-[var(--ink-soft)]" title={vignette.turns.join(' / ')}>
          “{vignette.turns[0]}”
        </p>
        {failure && <p className="mt-1 text-[0.82rem] font-semibold text-[var(--u-emergency)]">{failure}</p>}
      </div>
      <span className="shrink-0 self-center text-[0.72rem] text-[var(--ink-faint)] tabular-nums">{outcome.ms}ms</span>
    </li>
  );
}

/**
 * Re-derives the safety numbers, live, in the visitor's browser.
 *
 * ## Why this exists rather than a printed figure
 *
 * "100% emergency recall" is the kind of claim every project makes and almost none
 * let you check. Here the claim is checkable: the same 47 labelled cases CI runs go
 * through the same engine, on this device, while you watch, and the numbers that come
 * out are whatever they are. If something regressed, this shows it in red.
 *
 * ## Why there is no progress bar
 *
 * The whole suite takes tens of milliseconds. Padding that out so a bar could crawl
 * across the screen would be dressing up the single most impressive fact about the
 * safety layer — that it is deterministic code fast enough to run anywhere — as
 * something slow. The elapsed time is reported instead, honestly.
 */
export function EvalRunner() {
  const { t } = useApp();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState<EvalRun | null>(null);
  const [showCases, setShowCases] = useState(false);
  const section = useRef<HTMLDivElement>(null);

  // Fetch the engine and the case set once this section is anywhere near the
  // viewport, so pressing the button is a run rather than a download.
  useEffect(() => {
    const node = section.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void warmEval().catch(() => undefined);
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const start = useCallback(async () => {
    setPhase('running');
    setProgress(0);
    setRun(null);
    try {
      const result = await runEvaluation((done) => setProgress(done));
      setRun(result);
      setPhase('done');
    } catch {
      // The engine failed to load or threw. Say so plainly rather than showing a
      // half-finished result that could be mistaken for a pass.
      setPhase('failed');
    }
  }, []);

  const summary = run?.summary;
  const passed = run ? run.breaches.length === 0 : false;

  return (
    <section ref={section} aria-labelledby="dash-eval">
      <SectionLabel>
        <span id="dash-eval">{t('dashEvalTitle')}</span>
      </SectionLabel>
      <p className="mt-2 leading-relaxed text-[var(--ink-soft)]">{t('dashEvalIntro')}</p>

      {phase === 'idle' && (
        <div className="mt-4">
          <Button size="lg" icon={<Play className="size-4" aria-hidden />} onClick={() => void start()}>
            {t('dashEvalRun')}
          </Button>
        </div>
      )}

      {phase === 'running' && (
        <div className="mt-4 flex items-center gap-3 text-[var(--ink-soft)]" role="status">
          <span className="size-4 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--sage)] motion-reduce:animate-none" />
          <span className="tabular-nums">{t('dashEvalRunning', { done: progress })}</span>
        </div>
      )}

      {phase === 'failed' && (
        <p className="mt-4 flex items-start gap-2 text-[var(--u-emergency)]">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          {t('dashEvalFailed')}
        </p>
      )}

      {phase === 'done' && run && summary && (
        <div className="mt-4 space-y-4">
          {/* Verdict first. If anything breached, it says so before any green tile. */}
          <div
            className={cn(
              'sv-plate flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-lg)] px-4 py-3',
              passed ? 'bg-[var(--sage-soft)] text-[var(--sage-deep)]' : 'bg-[var(--u-emergency-soft)] text-[var(--u-emergency)]',
            )}
            role="status"
          >
            {passed ? <Check className="size-5 shrink-0" aria-hidden /> : <AlertTriangle className="size-5 shrink-0" aria-hidden />}
            <span className="font-bold">{passed ? t('dashEvalPassed') : t('dashEvalBreached')}</span>
            <span className="text-[0.85rem] tabular-nums opacity-80">
              {t('dashEvalTiming', { cases: summary.totals.cases, ms: run.engineMs })}
            </span>
          </div>

          {!passed && (
            <ul className="space-y-1">
              {run.breaches.map((b) => (
                <li key={b} className="text-[0.9rem] font-semibold text-[var(--u-emergency)]">
                  {b}
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label={t('dashStatRecall')}
              value={summary.emergencyDetection.recall * 100}
              suffix="%"
              decimals={0}
              tone={summary.emergencyDetection.missed > 0 ? 'bad' : 'good'}
              note={t('dashStatRecallNote', { caught: summary.emergencyDetection.caught, total: summary.totals.emergencies })}
            />
            <Stat
              label={t('dashStatFalse')}
              value={summary.falseAlarms.rate * 100}
              suffix="%"
              decimals={0}
              tone={summary.falseAlarms.count > 0 ? 'warn' : 'good'}
              note={t('dashStatFalseNote', { count: summary.falseAlarms.count, total: summary.totals.nonEmergencies })}
            />
            <Stat
              label={t('dashStatUnder')}
              value={summary.urgency.underTriaged}
              tone={summary.urgency.underTriaged > 0 ? 'bad' : 'good'}
              note={t('dashStatUnderNote')}
            />
            <Stat
              label={t('dashStatOver')}
              value={summary.urgency.overTriaged}
              tone={summary.urgency.overTriaged > 0 ? 'warn' : 'good'}
              note={t('dashStatOverNote')}
            />
          </div>

          <div className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-4">
            <h3 className="text-[0.7rem] font-bold tracking-[0.1em] text-[var(--ink-faint)] uppercase">{t('dashByLanguage')}</h3>
            <ul className="mt-3 space-y-2.5">
              {summary.byLanguage.map((row) => (
                <li key={row.language}>
                  <div className="flex items-baseline justify-between gap-3 text-[0.9rem]">
                    <span className="font-semibold text-[var(--ink)]">{row.language}</span>
                    <span className="text-[var(--ink-faint)] tabular-nums">
                      {t('dashLangCases', { cases: row.cases, failures: row.failures })}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--paper-sunk)]">
                    <div
                      aria-hidden
                      className={cn('h-full rounded-full', row.failures > 0 ? 'bg-[var(--u-emergency)]' : 'bg-[var(--sage)]')}
                      style={{ width: `${(row.cases / Math.max(1, summary.totals.cases)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="sv-card overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)]">
            <button
              type="button"
              onClick={() => setShowCases((v) => !v)}
              aria-expanded={showCases}
              className="sv-press flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)] focus-visible:-ring-offset-2"
            >
              <span className="font-semibold text-[var(--ink)]">{t('dashEvalAllCases', { n: run.outcomes.length })}</span>
              <ChevronDown className={cn('size-5 shrink-0 text-[var(--ink-faint)] transition-transform', showCases && 'rotate-180')} aria-hidden />
            </button>
            {showCases && (
              <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {/* Failures first: if anything is wrong it should not need scrolling to. */}
                {[...run.outcomes].sort((a, b) => Number(Boolean(b.failure)) - Number(Boolean(a.failure))).map((o) => (
                  <CaseRow key={o.vignette.id} outcome={o} />
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={<RotateCcw className="size-4" aria-hidden />} onClick={() => void start()}>
              {t('dashEvalAgain')}
            </Button>
            <p className="text-[0.82rem] text-[var(--ink-faint)]">{t('dashEvalWall', { ms: run.wallMs })}</p>
          </div>
        </div>
      )}

      <p className="mt-4 text-[0.85rem] leading-relaxed text-[var(--ink-faint)]">{t('dashEvalCaveat')}</p>
    </section>
  );
}
