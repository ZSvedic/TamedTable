import { describe, expect, test } from 'bun:test';
import { validateTablePlan } from '@tamedtable/table-plan';
import { applyPlanInputSchema, modelTools, plannerKnowledge, serverInstructions, stepSchema, tools } from './index.ts';

describe('tool contract', () => {
  test('the model sees ten tools and the grid calls three more', () => {
    expect(modelTools().map((t) => t.name)).toEqual([
      'open_table', 'show_table', 'profile_table', 'query_table', 'apply_plan',
      'get_pending', 'fill_cells', 'undo', 'export_table', 'delete_table',
    ]);
    expect(tools().filter((t) => !t.calledBy.includes('model')).map((t) => t.name)).toEqual(['get_page', 'edit_cells', 'upload_chunk']);
  });

  test('every write takes the revision it started from', () => {
    for (const name of ['apply_plan', 'undo', 'edit_cells']) {
      const t = tools().find((x) => x.name === name)!;
      expect((t.inputSchema.required as string[])).toContain('revision');
    }
  });

  test('the step schema offers every TablePlan kind and hides provenance', () => {
    const arms = stepSchema().oneOf as Array<{ properties: Record<string, { const?: string }> }>;
    expect(arms.map((a) => a.properties.kind!.const)).toEqual([
      'filter', 'mutate', 'select', 'sort', 'group', 'join', 'split', 'validate', 'pivot', 'unpivot',
    ]);
    expect(JSON.stringify(applyPlanInputSchema())).not.toMatch(/"query"|"name"|\$schema/);
  });

  test('a step the schema describes validates as a TablePlan step', () => {
    const plan = { columns: [{ id: 'Country' }], transformations: [{ kind: 'filter', pred: { js: "row.Country === 'USA'" } }] };
    expect(() => validateTablePlan(plan)).not.toThrow();
  });
});

describe('server instructions', () => {
  const md = [
    '## SYSTEM_PROMPT', 'Intro.', '### Questions', 'q', '### Rules', 'r', '### Spec shape', 's',
    '### Transformation grammar', 'g', '### Expr shapes', 'e', '### Few-shots', 'Examples.',
    '#### "Sort by X"', '- add sort', '#### "Which X?"', '1. query_table `{sql}`', '2. reply `{text}`',
    '#### "hello"', '- reply `{text}`', '### Patch lifecycle', 'p',
    '## MCP_INSTRUCTIONS', 'Use apply_plan.', '', '{PLANNER_KNOWLEDGE}',
  ].join('\n');

  test('planner knowledge keeps change examples and drops the question machinery', () => {
    const k = plannerKnowledge(md.split('## MCP_INSTRUCTIONS')[0]!.replace('## SYSTEM_PROMPT\n', ''));
    expect(k).toContain('#### "Sort by X"');
    expect(k).not.toContain('Which X?');
    expect(k).not.toContain('hello');
    expect(k).not.toMatch(/Questions|Patch lifecycle|Intro/);
  });

  test('schema variant leaves the placeholder empty, planner fills it', () => {
    expect(serverInstructions('schema', md)).toBe('Use apply_plan.');
    expect(serverInstructions('planner', md)).toMatch(/^Use apply_plan\.\n\n### Rules\n\nr/);
  });

  test('the real prompt file assembles in both variants', () => {
    expect(serverInstructions('schema')).not.toContain('{PLANNER_KNOWLEDGE}');
    expect(serverInstructions('planner')).toContain('### Transformation grammar');
  });
});
