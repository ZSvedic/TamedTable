// Helper — the REPL child process for the PTY test in cli-sigint.test.ts. Runs
// the real runCli over the committed customers fixture with a cassette-replay
// fetch delayed 3 s per call, so an NL request stays in flight long enough for
// a Ctrl-C to land mid-request.
//
// Guarded with import.meta.main: cucumber's `tests/**/!(*.test).ts` glob
// imports this file in every profile, and the import must stay side-effect
// free. Only the PTY driver actually executes it (`bun <this file>`).
import { join } from 'node:path';
import { runCli } from '../packages/cli/index.ts';
import { cassetteFetch } from './cassette.ts';

const REPO_ROOT = join(import.meta.dirname, '..', '..');

export async function main(): Promise<void> {
  const inner = cassetteFetch({
    mode: 'replay',
    file: join(REPO_ROOT, 'cassettes', 'repl-commands.json'),
  });
  const fetch: typeof inner = async (input, init) => {
    const res = await inner(input, init);
    await new Promise((r) => setTimeout(r, 3000));
    return res;
  };

  const res = await runCli([join(REPO_ROOT, 'spec', 'test-cases', 'customers-input.csv')], {
    fetch,
    apiKey: 'cassette-replay-placeholder',
  });
  console.log(`\nRUNCLI-RETURNED exit=${res.exitCode}`);
  process.exit(res.exitCode);
}

if (import.meta.main) await main();
