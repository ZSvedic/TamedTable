// #BenchE1
// One JSONL record per scenario, and the report that reads them. Pure: no file
// or network access, so the grading rules are unit-tested.

import type { E1Session, TurnLog } from './intercept.ts';

export interface E1Record {
  run: string;
  model: string;
  variant: string;
  feature: string;
  scenario: string;
  /** Cucumber's verdict: PASSED, FAILED, … */
  status: string;
  /** First lines of the failure, when the scenario failed. */
  failure?: string;
  failedStep?: string;
  turns: TurnLog[];
  liveCalls: number;
  questions: number;
  promptChars: number;
  errors: string[];
}

export type Verdict = 'correct' | 'silently-wrong' | 'plan-shape' | 'visible-failure' | 'harness-error' | 'not-graded';

/** A Then step that checks the plan's shape (how many steps, which kinds)
 *  rather than the data: a different valid plan fails it with the right rows. */
const PLAN_SHAPE_STEP = /\bspec\b|\btransformations?\b/i;

/** How one scenario counts. A failed scenario whose every turn committed a
 *  plan nobody refused is the case that matters most: the model wrote a valid
 *  plan that did the wrong thing. It still needs a human read, since a live
 *  cell call can fail an exact-value check on its own. When the failing step
 *  checked the plan's shape instead of the data, it is `plan-shape`: the data
 *  may well be right, and only reading the plan tells. */
export function verdict(r: Pick<E1Record, 'status' | 'turns' | 'errors' | 'failedStep'>): Verdict {
  if (r.turns.length === 0) return 'not-graded';
  if (r.errors.length > 0) return 'harness-error';
  if (r.status === 'PASSED') return 'correct';
  if (r.turns.some((t) => t.outcome !== 'committed')) return 'visible-failure';
  if (r.failedStep && PLAN_SHAPE_STEP.test(r.failedStep)) return 'plan-shape';
  return 'silently-wrong';
}

export function recordFor(
  meta: { run: string; model: string; variant: string; feature: string; scenario: string; status: string; failure?: string },
  s: E1Session,
): E1Record {
  return { ...meta, failedStep: s.failedStep, turns: s.turns, liveCalls: s.liveCalls, questions: s.questions, promptChars: s.promptChars, errors: s.errors };
}

export interface RunSummary {
  run: string;
  model: string;
  variant: string;
  graded: number;
  correct: number;
  silentlyWrong: number;
  planShape: number;
  visibleFailure: number;
  harnessError: number;
  turns: number;
  /** Attempts the schema or the engine refused. */
  invalidPlans: number;
  /** Turns that needed more than one attempt. */
  retriedTurns: number;
  /** Scenarios that made at least one live call. */
  liveScenarios: number;
  promptChars: number;
  inputTokens: number;
  outputTokens: number;
}

export function summarize(records: E1Record[]): RunSummary[] {
  const byRun = new Map<string, E1Record[]>();
  for (const r of records) byRun.set(r.run, [...(byRun.get(r.run) ?? []), r]);
  return [...byRun.entries()].map(([run, rs]) => {
    const graded = rs.filter((r) => verdict(r) !== 'not-graded');
    const count = (v: Verdict) => graded.filter((r) => verdict(r) === v).length;
    const turns = graded.flatMap((r) => r.turns);
    const attempts = turns.flatMap((t) => t.attempts);
    return {
      run,
      model: rs[0]!.model,
      variant: rs[0]!.variant,
      graded: graded.length,
      correct: count('correct'),
      silentlyWrong: count('silently-wrong'),
      planShape: count('plan-shape'),
      visibleFailure: count('visible-failure'),
      harnessError: count('harness-error'),
      turns: turns.length,
      invalidPlans: attempts.filter((a) => a.error).length,
      retriedTurns: turns.filter((t) => t.attempts.length > 1).length,
      liveScenarios: graded.filter((r) => r.liveCalls > 0).length,
      promptChars: rs[0]!.promptChars,
      inputTokens: attempts.reduce((n, a) => n + a.inputTokens, 0),
      outputTokens: attempts.reduce((n, a) => n + a.outputTokens, 0),
    };
  });
}

const pct = (n: number, d: number) => (d === 0 ? '-' : `${Math.round((100 * n) / d)}%`);

/** The markdown report: one summary row per run, then every failure with the
 *  plan the model wrote next to the plan the recorded planner wrote. */
export function reportMarkdown(records: E1Record[]): string {
  const lines: string[] = [];
  lines.push('| Run | Model | Instructions | Graded | Correct | Silently wrong | Plan shape | Visible failure | Harness error | Invalid plans | Retried turns | Live-cell scenarios | Prompt chars | Tokens in / out |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of summarize(records)) {
    lines.push(`| ${s.run} | ${s.model} | ${s.variant} | ${s.graded} | ${s.correct} (${pct(s.correct, s.graded)}) | ${s.silentlyWrong} (${pct(s.silentlyWrong, s.graded)}) | ${s.planShape} | ${s.visibleFailure} | ${s.harnessError} | ${s.invalidPlans} of ${s.turns} turns | ${s.retriedTurns} | ${s.liveScenarios} | ${s.promptChars} | ${s.inputTokens} / ${s.outputTokens} |`);
  }
  const failures = records.filter((r) => !['correct', 'not-graded'].includes(verdict(r)));
  if (failures.length) {
    lines.push('', '## Failures', '');
    for (const r of failures) {
      lines.push(`### ${r.run}: ${r.feature} / ${r.scenario}`, '', `Verdict: **${verdict(r)}**${r.liveCalls ? ` (${r.liveCalls} live calls)` : ''}`, '');
      if (r.failedStep) lines.push(`Failed at: \`${r.failedStep}\``, '');
      if (r.failure) lines.push('```', r.failure, '```', '');
      for (const e of r.errors) lines.push(`- Harness: ${e}`);
      for (const t of r.turns) {
        lines.push(`- Request: "${t.request}", ${t.outcome} after ${t.attempts.length} attempt(s)`);
        for (const a of t.attempts) {
          lines.push(`  - ${a.after}: ${a.ops ? '`' + JSON.stringify(a.ops) + '`' : `words: "${(a.text ?? '').slice(0, 200)}"`}${a.error ? ` → refused: ${a.error.slice(0, 300)}` : ''}`);
        }
        if (t.reference) lines.push(`  - recorded planner: \`${JSON.stringify(t.reference)}\``);
      }
      lines.push('');
    }
  }
  return lines.join('\n') + '\n';
}
