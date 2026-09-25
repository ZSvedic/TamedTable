// #McpServer
// The server instructions a chat app receives with the tools. The text lives in
// spec/prompt-app-edit.md § MCP_INSTRUCTIONS; its `{PLANNER_KNOWLEDGE}`
// placeholder is filled from SYSTEM_PROMPT, trimmed to what a change needs, so
// the chat model learns the engine from the same text the Web planner reads.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROMPT_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'spec', 'prompt-app-edit.md');

/** Split markdown on headers of one level (`## `, `### `, …): the text before
 *  the first header lands under ''. */
function splitOn(md: string, level: number): Array<{ title: string; body: string }> {
  const marker = '#'.repeat(level) + ' ';
  const parts: Array<{ title: string; body: string }> = [{ title: '', body: '' }];
  for (const line of md.split('\n')) {
    if (line.startsWith(marker)) parts.push({ title: line.slice(marker.length).trim(), body: '' });
    else parts[parts.length - 1]!.body += line + '\n';
  }
  return parts;
}

function section(md: string, name: string): string {
  const found = splitOn(md, 2).find((p) => p.title === name);
  if (!found) throw new Error(`spec/prompt-app-edit.md: missing "## ${name}" section`);
  return found.body.trim();
}

// The SYSTEM_PROMPT subsections a change needs. The rest (Questions, Patch
// lifecycle, the opening paragraph) teach apply_spec_patch/query_table/reply,
// headless tools MCP does not have.
const KEPT = ['Rules', 'Spec shape', 'Transformation grammar', 'Expr shapes', 'Few-shots'];

/** @internal: exported for unit tests. SYSTEM_PROMPT without the question
 *  machinery: the kept subsections, and in Few-shots only the examples that
 *  change the table (a question or greeting example calls query_table or
 *  reply). */
export function plannerKnowledge(systemPrompt: string): string {
  const out: string[] = [];
  for (const sub of splitOn(systemPrompt, 3)) {
    if (!KEPT.includes(sub.title)) continue;
    let body = sub.body;
    if (sub.title === 'Few-shots') {
      const [intro, ...shots] = splitOn(body, 4);
      body = intro!.body + shots
        .filter((s) => !/\b(query_table|reply) `/.test(s.body))
        .map((s) => `#### ${s.title}\n${s.body}`)
        .join('');
    }
    out.push(`### ${sub.title}\n\n${body.trim()}`);
  }
  if (out.length !== KEPT.length) throw new Error('spec/prompt-app-edit.md: SYSTEM_PROMPT lost a subsection MCP_INSTRUCTIONS needs');
  return out.join('\n\n');
}

export type InstructionsVariant = 'schema' | 'planner';

/** The server instructions. `planner` (the default) carries the trimmed
 *  planner prompt; `schema` leaves the placeholder empty, so the chat model has
 *  only the short instructions and the tool schema (E1's first condition). */
export function serverInstructions(variant: InstructionsVariant = 'planner', md = readFileSync(PROMPT_FILE, 'utf8')): string {
  const template = section(md, 'MCP_INSTRUCTIONS');
  if (!template.includes('{PLANNER_KNOWLEDGE}')) {
    throw new Error('spec/prompt-app-edit.md: MCP_INSTRUCTIONS is missing the {PLANNER_KNOWLEDGE} placeholder');
  }
  const knowledge = variant === 'planner' ? plannerKnowledge(section(md, 'SYSTEM_PROMPT')) : '';
  return template.replace('{PLANNER_KNOWLEDGE}', knowledge).trim();
}
