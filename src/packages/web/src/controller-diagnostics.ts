// #Diagnostics
// In-app diagnostics: a bounded ring buffer of recent app events, persisted in
// the browser so a user who hits a bug can grab a self-contained, key-free
// report and paste it straight into a Claude chat. Lives entirely in the web
// package; reuses @tamedtable/cassette `fingerprint` so a failed request is
// logged with the same hash the replay layer reports on a miss.
//
// Three capture points wire into existing code (no logic duplicated): every
// toast (controller.pushToast), every failed model request, and the tutorial
// replay miss (both in EngineManager's fetch). See spec/code-contract.md
// § Diagnostics log.
import { fingerprint } from '@tamedtable/cassette';
import type { ResolvedConfig } from '@tamedtable/model-config';
import type { ControllerHost } from './controller-context.ts';

export type DiagLevel = 'error' | 'warn' | 'info';

export interface DiagEvent {
  /** Absolute ISO 8601 timestamp. */
  ts: string;
  level: DiagLevel;
  /** Short, already-redacted message. */
  message: string;
  /** Structured, already-redacted context. */
  context: Record<string, unknown>;
}

/** localStorage key for the persisted ring buffer. */
const STORAGE_KEY = 'tamedtable.diagnostics';
/** Keep the newest this-many events … */
const MAX_EVENTS = 50;
/** … and at most this-many bytes of serialized JSON, oldest dropped first. */
const MAX_BYTES = 256 * 1024;
/** Request bodies are truncated to this many characters before logging. */
const MAX_BODY = 2048;

// ── Pure helpers (unit-tested directly) ─────────────────────────────────────

/** api-key shapes that must never reach the log. */
const KEY_SHAPES = [/sk-[A-Za-z0-9_-]+/g, /AIza[A-Za-z0-9_-]+/g];

/** Replace any api-key-shaped substring with `[redacted]`. */
export function redactString(s: string): string {
  let out = s;
  for (const re of KEY_SHAPES) out = out.replace(re, '[redacted]');
  return out;
}

/** Object keys whose VALUE is dropped whole: auth headers and any `*Key`
 *  field (anthropicKey/geminiKey/openaiKey/apiKey, x-api-key, authorization). */
function isSecretKey(key: string): boolean {
  const k = key.toLowerCase();
  return k.endsWith('key') || k === 'authorization';
}

/** Strip secrets from any value before it is logged: api-key-shaped strings
 *  become `[redacted]`, and object keys naming a secret are dropped entirely.
 *  Recurses through arrays and plain objects. */
export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isSecretKey(k)) continue;
      out[k] = redactValue(v);
    }
    return out;
  }
  return value;
}

/** The newest `maxEvents` events that also fit within `maxBytes` of serialized
 *  JSON — the oldest are dropped first when either cap is exceeded. */
export function evictEvents(events: DiagEvent[], maxEvents: number, maxBytes: number): DiagEvent[] {
  let out = events.slice(-maxEvents);
  while (out.length > 1 && JSON.stringify(out).length > maxBytes) {
    out = out.slice(1);
  }
  return out;
}

/** Render the log as a self-contained markdown report, newest event first. */
export function buildReportMarkdown(
  version: string,
  configSnapshot: Record<string, unknown>,
  events: DiagEvent[],
  generatedAt: string,
): string {
  const lines: string[] = [
    '# TamedTable diagnostics report',
    '',
    `- App version: ${version}`,
    `- Generated: ${generatedAt}`,
    `- Events: ${events.length}`,
    '',
    '## Config snapshot',
    '',
    '```json',
    JSON.stringify(configSnapshot, null, 2),
    '```',
    '',
    '## Events (newest first)',
    '',
  ];
  for (const e of [...events].reverse()) {
    lines.push(`### ${e.ts} · ${e.level} · ${e.message}`, '', '```json', JSON.stringify(e.context, null, 2), '```', '');
  }
  return lines.join('\n');
}

/** App build/version, read from the Vite-injected env where present. */
function appVersion(): string {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    return env?.VITE_APP_VERSION ?? env?.MODE ?? 'dev';
  } catch {
    return 'dev';
  }
}

// ── Manager ─────────────────────────────────────────────────────────────────

export class DiagnosticsManager {
  /** In-memory mirror of the persisted log — the source of truth so reads work
   *  even when localStorage is unavailable (private mode, headless, SSR). */
  private events: DiagEvent[] = [];
  private readonly host: ControllerHost;

  constructor(host: ControllerHost) {
    this.host = host;
    this.load();
  }

  // ── Capture points ────────────────────────────────────────────────────────

  /** Record every toast the user sees. */
  recordToast(kind: 'error' | 'info', message: string): void {
    this.record(kind === 'error' ? 'error' : 'info', message, { source: 'toast' });
  }

  /** Record a failed model request or a tutorial replay miss with the same
   *  fingerprint the replay layer reports, plus the truncated request body. */
  async recordRequestFailure(opts: {
    method: string;
    url: string;
    body: string;
    status?: number;
    replayMiss?: boolean;
    error?: unknown;
  }): Promise<void> {
    let fp = '';
    try {
      fp = await fingerprint(opts.method, opts.url, opts.body);
    } catch {
      /* hashing unavailable — log the event without a fingerprint */
    }
    const message = opts.replayMiss
      ? 'Tutorial replay miss — no recording for this request'
      : `Model request failed${opts.status ? ` (HTTP ${opts.status})` : ' (network error)'}`;
    this.record('error', message, {
      source: opts.replayMiss ? 'replay-miss' : 'request',
      method: opts.method,
      url: opts.url,
      fingerprint: fp,
      requestBody: opts.body.slice(0, MAX_BODY),
      ...(opts.status !== undefined ? { status: opts.status } : {}),
      ...(opts.error !== undefined ? { error: String((opts.error as Error)?.message ?? opts.error) } : {}),
    });
  }

  // ── Public read/actions (delegated from WebController) ────────────────────

  /** The log, chronological (newest last), as a fresh array. */
  list(): DiagEvent[] {
    return [...this.events];
  }

  /** The markdown report, newest event first. */
  report(): string {
    const generatedAt = nowIso();
    return buildReportMarkdown(appVersion(), this.configSnapshot(), this.events, generatedAt);
  }

  /** Copy the report to the clipboard (best-effort; surfaces a toast either way). */
  async copyReport(): Promise<void> {
    const text = this.report();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.host.pushToast('info', 'Diagnostics report copied to clipboard.');
        return;
      }
    } catch {
      /* fall through to the failure toast */
    }
    this.host.pushToast('error', 'Could not copy the report — clipboard access was blocked.');
  }

  /** Save the report through the file dialog as markdown or JSON. */
  async downloadReport(format: 'md' | 'json' = 'md'): Promise<void> {
    const content =
      format === 'json'
        ? JSON.stringify({ version: appVersion(), config: this.configSnapshot(), events: this.events }, null, 2)
        : this.report();
    const name = `tamedtable-diagnostics.${format}`;
    const accept = format === 'json' ? ['.json'] : ['.md'];
    try {
      const outcome = await this.host.file.pickSave(name, accept, new TextEncoder().encode(content));
      if (outcome.status !== 'cancelled') this.host.pushToast('info', `Saved ${outcome.name}.`);
    } catch (e) {
      this.host.pushToast('error', `Could not save the report: ${(e as Error).message}`);
    }
  }

  /** Empty the log, in memory and in storage. */
  clear(): void {
    this.events = [];
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    this.host.notify();
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private record(level: DiagLevel, message: string, context: Record<string, unknown>): void {
    const event: DiagEvent = {
      ts: nowIso(),
      level,
      message: redactString(message),
      context: redactValue({ ...this.gatherContext(), ...context }) as Record<string, unknown>,
    };
    this.events = evictEvents([...this.events, event], MAX_EVENTS, MAX_BYTES);
    this.persist();
  }

  /** Whatever context is available where the event fires — never the data. */
  private gatherContext(): Record<string, unknown> {
    const host = this.host;
    const ctx: Record<string, unknown> = {
      provider: host.config.provider,
      model: host.config.model,
      cellModel: host.config.cellModel,
    };
    const scenario = host.tutorial.selectedTourName();
    if (scenario) ctx.scenario = scenario;
    const feature = host.tutorial.replayCassetteName();
    if (feature) ctx.feature = feature;
    try {
      ctx.transformationCount = host.engine.displaySpec().transformations.length;
    } catch {
      /* engine not ready — omit the count */
    }
    ctx.recentMessages = host.messages.slice(-3).map((m) => m.text);
    if (typeof navigator !== 'undefined') ctx.userAgent = navigator.userAgent;
    return ctx;
  }

  /** The config without the per-provider key fields, then redacted. */
  private configSnapshot(): Record<string, unknown> {
    const { anthropicKey: _a, geminiKey: _g, openaiKey: _o, ...rest } = this.host.config as ResolvedConfig;
    void _a;
    void _g;
    void _o;
    return redactValue(rest) as Record<string, unknown>;
  }

  private load(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.events = JSON.parse(raw) as DiagEvent[];
    } catch {
      /* corrupt or unavailable storage — start empty in memory */
    }
  }

  private persist(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch {
      /* quota or private mode — the in-memory mirror still works */
    }
  }
}

/** ISO timestamp; isolated so the report and events agree on the clock. */
function nowIso(): string {
  return new Date().toISOString();
}
