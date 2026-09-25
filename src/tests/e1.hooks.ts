// #BenchE1
// Wires E1 into the suite. Under TAMEDTABLE_CASSETTE=e1 (`bun run bench:e1`),
// each headless scenario's model calls go through E1's fetch wrapper, which
// hands every change turn to a stand-in chat model; the After hook appends one
// record per scenario to benchmarks/mcp-e1/runs/<run>.jsonl. Other modes never
// touch this file's state.
import { After, AfterStep, type ITestCaseHookParameter, type ITestStepHookParameter } from '@cucumber/cucumber';
import { appendFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { CandidateChat, e1Env, e1Fetch, newSession, recordFor, type E1Session } from '@tamedtable/bench/e1';
import { cassetteFetch, type FetchLike } from './cassette.ts';
import { curlFetch } from './curl-fetch.ts';

// Own path anchors, not world.ts's: world.ts imports this file, so its
// constants are not initialized yet when this module loads.
const REPO_ROOT = join(import.meta.dirname, '..', '..');
const CASSETTE_DIR = join(REPO_ROOT, 'cassettes');
const RUNS_DIR = join(REPO_ROOT, 'benchmarks', 'mcp-e1', 'runs');
const sessions = new Map<string, E1Session>();

/** The live API for calls the cassette misses. Web scenarios configure a
 *  made-up key, which replay never sends anywhere; a live call needs the real
 *  one, so Gemini calls carry GEMINI_API_KEY. */
function liveFetch(): FetchLike {
  const curl = curlFetch();
  return (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const key = process.env.GEMINI_API_KEY;
    if (!key || !url.includes('generativelanguage.googleapis.com')) return curl(input, init);
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    headers['x-goog-api-key'] = key;
    return curl(input, { ...init, headers });
  };
}

/** The fetch an E1 scenario's runner uses. */
export function e1RunnerFetch(scenario: ITestCaseHookParameter): FetchLike {
  const { cfg, maxAttempts } = e1Env();
  const feature = basename(scenario.pickle.uri, '.feature');
  const live = liveFetch();
  const chat = new CandidateChat({ ...cfg, fetch: live as typeof globalThis.fetch });
  const session = newSession(chat);
  sessions.set(scenario.pickle.id, session);
  const replay = cassetteFetch({ mode: 'replay', file: join(CASSETTE_DIR, `${feature}.json`) });
  return e1Fetch({ chat, replay, live, maxAttempts }, session);
}

AfterStep(function ({ pickle, pickleStep, result }: ITestStepHookParameter) {
  const session = sessions.get(pickle.id);
  if (session && !session.failedStep && result.status === 'FAILED') session.failedStep = pickleStep.text;
});

After(function (scenario: ITestCaseHookParameter) {
  if (process.env.TAMEDTABLE_CASSETTE !== 'e1') return;
  const session = sessions.get(scenario.pickle.id);
  if (!session) return;
  sessions.delete(scenario.pickle.id);
  const { run, cfg } = e1Env();
  const record = recordFor({
    run,
    model: cfg.model,
    variant: cfg.variant,
    feature: basename(scenario.pickle.uri, '.feature'),
    scenario: scenario.pickle.name,
    status: String(scenario.result?.status ?? 'UNKNOWN'),
    failure: scenario.result?.message?.split('\n').slice(0, 12).join('\n'),
  }, session);
  mkdirSync(RUNS_DIR, { recursive: true });
  appendFileSync(join(RUNS_DIR, `${run}.jsonl`), JSON.stringify(record) + '\n');
});
