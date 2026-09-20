'use client';

import { Button, SectionLabel, cn } from '@sanjeevani/ui';
import { ArrowDown, ArrowRight, ArrowUp, CalendarClock, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageShell } from '@/components/chrome';
import { PageBody, Stagger, StaggerItem } from '@/components/motion/primitives';
import { useApp } from '@/components/providers/app-provider';
import { clearCheckIns, closeCheckIn, joinSymptoms, relativeTime, type Change, type CheckIn } from '@/lib/checkins';
import type { MessageKey } from '@/lib/i18n';
import { useCheckIns } from '@/lib/use-checkins';
import { useNow } from '@/lib/use-now';

const CHANGE_STYLE: Record<Change, { icon: typeof ArrowDown; label: MessageKey; fg: string; bg: string }> = {
  better: { icon: ArrowDown, label: 'ciBetter', fg: 'var(--sage-deep)', bg: 'var(--sage-soft)' },
  same: { icon: ArrowRight, label: 'ciSame', fg: 'var(--ink-soft)', bg: 'var(--paper-sunk)' },
  worse: { icon: ArrowUp, label: 'ciWorse', fg: 'var(--u-urgent)', bg: 'var(--u-urgent-soft)' },
};

/**
 * The timeline: what was reported, and how it moved.
 *
 * ## What this is for
 *
 * Two audiences. The person, who genuinely cannot remember on Thursday whether the
 * fever was worse on Tuesday — and answers that question badly, in the direction of
 * "it's fine", which is the wrong direction. And whoever they eventually show it to:
 * "three days, two worse, one same" is a better handover than "a few days I think".
 *
 * ## What it deliberately is not
 *
 * Not a diagnosis, not a chart, not a trend line. Three states and their dates. A
 * graph would imply a precision that three self-reported adjectives do not have, and
 * implying precision about someone's illness is its own kind of dishonesty.
 */
export function CheckInsView() {
  const { t } = useApp();
  const items = useCheckIns();
  const [confirmClear, setConfirmClear] = useState(false);
  const now = useNow();

  const open = items.filter((c) => c.status === 'pending');
  const done = items.filter((c) => c.status !== 'pending');

  const card = (c: CheckIn) => {
    const what = c.symptoms.length > 0 ? joinSymptoms(c.symptoms, t('ciAnd')) : t('ciTheProblem');
    return (
      <li key={c.id} className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-[var(--ink)]">{what}</h3>
            <p className="mt-0.5 text-[0.85rem] text-[var(--ink-faint)]">
              {t('ciStarted', { when: relativeTime(c.createdAt, now, t) })}
              {c.status === 'pending' &&
                ` · ${c.dueAt <= now ? t('ciDueNow') : t('ciNext', { when: relativeTime(c.dueAt, now, t) })}`}
            </p>
          </div>
          {c.status === 'pending' && (
            <button
              type="button"
              onClick={() => closeCheckIn(c.id)}
              className="shrink-0 rounded-full px-3 py-1.5 text-[0.82rem] font-semibold text-[var(--ink-faint)] hover:bg-[var(--paper-sunk)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
            >
              {t('ciStop')}
            </button>
          )}
        </div>

        {c.entries.length > 0 ? (
          <ol className="mt-3 flex flex-wrap gap-2">
            {c.entries.map((entry, i) => {
              const s = CHANGE_STYLE[entry.change];
              const Icon = s.icon;
              return (
                <li
                  key={`${entry.at}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8rem] font-semibold"
                  style={{ background: s.bg, color: s.fg }}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {t(s.label)}
                  <span className="font-normal opacity-70">{relativeTime(entry.at, now, t)}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-[0.85rem] text-[var(--ink-faint)]">{t('ciNoEntries')}</p>
        )}
      </li>
    );
  };

  return (
    <PageShell title={t('ciTitleLong')}>
      <PageBody>
        <Stagger className="space-y-8" step={0.07}>
          <StaggerItem>
            <p className="leading-relaxed text-[var(--ink-soft)]">{t('ciLead')}</p>
          </StaggerItem>

          {items.length === 0 && (
            <StaggerItem>
              <div className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-8 text-center">
                <CalendarClock className="mx-auto size-8 text-[var(--ink-faint)]" aria-hidden />
                <p className="mt-3 leading-relaxed text-[var(--ink-soft)]">{t('ciEmpty')}</p>
                <Link
                  href="/"
                  className="sv-press mt-5 inline-flex min-h-12 items-center rounded-full bg-[var(--sage)] px-6 font-semibold text-[var(--paper-raised)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
                >
                  {t('ovStart')}
                </Link>
              </div>
            </StaggerItem>
          )}

          {open.length > 0 && (
            <StaggerItem as="section">
              <SectionLabel>{t('ciOpen')}</SectionLabel>
              <ul className="mt-3 space-y-3">{open.map(card)}</ul>
            </StaggerItem>
          )}

          {done.length > 0 && (
            <StaggerItem as="section">
              <SectionLabel>{t('ciPast')}</SectionLabel>
              <ul className="mt-3 space-y-3">{done.map(card)}</ul>
            </StaggerItem>
          )}

          {items.length > 0 && (
            <StaggerItem>
              <div className={cn('rounded-[var(--radius-lg)] border border-[var(--line)] p-4')}>
                <p className="text-[0.85rem] leading-relaxed text-[var(--ink-soft)]">{t('ciPrivacyLong')}</p>
                {confirmClear ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="danger"
                      onClick={() => {
                        clearCheckIns();
                        setConfirmClear(false);
                      }}
                    >
                      {t('ciClearConfirm')}
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirmClear(false)}>
                      {t('notNow')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    className="mt-3"
                    icon={<Trash2 className="size-4" aria-hidden />}
                    onClick={() => setConfirmClear(true)}
                  >
                    {t('ciClear')}
                  </Button>
                )}
              </div>
            </StaggerItem>
          )}
        </Stagger>
      </PageBody>
    </PageShell>
  );
}
