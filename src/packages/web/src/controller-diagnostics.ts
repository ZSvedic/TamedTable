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
const MAX_EVENTS = 20;
/** … and at most this-many bytes of serialized JSON, oldest dropped first. */
const MAX_BYTES = 64 * 1024;
/** Request bodies are truncated to this many characters before logging. */
const MAX_BODY = 2048;

/** Where a "Send a bug report" lands — the maintainers' issue tracker. */
const ISSUE_URL = 'https://github.com/ZSvedic/TamedTable/issues/new';
/** How much raw report rides in the prefilled issue URL. GitHub rejects
 *  URLs past ~8 KB ("Whoa there! Your request URL is too long."), and
 *  percent-encoding inflates the report's JSON-heavy markdown ~3× — so the
 *  raw budget is kept small enough that the encoded URL stays well under
 *  the limit. The full copy goes to the clipboard regardless. */
const URL_REPORT_BUDGET = 2000;

// ── Pure helpers (unit-tested directly) ─────────────────────────────────────

/** api-key shapes that must never reach the log. */
const KEY_SHAPES = [/sk-[A-Za-z0-9_-]+/g, /AIza[A-Za-z0-9_-]+/g, /gsk_[A-Za-z0-9_-]+/g];

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

  /** Record an ordinary successful action that never surfaces as a toast — a
   *  file load, a completed chat request — so a report copied after normal work
   *  reflects what the user did instead of coming up empty. */
  recordActivity(message: string): void {
    this.record('info', message.slice(0, MAX_BODY), { source: 'activity' });
  }

  /** Record a chat reply the user flagged with Report bug — the reply's text
   *  plus the request that produced it, both truncated like request bodies. */
  recordUserReport(messageText: string, userRequest?: string): void {
    this.record('info', 'User flagged a chat reply with Report bug', {
      source: 'user-report',
      messageText: messageText.slice(0, MAX_BODY),
      ...(userRequest !== undefined ? { userRequest: userRequest.slice(0, MAX_BODY) } : {}),
    });
  }

  // ── Public read/actions (delegated from WebController) ────────────────────

  /** The log, chronological (newest last), as a fresh array. */
  list(): DiagEvent[] {
    this.sync();
    return [...this.events];
  }

  /** The markdown report, newest event first. */
  report(): string {
    this.sync();
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

  /** The prefilled "new issue" URL for the maintainers' tracker: a friendly
   *  intro plus the redacted report (truncated to fit the URL). Pure — safe to
   *  call from a test without a browser. */
  bugReportUrl(): string {
    const report = this.report();
    const intro = [
      '<!-- Describe what you were doing when the bug hit, above this line. -->',
      '',
      'Diagnostics (auto-generated, redacted — contains no API keys):',
      '',
    ].join('\n');
    const truncated = report.length > URL_REPORT_BUDGET;
    const body =
      intro +
      (truncated ? report.slice(0, URL_REPORT_BUDGET) : report) +
      (truncated ? '\n\n_(Report truncated — the full report is on your clipboard; paste it here.)_' : '');
    const params = new URLSearchParams({ title: 'Bug report', body });
    return `${ISSUE_URL}?${params.toString()}`;
  }

  /** Copy the full report to the clipboard, then open a prefilled GitHub issue.
   *  The clipboard copy is the safety net for a report too long to fit the URL,
   *  and the fallback when a popup blocker stops the new tab. */
  async sendBugReport(): Promise<void> {
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(this.report());
        copied = true;
      }
    } catch {
      /* clipboard blocked — the URL still carries a (possibly truncated) copy */
    }
    const url = this.bugReportUrl();
    // Note: `window.open(url, '_blank', 'noopener')` returns null even on
    // success, so we can't tell a real open from a blocked popup. Open without
    // that flag and null the opener by hand — same security, a usable handle.
    const win =
      typeof window !== 'undefined' && typeof window.open === 'function'
        ? window.open(url, '_blank')
        : null;
    if (win) {
      try {
        win.opener = null;
      } catch {
        /* cross-origin handle — opener already isolated */
      }
    } else {
      this.host.pushToast(
        'info',
        copied
          ? 'Could not open GitHub — the report is on your clipboard. Open a new issue and paste it.'
          : 'Could not open GitHub — copy the report and open a new issue manually.',
      );
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
    // Append onto the latest persisted log, not this tab's frozen mirror, so a
    // second tab on the origin (a pr-preview build) never clobbers the other's
    // events — every tab appends to the shared key.
    this.sync();
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
    const { anthropicKey: _a, geminiKey: _g, openaiKey: _o, openrouterKey: _r, ...rest } = this.host.config as ResolvedConfig;
    void _a;
    void _g;
    void _o;
    return redactValue(rest) as Record<string, unknown>;
  }

  /** Merge the persisted log into the in-memory buffer. Storage is shared by
   *  every tab on the origin (the live app and any pr-preview build), so
   *  reads and appends fold in what other tabs stored — but the in-memory
   *  buffer stays authoritative and persistence stays best-effort: where the
   *  browser allows reads but rejects writes (legacy private modes, a full
   *  quota), this tab's never-persisted events must survive every sync, not
   *  be replaced by the stale stored copy. */
  private sync(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as DiagEvent[];
      const have = new Set(this.events.map((e) => JSON.stringify(e)));
      const merged = [...this.events];
      for (const e of stored) if (!have.has(JSON.stringify(e))) merged.push(e);
      merged.sort((a, b) => a.ts.localeCompare(b.ts));
      this.events = evictEvents(merged, MAX_EVENTS, MAX_BYTES);
    } catch {
      /* corrupt or unavailable storage — keep the in-memory buffer */
    }
  }

  private load(): void {
    this.sync();
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
