// #BenchSweep
// Static SVG generators for the two tradeoff charts, from a flat SweepResult[]:
//   1. accuracy vs cost-per-task, one point per cell model (the Pareto view)
//   2. accuracy / cost / time vs batch size, for one cell model (small multiples)
// Pure string templating — no runtime dependency, output committed under
// benchmarks/charts/. Colours are the Okabe-Ito colourblind-safe palette.
import type { SweepResult } from './sweep.ts';

// Okabe-Ito, mapped by provider so a model keeps one colour across both charts.
const PROVIDER_COLOR: Record<string, string> = {
  anthropic: '#D55E00',  // vermillion
  gemini: '#0072B2',     // blue
  openai: '#009E73',     // bluish green
  cerebras: '#CC79A7',   // reddish purple
  openrouter: '#E69F00', // orange
};

/** Model id → safe chart filename fragment. OpenRouter ids carry `/` and `:`
 *  (`qwen/qwen3-coder:free`), which would otherwise nest or break the path. */
export const fileSlug = (id: string) => id.replace(/[/:]/g, '-').replace(/-+/g, '-');
const FALLBACK_COLOR = '#999999';
const INK = '#222222';
const GRID = '#e5e5e5';
const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const usd = (v: number) => `$${v.toFixed(v < 1 ? 4 : 2)}`;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (v <= step * mag) return step * mag;
  }
  return 10 * mag;
}

interface ScatterOpts {
  /** Only plot rows at this batch size (the model chart shows one point/model). */
  batchSize?: number;
  width?: number;
  height?: number;
  title?: string;
  /** Optional caption under the title — e.g. a provenance note. */
  subtitle?: string;
}

/** Chart 1 — accuracy (y) vs average cost per task (x), one point per model.
 *  When `batchSize` is set, only rows at that batch size are plotted. */
export function modelTradeoffChart(results: SweepResult[], opts: ScatterOpts = {}): string {
  const W = opts.width ?? 760, H = opts.height ?? 480;
  const m = { top: opts.subtitle ? 60 : 48, right: 150, bottom: 56, left: 64 };
  const plotW = W - m.left - m.right, plotH = H - m.top - m.bottom;
  const rows = (opts.batchSize == null ? results : results.filter((r) => r.batchSize === opts.batchSize));

  const maxCost = niceMax(Math.max(0.0001, ...rows.map((r) => r.costUsd)));
  const x = (cost: number) => m.left + (cost / maxCost) * plotW;
  const y = (acc: number) => m.top + (1 - acc) * plotH; // accuracy 0..1 → bottom..top

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`);
  parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  parts.push(`<text x="${m.left}" y="24" font-size="15" font-weight="600" fill="${INK}">${esc(opts.title ?? 'Accuracy vs cost per task')}</text>`);
  if (opts.subtitle) parts.push(`<text x="${m.left}" y="42" font-size="11" fill="#888888">${esc(opts.subtitle)}</text>`);

  // Y gridlines + labels (0..100%)
  for (let a = 0; a <= 1.0001; a += 0.25) {
    const yy = y(a);
    parts.push(`<line x1="${m.left}" y1="${yy.toFixed(1)}" x2="${m.left + plotW}" y2="${yy.toFixed(1)}" stroke="${GRID}"/>`);
    parts.push(`<text x="${m.left - 8}" y="${(yy + 4).toFixed(1)}" font-size="11" text-anchor="end" fill="${INK}">${pct(a)}</text>`);
  }
  // X gridlines + labels
  for (let i = 0; i <= 4; i++) {
    const cost = (maxCost / 4) * i;
    const xx = x(cost);
    parts.push(`<line x1="${xx.toFixed(1)}" y1="${m.top}" x2="${xx.toFixed(1)}" y2="${m.top + plotH}" stroke="${GRID}"/>`);
    parts.push(`<text x="${xx.toFixed(1)}" y="${m.top + plotH + 18}" font-size="11" text-anchor="middle" fill="${INK}">${usd(cost)}</text>`);
  }
  parts.push(`<text x="${m.left + plotW / 2}" y="${H - 12}" font-size="12" text-anchor="middle" fill="${INK}">Average cost per task (USD)</text>`);

  // Points + labels
  for (const r of rows) {
    const cx = x(r.costUsd), cy = y(r.accuracy);
    const color = PROVIDER_COLOR[r.provider] ?? FALLBACK_COLOR;
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="${color}"/>`);
    parts.push(`<text x="${(cx + 8).toFixed(1)}" y="${(cy + 4).toFixed(1)}" font-size="11" fill="${color}">${esc(r.cellModel)}</text>`);
  }
  parts.push('</svg>');
  return parts.join('\n');
}

/** Chart 2 — three stacked panels (accuracy, cost, time) vs batch size for one
 *  cell model. Small multiples share the batch-size x-axis so the tradeoff knee
 *  is easy to read. */
export function batchSweepChart(results: SweepResult[], cellModel: string, opts: { width?: number; subtitle?: string } = {}): string {
  const rows = results.filter((r) => r.cellModel === cellModel).sort((a, b) => a.batchSize - b.batchSize);
  const panelH = 120, gap = 40, top = opts.subtitle ? 60 : 48, left = 64, right = 24;
  const W = opts.width ?? 640, plotW = W - left - right;
  const H = top + panelH * 3 + gap * 2 + 40;
  const color = PROVIDER_COLOR[rows[0]?.provider ?? ''] ?? FALLBACK_COLOR;
  const batches = rows.map((r) => r.batchSize);
  const bx = (b: number) => {
    if (batches.length <= 1) return left + plotW / 2;
    const min = Math.min(...batches), max = Math.max(...batches);
    return left + ((b - min) / (max - min)) * plotW;
  };

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`);
  parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  parts.push(`<text x="${left}" y="24" font-size="15" font-weight="600" fill="${INK}">Batch-size sweep — ${esc(cellModel)}</text>`);
  if (opts.subtitle) parts.push(`<text x="${left}" y="42" font-size="11" fill="#888888">${esc(opts.subtitle)}</text>`);

  const panel = (idx: number, label: string, value: (r: SweepResult) => number, fmt: (v: number) => string) => {
    const pTop = top + idx * (panelH + gap);
    const vals = rows.map(value);
    const vmax = niceMax(Math.max(0.0001, ...vals));
    const py = (v: number) => pTop + (1 - v / vmax) * panelH;
    parts.push(`<text x="${left}" y="${pTop - 6}" font-size="12" font-weight="600" fill="${INK}">${esc(label)}</text>`);
    // frame + max/zero ticks
    parts.push(`<line x1="${left}" y1="${pTop}" x2="${left + plotW}" y2="${pTop}" stroke="${GRID}"/>`);
    parts.push(`<line x1="${left}" y1="${pTop + panelH}" x2="${left + plotW}" y2="${pTop + panelH}" stroke="${GRID}"/>`);
    parts.push(`<text x="${left - 8}" y="${pTop + 4}" font-size="10" text-anchor="end" fill="${INK}">${fmt(vmax)}</text>`);
    parts.push(`<text x="${left - 8}" y="${pTop + panelH + 4}" font-size="10" text-anchor="end" fill="${INK}">0</text>`);
    // line
    const pts = rows.map((r) => `${bx(r.batchSize).toFixed(1)},${py(value(r)).toFixed(1)}`);
    if (pts.length > 1) parts.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`);
    for (const r of rows) {
      parts.push(`<circle cx="${bx(r.batchSize).toFixed(1)}" cy="${py(value(r)).toFixed(1)}" r="3.5" fill="${color}"/>`);
    }
  };

  panel(0, 'Accuracy', (r) => r.accuracy, (v) => pct(v));
  panel(1, 'Cost (USD)', (r) => r.costUsd, (v) => usd(v));
  panel(2, 'Time (s)', (r) => r.timeMs / 1000, (v) => `${v.toFixed(0)}s`);

  // x labels under the last panel
  const xAxisY = top + 3 * panelH + 2 * gap + 20;
  for (const r of rows) {
    parts.push(`<text x="${bx(r.batchSize).toFixed(1)}" y="${xAxisY}" font-size="11" text-anchor="middle" fill="${INK}">${r.batchSize}</text>`);
  }
  parts.push(`<text x="${left + plotW / 2}" y="${xAxisY + 20}" font-size="12" text-anchor="middle" fill="${INK}">Batch size (rows per model call)</text>`);
  parts.push('</svg>');
  return parts.join('\n');
}
