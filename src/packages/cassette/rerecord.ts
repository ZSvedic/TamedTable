// #Cassettes
// Rerecord one feature's cassette from scratch: delete
// cassettes/<feature>.json, then record that feature across every surface
// profile (headless, cli, web). Delete-then-record is the correct recovery
// from a flaky recording — record mode returns cached entries, so rerunning
// without deleting would replay the frozen bad response instead of hitting
// the live API (spec/code-contract.md § Recording model calls).
//
// Run from src/: `bun run rerecord <feature>` (needs GEMINI_API_KEY)
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const SRC_DIR = join(REPO_ROOT, 'src');

const feature = process.argv[2];
if (!feature || process.argv.length > 3) {
  console.error('usage: bun run rerecord <feature>   e.g. bun run rerecord clean-up');
  process.exit(2);
}

const cassette = join(REPO_ROOT, 'cassettes', `${feature}.json`);
if (existsSync(cassette)) {
  rmSync(cassette);
  console.log(`deleted cassettes/${feature}.json — recording fresh`);
} else {
  console.log(`no cassettes/${feature}.json yet — recording fresh`);
}

let failed = false;
for (const profile of ['headless', 'cli', 'web']) {
  console.log(`\n== recording ${feature} (${profile}) ==`);
  const run = spawnSync('bun', ['--bun', 'cucumber-js', '--profile', profile], {
    cwd: SRC_DIR,
    stdio: 'inherit',
    env: { ...process.env, TAMEDTABLE_CASSETTE: 'record', TAMEDTABLE_FEATURES: feature },
  });
  if (run.status !== 0) failed = true;
}
if (failed) console.error(`\nrerecord ${feature}: at least one profile failed — see output above`);
process.exit(failed ? 1 : 0);
