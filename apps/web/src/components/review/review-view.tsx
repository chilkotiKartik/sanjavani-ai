'use client';

import type { ReviewCase, ReviewStats, ReviewVerdict, Urgency } from '@sanjeevani/types';
import { Button, SectionLabel, cn } from '@sanjeevani/ui';
import { AlertTriangle, CheckCircle2, LogOut, Stethoscope } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PageShell } from '@/components/chrome';
import { PageBody, Stagger, StaggerItem } from '@/components/motion/primitives';
import { useApp } from '@/components/providers/app-provider';
import { useToast } from '@/components/providers/toast-provider';
import { ApiError, reviewApi } from '@/lib/api';
import type { MessageKey } from '@/lib/i18n';
import { useReviewer } from '@/lib/use-reviewer';
import { CaseCard } from './case-card';

const VERDICT_LABEL: Record<ReviewVerdict, MessageKey> = {
  AGREE: 'revAgree',
  URGENCY_TOO_LOW: 'revTooLow',
  URGENCY_TOO_HIGH: 'revTooHigh',
  WRONG_SPECIALTY: 'revWrongSpecialty',
  INSUFFICIENT: 'revInsufficient',
};

function SignIn({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const { t } = useApp();
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await reviewApi.signIn(key);
      onSignedIn(token);
    } catch (caught) {
      /*
       * A 404 means no reviewer key is configured on this deployment; a 401 means the
       * key was wrong. They are reported differently because they are different
       * problems — one is "you typed it wrong", the other is "nobody has set this up".
       */
      const notConfigured = caught instanceof ApiError && caught.status === 404;
      setError(t(notConfigured ? 'revNotConfigured' : 'revBadKey'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="sv-card mx-auto max-w-md space-y-4 rounded-[var(--radius-lg)] border border-[var(--line)] p-6">
      <div className="flex items-center gap-2.5">
        <Stethoscope className="size-6 text-[var(--sage)]" aria-hidden />
        <h2 className="font-display text-[1.4rem] text-[var(--ink)]">{t('revSignInTitle')}</h2>
      </div>
      <p className="text-[0.95rem] leading-relaxed text-[var(--ink-soft)]">{t('revSignInIntro')}</p>
      <label className="block">
        <span className="text-[0.8rem] text-[var(--ink-faint)]">{t('revAccessKey')}</span>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
          required
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--paper-raised)] p-3 text-[var(--ink)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
        />
      </label>
      {error && (
        <p role="alert" className="text-[0.95rem] text-[var(--u-emergency)]">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={busy || key.length === 0}>
        {busy ? t('loading') : t('revSignIn')}
      </Button>
    </form>
  );
}

function Stats({ stats }: { stats: ReviewStats & { samplingNote: string } }) {
  const { t } = useApp();
  const rate = stats.agreementRate;
  return (
    <section aria-labelledby="rev-stats" className="space-y-3">
      <SectionLabel>
        <span id="rev-stats">{t('revStatsTitle')}</span>
      </SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        <div className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-3">
          <p className="font-display text-[1.6rem] text-[var(--ink)]">{rate === null ? '—' : `${Math.round(rate * 100)}%`}</p>
          <p className="text-[0.8rem] text-[var(--ink-faint)]">{t('revAgreement')}</p>
        </div>
        <div className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-3">
          <p className="font-display text-[1.6rem] text-[var(--ink)]">{stats.total}</p>
          <p className="text-[0.8rem] text-[var(--ink-faint)]">{t('revReviewed')}</p>
        </div>
        <div className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-3">
          <p className="font-display text-[1.6rem] text-[var(--ink)]">{stats.pending}</p>
          <p className="text-[0.8rem] text-[var(--ink-faint)]">{t('revPending')}</p>
        </div>
      </div>

      {/*
        The caveat is rendered beside the number rather than in a footnote. An
        agreement rate gathered from a queue that puts emergencies first is a floor on
        the hardest cases, and the figure is exactly the kind that gets lifted onto a
        slide without the sentence that makes it honest.
      */}
      <p className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--paper-sunk)] p-3 text-[0.9rem] leading-relaxed text-[var(--ink-soft)]">
        {stats.samplingNote}
      </p>

      {stats.total > 0 && (
        <ul className="flex flex-wrap gap-2">
          {(Object.entries(stats.byVerdict) as [ReviewVerdict, number][])
            .filter(([, n]) => n > 0)
            .map(([verdict, n]) => (
              <li
                key={verdict}
                className={cn(
                  'rounded-full border px-3 py-1 text-[0.9rem]',
                  verdict === 'AGREE'
                    ? 'border-[var(--sage)] text-[var(--sage)]'
                    : 'border-[var(--line)] text-[var(--ink-soft)]',
                )}
              >
                {t(VERDICT_LABEL[verdict])} · {n}
              </li>
            ))}
        </ul>
      )}

      {stats.contestedRules.length > 0 && (
        <div>
          <SectionLabel>{t('revContested')}</SectionLabel>
          <p className="mt-1 text-[0.9rem] text-[var(--ink-soft)]">{t('revContestedHelp')}</p>
          <ul className="mt-2 space-y-1">
            {stats.contestedRules.map((rule) => (
              <li key={rule.ruleId} className="flex items-center justify-between gap-3 text-[0.95rem]">
                <code className="truncate font-mono text-[0.85rem] text-[var(--ink)]">{rule.ruleId}</code>
                <span className="shrink-0 text-[var(--ink-faint)]">{rule.disagreements}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * The clinician review console.
 *
 * `docs/SAFETY.md` has always said that no clinician has reviewed the triage rules and
 * that a real deployment needs that review. This is where it happens: a queue of
 * decisions the system actually made, judged one at a time, with the result feeding a
 * second axis of safety measurement beside the vignette suite.
 *
 * It is the first and only consumer of a privileged role in this product, and it is
 * deliberately thin: sign in for a sitting, work the queue, see the running numbers.
 * There is nothing here to browse, search or export, because every one of those would
 * be a reason to hold more about a person than this needs — which is nothing at all.
 */
export function ReviewView() {
  const { t } = useApp();
  const toast = useToast();
  const { token, signIn, signOut } = useReviewer();

  const [cases, setCases] = useState<ReviewCase[] | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [stats, setStats] = useState<(ReviewStats & { samplingNote: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (current: string, live: () => boolean = () => true) => {
      try {
        const [queue, next] = await Promise.all([reviewApi.queue(current), reviewApi.stats(current)]);
        // A reply that arrives after the token changed, or after this unmounted, must
        // not overwrite newer state — signing out and back in is enough to race this.
        if (!live()) return;
        setCases(queue.cases);
        setRemaining(queue.remaining);
        setStats(next);
        setFailed(false);
      } catch (caught) {
        if (!live()) return;
        // An expired or revoked token means the sitting is over; anything else is a
        // transient failure worth offering a retry for.
        if (caught instanceof ApiError && (caught.status === 401 || caught.status === 403)) signOut();
        else setFailed(true);
      }
    },
    [signOut],
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    // `load` is async and touches state only after its first await, so nothing here
    // sets state synchronously; the guard above makes the late write safe as well.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on token change, guarded against a stale reply
    void load(token, () => active);
    return () => {
      active = false;
    };
  }, [token, load]);

  const submit = async (id: string, verdict: ReviewVerdict, suggestedUrgency: Urgency | null, note: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await reviewApi.submit(token, id, {
        verdict,
        ...(suggestedUrgency ? { suggestedUrgency } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast(t('revRecorded'));
      await load(token);
    } catch (caught) {
      // A 409 means someone already recorded this one in another tab. Reloading the
      // queue is the correct response, and it is not an error worth alarming about.
      const stale = caught instanceof ApiError && caught.status === 409;
      toast(t(stale ? 'revAlready' : 'somethingWrong'));
      if (stale) await load(token);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <PageShell title={t('revTitle')}>
        <PageBody>
          <SignIn onSignedIn={signIn} />
        </PageBody>
      </PageShell>
    );
  }

  const current = cases?.[0] ?? null;

  return (
    <PageShell
      title={t('revTitle')}
      actions={
        <button
          type="button"
          onClick={signOut}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-sm font-semibold text-[var(--ink)]"
        >
          <LogOut className="size-4" aria-hidden />
          {t('revSignOut')}
        </button>
      }
      wide
    >
      <PageBody>
        <Stagger className="space-y-8">
          <StaggerItem>
            <p className="leading-relaxed text-[var(--ink-soft)]">{t('revIntro')}</p>
            <p className="mt-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--paper-sunk)] p-3 text-[0.9rem] leading-relaxed text-[var(--ink-soft)]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t('revPrivacyNote')}
            </p>
          </StaggerItem>

          {failed && (
            <StaggerItem>
              <div className="sv-card rounded-[var(--radius-lg)] border border-[var(--line)] p-4">
                <p className="text-[var(--ink)]">{t('somethingWrong')}</p>
                <Button className="mt-3" onClick={() => void load(token)}>
                  {t('retry')}
                </Button>
              </div>
            </StaggerItem>
          )}

          {cases === null && !failed && <StaggerItem>{t('loading')}</StaggerItem>}

          {current && (
            <StaggerItem>
              <p className="mb-3 text-[0.9rem] text-[var(--ink-faint)]">{t('revRemaining', { n: remaining + cases!.length })}</p>
              {/* Keyed by case id so the verdict buttons reset between cases rather
                  than carrying a previous answer onto the next one. */}
              <CaseCard
                key={current.id}
                reviewCase={current}
                busy={busy}
                onSubmit={(verdict, urgency, note) => void submit(current.id, verdict, urgency, note)}
              />
            </StaggerItem>
          )}

          {cases !== null && cases.length === 0 && !failed && (
            <StaggerItem>
              <div className="sv-card flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] p-5">
                <CheckCircle2 className="size-6 shrink-0 text-[var(--sage)]" aria-hidden />
                <p className="text-[var(--ink)]">{t('revQueueEmpty')}</p>
              </div>
            </StaggerItem>
          )}

          {stats && (
            <StaggerItem>
              <Stats stats={stats} />
            </StaggerItem>
          )}
        </Stagger>
      </PageBody>
    </PageShell>
  );
}
