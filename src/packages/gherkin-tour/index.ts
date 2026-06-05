export type TourAction =
  | { kind: 'load-file';    filename: string }
  | { kind: 'prefill-chat'; text: string    }
  | { kind: 'show-golden'                   }
  | { kind: 'display'                       }

export interface TourStep     { keyword: string; text: string; action: TourAction }
export interface TourScenario { name: string; steps: TourStep[] }

// ── Step classification ────────────────────────────────────────────────────

function classify(text: string): TourAction {
  const load = text.match(/^"(.+)" is loaded$/);
  if (load) return { kind: 'load-file', filename: load[1]! };

  const chat = text.match(/^user requests "(.+)"$/);
  if (chat) return { kind: 'prefill-chat', text: chat[1]! };

  if (text === 'the table matches the golden output') return { kind: 'show-golden' };

  return { kind: 'display' };
}

// ── Parser ─────────────────────────────────────────────────────────────────

type State = 'idle' | 'background' | 'scenario' | 'outline' | 'docstring';

const STEP_WORDS = new Set(['Given', 'When', 'Then', 'And', 'But']);

export function parseTours(source: string): TourScenario[] {
  const result: TourScenario[] = [];

  let state: State = 'idle';
  let docstringReturn: State = 'idle';

  // Background steps: top-level apply to all; rule-level apply only inside that rule.
  let topBg: TourStep[] = [];
  let ruleBg: TourStep[] = [];
  let inRule = false;

  // Current scenario being accumulated.
  let scenarioName = '';
  let scenarioTags: string[] = [];
  let scenarioSteps: TourStep[] = [];
  let hasScenario = false;

  // Tags that have been read but not yet attached to a Scenario.
  let pendingTags: string[] = [];

  function flush() {
    if (hasScenario && scenarioTags.includes('@tutorial')) {
      const bg = inRule ? [...topBg, ...ruleBg] : [...topBg];
      result.push({ name: scenarioName, steps: [...bg, ...scenarioSteps] });
    }
    hasScenario = false;
    scenarioName = '';
    scenarioTags = [];
    scenarioSteps = [];
  }

  for (const raw of source.split('\n')) {
    const line = raw.trim();

    // Docstring mode: absorb everything until closing """.
    if (state === 'docstring') {
      if (line === '"""') state = docstringReturn;
      continue;
    }
    if (line === '"""') {
      docstringReturn = state;
      state = 'docstring';
      continue;
    }

    // Skip comments and blank lines.
    if (line === '' || line.startsWith('#')) continue;

    // Feature: — no-op.
    if (line.startsWith('Feature:')) continue;

    // Rule: — new rule scope; finalize any open scenario first.
    if (line.startsWith('Rule:')) {
      flush();
      // Rule-scoped background resets; top-level background is preserved.
      ruleBg = [];
      inRule = true;
      state = 'idle';
      continue;
    }

    // @tags — accumulate; attached to the next Scenario.
    if (line.startsWith('@')) {
      pendingTags = line.split(/\s+/).filter((t) => t.startsWith('@'));
      continue;
    }

    // Background:
    if (line.startsWith('Background:')) {
      flush();
      pendingTags = [];
      if (inRule) {
        ruleBg = [];
        state = 'background';
      } else {
        topBg = [];
        state = 'background';
      }
      continue;
    }

    // Scenario Outline: — skip the whole block, including Examples table.
    if (line.startsWith('Scenario Outline:')) {
      flush();
      pendingTags = [];
      state = 'outline';
      continue;
    }

    // Scenario:
    if (line.startsWith('Scenario:')) {
      flush();
      scenarioName = line.slice('Scenario:'.length).trim();
      scenarioTags = pendingTags;
      scenarioSteps = [];
      hasScenario = true;
      pendingTags = [];
      state = 'scenario';
      continue;
    }

    // Step line.
    const keyword = line.split(/\s+/)[0] ?? '';
    if (STEP_WORDS.has(keyword)) {
      const text = line.slice(keyword.length).trim();
      const step: TourStep = { keyword, text, action: classify(text) };
      if (state === 'background') {
        inRule ? ruleBg.push(step) : topBg.push(step);
      } else if (state === 'scenario') {
        scenarioSteps.push(step);
      }
      // In outline state, steps are silently dropped.
      continue;
    }

    // Everything else (Examples:, table rows, etc.) in outline state — skip.
  }

  flush();
  return result;
}
