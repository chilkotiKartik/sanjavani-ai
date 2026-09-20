import type { EvalOutcome, EvalSummary } from '@sanjeevani/ai/eval';

/**
 * Runs the safety evaluation in the visitor's own browser.
 *
 * ## Why this is worth the bundle
 *
 * Every project claims its safety numbers. Almost none let you check them. The whole
 * point of this module is that the "100% emergency recall" figure is not a number
 * someone typed into a slide — it is re-derived, on demand, in front of whoever is
 * asking, from the same 47 labelled cases and the same engine that CI runs.
 *
 * That is only possible because the safety rules have no dependency on a server: no
 * model call, no maps key, no database. They are deterministic TypeScript over a
 * lexicon, so they run anywhere the code does.
 *
 * ## Loaded on demand, never on the critical path
 *
 * The engine and the case set are several hundred kilobytes. Nobody arriving with
 * chest pain should pay for that, so nothing here is imported until someone presses
 * the button. The types above are erased at build time and cost nothing.
 */

export interface EvalRun {
  outcomes: EvalOutcome[];
  summary: EvalSummary;
  /** Threshold violations, in words. Empty means the run passed. */
  breaches: string[];
  /** Wall-clock time for the whole run, including the module load. */
  wallMs: number;
  /** Time spent inside the engine alone. */
  engineMs: number;
}

/**
 * Pulls the engine and the case set across, without running anything.
 *
 * Called when the section scrolls into reach so that pressing the button feels
 * instant rather than like a download.
 */
export async function warmEval(): Promise<void> {
  await Promise.all([import('@sanjeevani/ai/eval'), import('@sanjeevani/medical-safety/vignettes')]);
}

/**
 * Runs every case and scores it.
 *
 * `onProgress` fires after each case. It is deliberately not throttled or padded: the
 * run really does take tens of milliseconds, and dressing that up with an artificial
 * progress bar would be a lie about the thing being demonstrated.
 */
export async function runEvaluation(onProgress?: (done: number, total: number) => void): Promise<EvalRun> {
  const started = performance.now();
  const [{ breaches, runAll, summarise }, { THRESHOLDS, VIGNETTES }] = await Promise.all([
    import('@sanjeevani/ai/eval'),
    import('@sanjeevani/medical-safety/vignettes'),
  ]);

  const outcomes = await runAll(VIGNETTES, (done, total) => {
    onProgress?.(done, total);
  });
  const summary = summarise(outcomes);

  return {
    outcomes,
    summary,
    breaches: breaches(summary, THRESHOLDS),
    wallMs: Math.round(performance.now() - started),
    engineMs: summary.ms,
  };
}
