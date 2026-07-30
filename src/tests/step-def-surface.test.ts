// #StepDefSurface — a guard test.
//
// Step definitions must drive the app only through its public controller
// surface, never reach into internals. The @web Cucumber profile drives
// WebController directly — no DOM, no bundler, no clicks — so a step that pokes
// `controller.engine` / `.lazy` / `.patch` / `.settingsMgr` exercises a seam no
// real browser user can reach. That gap is exactly how three shipped features
// passed the suite while broken in the deployed app (PR #259). This test pins
// the private surface shut: the only fix for a violation is to route the step
// through a public controller method (as the #LookupJoin `load the lookup
// table` step now does via `chooseLookupFile()`).
import { describe, it, expect } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TESTS_DIR = import.meta.dir;
const PACKAGES_DIR = join(import.meta.dir, '../packages');
const SELF = join(TESTS_DIR, 'step-def-surface.test.ts');

// Private controller members no step definition may touch. Written with the
// leading and trailing dot so a member access (`controller.engine.foo`) is
// caught but an unrelated identifier (`engineConfig`, `dispatch`) is not.
const FORBIDDEN = ['.engine.', '.lazy.', '.patch.', '.settingsMgr.'];

function walk(dir: string, keep: (path: string) => boolean): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === 'node_modules') continue;
      out.push(...walk(path, keep));
    } else if (keep(path)) {
      out.push(path);
    }
  }
  return out;
}

// The step-definition surface the prompt scopes: every file under src/tests/
// (the app step defs), plus each package's own *.steps.ts.
const stepFiles = [
  ...walk(TESTS_DIR, (p) => p.endsWith('.ts') && p !== SELF),
  ...walk(PACKAGES_DIR, (p) => p.endsWith('.steps.ts')),
].sort();

const label = (file: string): string =>
  file.replace(PACKAGES_DIR + '/', 'packages/').replace(TESTS_DIR + '/', 'tests/');

describe('step definitions stay on the public controller surface', () => {
  it('finds step-definition files to check', () => {
    expect(stepFiles.length).toBeGreaterThan(0);
  });

  for (const file of stepFiles) {
    it(`${label(file)} reaches no controller internals`, () => {
      const hits: string[] = [];
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        for (const token of FORBIDDEN) {
          if (line.includes(token)) hits.push(`  ${i + 1}: ${line.trim()}   ⟵ ${token}`);
        }
      });
      expect(hits, `${label(file)} reaches past the controller surface:\n${hits.join('\n')}`).toEqual([]);
    });
  }
});
