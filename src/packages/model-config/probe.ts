// #ModelConfig #KeyProbe
// The only part of the module that touches the network: check a pasted key
// against its provider, and measure what its models cost and how fast they are.
// Hosts inject `fetch` (and, for measurement, a clock), so tests never reach a
// real API. Kept in its own entry point so the main entry stays offline.
// Spec: spec/packages/model-config/behavior.md § Checking a key — the probe.

import {
  defaultCellModel, puterEnvelope, PROVIDER_BASE_URL, PROVIDER_NAME, PUTER_DRIVERS_URL,
  type Provider, type Tier,
} from './index.ts';

/** The slice of `fetch` this module uses. Narrower than the DOM's `typeof
 *  fetch` on purpose, so a host can inject its own wrapper (the web app routes
 *  every call through one) without having to satisfy the full signature. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ProbeOptions {
  fetch?: FetchLike;
  /** Milliseconds-since-epoch clock, injectable so a measurement scenario can
   *  advance time without the test waiting for it. */
  now?: () => number;
}

/** How fast a model is, split into the two things a call actually spends time
 *  on. Price is never measured — it comes from the catalogue. */
export interface ModelMeasure {
  /** Seconds until the first streamed frame carrying text: getting the model
   *  going. 0 when the provider buffered the whole reply and there was nothing
   *  to separate. */
  ttftSec: number;
  /** Output tokens per second once generation is under way. */
  tokPerSec: number;
}

/** The card's `~Z sec`: the two halves put back together for a thousand output
 *  tokens. The startup cost is paid once per call whatever its length, which is
 *  why it is added rather than averaged in. */
export function estimateSecPer1kTok(m: ModelMeasure): number {
  return m.tokPerSec > 0 ? m.ttftSec + 1000 / m.tokPerSec : 0;
}

// openai, groq and openrouter all speak the same OpenAI chat-completions
// request and usage shape, so one branch serves all three; their base URLs come
// from the shared PROVIDER_BASE_URL table the engine reads too.

/** The reference task: twenty rows to classify, which is the app's own hot
 *  path. It asks for a sentence per row so the model has real work to stream. */
const REFERENCE_PROMPT =
  'For each numbered title below, decide whether it is a music video. ' +
  'Reply with a JSON array of twenty objects and nothing else, each ' +
  '{"n": <number>, "music": <boolean>, "why": "<one short sentence>"}.\n' +
  Array.from({ length: 20 }, (_, i) => `${i + 1}. Sample video title ${i + 1}`).join('\n');

/** The cheapest thing we can ask a provider, used only to prove the key works. */
const VERIFY_PROMPT = 'Reply with the single word: ok';

/** Output-token cap for the measurement. Small enough to be cheap, big enough
 *  that a thinking model still streams: at 100, `gemini-3.6-flash` spent the
 *  whole budget reasoning and returned 96 tokens in a single frame. Turning
 *  thinking off is not the alternative — Gemini 3.6 rejects
 *  `thinkingBudget: 0` — so the probe sends no reasoning options at all and
 *  stays provider-neutral. See the 2026-08-11 provider probe. */
const MEASURE_MAX_TOKENS = 300;

/** Below this share of the call spent streaming, treat the reply as buffered:
 *  a provider that flushes at the end (or a model that thinks silently, then
 *  dumps it all) has no separable first-token time to report. */
const STREAMING_SHARE = 0.2;

interface Answer {
  status: number;
  headers: Headers;
  body: Record<string, unknown>;
}

/** One call to a provider, normalised. Network and CORS failures come back as
 *  status 0 so the caller has a single shape to read. */
async function call(
  provider: Provider,
  key: string,
  modelId: string,
  prompt: string,
  opts: ProbeOptions,
): Promise<Answer> {
  const doFetch: FetchLike = opts.fetch ?? ((u, i) => globalThis.fetch(u, i));
  let url: string;
  let init: RequestInit;

  if (provider === 'gemini') {
    url = `${PROVIDER_BASE_URL.gemini}/models/${modelId}:generateContent`;
    init = {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    };
  } else if (provider === 'anthropic') {
    url = `${PROVIDER_BASE_URL.anthropic}/messages`;
    init = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        // Anthropic refuses browser origins unless this opt-in is present, and
        // the chooser runs in the browser.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: modelId, max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    };
  } else if (provider === 'puter') {
    url = PUTER_DRIVERS_URL;
    init = {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify(
        puterEnvelope({ model: modelId, messages: [{ role: 'user', content: prompt }] }),
      ),
    };
  } else {
    url = `${PROVIDER_BASE_URL[provider]}/chat/completions`;
    init = {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: prompt }] }),
    };
  }

  try {
    const res = await doFetch(url, init);
    return { status: res.status, headers: res.headers, body: await readJson(res) };
  } catch {
    return { status: 0, headers: new Headers(), body: {} };
  }
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** One sentence the user can act on, named for the provider they chose. An
 *  unrecognised failure passes the provider's own message through so no
 *  information is lost. */
function failure(provider: Provider, answer: Answer): Error {
  const who = PROVIDER_NAME[provider];
  if (answer.status === 0) return new Error(`Could not reach ${who}.`);
  if (answer.status === 401 || answer.status === 403) {
    return new Error(`Key rejected by ${who}. Check the key and try again.`);
  }
  const raw = answer.body['error'];
  const err = (typeof raw === 'string' ? { message: raw } : raw) as
    { message?: string; type?: string; code?: string } | undefined;
  if (answer.status === 429) {
    // An account with no money left arrives as a 429 too — OpenAI answers an
    // empty balance with `insufficient_quota`. Checked first: telling that user
    // to wait a minute sends them into a wait that never ends.
    const quota = `${err?.code ?? ''} ${err?.type ?? ''} ${err?.message ?? ''}`;
    if (/insufficient_quota|exceeded your current quota/i.test(quota)) {
      return new Error(
        `Your ${who} account has no credit left. Add credit (or a billing method) and try again.`,
      );
    }
    return new Error(`${who} rate-limited the check. Wait a minute and try again.`);
  }
  return new Error(err?.message ?? `${who} refused the key (HTTP ${answer.status}).`);
}

/** Whether an answer is a success. Some OpenAI-compatible hosts return HTTP 200
 *  with an `error` object in the body, so the status alone is not enough. */
function ok(answer: Answer): boolean {
  return answer.status >= 200 && answer.status < 300 && answer.body['error'] == null;
}

/**
 * Check a key against its provider and report the account tier. The gate before
 * anything is stored: no card appears until this resolves. One cheap call to the
 * cell model with a two-word prompt and no retries, so a dead key answers
 * in about a second instead of after a backoff a user has no reason to wait out.
 *
 * The tier is only ever a real signal. Google returns it in a response header
 * and OpenRouter has an endpoint for it; OpenAI and Anthropic have no free tier
 * to distinguish; Groq publishes nothing, so it reports null and the chooser
 * shows no tag rather than a guess.
 */
export async function verifyKey(
  provider: Provider,
  key: string,
  opts: ProbeOptions = {},
): Promise<{ tier: Tier }> {
  // OpenRouter's key endpoint validates and reports the tier in one call, so it
  // needs no model call at all.
  if (provider === 'openrouter') {
    const doFetch: FetchLike = opts.fetch ?? ((u, i) => globalThis.fetch(u, i));
    let answer: Answer;
    try {
      const res = await doFetch(`${PROVIDER_BASE_URL.openrouter}/key`, {
        headers: { authorization: `Bearer ${key}` },
      });
      answer = { status: res.status, headers: res.headers, body: await readJson(res) };
    } catch {
      answer = { status: 0, headers: new Headers(), body: {} };
    }
    if (!ok(answer)) throw failure(provider, answer);
    const data = answer.body['data'] as { is_free_tier?: boolean } | undefined;
    return { tier: data?.is_free_tier ? 'free' : 'paid' };
  }

  // Puter's whoami proves the token without spending anything — no model call
  // needed at all, so connecting is free as well as fast.
  if (provider === 'puter') {
    const doFetch: FetchLike = opts.fetch ?? ((u, i) => globalThis.fetch(u, i));
    let answer: Answer;
    try {
      const res = await doFetch(`${PROVIDER_BASE_URL.puter}/whoami`, {
        headers: { authorization: `Bearer ${key}` },
      });
      answer = { status: res.status, headers: res.headers, body: await readJson(res) };
    } catch {
      answer = { status: 0, headers: new Headers(), body: {} };
    }
    if (!ok(answer)) throw failure(provider, answer);
    // Puter bills per call against one balance; it reports no free/paid tier.
    return { tier: null };
  }

  const answer = await call(provider, key, defaultCellModel(provider), VERIFY_PROMPT, opts);
  if (!ok(answer)) throw failure(provider, answer);

  // Google publishes no billing signal, so we report none. We used to read
  // `x-gemini-service-tier` as one, but that header is the *inference* tier —
  // standard / priority / flex, the latency class a request was served at —
  // and it reads `standard` for every ordinary call whether the project is
  // billed or not. A genuinely free-tier key (billing never set up) returns
  // `standard`, so the card called it PAID. Silence is the honest answer, and
  // it is the safe one: "paid" is the single word that tells a free-tier user
  // to worry about a bill they will never get.
  if (provider === 'gemini') return { tier: null };
  // Neither OpenAI nor Anthropic has a free tier; Groq publishes no signal.
  if (provider === 'groq') return { tier: null };
  return { tier: 'paid' };
}

/** Input and output tokens a provider reported, whichever shape it used. */
function usageOf(provider: Provider, body: Record<string, unknown>): { inTok: number; outTok: number } {
  if (provider === 'puter') {
    // Streaming: a {"type":"usage","usage":{…}} frame. Non-streaming: the same
    // object under result.usage. The two spell the counters differently —
    // `prompt_tokens`/`completion_tokens` when streamed, `prompt`/`completion`
    // when not — so read whichever is there.
    const result = (body['result'] ?? {}) as Record<string, unknown>;
    const u = (body['usage'] ?? result['usage'] ?? {}) as Record<string, number>;
    return {
      inTok: u['prompt_tokens'] ?? u['prompt'] ?? 0,
      outTok: u['completion_tokens'] ?? u['completion'] ?? 0,
    };
  }
  if (provider === 'gemini') {
    const u = (body['usageMetadata'] ?? {}) as Record<string, number>;
    return {
      inTok: u['promptTokenCount'] ?? 0,
      // Reasoning tokens are billed and take time, so they count as output.
      outTok: (u['candidatesTokenCount'] ?? 0) + (u['thoughtsTokenCount'] ?? 0),
    };
  }
  const u = (body['usage'] ?? {}) as Record<string, number>;
  if (provider === 'anthropic') {
    return { inTok: u['input_tokens'] ?? 0, outTok: u['output_tokens'] ?? 0 };
  }
  return { inTok: u['prompt_tokens'] ?? 0, outTok: u['completion_tokens'] ?? 0 };
}

/** The streaming request body/URL for one provider. Deliberately minimal: no
 *  reasoning or thinking options, because the one knob that would help
 *  (Gemini's `thinkingBudget: 0`) is rejected by the very model that needs it. */
function streamRequest(
  provider: Provider, key: string, modelId: string,
): { url: string; init: RequestInit } {
  if (provider === 'gemini') {
    return {
      url: `${PROVIDER_BASE_URL.gemini}/models/${modelId}:streamGenerateContent?alt=sse`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: REFERENCE_PROMPT }] }],
          generationConfig: { maxOutputTokens: MEASURE_MAX_TOKENS },
        }),
      },
    };
  }
  if (provider === 'anthropic') {
    return {
      url: `${PROVIDER_BASE_URL.anthropic}/messages`,
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: modelId, stream: true, max_tokens: MEASURE_MAX_TOKENS,
          messages: [{ role: 'user', content: REFERENCE_PROMPT }],
        }),
      },
    };
  }
  if (provider === 'puter') {
    return {
      url: PUTER_DRIVERS_URL,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify(puterEnvelope({
          model: modelId, stream: true, max_tokens: MEASURE_MAX_TOKENS,
          messages: [{ role: 'user', content: REFERENCE_PROMPT }],
        })),
      },
    };
  }
  return {
    url: `${PROVIDER_BASE_URL[provider]}/chat/completions`,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: modelId, stream: true,
        stream_options: { include_usage: true },
        max_completion_tokens: MEASURE_MAX_TOKENS,
        messages: [{ role: 'user', content: REFERENCE_PROMPT }],
      }),
    },
  };
}

/** Read a nested field out of a streamed frame. Every hop is an `unknown` that
 *  may not be there — frames are provider-shaped JSON, not a type we own. */
function dig(value: unknown, ...path: (string | number)[]): unknown {
  let cur = value;
  for (const step of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string | number, unknown>)[step];
  }
  return cur;
}

/** A non-empty string at that path, or ''. */
function textAt(value: unknown, ...path: (string | number)[]): string {
  const v = dig(value, ...path);
  return typeof v === 'string' ? v : '';
}

/**
 * Whether a streamed frame carries generated text — which is what the
 * first-token clock is timing. A stream opens with frames that are not output:
 * a role header, a `message_start`, a keep-alive ping, a usage report, and on
 * a thinking model however many reasoning deltas it needs before it says
 * anything. Stopping the clock on those would time the cheapest byte on the
 * wire and make a slow thinker look instant.
 */
function frameHasContent(provider: Provider, f: Record<string, unknown>): boolean {
  if (provider === 'gemini') {
    const parts = dig(f, 'candidates', 0, 'content', 'parts');
    // `thought: true` marks a reasoning part: text on the wire, not output on
    // the screen.
    return Array.isArray(parts)
      && parts.some((p) => textAt(p, 'text') !== '' && dig(p, 'thought') !== true);
  }
  if (provider === 'anthropic') {
    return f['type'] === 'content_block_delta' && textAt(f, 'delta', 'text') !== '';
  }
  // Puter streams NDJSON `{"type":"text","text":"…"}`; every OpenAI-compatible
  // host streams `choices[].delta.content`. Accept either — the shapes don't
  // collide, so one branch serves both.
  return textAt(f, 'text') !== '' || textAt(f, 'choices', 0, 'delta', 'content') !== '';
}

/** One `data:` line (or one bare NDJSON line) as parsed JSON, or undefined for
 *  the blanks, the `[DONE]` sentinel, and half a frame at a chunk boundary. */
function parseFrame(line: string): Record<string, unknown> | undefined {
  const trimmed = line.trim();
  if (trimmed === '') return undefined;
  // SSE frames are `data: {…}`; Puter streams bare NDJSON objects.
  const payload = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
  if (payload === '' || payload === '[DONE]' || !payload.startsWith('{')) return undefined;
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * Read a streaming body, collecting every frame and timing two moments: when
 * the first frame carrying text arrived, and when the last byte did. Frames are
 * parsed **as they arrive** rather than from the finished buffer, because the
 * first of those two moments cannot be recovered afterwards.
 *
 * A body that arrives in one piece — a buffering provider, or a stubbed
 * Response in a test — yields its frames with `streamed` false or with the two
 * times equal, and the caller falls back to a plain average.
 */
async function readStream(
  res: Response, provider: Provider, clock: () => number, started: number,
): Promise<{
  frames: Record<string, unknown>[]; firstMs: number; lastMs: number; streamed: boolean;
}> {
  const frames: Record<string, unknown>[] = [];
  let firstMs = started;
  let lastMs = clock();
  let streamed = false;
  let buffer = '';
  let pending = '';

  const take = (text: string, final: boolean): void => {
    lastMs = clock();
    buffer += text;
    pending += text;
    const lines = pending.split('\n');
    // Hold the trailing partial line back for the next chunk — a frame split
    // across a chunk boundary parses as nothing, and the last one to arrive is
    // usually the usage report.
    pending = final ? '' : lines.pop() ?? '';
    for (const line of lines) {
      const frame = parseFrame(line);
      if (!frame) continue;
      frames.push(frame);
      if (!streamed && frameHasContent(provider, frame)) {
        firstMs = clock();
        streamed = true;
      }
    }
  };

  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      take(decoder.decode(value, { stream: true }), false);
    }
    take('', true);
  } else {
    take(await res.text(), true);
  }

  // A non-SSE body (a stub, or an error response) is still one JSON object,
  // possibly pretty-printed across the lines the loop above discarded.
  if (frames.length === 0 && buffer.trim() !== '') {
    try {
      frames.push(JSON.parse(buffer) as Record<string, unknown>);
    } catch {
      // Not JSON at all — no usage to read, handled by the caller.
    }
  }
  return { frames, firstMs, lastMs, streamed };
}

/**
 * Measure one model's speed with a single capped streaming call. Price is not
 * measured — it comes from the catalogue.
 *
 *   ttftSec   = seconds until the first frame carrying text  (getting going)
 *   tokPerSec = outTok / (totalSec − ttftSec)               (generating)
 *
 * Splitting them is what lets a 300-token sample extrapolate honestly: the
 * startup cost is paid once per call whatever its length, so folding it into a
 * per-token average makes short answers look slow. Measured against live
 * providers, dividing a whole round trip by its tokens inverted the ranking.
 *
 * When the reply arrives buffered — no frame carried text, or under a fifth of
 * the call was spent streaming — there is no separable first-token time, so the
 * whole call counts as generation and the estimate becomes a plain average.
 */
export async function measureModel(
  provider: Provider,
  key: string,
  modelId: string,
  opts: ProbeOptions = {},
): Promise<ModelMeasure> {
  const doFetch: FetchLike = opts.fetch ?? ((u, i) => globalThis.fetch(u, i));
  const clock = opts.now ?? (() => Date.now());
  const { url, init } = streamRequest(provider, key, modelId);

  const started = clock();
  let res: Response;
  try {
    res = await doFetch(url, init);
  } catch {
    throw failure(provider, { status: 0, headers: new Headers(), body: {} });
  }
  const { frames, firstMs, lastMs, streamed } = await readStream(res, provider, clock, started);

  // An error answer is a single JSON frame, not a stream.
  const errFrame = frames.find((f) => f['error'] != null);
  if (res.status < 200 || res.status >= 300 || errFrame) {
    throw failure(provider, { status: res.status, headers: res.headers, body: errFrame ?? {} });
  }

  // Usage lands in one frame or is spread across several (Anthropic reports
  // input on message_start and output on message_delta), so merge as we go.
  let outTok = 0;
  for (const frame of frames) {
    outTok = Math.max(outTok, usageOf(provider, frame).outTok);
  }

  const totalSec = (lastMs - started) / 1000;
  const ttftSec = (firstMs - started) / 1000;
  const streamedSec = totalSec - ttftSec;
  if (outTok === 0 || totalSec <= 0) return { ttftSec: 0, tokPerSec: 0 };

  if (streamed && streamedSec >= STREAMING_SHARE * totalSec) {
    return { ttftSec, tokPerSec: outTok / streamedSec };
  }
  return { ttftSec: 0, tokPerSec: outTok / totalSec };
}
