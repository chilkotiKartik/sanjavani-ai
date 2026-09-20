/**
 * Measures the triage engine against the labelled vignettes and prints a report.
 *
 *   npm run eval            # table + pass/fail
 *   npm run eval -- --json  # machine-readable, for CI artefacts
 *
 * Exits non-zero when a threshold is breached, so a change that makes the engine less
 * safe fails the build rather than shipping quietly.
 *
 * ## This file only prints
 *
 * The engine, the scoring and the threshold checks all live in
 * `@sanjeevani/ai/eval`, because the dashboard in the web app runs the identical
 * cases through the identical scorer in the visitor's browser. Two implementations
 * would eventually disagree, and the one people *see* would be the one nobody checks.
 * So everything below the imports is presentation.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { breaches, runAll, summarise } from '@sanjeevani/ai/eval';
import { THRESHOLDS, VIGNETTES } from '@sanjeevani/medical-safety/vignettes';

function pct(n: number, d: number): string {
  return d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`;
}

async function main() {
  const asJson = process.argv.includes('--json');
  const outcomes = await runAll(VIGNETTES);
  const summary = summarise(outcomes);
  const failed = breaches(summary, THRESHOLDS);

  const report = { generatedAt: new Date().toISOString(), ...summary, thresholds: THRESHOLDS, breaches: failed };
  writeFileSync(resolve(import.meta.dirname, 'report.json'), JSON.stringify(report, null, 2));

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const bold = (s: string) => `\u001b[1m${s}\u001b[0m`;
    const green = (s: string) => `\u001b[32m${s}\u001b[0m`;
    const red = (s: string) => `\u001b[31m${s}\u001b[0m`;
    const yellow = (s: string) => `\u001b[33m${s}\u001b[0m`;
    const dim = (s: string) => `\u001b[2m${s}\u001b[0m`;

    const { totals, emergencyDetection: ed, falseAlarms, urgency } = summary;

    console.log(bold('\n  Triage evaluation\n'));
    console.log(`  ${totals.cases} cases — ${totals.emergencies} emergencies, ${totals.nonEmergencies} not\n`);

    console.log(bold('  Emergency detection'));
    console.log(`    caught              ${ed.caught}/${totals.emergencies}   ${pct(ed.caught, totals.emergencies)}`);
    console.log(`    ${ed.missed > 0 ? red('missed') : 'missed'}              ${ed.missed}`);
    console.log(`    wrong category      ${ed.wrongCategory}\n`);

    console.log(bold('  False alarms'));
    console.log(`    fired wrongly       ${falseAlarms.count}/${totals.nonEmergencies}   ${pct(falseAlarms.count, totals.nonEmergencies)}\n`);

    console.log(bold('  Urgency'));
    console.log(`    ${urgency.underTriaged > 0 ? red('under-triaged') : 'under-triaged'}       ${urgency.underTriaged}   ${dim('(dangerous)')}`);
    console.log(`    ${urgency.falseEscalations > 0 ? red('false escalation') : 'false escalation'}    ${urgency.falseEscalations}   ${dim('(emergency advice with nothing happening)')}`);
    console.log(`    ${urgency.overTriaged > 0 ? yellow('over-triaged') : 'over-triaged'}        ${urgency.overTriaged}   ${dim('(costly, tolerated)')}\n`);

    console.log(bold('  By language'));
    for (const row of summary.byLanguage) {
      console.log(`    ${row.language.padEnd(9)} ${row.cases} cases, ${row.failures} failing`);
    }

    if (summary.failures.length > 0) {
      console.log(bold(red('\n  Failures')));
      for (const f of summary.failures) console.log(`    ${f.id}\n      ${f.failure}\n      ${dim(f.note)}`);
    }

    console.log();
    if (failed.length === 0) {
      console.log(`  ${green('✓')} all thresholds met ${dim(`(${summary.ms}ms in the engine)`)}\n`);
    } else {
      console.log(`  ${red('✗')} thresholds breached:`);
      for (const b of failed) console.log(`      ${b}`);
      console.log();
    }
    console.log(dim('  These are engineering regression cases, not a clinical gold standard.'));
    console.log(dim('  See packages/medical-safety/src/eval/vignettes.ts for what that means.\n'));
  }

  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error('Evaluation failed to run:', error);
  process.exit(1);
});
