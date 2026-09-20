'use client';

import type { TriageResult } from '@sanjeevani/types';
import { Button } from '@sanjeevani/ui';
import { Printer, Share2 } from 'lucide-react';
import { useApp } from '@/components/providers/app-provider';
import { useToast } from '@/components/providers/toast-provider';
import type { MessageKey } from '@/lib/i18n';
import { durationLabel, formatDate, ruledOutText, specialtyLabel, symptomLabel } from '@/lib/present';
import { buildQr } from '@/lib/qr';

/** One labelled line of the card. Declared outside the component so it keeps its identity. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-[var(--line)] py-2.5 last:border-b-0">
      <dt className="w-[42%] shrink-0 text-sm text-[var(--ink-faint)]">{label}</dt>
      <dd className="min-w-0 flex-1 font-semibold text-[var(--ink)]">{value}</dd>
    </div>
  );
}

/**
 * The care card — something to hand across a hospital desk.
 *
 * At a busy OPD the first exchange is always the same: what is wrong, since when,
 * for whom. Someone unwell, or speaking a second language, or holding a crying
 * child, does that badly. This card answers it on paper in a fixed order.
 *
 * Two things make it honest. It states in its own body that it is not a diagnosis
 * and asks the clinician to examine independently. And it lists what was already
 * *excluded* — the red-flag questions answered "no" — because that is the part a
 * clinician cannot recover from a summary and would otherwise have to re-ask.
 *
 * It prints in black on white via the `sv-print-card` rules in globals.css, so a
 * phone hooked to any printer produces something readable.
 */
/**
 * "Your child, age 6" rather than just "Child".
 *
 * Whoever reads this card at a hospital desk needs to know who the patient is before
 * anything else on it means much, and the relationship is the part a stranger cannot
 * infer. Both halves are omitted when unknown rather than guessed at.
 */
function personLabel(triage: TriageResult, t: (key: MessageKey) => string): string {
  const who = triage.subject && triage.subject !== 'unknown' ? t(`subject_${triage.subject}` as MessageKey) : null;
  const band = triage.ageGroup !== 'unknown' ? t(`age_${triage.ageGroup}` as MessageKey) : null;
  if (who && band) return `${who} · ${band}`;
  return who ?? band ?? t('age_unknown');
}


/**
 * The card, as a square someone at a desk can scan.
 *
 * It carries the card's own text — not a link — for the reasons set out in `lib/qr`.
 * Rendered as inline SVG rather than a canvas so it stays sharp at any size and prints
 * as vector; forced black on white regardless of theme, because a scanner reading a
 * dark-mode card off a screen or a grey print is the one case where this has to work.
 *
 * `shapeRendering="crispEdges"` matters more than it looks: without it the browser
 * antialiases module boundaries, and at small sizes the grey fringe is enough to lose
 * a scan on a cheap camera.
 */
function CardQr({ text, label }: { text: string; label: string }) {
  const qr = buildQr(text);
  // No code rather than a shortened one — the card beside it is still complete.
  if (!qr) return null;
  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      width={148}
      height={148}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="shrink-0"
    >
      <rect width={qr.size} height={qr.size} fill="#fff" />
      <path d={qr.path} fill="#000" />
    </svg>
  );
}

export function CareCard({ triage, preparedAt }: { triage: TriageResult; preparedAt: string }) {
  const { t, uiLanguage } = useApp();
  const toast = useToast();

  const symptoms = triage.symptoms.map((s) => symptomLabel(s.code, uiLanguage)).join(', ');
  const duration = durationLabel(triage.duration?.hours, uiLanguage);
  const excluded = (triage.ruledOut ?? []).map((id) => ruledOutText(id, uiLanguage)).filter((x): x is string => Boolean(x));

  /** Plain text, so it survives WhatsApp, SMS and a paste into any records system. */
  const asText = [
    `${t('cardShareIntro')} — ${formatDate(preparedAt, uiLanguage)}`,
    `${t('careCardFor')}: ${personLabel(triage, t)}`,
    `${t('careCardSymptoms')}: ${symptoms || '—'}`,
    duration ? `${t('careCardDuration')}: ${duration}` : null,
    `${t('careCardUrgency')}: ${t(`urgency_${triage.urgency}`)}`,
    `${t('careCardDepartment')}: ${specialtyLabel(triage.specialty, uiLanguage)}`,
    excluded.length ? `${t('careCardRuledOut')}: ${excluded.join('; ')}` : null,
    triage.warningSigns.length ? `${t('careCardWatch')}: ${triage.warningSigns.join('; ')}` : null,
    '',
    t('careCardNotDiagnosis'),
  ]
    .filter(Boolean)
    .join('\n');

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: t('careCard'), text: asText });
        return;
      }
      await navigator.clipboard.writeText(asText);
      toast(t('copied'));
    } catch {
      /* the share sheet was dismissed — nothing to report */
    }
  };

  return (
    <div className="space-y-4">
      <article className="sv-print-card sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-5">
        <header className="border-b-2 border-[var(--ink)] pb-3">
          <h2 className="font-display text-[1.6rem] leading-tight text-[var(--ink)]">{t('careCard')}</h2>
          <p className="text-[var(--ink-soft)]">{t('careCardSub')}</p>
        </header>

        <dl className="mt-3">
          <Row label={t('careCardWhen')} value={formatDate(preparedAt, uiLanguage)} />
          <Row label={t('careCardFor')} value={personLabel(triage, t)} />
          <Row label={t('careCardSymptoms')} value={symptoms || '—'} />
          {duration && <Row label={t('careCardDuration')} value={duration} />}
          <Row label={t('careCardUrgency')} value={t(`urgency_${triage.urgency}`)} />
          <Row label={t('careCardDepartment')} value={specialtyLabel(triage.specialty, uiLanguage)} />
        </dl>

        {excluded.length > 0 && (
          <section className="mt-4">
            <h3 className="text-[0.78rem] font-bold tracking-[0.12em] text-[var(--ink-faint)] uppercase">{t('careCardRuledOut')}</h3>
            <ul className="mt-1.5 space-y-1">
              {excluded.map((item) => (
                <li key={item} className="text-[0.95rem] text-[var(--ink)]">
                  — {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {triage.warningSigns.length > 0 && (
          <section className="mt-4">
            <h3 className="text-[0.78rem] font-bold tracking-[0.12em] text-[var(--ink-faint)] uppercase">{t('careCardWatch')}</h3>
            <ul className="mt-1.5 space-y-1">
              {triage.warningSigns.map((sign) => (
                <li key={sign} className="text-[0.95rem] text-[var(--ink)]">
                  — {sign}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/*
          The square sits with the disclaimer rather than at the top, because the card
          is the document and the code is a convenience for copying it — putting it
          first would suggest the paper is a pointer to something else.
        */}
        <div className="mt-4 flex items-start gap-4 border-t border-[var(--line)] pt-3">
          <CardQr text={asText} label={t('careCardQrAlt')} />
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--ink-soft)]">
            <span className="block font-semibold text-[var(--ink)]">{t('careCardQr')}</span>
            {t('careCardQrHelp')}
          </p>
        </div>

        <p className="mt-4 border-t border-[var(--line)] pt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{t('careCardNotDiagnosis')}</p>
      </article>

      {/* Actions are excluded from the printed sheet. */}
      <div className="sv-no-print grid grid-cols-2 gap-2">
        <Button onClick={() => window.print()} size="lg" icon={<Printer className="size-5" aria-hidden />}>
          {t('print')}
        </Button>
        <Button variant="secondary" size="lg" onClick={share} icon={<Share2 className="size-5" aria-hidden />}>
          {t('shareCard')}
        </Button>
      </div>
    </div>
  );
}
