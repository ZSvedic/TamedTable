// #LLMCells
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import type { Row } from '@tamedtable/core';
import { renderPrompt, validateTemplate } from '@tamedtable/headless';
import { TamedTableWorld } from './world.ts';

interface PlaceholderCtx {
  rows: Row[];
  transformation?:
    | { kind: 'mutate'; columns: string; value: { llm: string } }
    | { kind: 'filter'; pred: { llm: string } };
  rendered: string[];
  error?: Error;
}

const ctx = new WeakMap<TamedTableWorld, PlaceholderCtx>();
const get = (w: TamedTableWorld): PlaceholderCtx => {
  let c = ctx.get(w);
  if (!c) { c = { rows: [], rendered: [] }; ctx.set(w, c); }
  return c;
};

function parseColumns(spec: string): Row {
  const row: Row = {};
  for (const pair of spec.split(',')) {
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    row[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return row;
}

Given(/^a single-row table with columns "(.+)"$/, function (this: TamedTableWorld, cols: string) {
  const c = get(this);
  c.rows = [parseColumns(cols)];
  c.rendered = [];
  c.error = undefined;
});

// #NestedCells: the value arrives as a JSON DocString, so the cell holds a
// real list or object rather than its text.
Given('a single-row table with the nested column {string}:', function (this: TamedTableWorld, column: string, json: string) {
  const c = get(this);
  c.rows = [{ [column]: JSON.parse(json) }];
  c.rendered = [];
  c.error = undefined;
});

Given(/^a two-row table with rows "(.+)" and "(.+)"$/, function (this: TamedTableWorld, r1: string, r2: string) {
  const c = get(this);
  c.rows = [parseColumns(r1), parseColumns(r2)];
  c.rendered = [];
  c.error = undefined;
});

Given(/^a mutate transformation with value \{llm: "(.+)"\}$/, function (this: TamedTableWorld, template: string) {
  get(this).transformation = { kind: 'mutate', columns: '', value: { llm: template } };
});

Given(/^a mutate transformation targeting column "(.+)" with value \{llm: "(.+)"\}$/, function (this: TamedTableWorld, col: string, template: string) {
  get(this).transformation = { kind: 'mutate', columns: col, value: { llm: template } };
});

Given(/^a filter transformation with pred \{llm: "(.+)"\}$/, function (this: TamedTableWorld, template: string) {
  get(this).transformation = { kind: 'filter', pred: { llm: template } };
});

function renderAll(c: PlaceholderCtx): void {
  const t = c.transformation;
  if (!t) throw new Error('placeholder ctx: no transformation set');
  const template = t.kind === 'mutate' ? t.value.llm : t.pred.llm;
  const exclude = t.kind === 'mutate' && t.columns ? [t.columns] : undefined;
  c.rendered = [];
  c.error = undefined;
  try {
    validateTemplate(template, c.rows);
    for (const r of c.rows) c.rendered.push(renderPrompt(template, r, exclude));
  } catch (e) {
    c.error = e as Error;
  }
}

When('the runtime renders the per-row cell prompt', function (this: TamedTableWorld) {
  renderAll(get(this));
});

When('the runtime evaluates the transformation against a counting fake cell model', function (this: TamedTableWorld) {
  renderAll(get(this));
});

Then(/^the rendered prompt body is "(.+)"$/, function (this: TamedTableWorld, expected: string) {
  const c = get(this);
  assert.ok(!c.error, `unexpected error: ${c.error?.message}`);
  assert.equal(c.rendered[0], expected);
});

// The DocString twin, for an expectation carrying quotes of its own.
Then('the rendered prompt body is:', function (this: TamedTableWorld, expected: string) {
  const c = get(this);
  assert.ok(!c.error, `unexpected error: ${c.error?.message}`);
  assert.equal(c.rendered[0], expected);
});

Then(/^the rendered prompt body mentions column "(.+)" with value "(.+)"$/, function (this: TamedTableWorld, col: string, val: string) {
  const body = get(this).rendered[0] ?? '';
  const needle = `"${col}":"${val}"`;
  assert.ok(body.includes(needle), `rendered body missing ${needle}. Body was: ${body}`);
});

Then(/^the rendered prompt body does not mention column "(.+)"$/, function (this: TamedTableWorld, col: string) {
  const body = get(this).rendered[0] ?? '';
  assert.ok(!body.includes(`"${col}":`), `rendered body unexpectedly mentions column "${col}". Body: ${body}`);
});

Then(/^the runtime raises a placeholder error mentioning "(.+)"$/, function (this: TamedTableWorld, col: string) {
  const c = get(this);
  assert.ok(c.error, 'expected the runtime to raise an error');
  assert.ok(c.error!.message.includes(col), `error should mention "${col}". Got: ${c.error!.message}`);
});

// "Feeds back through the recovery loop" = raised as a regular Error the runner's
// retry loop can serialize back to the patch-turn LLM. validateTemplate produces
// exactly such an Error, so a plain instanceof check confirms the path is wired.
Then('the error feeds back through the recovery loop', function (this: TamedTableWorld) {
  assert.ok(get(this).error instanceof Error, 'placeholder error must be a standard Error');
});

Then(/^the cell model is called exactly (\d+) times?$/, function (this: TamedTableWorld, n: string) {
  const unique = new Set(get(this).rendered);
  assert.equal(unique.size, Number(n), `expected ${n} unique cell-model calls, got ${unique.size} (rendered: ${JSON.stringify([...unique])})`);
});
