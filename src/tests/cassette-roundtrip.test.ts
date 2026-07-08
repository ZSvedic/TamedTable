// #Cassettes
// The readable-request acceptance property: for every committed cassette entry
// that carries a `request`, `fingerprint(method, url, prefix + suffix)` must
// equal the entry key — i.e. the human-readable record reconstructs the exact
// bytes the fingerprint hashed. Entries recorded before the format carried
// requests have none and are skipped (they upgrade on re-record).
// See spec/code-contract.md § Headless ("Recording model calls for tests").

import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { entryBody, fingerprint, parseCassette } from '@tamedtable/cassette';

const CASSETTE_DIR = join(import.meta.dir, '..', '..', 'cassettes');

describe('committed cassettes round-trip their readable requests', () => {
  for (const name of readdirSync(CASSETTE_DIR).filter((f) => f.endsWith('.json')).sort()) {
    test(name, async () => {
      const tape = parseCassette(readFileSync(join(CASSETTE_DIR, name), 'utf8'));
      for (const [key, entry] of Object.entries(tape.entries)) {
        if (!entry.request) continue;
        const { method, url, prefixId } = entry.request;
        if (prefixId != null) {
          expect(tape.prefixes[prefixId]).toBeDefined();
        }
        expect(await fingerprint(method, url, entryBody(tape, entry)!)).toBe(key);
      }
    });
  }
});
