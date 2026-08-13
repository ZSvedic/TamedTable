// Bun `--preload` shim: route provider HTTPS calls through `curl` when the
// environment forces outbound traffic through a CONNECT proxy.
//
// Why: Bun's built-in `fetch` does not tunnel TLS through an HTTPS CONNECT proxy
// (as used by Claude Code on the web). The proxy answers "200 Connection
// Established", then the socket closes and the call fails with "The socket
// connection was closed unexpectedly". `curl` honours `HTTPS_PROXY` correctly,
// so we override `globalThis.fetch` to spawn `curl` for the LLM provider hosts
// and leave every other request on native fetch.
//
// Scope: helps any bun/Node command that makes live LLM calls — the CLI
// (`@tamedtable/cli`) and the benchmark (`@tamedtable/bench`) both go through
// the headless engine's default global fetch. The web app runs in a browser
// (the browser handles the proxy) and needs none of this.
//
// Use: prepend to any bun command, run from `src/`:
//   bun --preload ../process/proxy-fetch.ts packages/cli/index.ts …
//   bun --preload ../process/proxy-fetch.ts packages/bench/cli.ts sweep …
//
// It only rewrites requests when an HTTPS proxy is configured, so it is a safe
// no-op on a machine with direct egress — leave it preloaded everywhere.

const PROXY = process.env.HTTPS_PROXY ?? process.env.https_proxy;

// Provider API hosts the app engine speaks to. Extend with a comma-separated
// TAMEDTABLE_PROXY_FETCH_HOSTS for a custom base URL (e.g. an Anthropic gateway).
const HOSTS = [
  'openrouter.ai',
  'generativelanguage.googleapis.com',
  'api.anthropic.com',
  'api.openai.com',
  'api.cerebras.ai',
  'api.groq.com',
  'api.puter.com',
  ...(process.env.TAMEDTABLE_PROXY_FETCH_HOSTS?.split(',').map((h) => h.trim()).filter(Boolean) ?? []),
];

const orig = globalThis.fetch;

function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return ''; }
}

function pickHeaders(init: RequestInit | undefined, input: unknown): Headers {
  if (init?.headers) return new Headers(init.headers as HeadersInit);
  if (input instanceof Request) return new Headers(input.headers);
  return new Headers();
}

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  // Only intervene when a proxy is present AND the target is a provider host —
  // otherwise native fetch is correct and cheaper.
  if (!PROXY || !HOSTS.includes(hostOf(url))) return orig(input as Parameters<typeof orig>[0], init);

  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const headers = pickHeaders(init, input);
  let bodyText: string | undefined;
  const rawBody = init?.body ?? (input instanceof Request ? input : undefined);
  if (typeof rawBody === 'string') bodyText = rawBody;
  else if (rawBody != null) bodyText = await new Response(rawBody as BodyInit).text();

  const hdrFile = `${process.env.TMPDIR ?? '/tmp'}/proxy-fetch-hdr-${crypto.randomUUID()}`;
  const args = ['curl', '-sS', '--compressed', '-X', method, '-D', hdrFile, '--max-time', '300'];
  // Force identity encoding at the request layer; --compressed handles the rest.
  headers.forEach((v, k) => { if (k.toLowerCase() !== 'accept-encoding') args.push('-H', `${k}: ${v}`); });
  if (bodyText !== undefined) args.push('--data-binary', '@-');
  args.push(url);

  const proc = Bun.spawn(args, {
    stdin: bodyText !== undefined ? new TextEncoder().encode(bodyText) : undefined,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (init?.signal) init.signal.addEventListener('abort', () => proc.kill(), { once: true });
  const bodyBuf = await new Response(proc.stdout).arrayBuffer();
  const exit = await proc.exited;
  if (exit !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`proxy-fetch: curl exit ${exit} for ${url}: ${err.slice(0, 200)}`);
  }

  // Rebuild a Response from curl's dumped header block (last one, after any
  // redirects) plus the decompressed body.
  const rawHdr = await Bun.file(hdrFile).text().catch(() => '');
  await Bun.file(hdrFile).unlink?.().catch?.(() => {});
  const lastBlock = rawHdr.split(/\r?\n\r?\n/).filter((b) => /^HTTP\//.test(b)).at(-1) ?? '';
  const lines = lastBlock.split(/\r?\n/);
  const status = Number(lines[0]?.match(/HTTP\/[\d.]+\s+(\d{3})/)?.[1] ?? 200);
  const respHeaders = new Headers();
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim().toLowerCase();
    // The body is already decompressed; drop framing headers that would
    // misdescribe the bytes we hand to Response.
    if (k === 'content-encoding' || k === 'content-length' || k === 'transfer-encoding') continue;
    respHeaders.append(k, line.slice(idx + 1).trim());
  }
  if (!respHeaders.has('content-type')) respHeaders.set('content-type', 'application/json');

  return new Response(bodyBuf, { status, headers: respHeaders });
}) as typeof globalThis.fetch;
