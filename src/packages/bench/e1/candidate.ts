// #BenchE1
// The stand-in chat app: one model, TamedTable MCP's server instructions and
// the apply_plan tool, nothing from headless's planner. It keeps one
// conversation per scenario, the way a chat keeps its history, and sees the
// table the way MCP shows it: a show_table result carrying the recipe.

import { createOpenAI } from '@ai-sdk/openai';
import { generateText, jsonSchema, tool, type LanguageModel, type ModelMessage } from 'ai';
import { APPLY_PLAN_DESCRIPTION, applyPlanInputSchema, serverInstructions, type InstructionsVariant } from '@tamedtable/mcp-server';
import type { TablePlan } from '@tamedtable/table-plan';

export type CandidateProvider = 'openai' | 'openrouter';

export interface CandidateConfig {
  provider: CandidateProvider;
  model: string;
  variant: InstructionsVariant;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}

/** What one model call produced. */
export interface CandidateStep {
  plan?: { ops: unknown[]; summary?: string };
  text: string;
  inputTokens: number;
  outputTokens: number;
  ms: number;
}

/** The chat app around TamedTable: a generic assistant. A host's own system
 *  prompt is far longer; this keeps only what bears on tool use. */
const HOST_PROMPT =
  'You are a helpful assistant in a chat app. The user has connected the TamedTable app, which holds their table. Use its tools to do what the user asks. The server instructions below come from TamedTable.';

export function languageModel(cfg: CandidateConfig): LanguageModel {
  const f = cfg.fetch ? { fetch: cfg.fetch } : {};
  if (cfg.provider === 'openrouter') {
    return createOpenAI({ apiKey: cfg.apiKey, baseURL: 'https://openrouter.ai/api/v1', ...f }).chat(cfg.model);
  }
  return createOpenAI({ apiKey: cfg.apiKey, ...f })(cfg.model);
}

export function systemPrompt(variant: InstructionsVariant): string {
  return `${HOST_PROMPT}\n\n# TamedTable server instructions\n\n${serverInstructions(variant)}`;
}

const SHOW_TABLE_SCHEMA = {
  type: 'object',
  properties: { table_id: { type: 'string' } },
  required: ['table_id'],
  additionalProperties: false,
} as const;

/** The recipe as MCP shows it: the plan without the source path. */
export function recipeOf(spec: TablePlan): { columns: unknown[]; transformations: unknown[] } {
  return { columns: spec.columns, transformations: spec.transformations };
}

export class CandidateChat {
  readonly system: string;
  readonly toolsChars: number;
  private readonly model: LanguageModel;
  private readonly messages: ModelMessage[] = [];
  private readonly tools;
  private calls = 0;
  /** apply_plan calls still owed a tool result, answered when the next turn
   *  or the next engine verdict arrives. */
  private open: Array<{ id: string; name: string }> = [];
  revision = 1;

  constructor(cfg: CandidateConfig, model: LanguageModel = languageModel(cfg)) {
    this.model = model;
    this.system = systemPrompt(cfg.variant);
    const applySchema = applyPlanInputSchema();
    this.tools = {
      apply_plan: tool({ description: APPLY_PLAN_DESCRIPTION, inputSchema: jsonSchema(applySchema) }),
      show_table: tool({
        description: 'Show the table in the grid and return its revision, columns, row count and recipe.',
        inputSchema: jsonSchema(SHOW_TABLE_SCHEMA),
      }),
    };
    this.toolsChars = APPLY_PLAN_DESCRIPTION.length + JSON.stringify(applySchema).length + JSON.stringify(SHOW_TABLE_SCHEMA).length;
  }

  private answerOpen(result: unknown): void {
    if (this.open.length === 0) return;
    this.messages.push({
      role: 'tool',
      content: this.open.map((c) => ({ type: 'tool-result' as const, toolCallId: c.id, toolName: c.name, output: { type: 'json' as const, value: result as never } })),
    });
    this.open = [];
  }

  private showTable(spec: TablePlan): Record<string, unknown> {
    return { ok: true, table_id: 't1', revision: this.revision, recipe: recipeOf(spec) };
  }

  /** A new user request. The chat app has already shown the table, so the
   *  conversation gets a show_table call and its result first. */
  newTurn(spec: TablePlan, request: string, prior?: string): void {
    if (this.open.length) {
      this.revision++;
      this.answerOpen({ ok: true, table_id: 't1', revision: this.revision });
    }
    const id = `show_${++this.calls}`;
    this.messages.push({ role: 'assistant', content: [{ type: 'tool-call', toolCallId: id, toolName: 'show_table', input: { table_id: 't1' } }] });
    this.messages.push({ role: 'tool', content: [{ type: 'tool-result', toolCallId: id, toolName: 'show_table', output: { type: 'json', value: this.showTable(spec) as never } }] });
    // A web answer from the previous turn would sit in the chat already.
    if (prior) this.messages.push({ role: 'assistant', content: prior });
    this.messages.push({ role: 'user', content: request });
  }

  /** apply_plan's answer when it refused the plan: the model tries again. */
  rejected(error: string): void {
    this.answerOpen({ ok: false, table_id: 't1', revision: this.revision, error });
  }

  /** One model call. A show_table call is answered in place and the call
   *  repeated, so it never counts as an attempt. */
  async step(spec: TablePlan): Promise<CandidateStep> {
    const started = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;
    for (let hop = 0; hop < 4; hop++) {
      const res = await generateText({ model: this.model, system: this.system, messages: this.messages, tools: this.tools, maxRetries: 3 });
      inputTokens += res.usage.inputTokens ?? 0;
      outputTokens += res.usage.outputTokens ?? 0;
      this.messages.push(...res.response.messages);
      const calls = res.toolCalls;
      const apply = calls.find((c) => c.toolName === 'apply_plan');
      if (apply) {
        // Owe a result to every call; extra apply_plan calls in the same
        // message are refused, one plan per request.
        const extra = calls.filter((c) => c !== apply);
        if (extra.length) {
          this.messages.push({
            role: 'tool',
            content: extra.map((c) => ({ type: 'tool-result' as const, toolCallId: c.toolCallId, toolName: c.toolName, output: { type: 'json' as const, value: { ok: false, error: 'One apply_plan call per request: this one was ignored.' } } })),
          });
        }
        this.open = [{ id: apply.toolCallId, name: 'apply_plan' }];
        const input = apply.input as { operations?: unknown[]; summary?: string };
        return { plan: { ops: Array.isArray(input.operations) ? input.operations : [], summary: input.summary }, text: res.text, inputTokens, outputTokens, ms: Date.now() - started };
      }
      if (calls.length === 0) return { text: res.text, inputTokens, outputTokens, ms: Date.now() - started };
      this.messages.push({
        role: 'tool',
        content: calls.map((c) => ({ type: 'tool-result' as const, toolCallId: c.toolCallId, toolName: c.toolName, output: { type: 'json' as const, value: this.showTable(spec) as never } })),
      });
    }
    return { text: '', inputTokens, outputTokens, ms: Date.now() - started };
  }
}
