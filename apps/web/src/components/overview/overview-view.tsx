'use client';

import { VIGNETTES } from '@sanjeevani/medical-safety/vignettes';
import { SectionLabel, cn } from '@sanjeevani/ui';
import { Activity, Ban, Ear, Gauge, Hospital, Languages, PhoneCall, ShieldAlert, Sparkles, WifiOff } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { BrandMark, OfflineBanner } from '@/components/chrome';
import { PageBody, Stagger, StaggerItem } from '@/components/motion/primitives';
import { useApp } from '@/components/providers/app-provider';
import type { MessageKey } from '@/lib/i18n';

/**
 * Concentric rings that breathe, standing in for the voice orb without the canvas.
 *
 * Purely decorative and purely CSS, so the front page stays light: the real orb is a
 * simplex-noise canvas and has no business loading for someone who has not opened the
 * app yet. Stops moving under reduced motion, like everything else here.
 */
function PulseMark() {
  return (
    <div aria-hidden className="relative mx-auto flex size-40 items-center justify-center sm:size-48">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute inset-0 rounded-full border border-[var(--sage)] opacity-0 motion-reduce:hidden"
          style={{
            animation: `sv-pulse-out 3.6s cubic-bezier(0.2, 0.7, 0.3, 1) ${i * 1.2}s infinite`,
          }}
        />
      ))}
      <span className="absolute inset-6 rounded-full bg-[var(--sage-soft)]" />
      <span className="absolute inset-10 rounded-full bg-[var(--sage)] opacity-90 shadow-[var(--shadow-lift)]" />
      <Activity className="relative size-10 text-[var(--paper-raised)]" />
    </div>
  );
}

/**
 * The claims worth leading with — every one of them checkable on /dashboard.
 *
 * The case count and the language count are counted from the suite rather than typed
 * here. They were typed here, and they were wrong: the suite had grown past them and
 * gained a language, and nothing had told the front page. A number on a landing page
 * that nothing keeps honest becomes a false claim the moment someone improves the
 * thing it describes, which is the worst possible time for it to be wrong.
 *
 * Recall and the false-alarm count stay as literals on purpose: they are thresholds
 * the eval enforces in CI, not measurements. If they ever stop being true the build
 * fails before this page is ever served.
 */
const PROOF: { value: string; label: MessageKey }[] = [
  { value: String(VIGNETTES.length), label: 'ovProofCases' },
  { value: '100%', label: 'ovProofRecall' },
  { value: '0', label: 'ovProofFalse' },
  { value: String(new Set(VIGNETTES.map((v) => v.language)).size), label: 'ovProofLanguages' },
];

const PILLARS: { icon: ComponentType<{ className?: string }>; title: MessageKey; body: MessageKey }[] = [
  { icon: Ear, title: 'ovPillar1', body: 'ovPillar1Body' },
  { icon: ShieldAlert, title: 'ovPillar2', body: 'ovPillar2Body' },
  { icon: Hospital, title: 'ovPillar3', body: 'ovPillar3Body' },
  { icon: Languages, title: 'ovPillar4', body: 'ovPillar4Body' },
  { icon: WifiOff, title: 'ovPillar5', body: 'ovPillar5Body' },
  { icon: Gauge, title: 'ovPillar6', body: 'ovPillar6Body' },
];

const NEVER: MessageKey[] = ['aboutNever1', 'aboutNever2', 'aboutNever3', 'aboutNever4'];

/**
 * The front page: what this is, for someone who has never seen it.
 *
 * ## Why it is not the home screen
 *
 * The app's home is a microphone and nothing else, because the person who needs it
 * most is frightened and in a hurry, and every extra element is a thing between them
 * and help. That is the right first screen for a user and the wrong one for a visitor
 * trying to work out what they are looking at. So the explanation lives here, one tap
 * away, and the app stays out of its own way.
 *
 * ## The numbers on this page
 *
 * Only figures this project actually owns and can re-derive appear here — the size of
 * the evaluation set, what it measures, the languages accepted. There are no
 * borrowed statistics about Indian healthcare, however well they would sell the
 * problem, because a page arguing that you should trust a medical tool is the last
 * place to put a number nobody checked.
 */
export function OverviewView() {
  const { t } = useApp();

  return (
    <div className="relative min-h-dvh">
      <div className="sv-ambient" aria-hidden />
      <div className="sv-grain" aria-hidden />
      <OfflineBanner />

      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--paper)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <BrandMark />
          <Link
            href="/"
            className="sv-press inline-flex min-h-10 items-center rounded-full bg-[var(--sage)] px-4 text-[0.9rem] font-semibold text-[var(--paper-raised)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
          >
            {t('ovOpen')}
          </Link>
        </div>
      </header>

      <main id="main" className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-20">
        <PageBody>
          <Stagger className="space-y-16" step={0.07}>
            {/* ── Hero ───────────────────────────────────────────────────── */}
            <StaggerItem className="text-center">
              <PulseMark />
              <h1 className="mt-6 font-display text-[2.4rem] leading-[1.08] text-balance text-[var(--ink)] sm:text-[3.4rem]">
                {t('ovHeadline')}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-balance text-[var(--ink-soft)]">{t('ovSub')}</p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/"
                  className="sv-press inline-flex min-h-13 items-center gap-2 rounded-full bg-[var(--sage)] px-7 text-base font-semibold text-[var(--paper-raised)] shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
                >
                  <Sparkles className="size-4.5" aria-hidden />
                  {t('ovStart')}
                </Link>
                <Link
                  href="/dashboard"
                  className="sv-press inline-flex min-h-13 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-7 text-base font-semibold text-[var(--ink)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
                >
                  {t('ovSeeProof')}
                </Link>
              </div>
              {/* The emergency route is reachable from the front page too — someone can
                  arrive here by accident during the worst five minutes of their week. */}
              <Link
                href="/emergency"
                className="mt-5 inline-flex items-center gap-2 text-[0.9rem] font-semibold text-[var(--sos)] underline-offset-4 hover:underline"
              >
                <PhoneCall className="size-4" aria-hidden />
                {t('ovEmergencyShortcut')}
              </Link>
            </StaggerItem>

            {/* ── The situation ──────────────────────────────────────────── */}
            <StaggerItem as="section">
              <div className="sv-card rounded-[var(--radius-xl)] border border-[var(--line)] p-6 sm:p-8">
                <p className="font-display text-[1.35rem] leading-snug text-balance text-[var(--ink)] sm:text-[1.6rem]">
                  {t('ovProblem')}
                </p>
                <p className="mt-4 leading-relaxed text-[var(--ink-soft)]">{t('ovProblemBody')}</p>
              </div>
            </StaggerItem>

            {/* ── What it does ───────────────────────────────────────────── */}
            <StaggerItem as="section" aria-labelledby="ov-pillars">
              <SectionLabel>
                <span id="ov-pillars">{t('ovPillarsTitle')}</span>
              </SectionLabel>
              <Stagger as="ul" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" step={0.05}>
                {PILLARS.map(({ icon: Icon, title, body }) => (
                  <StaggerItem
                    as="li"
                    key={title}
                    className="sv-card sv-lift rounded-[var(--radius-lg)] border border-[var(--line)] p-5"
                  >
                    <span
                      aria-hidden
                      className="flex size-10 items-center justify-center rounded-full bg-[var(--sage-soft)] text-[var(--sage-deep)]"
                    >
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-3 font-bold text-[var(--ink)]">{t(title)}</h3>
                    <p className="mt-1.5 text-[0.92rem] leading-relaxed text-[var(--ink-soft)]">{t(body)}</p>
                  </StaggerItem>
                ))}
              </Stagger>
            </StaggerItem>

            {/* ── Proof ──────────────────────────────────────────────────── */}
            <StaggerItem as="section" aria-labelledby="ov-proof">
              <SectionLabel>
                <span id="ov-proof">{t('ovProofTitle')}</span>
              </SectionLabel>
              <p className="mt-2 max-w-2xl leading-relaxed text-[var(--ink-soft)]">{t('ovProofIntro')}</p>
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PROOF.map(({ value, label }) => (
                  <li key={label} className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-4 text-center">
                    <div className="font-display text-[2.2rem] leading-none text-[var(--sage-deep)]">{value}</div>
                    <div className="mt-1.5 text-[0.8rem] leading-snug text-[var(--ink-faint)]">{t(label)}</div>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className="sv-press mt-4 inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-5 font-semibold text-[var(--ink)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
              >
                <Gauge className="size-4" aria-hidden />
                {t('ovProofCta')}
              </Link>
            </StaggerItem>

            {/* ── The promises ───────────────────────────────────────────── */}
            <StaggerItem as="section" aria-labelledby="ov-never">
              <div className="sv-plate rounded-[var(--radius-xl)] bg-[var(--u-emergency-soft)] p-6 sm:p-8">
                <h2 id="ov-never" className="flex items-center gap-2 font-display text-[1.4rem] text-[var(--u-emergency)]">
                  <Ban className="size-5.5 shrink-0" aria-hidden />
                  {t('aboutSafetyTitle')}
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {NEVER.map((key) => (
                    <li key={key} className="flex gap-2.5 leading-relaxed text-[var(--ink)]">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--u-emergency)]" />
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>

            {/* ── Close ──────────────────────────────────────────────────── */}
            <StaggerItem className="text-center">
              <h2 className="font-display text-[1.8rem] text-balance text-[var(--ink)]">{t('ovCloseTitle')}</h2>
              <p className="mx-auto mt-3 max-w-md leading-relaxed text-balance text-[var(--ink-soft)]">{t('ovCloseBody')}</p>
              <Link
                href="/"
                className="sv-press mt-6 inline-flex min-h-14 items-center gap-2 rounded-full bg-[var(--sage)] px-8 text-lg font-semibold text-[var(--paper-raised)] shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
              >
                {t('ovStart')}
              </Link>
              <p className="mx-auto mt-6 max-w-lg text-[0.85rem] leading-relaxed text-[var(--ink-faint)]">{t('disclaimer')}</p>
              <nav aria-label={t('ovMoreLinks')} className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.9rem]">
                {(
                  [
                    ['/about', 'aboutTitle'],
                    ['/guide', 'guideTitle'],
                    ['/dashboard', 'dashTitle'],
                    ['/privacy', 'privacy'],
                  ] as const
                ).map(([href, key]) => (
                  <Link key={href} href={href} className={cn('text-[var(--ink-soft)] underline-offset-4 hover:underline')}>
                    {t(key)}
                  </Link>
                ))}
              </nav>
            </StaggerItem>
          </Stagger>
        </PageBody>
      </main>
    </div>
  );
}
