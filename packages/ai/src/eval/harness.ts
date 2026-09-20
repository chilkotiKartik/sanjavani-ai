import { LANGUAGES, urgencyRank, type Language, type Urgency } from '@sanjeevani/types';
import type { Thresholds, Vignette } from '@sanjeevani/medical-safety/vignettes';
import { ConversationEngine, newConversationMemory } from '../orchestrator/engine';
import type { ConversationMemory } from '../orchestrator/types';
import { DeterministicProvider } from '../providers/mock/deterministic';

/**
 * Scoring the triage engine against labelled cases.
 *
 * ## Why this is a module and not a script
 *
 * Two places run this: `npm run eval`, which fails CI when the numbers slip, and the
 * dashboard in the web app, which runs it in the visitor's own browser so the safety
 * claim can be re-derived in front of them rather than read off a slide.
 *
 * If those two had separate implementations they would eventually disagree, and the
 * version people *see* would be the one nobody checks. So the scoring lives here, once,
 * and both callers do nothing but present its output.
 *
 * ## What is deliberately excluded
 *
 * The engine is built with the deterministic provider and a facility finder that
 * returns nothing. No model, no maps key, no network. That is not a convenience — it
 * is the measurement. The claim being tested is that the safety rules hold on their
 * own, so anything that could quietly do the work for them is removed.
 */

/** How one case came out. */
export interface EvalOutcome {
  vignette: Vignette;
  firedEmergency: boolean;
  category: string | null;
  /** Where triage ended up on the last turn. */
  urgency: Urgency | null;
  /**
   * The highest urgency reached at any point in the exchange.
   *
   * This, not the final value, is what the hard ceiling is checked against: being told
   * to call an ambulance on turn one and talked back down on turn two is still having
   * been told to call an ambulance.
   */
  peakUrgency: Urgency | null;
  /** How long the whole exchange took, in milliseconds. */
  ms: number;
  /** Set when the case failed, and says how. */
  failure: string | null;
  /** Over-triage is recorded but never fails a run. */
  overTriaged: boolean;
}

export interface EvalSummary {
  totals: { cases: number; emergencies: number; nonEmergencies: number };
  emergencyDetection: { caught: number; missed: number; recall: number; wrongCategory: number };
  falseAlarms: { count: number; rate: number };
  urgency: { underTriaged: number; overTriaged: number; falseEscalations: number };
  byLanguage: { language: Language; cases: number; failures: number }[];
  failures: { id: string; failure: string; note: string }[];
  /** Total time spent inside the engine, in milliseconds. */
  ms: number;
}

/**
 * The engine used for measurement: deterministic, offline, no facility lookup.
 *
 * `aiTimeoutMs` is small rather than zero so the deterministic provider still travels
 * the same code path a real one would, timeout included.
 */
export function createEvalEngine(): ConversationEngine {
  return new ConversationEngine({
    llm: new DeterministicProvider(),
    facilities: { find: async () => ({ facilities: [], status: 'not_needed' as const }) },
    aiTimeoutMs: 1000,
  });
}

/** Runs one case end to end and judges it. */
export async function runVignette(engine: ConversationEngine, vignette: Vignette): Promise<EvalOutcome> {
  const started = Date.now();
  let memory: ConversationMemory = newConversationMemory();
  let firedEmergency = false;
  let category: string | null = null;
  let urgency: Urgency | null = null;
  let peakUrgency: Urgency | null = null;

  for (const text of vignette.turns) {
    const outcome = await engine.handleTurn(memory, {
      text,
      inputMode: 'text',
      languagePreference: 'auto',
      recentTurns: [],
    });
    memory = outcome.memory;
    // An emergency anywhere in the exchange counts. Escalating on a later turn is
    // still a catch — it is exactly how the red-flag screens are meant to work.
    if (outcome.response.emergency) {
      firedEmergency = true;
      category = outcome.response.emergency.category;
    }
    if (outcome.response.triage) {
      urgency = outcome.response.triage.urgency;
      if (!peakUrgency || urgencyRank(urgency) > urgencyRank(peakUrgency)) peakUrgency = urgency;
    }
    /*
     * An emergency takeover is the loudest thing this app can do, so it counts towards
     * the peak even though it bypasses triage. Otherwise a case could be shown the
     * full emergency screen and still satisfy a hard ceiling.
     */
    if (outcome.response.emergency) peakUrgency = 'emergency';
  }

  let failure: string | null = null;
  let overTriaged = false;

  if (vignette.expectEmergency && !firedEmergency) {
    failure = 'MISSED EMERGENCY — the circuit breaker did not fire';
  } else if (!vignette.expectEmergency && firedEmergency) {
    failure = `FALSE ALARM — fired as ${category}`;
  } else if (vignette.expectEmergency && vignette.expectCategory && category !== vignette.expectCategory) {
    // The right escalation filed under the wrong heading. The person is still sent to
    // help, but the instructions they are shown are the wrong ones — a real failure.
    failure = `WRONG CATEGORY — expected ${vignette.expectCategory}, got ${category}`;
  }

  if (!failure && vignette.minUrgency && urgency && urgencyRank(urgency) < urgencyRank(vignette.minUrgency)) {
    failure = `UNDER-TRIAGE — expected at least ${vignette.minUrgency}, got ${urgency}`;
  }
  /*
   * The hard ceiling, checked against the peak rather than the final value. This is
   * the check that catches an engine telling someone to call an ambulance without
   * ever raising a formal emergency — which the `expectEmergency` check alone cannot
   * see, because no red-flag rule fired.
   */
  if (!failure && vignette.failAboveUrgency && peakUrgency && urgencyRank(peakUrgency) > urgencyRank(vignette.failAboveUrgency)) {
    failure = `FALSE ESCALATION — reached ${peakUrgency} where nothing above ${vignette.failAboveUrgency} is acceptable`;
  }
  if (!failure && vignette.maxReasonableUrgency && urgency && urgencyRank(urgency) > urgencyRank(vignette.maxReasonableUrgency)) {
    overTriaged = true;
  }

  return { vignette, firedEmergency, category, urgency, peakUrgency, ms: Date.now() - started, failure, overTriaged };
}

/**
 * Runs every case in order, reporting progress as it goes.
 *
 * Sequential on purpose. In the browser this drives a counter someone is watching, and
 * a progress bar that jumps from 0 to 47 tells them nothing about whether the work is
 * real. `onProgress` is also where the caller yields to the event loop, so the page
 * stays responsive while the engine works.
 */
export async function runAll(
  vignettes: readonly Vignette[],
  onProgress?: (done: number, total: number, last: EvalOutcome) => void | Promise<void>,
): Promise<EvalOutcome[]> {
  const engine = createEvalEngine();
  const outcomes: EvalOutcome[] = [];
  for (const vignette of vignettes) {
    const outcome = await runVignette(engine, vignette);
    outcomes.push(outcome);
    await onProgress?.(outcomes.length, vignettes.length, outcome);
  }
  return outcomes;
}

/** Aggregates outcomes into the numbers that get reported. */
export function summarise(outcomes: readonly EvalOutcome[]): EvalSummary {
  const emergencies = outcomes.filter((o) => o.vignette.expectEmergency);
  const nonEmergencies = outcomes.filter((o) => !o.vignette.expectEmergency);

  const caught = emergencies.filter((o) => o.firedEmergency).length;
  const falseAlarms = nonEmergencies.filter((o) => o.firedEmergency).length;

  return {
    totals: { cases: outcomes.length, emergencies: emergencies.length, nonEmergencies: nonEmergencies.length },
    emergencyDetection: {
      caught,
      missed: emergencies.length - caught,
      // An empty set is reported as perfect rather than as a division by zero; the
      // threshold check below is what actually decides whether that is acceptable.
      recall: emergencies.length === 0 ? 1 : caught / emergencies.length,
      wrongCategory: outcomes.filter((o) => o.failure?.startsWith('WRONG CATEGORY')).length,
    },
    falseAlarms: {
      count: falseAlarms,
      rate: nonEmergencies.length === 0 ? 0 : falseAlarms / nonEmergencies.length,
    },
    urgency: {
      underTriaged: outcomes.filter((o) => o.failure?.startsWith('UNDER-TRIAGE')).length,
      overTriaged: outcomes.filter((o) => o.overTriaged).length,
      falseEscalations: outcomes.filter((o) => o.failure?.startsWith('FALSE ESCALATION')).length,
    },
    // Driven by LANGUAGES rather than a list written here, so a language added to the
    // product cannot quietly go unreported by the suite that is meant to vouch for it.
    byLanguage: LANGUAGES.map((language) => {
      const forLanguage = outcomes.filter((o) => o.vignette.language === language);
      return { language, cases: forLanguage.length, failures: forLanguage.filter((o) => o.failure).length };
    }).filter((row) => row.cases > 0),
    failures: outcomes
      .filter((o) => o.failure)
      .map((o) => ({ id: o.vignette.id, failure: o.failure ?? '', note: o.vignette.note })),
    ms: outcomes.reduce((total, o) => total + o.ms, 0),
  };
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Which thresholds a summary violates, in words. An empty array means the run passed.
 *
 * Wrong-category is always a breach and has no threshold to relax: there is no number
 * of people correctly escalated and then handed the wrong instructions that is fine.
 */
export function breaches(summary: EvalSummary, thresholds: Thresholds): string[] {
  const found: string[] = [];
  if (summary.emergencyDetection.recall < thresholds.minEmergencyRecall) {
    found.push(`emergency recall ${pct(summary.emergencyDetection.recall)} is below the required ${pct(thresholds.minEmergencyRecall)}`);
  }
  if (summary.falseAlarms.rate > thresholds.maxFalseAlarmRate) {
    found.push(`false-alarm rate ${pct(summary.falseAlarms.rate)} exceeds the ceiling ${pct(thresholds.maxFalseAlarmRate)}`);
  }
  if (summary.urgency.underTriaged > thresholds.maxUnderTriage) {
    found.push(`${summary.urgency.underTriaged} case(s) under-triaged; the limit is ${thresholds.maxUnderTriage}`);
  }
  if (summary.emergencyDetection.wrongCategory > 0) {
    found.push(`${summary.emergencyDetection.wrongCategory} emergency case(s) filed under the wrong category`);
  }
  // No threshold to relax: these are cases where nothing is happening to anyone, and
  // being told to call an ambulance is the failure that teaches people to ignore the
  // app — which is itself a safety failure.
  if (summary.urgency.falseEscalations > 0) {
    found.push(`${summary.urgency.falseEscalations} case(s) escalated to emergency advice with nothing happening`);
  }
  return found;
}
