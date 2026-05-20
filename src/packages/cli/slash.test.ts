import { describe, it, expect, beforeAll } from 'bun:test';
import { Writable } from 'node:stream';
import { readFile, unlink, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCliRunner, handleSlashCommand, type CliRunner } from './index.ts';
import { loadEnv, readJsonl, validateSpec } from '@tamedtable/core';

// This file lives at src/packages/cli/slash.test.ts.
const REPO_ROOT = join(import.meta.dirname, '../../..');
const SPEC_TC = join(REPO_ROOT, 'spec/test-cases');
const TEMP = join(REPO_ROOT, 'temp');
const tcFixture = (name: string) => join(SPEC_TC, name);

interface Harness {
  stream: Writable;
  text: () => string;
  runner: CliRunner;
}

function makeHarness(): Harness {
  const chunks: string[] = [];
  const stream = new Writable({ write(c, _e, cb) { chunks.push(c.toString()); cb(); } });
  return { stream, text: () => chunks.join(''), runner: createCliRunner({ stdout: stream, quiet: true }) };
}

async function loadedHarness(csv = tcFixture('dedupe-input.csv')): Promise<Harness> {
  const h = makeHarness();
  await h.runner.loadInput(csv);
  return h;
}

const tmpPath = (suffix: string) => join(tmpdir(), `tamedtable-${process.pid}-${Date.now()}.${suffix}`);

beforeAll(() => { loadEnv(); });

describe('handleSlashCommand', () => {
  it('returns "exit" for the exit alias', async () => {
    const h = makeHarness();
    expect(await handleSlashCommand('exit', h.runner, h.stream)).toBe('exit');
    expect(await handleSlashCommand(':exit', h.runner, h.stream)).toBe('exit');
  });

  it('returns "handled" for :help and writes a usage screen', async () => {
    const h = makeHarness();
    expect(await handleSlashCommand(':help', h.runner, h.stream)).toBe('handled');
    const out = h.text();
    expect(out).toContain('TamedTable');
    expect(out).toContain(':help');
    expect(out).toContain(':undo');
    expect(out).toContain(':redo');
    expect(out).toContain('exit');
  });

  it('returns "unhandled" for free-form text (passes through to the LLM path)', async () => {
    const h = makeHarness();
    expect(await handleSlashCommand('normalize phone numbers', h.runner, h.stream)).toBe('unhandled');
    expect(await handleSlashCommand('helpme', h.runner, h.stream)).toBe('unhandled');
    expect(await handleSlashCommand('undo this thing', h.runner, h.stream)).toBe('unhandled');
  });

  it('on :undo with no transformations writes "nothing to undo."', async () => {
    const h = await loadedHarness();
    expect(await handleSlashCommand(':undo', h.runner, h.stream)).toBe('handled');
    expect(h.text()).toContain('nothing to undo.');
    expect(h.runner.currentSpec().transformations.length).toBe(0);
  });

  it('on :save without a path prints usage', async () => {
    const h = await loadedHarness();
    expect(await handleSlashCommand(':save', h.runner, h.stream)).toBe('handled');
    expect(h.text()).toContain(':save: missing path');
  });

  it('on :save <path> writes current rows as JSONL', async () => {
    const h = await loadedHarness();
    const out = tmpPath('jsonl');
    try {
      expect(await handleSlashCommand(`:save ${out}`, h.runner, h.stream)).toBe('handled');
      expect(h.text()).toContain(`saved ${h.runner.currentRows().length} rows to ${out}`);
      await stat(out);
      const written = await readJsonl(out);
      expect(written.length).toBe(h.runner.currentRows().length);
    } finally {
      await unlink(out).catch(() => {});
    }
  });

  it('on :save with an unknown file type prints an error', async () => {
    const h = await loadedHarness();
    expect(await handleSlashCommand(`:save ${tmpPath('txt')}`, h.runner, h.stream)).toBe('handled');
    expect(h.text()).toContain(':save: unknown file type');
  });

  it('on :save-flow without a path prints usage', async () => {
    const h = await loadedHarness();
    expect(await handleSlashCommand(':save-flow', h.runner, h.stream)).toBe('handled');
    expect(h.text()).toContain(':save-flow: missing path');
  });

  it('on :save-flow writes a flow whose source is relative to the flow file dir', async () => {
    const h = await loadedHarness();
    const flowFixture = JSON.parse(await readFile(tcFixture('dedupe.flow'), 'utf8'));
    await h.runner.setSpec(validateSpec(flowFixture.spec));
    const outFlow = tmpPath('flow');
    try {
      expect(await handleSlashCommand(`:save-flow ${outFlow}`, h.runner, h.stream)).toBe('handled');
      expect(h.text()).toContain('saved flow');
      const saved = JSON.parse(await readFile(outFlow, 'utf8'));
      expect(saved.version).toBe(1);
      expect(typeof saved.source).toBe('string');
      const resolved = join(tmpdir(), saved.source);
      expect(resolved.endsWith('test-cases/dedupe-input.csv')).toBe(true);
      expect(saved.spec.transformations.length).toBe(h.runner.currentSpec().transformations.length);
    } finally {
      await unlink(outFlow).catch(() => {});
    }
  });

  it('on :save-flow followed by execute round-trips the same rows', async () => {
    const h = await loadedHarness();
    const flowFixture = JSON.parse(await readFile(tcFixture('dedupe.flow'), 'utf8'));
    await h.runner.setSpec(validateSpec(flowFixture.spec));
    const expectedRows = h.runner.currentRows();
    const outFlow = join(TEMP, `repl-save-flow-roundtrip-${process.pid}.flow`);
    const outJsonl = join(TEMP, `repl-save-flow-roundtrip-${process.pid}.jsonl`);
    try {
      await handleSlashCommand(`:save-flow ${outFlow}`, h.runner, h.stream);
      const { runCli } = await import('./index.ts');
      const result = await runCli(['execute', outFlow, '--output', outJsonl.split('/').pop()!]);
      expect(result.exitCode).toBe(0);
      const replayed = await readJsonl(outJsonl);
      expect(replayed.length).toBe(expectedRows.length);
      for (let i = 0; i < expectedRows.length; i++) {
        expect(replayed[i]).toEqual(expectedRows[i] as Record<string, unknown>);
      }
    } finally {
      await unlink(outFlow).catch(() => {});
      await unlink(outJsonl).catch(() => {});
    }
  });

  it('on :undo after a JS-only setSpec pops the last transformation and reprints', async () => {
    const h = await loadedHarness();
    const flow = JSON.parse(await readFile(tcFixture('dedupe.flow'), 'utf8'));
    await h.runner.setSpec(validateSpec(flow.spec));
    const beforeLen = h.runner.currentSpec().transformations.length;
    expect(beforeLen).toBeGreaterThan(0);
    expect(await handleSlashCommand(':undo', h.runner, h.stream)).toBe('handled');
    const out = h.text();
    expect(out).toContain('undid:');
    expect(out).toContain('filter rows where');
    expect(h.runner.currentSpec().transformations.length).toBe(beforeLen - 1);
  });
});
