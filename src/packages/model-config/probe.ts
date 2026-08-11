// #ModelConfig #KeyProbe
// The only part of the module that touches the network: check a pasted key
// against its provider, and measure what its models cost and how fast they are.
// Hosts inject `fetch` (and, for measurement, a clock), so tests never reach a
// real API. Kept in its own entry point so the main entry stays offline.
// Spec: spec/packages/model-config/behavior.md § Checking a key — the probe.

import {
  ALL_MODELS, defaultCellModel, type Provider, type Tier,
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

/** What a thousand tokens cost, and how long they take. */
export interface ModelMeasure {
  usdPer1kTok: number;
  secPer1kTok: number;
}

/** Display name used in every message this module produces. */
const PROVIDER_NAME: Record<Provider, string> = {
  gemini: 'Google',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
  openrouter: 'OpenRouter',
};

/** OpenAI-compatible chat-completions hosts. Each of these three speaks the
 *  same request and usage shape, so one branch serves all of them. */
const OPENAI_COMPATIBLE_BASE: Partial<Record<Provider, string>> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

/** The reference task: twenty rows to classify, which is the app's own hot path.
 *  It asks for a sentence per row on purpose. A bare true/false answer is a few
 *  dozen output tokens, and at that size the fixed round trip dwarfs the
 *  generation — measured against live providers, a terse answer from
 *  `gemini-3.1-flash-lite` read as 25 sec per 1000 tokens against `gemini-3.6-flash`'s
 *  7.6, the reverse of the truth. Asking for a justification pulls every model
 *  up to several hundred output tokens, and the ranking comes out right.
 *  See the 2026-08-11 provider probe. */
const REFERENCE_PROMPT =
  'For each numbered title below, decide whether it is a music video. ' +
  'Reply with a JSON array of twenty objects and nothing else, each ' +
  '{"n": <number>, "music": <boolean>, "why": "<one short sentence>"}.\n' +
  Array.from({ length: 20 }, (_, i) => `${i + 1}. Sample video title ${i + 1}`).join('\n');

/** The cheapest thing we can ask a provider, used only to prove the key works. */
const VERIFY_PROMPT = 'Reply with the single word: ok';

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
  const base = OPENAI_COMPATIBLE_BASE[provider];
  let url: string;
  let init: RequestInit;

  if (provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
    init = {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    };
  } else if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
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
  } else {
    url = `${base}/chat/completions`;
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
  const err = answer.body['error'] as { message?: string; type?: string; code?: string } | undefined;
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
 * secondary model with a two-word prompt and no retries, so a dead key answers
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
      const res = await doFetch('https://openrouter.ai/api/v1/key', {
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

  const answer = await call(provider, key, defaultCellModel(provider), VERIFY_PROMPT, opts);
  if (!ok(answer)) throw failure(provider, answer);

  if (provider === 'gemini') {
    // `free` when the key's project has no billing enabled, `standard` (or
    // `priority`) when it does.
    const served = answer.headers.get('x-gemini-service-tier');
    return { tier: served === 'free' ? 'free' : 'paid' };
  }
  // Neither OpenAI nor Anthropic has a free tier; Groq publishes no signal.
  if (provider === 'groq') return { tier: null };
  return { tier: 'paid' };
}

/** Input and output tokens a provider reported, whichever shape it used. */
function usageOf(provider: Provider, body: Record<string, unknown>): { inTok: number; outTok: number } {
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

/**
 * Run the reference task once and report what a thousand tokens cost and how
 * long they take.
 *
 *   usdPer1kTok = total price / total tokens × 1000
 *   secPer1kTok = elapsed seconds / output tokens × 1000
 *
 * Cost blends the two per-Mtok rates at the ratio the call actually used, so it
 * is exact. Latency divides by **output** tokens only: output is what a run
 * spends its time generating, and dividing by the round trip lets a short
 * answer's fixed overhead make the cheap fast model look slower than the
 * expensive one — measured, not hypothetical.
 */
export async function measureModel(
  provider: Provider,
  key: string,
  modelId: string,
  opts: ProbeOptions = {},
): Promise<ModelMeasure> {
  const clock = opts.now ?? (() => Date.now());
  const started = clock();
  const answer = await call(provider, key, modelId, REFERENCE_PROMPT, opts);
  const elapsedSec = (clock() - started) / 1000;
  if (!ok(answer)) throw failure(provider, answer);

  const { inTok, outTok } = usageOf(provider, answer.body);
  const model = ALL_MODELS.find((m) => m.id === modelId);
  const total = inTok + outTok;
  const usd = model ? (inTok * model.inUsdPerMtok + outTok * model.outUsdPerMtok) / 1e6 : 0;

  return {
    usdPer1kTok: total > 0 ? (usd / total) * 1000 : 0,
    secPer1kTok: outTok > 0 ? (elapsedSec / outTok) * 1000 : 0,
  };
}
