// #Cassettes
// Re-key committed cassettes after a *small* SYSTEM_PROMPT edit, one that
// would not change what the model answers, so the suite keeps replaying
// offline without a live re-record (spec/code-contract.md § Recording model
// calls). For every entry whose stored request body embeds the previous
// prompt (git HEAD's spec/prompt-app-edit.md), the current prompt is spliced
// in and the entry is re-keyed under the recomputed fingerprint; responses
// stay byte-identical. Entries recorded before the readable-request format
// (no `request` field) cannot be re-keyed and are reported.
//
// Run from src/: `bun run cassettes:rekey`
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprint, parseCassette, serializeCassette, splitBody, type Cassette, type CassetteEntry } from './index.ts';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const PROMPT_FILE = join(REPO_ROOT, 'spec', 'prompt-app-edit.md');
const CASSETTE_DIR = join(REPO_ROOT, 'cassettes');

/** The `## SYSTEM_PROMPT` section body, same parse the runtime does. */
function systemPromptSection(md: string): string {
  const sections: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^## (\S+)\s*$/);
    if (m) {
      if (current) sections[current] = buf.join('\n').trim();
      current = m[1]!;
      buf = [];
    } else if (current) buf.push(line);
  }
  if (current) sections[current] = buf.join('\n').trim();
  const prompt = sections.SYSTEM_PROMPT;
  if (!prompt) throw new Error('spec/prompt-app-edit.md: missing "## SYSTEM_PROMPT" section');
  return prompt;
}

/** The prompt as it appears inside a JSON request body: JSON-escaped. */
const escaped = (s: string): string => JSON.stringify(s).slice(1, -1);

const oldPrompt = systemPromptSection(
  execSync('git show HEAD:spec/prompt-app-edit.md', { cwd: REPO_ROOT, encoding: 'utf8' }),
);
const newPrompt = systemPromptSection(readFileSync(PROMPT_FILE, 'utf8'));
if (oldPrompt === newPrompt) {
  console.log('SYSTEM_PROMPT is unchanged vs git HEAD: nothing to re-key.');
  process.exit(0);
}
const oldEsc = escaped(oldPrompt);
const newEsc = escaped(newPrompt);

let rekeyed = 0;
let unreadable = 0;
for (const file of readdirSync(CASSETTE_DIR).filter((f) => f.endsWith('.json'))) {
  const path = join(CASSETTE_DIR, file);
  const tape = parseCassette(readFileSync(path, 'utf8'));
  const out: Cassette = { prefixes: {}, entries: {} };
  let touched = 0;
  for (const [fp, entry] of Object.entries(tape.entries) as Array<[string, CassetteEntry]>) {
    const req = entry.request;
    if (!req) {
      unreadable++;
      out.entries[fp] = entry; // replays as-is under its old key
      continue;
    }
    const body = (req.prefixId ? tape.prefixes[req.prefixId] ?? '' : '') + req.suffix;
    const newBody = body.includes(oldEsc) ? body.split(oldEsc).join(newEsc) : body;
    const key = newBody === body ? fp : await fingerprint(req.method, req.url, newBody);
    if (key !== fp) touched++;
    out.entries[key] = { ...entry, request: { method: req.method, url: req.url, ...splitBody(out, newBody) } };
  }
  if (touched > 0) writeFileSync(path, serializeCassette(out));
  rekeyed += touched;
  console.log(`${file}: ${touched} entr${touched === 1 ? 'y' : 'ies'} re-keyed`);
}
console.log(`done: ${rekeyed} re-keyed total${unreadable ? `, ${unreadable} old-format entries left as-is` : ''}`);
