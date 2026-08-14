// One-off migration (2026-07, remove-view-fields PR), parked for the record.
// The SYSTEM_PROMPT in spec/prompt-app-edit.md dropped the view fields
// (filter/sort/page/summary) from its "Spec shape" line and the /filter,
// /sort, /page patchable paths, which orphans every cassette entry whose
// fingerprint covers a request body embedding the prompt. This script
// re-keyed them offline: rebuild each body as prefix + suffix, apply the
// identical textual edit, recompute the fingerprint, re-key the entry, and
// edit `_prefixes` in place. Responses stayed byte-identical. Entries with no
// `request` field were untouched (their bodies never embedded SYSTEM_PROMPT:
// batch cell evaluations, so their fingerprints survived).
//
// Run from the repo root: `bun process/migrate-cassettes-view-fields.ts`
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  entryBody,
  fingerprint,
  parseCassette,
  serializeCassette,
  type Cassette,
  type CassetteEntry,
} from '../src/packages/cassette/index.ts';

const EDITS: Array<[string, string]> = [
  [
    'transformations: T[], filter?, sort?, page?, summary? }',
    'transformations: T[] }',
  ],
  [', `/filter`, `/sort`, `/page`.', '.'],
];

const apply = (s: string): string => {
  for (const [from, to] of EDITS) s = s.split(from).join(to);
  return s;
};

const dir = fileURLToPath(new URL('../cassettes', import.meta.url));
let totMigrated = 0;
let totSame = 0;
let totNoRequest = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const path = join(dir, file);
  const tape: Cassette = parseCassette(readFileSync(path, 'utf8'));

  // Snapshot original bodies BEFORE editing prefixes in place.
  const originals = new Map<CassetteEntry, string | undefined>();
  for (const e of Object.values(tape.entries)) originals.set(e, entryBody(tape, e));

  for (const [id, p] of Object.entries(tape.prefixes)) tape.prefixes[id] = apply(p);

  const next: Record<string, CassetteEntry> = {};
  let migrated = 0;
  let same = 0;
  let noRequest = 0;
  for (const [fp, e] of Object.entries(tape.entries)) {
    const full = originals.get(e);
    if (full === undefined) {
      noRequest++;
      if (next[fp]) throw new Error(`${file}: duplicate key ${fp}`);
      next[fp] = e;
      continue;
    }
    const r = e.request!;
    const newFull = apply(full);
    const newSuffix = apply(r.suffix);
    const newPrefix = r.prefixId ? tape.prefixes[r.prefixId] ?? '' : '';
    if (newPrefix + newSuffix !== newFull) {
      throw new Error(`${file}: edit spans the prefix/suffix boundary for ${fp}`);
    }
    const newFp = await fingerprint(r.method, r.url, newFull);
    if (next[newFp]) throw new Error(`${file}: fingerprint collision ${newFp}`);
    next[newFp] = { ...e, request: { ...r, suffix: newSuffix } };
    if (newFp === fp) same++; else migrated++;
  }
  tape.entries = next;
  writeFileSync(path, serializeCassette(tape));
  console.log(`${file}: re-keyed ${migrated}, unchanged ${same}, no-request ${noRequest}`);
  totMigrated += migrated;
  totSame += same;
  totNoRequest += noRequest;
}
console.log(`TOTAL: re-keyed ${totMigrated}, unchanged ${totSame}, no-request ${totNoRequest}`);
