// #ModelConfig #PuterGateway — where each provider's calls actually go.
//
// The engine is *told* its provider rather than guessing from the model id,
// because an id cannot say who serves it: `openai/gpt-oss-120b` is Groq's here
// and OpenRouter's elsewhere, and Puter re-serves Google's ids under Google's
// names. The Gherkin covers the resolution rules; this covers the wire — the
// URL, the auth header and the model id that leave the process — which is the
// half a routing mistake actually breaks.
//
// One tiny table and one request is the smallest way in through the public API,
// and the stub fetch records the outgoing call and then fails — so nothing here
// has to fabricate six providers' response shapes.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import type { Row, TablePlan } from '@tamedtable/core';
import { createHeadlessRunner, type HeadlessRunnerOptions } from './index.ts';

const ROWS: Row[] = [{ title: 'a video' }];
const PLAN: TablePlan = {
  table: 'routing.csv',
  columns: [{ id: 'title' }],
  transformations: [],
};

interface SentRequest {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
}

async function capture(opts: HeadlessRunnerOptions): Promise<SentRequest> {
  let sent: SentRequest | undefined;
  const runner = createHeadlessRunner({
    apiKey: 'test-key',
    maxRetries: 0,
    ...opts,
    fetch: (input, init) => {
      sent = {
        url: input instanceof Request ? input.url : String(input),
        headers: new Headers(init?.headers ?? {}),
        body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
      };
      // Recording is the whole point; failing here keeps the test off every
      // provider's response format.
      return Promise.reject(new Error('captured'));
    },
  });
  await runner.loadParsed(ROWS, PLAN);
  await runner.request('add a column').catch(() => {});
  assert.ok(sent, 'no request left the runner');
  return sent;
}

test('Gemini calls Google, keyed by header, with the model id in the path', async () => {
  const sent = await capture({ provider: 'gemini', model: 'gemini-3.6-flash', cellModel: 'gemini-3.1-flash-lite' });
  assert.match(sent.url, /^https:\/\/generativelanguage\.googleapis\.com\//);
  assert.match(sent.url, /models\/gemini-3\.6-flash/);
  assert.equal(sent.headers.get('x-goog-api-key'), 'test-key');
});

test('OpenAI calls its own chat-completions endpoint', async () => {
  const sent = await capture({ provider: 'openai', model: 'gpt-5.5', cellModel: 'gpt-5.4-mini' });
  assert.equal(sent.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(sent.headers.get('authorization'), 'Bearer test-key');
  assert.equal(sent.body['model'], 'gpt-5.5');
});

test('Anthropic calls the messages endpoint with its own key header', async () => {
  const sent = await capture({ provider: 'anthropic', model: 'claude-sonnet-4-6', cellModel: 'claude-haiku-4-5' });
  assert.equal(sent.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(sent.headers.get('x-api-key'), 'test-key');
  assert.equal(sent.body['model'], 'claude-sonnet-4-6');
});

test('Groq calls its OpenAI-compatible endpoint with the vendor-prefixed id intact', async () => {
  const sent = await capture({ provider: 'groq', model: 'openai/gpt-oss-120b', cellModel: 'openai/gpt-oss-20b' });
  assert.equal(sent.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(sent.headers.get('authorization'), 'Bearer test-key');
  // The slash is Groq's own naming, not a routing hint — it must survive.
  assert.equal(sent.body['model'], 'openai/gpt-oss-120b');
});

test('OpenRouter calls its own endpoint', async () => {
  const sent = await capture({ provider: 'openrouter', model: 'cohere/north-mini-code:free', cellModel: 'cohere/north-mini-code:free' });
  assert.equal(sent.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(sent.body['model'], 'cohere/north-mini-code:free');
});

test('Cerebras (bench-only) calls its own endpoint', async () => {
  const sent = await capture({ provider: 'cerebras', model: 'gpt-oss-120b', cellModel: 'gpt-oss-120b' });
  assert.equal(sent.url, 'https://api.cerebras.ai/v1/chat/completions');
});

test('Puter calls the driver endpoint, the OpenAI body wrapped in its envelope', async () => {
  const sent = await capture({ provider: 'puter', model: 'gemini-3.6-flash', cellModel: 'gemini-3.1-flash-lite' });
  assert.equal(sent.url, 'https://api.puter.com/drivers/call');
  assert.equal(sent.headers.get('authorization'), 'Bearer test-key');
  assert.equal(sent.body['interface'], 'puter-chat-completion');
  assert.equal(sent.body['driver'], 'ai-chat');
  assert.equal(sent.body['method'], 'complete');
  const args = sent.body['args'] as Record<string, unknown>;
  assert.equal(args['model'], 'gemini-3.6-flash');
  // Always non-streaming: Puter's streamed frames carry no tool calls.
  assert.equal(args['stream'], undefined);
});

test('The same model id goes to whichever provider the runner was told', async () => {
  // The reason the runner is told rather than left to guess: this id is
  // served, under this exact name, by both.
  const viaGroq = await capture({ provider: 'groq', model: 'openai/gpt-oss-120b', cellModel: 'openai/gpt-oss-120b' });
  const viaOpenRouter = await capture({ provider: 'openrouter', model: 'openai/gpt-oss-120b', cellModel: 'openai/gpt-oss-120b' });
  assert.match(viaGroq.url, /api\.groq\.com/);
  assert.match(viaOpenRouter.url, /openrouter\.ai/);
});

test('With no provider told, the id still routes — the fallback the CLI and bench use', async () => {
  const sent = await capture({ model: 'claude-sonnet-4-6', cellModel: 'claude-haiku-4-5' });
  assert.equal(sent.url, 'https://api.anthropic.com/v1/messages');
});
