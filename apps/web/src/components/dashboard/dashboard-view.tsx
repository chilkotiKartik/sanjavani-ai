'use client';

import type { Capabilities } from '@sanjeevani/types';
import { SectionLabel, cn } from '@sanjeevani/ui';
import { CircleDot, Cpu, Database, Hospital, MapPin, Mic, Volume2 } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { PageShell } from '@/components/chrome';
import { PageBody, Skeleton, Stagger, StaggerItem } from '@/components/motion/primitives';
import { useApp } from '@/components/providers/app-provider';
import type { MessageKey } from '@/lib/i18n';
import { EvalRunner } from './eval-runner';
import { Probe } from './probe';

/**
 * The ten stages every turn passes through, in order, with what each one is for.
 *
 * `guarded` marks the three that exist to contain the model rather than to use it.
 * They are called out visually because the whole safety argument rests on them: the
 * emergency check runs *before* generation and cannot be overruled by it, and
 * whatever the model returns is validated and capped before anyone sees it.
 */
const STAGES: { stage: string; label: MessageKey; guarded?: boolean }[] = [
  { stage: 'language', label: 'stageLanguage' },
  { stage: 'extraction', label: 'stageExtraction' },
  { stage: 'emergency_check', label: 'stageEmergency', guarded: true },
  { stage: 'intent', label: 'stageIntent' },
  { stage: 'ai_understanding', label: 'stageAi' },
  { stage: 'follow_up', label: 'stageFollowUp' },
  { stage: 'triage', label: 'stageTriage', guarded: true },
  { stage: 'facilities', label: 'stageFacilities' },
  { stage: 'phrasing', label: 'stagePhrasing' },
  { stage: 'output_guard', label: 'stageGuard', guarded: true },
];

type Row = {
  icon: ComponentType<{ className?: string }>;
  label: MessageKey;
  value: string;
  /** true when a real external provider is in use, false when it is the local fallback. */
  live: boolean;
  note: MessageKey;
};

function buildRows(c: Capabilities, t: (k: MessageKey) => string): Row[] {
  return [
    {
      icon: Cpu,
      label: 'dashRowAi',
      value: c.ai === 'gemini' ? 'Gemini' : c.ai === 'anthropic' ? 'Claude' : t('aiRules'),
      live: c.ai !== 'rules',
      note: c.ai === 'rules' ? 'dashRowAiFallback' : 'dashRowAiLive',
    },
    {
      icon: Mic,
      label: 'dashRowStt',
      value: c.stt === 'elevenlabs' ? 'ElevenLabs' : c.stt === 'gemini' ? 'Gemini' : t('voiceBrowser'),
      live: c.stt !== 'browser',
      note: c.stt === 'browser' ? 'dashRowSttFallback' : 'dashRowSttLive',
    },
    {
      icon: Volume2,
      label: 'dashRowTts',
      value: c.tts === 'elevenlabs' ? 'ElevenLabs' : c.tts === 'gemini' ? 'Gemini' : t('voiceBrowser'),
      live: c.tts !== 'browser',
      note: c.tts === 'browser' ? 'dashRowTtsFallback' : 'dashRowTtsLive',
    },
    {
      icon: Hospital,
      label: 'dashRowMaps',
      value: c.maps === 'google_places' ? 'Google Places' : t('mapsCurated'),
      live: c.maps === 'google_places',
      note: c.maps === 'google_places' ? 'dashRowMapsLive' : 'dashRowMapsFallback',
    },
    {
      icon: MapPin,
      label: 'dashRowRouting',
      value: c.routing === 'google_routes' ? 'Google Routes' : t('dashEstimate'),
      live: c.routing === 'google_routes',
      note: c.routing === 'google_routes' ? 'dashRowRoutingLive' : 'dashRowRoutingFallback',
    },
    {
      icon: Database,
      label: 'dashRowStore',
      value: c.persistence === 'postgres' ? 'PostgreSQL' : t('dashInMemory'),
      live: c.persistence === 'postgres',
      note: c.persistence === 'postgres' ? 'dashRowStoreLive' : 'dashRowStoreFallback',
    },
  ];
}

/**
 * What this deployment actually is, and proof that it does what it claims.
 *
 * ## Who this is for
 *
 * Someone deciding whether to believe the rest of the app: a reviewer, a judge, a
 * clinician's technical friend. Not a patient — nothing here is needed to use
 * Sanjeevani, and it is deliberately kept off the path of anyone in a hurry.
 *
 * ## The one rule this page follows
 *
 * Every claim on it is either derived live or labelled as unverified. The provider
 * table reports what is *running*, not what could run — a deployment with no model
 * key says so, in the same size type as one with a key. The safety numbers are
 * recomputed in the visitor's browser rather than printed. A demo that quietly
 * dresses up its fallbacks is the exact failure mode this project set out to avoid.
 */
export function DashboardView() {
  const { t, capabilities, capabilitiesError } = useApp();

  return (
    <PageShell title={t('dashTitle')} wide>
      <PageBody>
        <Stagger className="space-y-12" step={0.06}>
          <StaggerItem>
            <p className="font-display text-[1.45rem] leading-snug text-balance text-[var(--ink)]">{t('dashLead')}</p>
          </StaggerItem>

          {/* ── What is actually running ─────────────────────────────────── */}
          <StaggerItem as="section">
            <SectionLabel>
              <span id="dash-live">{t('dashLiveTitle')}</span>
            </SectionLabel>
            <p className="mt-2 leading-relaxed text-[var(--ink-soft)]">{t('dashLiveIntro')}</p>

            {capabilitiesError && <p className="mt-3 text-[var(--u-emergency)]">{t('dashLiveError')}</p>}

            {!capabilities && !capabilitiesError && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            )}

            {capabilities && (
              <>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {buildRows(capabilities, t).map(({ icon: Icon, label, value, live, note }) => (
                    <li key={label} className="sv-card flex gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] p-4">
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-full',
                          live ? 'bg-[var(--sage-soft)] text-[var(--sage-deep)]' : 'bg-[var(--paper-sunk)] text-[var(--ink-faint)]',
                        )}
                      >
                        <Icon className="size-4.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-[0.7rem] font-bold tracking-[0.1em] text-[var(--ink-faint)] uppercase">{t(label)}</span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-1.5 text-[0.62rem] font-bold tracking-wide uppercase',
                              live
                                ? 'bg-[var(--sage-soft)] text-[var(--sage-deep)]'
                                : 'bg-[var(--saffron-soft)] text-[var(--ink-soft)]',
                            )}
                          >
                            <CircleDot className="size-2.5" aria-hidden />
                            {live ? t('dashLive') : t('dashFallback')}
                          </span>
                        </div>
                        <p className="mt-0.5 font-semibold text-[var(--ink)]">{value}</p>
                        <p className="mt-0.5 text-[0.82rem] leading-snug text-[var(--ink-faint)]">{t(note)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[0.85rem] leading-relaxed text-[var(--ink-faint)]">
                  {t('dashRegionNote', { region: capabilities.region.name, days: capabilities.retentionDays })}
                </p>
              </>
            )}
          </StaggerItem>

          {/* ── Re-derive the safety numbers ─────────────────────────────── */}
          <StaggerItem>
            <EvalRunner />
          </StaggerItem>

          {/* ── Try the circuit breaker ──────────────────────────────────── */}
          <StaggerItem>
            <Probe />
          </StaggerItem>

          {/* ── The pipeline ─────────────────────────────────────────────── */}
          <StaggerItem as="section">
            <SectionLabel>
              <span id="dash-pipeline">{t('dashPipelineTitle')}</span>
            </SectionLabel>
            <p className="mt-2 leading-relaxed text-[var(--ink-soft)]">{t('dashPipelineIntro')}</p>
            <ol className="relative mt-4 ml-3 space-y-3 border-l-2 border-[var(--line)] pl-7">
              {STAGES.map(({ stage, label, guarded }, i) => (
                <li key={stage} className="relative">
                  {/* Centred on the rule, and given a border so the unguarded steps are
                      still legible against the paper rather than fading into it. */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-0.5 -left-[38px] flex size-6 items-center justify-center rounded-full text-[0.68rem] font-bold tabular-nums',
                      guarded
                        ? 'bg-[var(--sage)] text-[var(--paper-raised)] ring-3 ring-[var(--paper)]'
                        : 'border border-[var(--line-strong)] bg-[var(--paper-raised)] text-[var(--ink-soft)] ring-3 ring-[var(--paper)]',
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <code className="font-mono text-[0.85rem] font-semibold text-[var(--ink)]">{stage}</code>
                    {guarded && (
                      <span className="rounded-full bg-[var(--sage-soft)] px-2 py-px text-[0.62rem] font-bold tracking-wide text-[var(--sage-deep)] uppercase">
                        {t('dashGuardrail')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[0.9rem] leading-relaxed text-[var(--ink-soft)]">{t(label)}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-[var(--radius-lg)] bg-[var(--paper-sunk)] p-4 text-[0.9rem] leading-relaxed text-[var(--ink-soft)]">
              {t('dashPipelineNote')}
            </p>
          </StaggerItem>

          <StaggerItem>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/overview"
                className="sv-press inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--sage)] px-6 font-semibold text-[var(--paper-raised)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
              >
                {t('overviewTitle')}
              </Link>
              <Link
                href="/about"
                className="sv-press inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-6 font-semibold text-[var(--ink)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
              >
                {t('aboutTitle')}
              </Link>
            </div>
          </StaggerItem>
        </Stagger>
      </PageBody>
    </PageShell>
  );
}
