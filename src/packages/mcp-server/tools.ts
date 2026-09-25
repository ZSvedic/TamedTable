// #McpServer
// The tool contract TamedTable MCP exposes: ten tools the chat model sees and
// three only the grid calls. Names, descriptions and input schemas only: the
// table store that answers them is not built yet. Spec:
// spec/packages/mcp-server/behavior.md § Tools.

import { z } from 'zod';
import { ColumnSchema, TransformationUnionSchema } from '@tamedtable/table-plan';

export type JsonSchema = Record<string, unknown>;

export interface ToolDef {
  name: string;
  /** Who may call it. A grid-only tool is hidden from the model
   *  (MCP Apps `_meta.ui.visibility: ["app"]`). */
  calledBy: ReadonlyArray<'model' | 'grid'>;
  /** Read tools carry MCP's `readOnlyHint`, so hosts ask fewer confirmations. */
  readOnly: boolean;
  description: string;
  inputSchema: JsonSchema;
}

// Provenance the runner stamps on a committed step. The model never sees it
// (headless strips it from the prompt too), so the schema leaves it out.
const PROVENANCE_KEYS = ['query', 'name'];

/** Tidy a Zod-generated schema for a tool argument: drop `$schema`, the
 *  provenance keys, and the unrepresentable RegExp arm (`{}`) of split.on, which
 *  a model can only ever send as a slash-delimited string anyway. */
function tidy(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node
      .filter((n) => !(n && typeof n === 'object' && !Array.isArray(n) && Object.keys(n).length === 0))
      .map(tidy);
  }
  if (!node || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === '$schema') continue;
    if (k === 'properties' && v && typeof v === 'object') {
      out[k] = Object.fromEntries(
        Object.entries(v).filter(([p]) => !PROVENANCE_KEYS.includes(p)).map(([p, s]) => [p, tidy(s)]),
      );
      continue;
    }
    out[k] = tidy(v);
  }
  return out;
}

function toSchema(schema: z.ZodTypeAny): JsonSchema {
  return tidy(z.toJSONSchema(schema, { unrepresentable: 'any', io: 'input' })) as JsonSchema;
}

/** One recipe step: the TablePlan transformation union as JSON Schema. */
export function stepSchema(): JsonSchema {
  return toSchema(TransformationUnionSchema);
}

/** One recipe column: `{id, label?, format?}`. */
export function columnSchema(): JsonSchema {
  return toSchema(ColumnSchema);
}

/** apply_plan's `operations`: RFC 6902 ops over the recipe `{columns,
 *  transformations}`. Unlike headless's apply_spec_patch, `value` is typed
 *  JSON, not a JSON-encoded string: that encoding exists only for Gemini's
 *  function-calling layer, and the chat apps take real schemas. */
export function operationsSchema(): JsonSchema {
  const step = stepSchema();
  const column = columnSchema();
  return {
    type: 'array',
    minItems: 1,
    items: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'] },
        path: {
          type: 'string',
          description: 'JSON Pointer into the recipe, e.g. "/transformations/-" to append a step or "/columns/-" to append a column.',
        },
        from: { type: 'string' },
        value: {
          // The array arm stays untyped: repeating both schemas inside it would
          // double the tool's size, and the server validates the result anyway.
          description: 'For add/replace/test: a step, a column, or an array of steps or columns.',
          anyOf: [step, column, { type: 'array' }],
        },
      },
      required: ['op', 'path'],
      additionalProperties: false,
    },
  };
}

const TABLE_ID = { type: 'string', description: 'The table id an earlier tool result returned, e.g. "t1".' };
const REVISION = {
  type: 'integer',
  description: 'The revision you read the table at. A write against an older revision changes nothing and returns the current one.',
};
const ROW_EDITS = {
  type: 'array',
  items: {
    type: 'object',
    properties: { row_id: { type: 'string' }, column: { type: 'string' }, value: {} },
    required: ['row_id', 'column', 'value'],
    additionalProperties: false,
  },
};

function object(properties: Record<string, unknown>, required: string[]): JsonSchema {
  return { type: 'object', properties, required, additionalProperties: false };
}

/** apply_plan's input schema: the one tool E1 measures. */
export function applyPlanInputSchema(): JsonSchema {
  return object(
    {
      table_id: TABLE_ID,
      revision: REVISION,
      operations: operationsSchema(),
      summary: {
        type: 'string',
        description: 'One plain sentence saying what the step does and how it meets the request, e.g. "Kept the rows whose Country is in Europe."',
      },
    },
    ['table_id', 'revision', 'operations', 'summary'],
  );
}

export const APPLY_PLAN_DESCRIPTION =
  'Change the table by editing its recipe: RFC 6902 ops over {columns, transformations}. The engine checks the steps and runs them on every row. Returns the new revision, or an error to fix and retry.';

export function tools(): ToolDef[] {
  return [
    {
      name: 'open_table',
      calledBy: ['model', 'grid'],
      readOnly: false,
      description: 'Open a table from an http(s) URL, pasted CSV/TSV/JSONL text, or the built-in sample. Returns its table id and revision 1.',
      inputSchema: object(
        {
          url: { type: 'string', description: 'An http(s) URL the server fetches.' },
          text: { type: 'string', description: 'Pasted table text.' },
          sample: { type: 'boolean', description: 'Open the built-in sample table.' },
        },
        [],
      ),
    },
    {
      name: 'show_table',
      calledBy: ['model'],
      readOnly: true,
      description: 'Show the table in the grid and return its revision, columns, row count and recipe.',
      inputSchema: object({ table_id: TABLE_ID }, ['table_id']),
    },
    {
      name: 'profile_table',
      calledBy: ['model'],
      readOnly: true,
      description: 'Per-column statistics and suspicious values: empty cells, duplicates, mixed formats, outliers.',
      inputSchema: object({ table_id: TABLE_ID }, ['table_id']),
    },
    {
      name: 'query_table',
      calledBy: ['model'],
      readOnly: true,
      description: 'Answer a question with a read-only DuckDB SELECT over the relation `t` (the whole current table). Changes nothing and adds no history entry.',
      inputSchema: object({ table_id: TABLE_ID, sql: { type: 'string' } }, ['table_id', 'sql']),
    },
    {
      name: 'apply_plan',
      calledBy: ['model'],
      readOnly: false,
      description: APPLY_PLAN_DESCRIPTION,
      inputSchema: applyPlanInputSchema(),
    },
    {
      name: 'get_pending',
      calledBy: ['model'],
      readOnly: true,
      description: 'The next batch of up to 20 pending AI cells: row ids, input values, the prompt, and a batch token for fill_cells.',
      inputSchema: object({ table_id: TABLE_ID }, ['table_id']),
    },
    {
      name: 'fill_cells',
      calledBy: ['model'],
      readOnly: false,
      description: 'Save your answers for one batch of pending AI cells. Accepts only the cells the batch issued. Returns what it saved and the next batch.',
      inputSchema: object(
        {
          table_id: TABLE_ID,
          batch_token: { type: 'string', description: 'The token get_pending or the previous fill_cells returned.' },
          answers: ROW_EDITS,
        },
        ['table_id', 'batch_token', 'answers'],
      ),
    },
    {
      name: 'undo',
      calledBy: ['model', 'grid'],
      readOnly: false,
      description: 'Step back through the table history one change at a time.',
      inputSchema: object({ table_id: TABLE_ID, revision: REVISION }, ['table_id', 'revision']),
    },
    {
      name: 'export_table',
      calledBy: ['model', 'grid'],
      readOnly: true,
      description: 'Export the table as a CSV or XLSX download link, clipboard text, or the .flow recipe.',
      inputSchema: object(
        { table_id: TABLE_ID, format: { type: 'string', enum: ['csv', 'xlsx', 'clipboard', 'flow'] } },
        ['table_id', 'format'],
      ),
    },
    {
      name: 'delete_table',
      calledBy: ['model', 'grid'],
      readOnly: false,
      description: 'Delete the table from the server now.',
      inputSchema: object({ table_id: TABLE_ID }, ['table_id']),
    },
    {
      name: 'get_page',
      calledBy: ['grid'],
      readOnly: true,
      description: 'Rows for one grid page.',
      inputSchema: object(
        { table_id: TABLE_ID, offset: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 1, maximum: 500 } },
        ['table_id', 'offset', 'limit'],
      ),
    },
    {
      name: 'edit_cells',
      calledBy: ['grid'],
      readOnly: false,
      description: 'Manual corrections from the grid, stored as recipe steps.',
      inputSchema: object({ table_id: TABLE_ID, revision: REVISION, edits: ROW_EDITS }, ['table_id', 'revision', 'edits']),
    },
    {
      name: 'upload_chunk',
      calledBy: ['grid'],
      readOnly: false,
      description: 'One piece of a file picked in the grid. The last piece opens the table.',
      inputSchema: object(
        {
          upload_id: { type: 'string', description: 'Omit on the first piece; echo the id the first answer returned.' },
          name: { type: 'string' },
          index: { type: 'integer', minimum: 0 },
          total: { type: 'integer', minimum: 1 },
          data: { type: 'string', description: 'Base64 bytes.' },
        },
        ['name', 'index', 'total', 'data'],
      ),
    },
  ];
}

/** The tools a chat model sees. */
export function modelTools(): ToolDef[] {
  return tools().filter((t) => t.calledBy.includes('model'));
}
