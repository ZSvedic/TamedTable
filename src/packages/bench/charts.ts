// #BenchSweep
// Static SVG generators, from the flat results table:
//   1. tradeoff: accuracy vs cost or time, one point per model, Pareto line
//   2. batch:    accuracy / cost / time vs batch size, for one cell model
// Pure string templating, no runtime dependency; output committed under
// benchmarks/charts/. Colours are the Okabe-Ito colourblind-safe palette.
//
// Two decisions drive how these read. Accuracy is plotted on a **log scale of
// the error** (100% minus accuracy), fixed identically on every chart: real
// results land between 61% and 97%, so a linear 0..100% axis stacked almost all
// of them on one line, and the interesting distance (93% to 97% is more than
// halving the mistakes) was invisible. Log error spreads exactly that end, and
// fixing the range means two charts side by side are directly comparable. Every
// point also carries its own value as text, because what a reader wants off
// these charts is a number, not a pixel position.
import type { ResultRow } from './results.ts';

// Okabe-Ito, mapped by provider so a model keeps one colour across every chart.
const PROVIDER_COLOR: Record<string, string> = {
  anthropic: '#D55E00',  // vermillion
  gemini: '#0072B2',     // blue
  openai: '#009E73',     // bluish green
  cerebras: '#CC79A7',   // reddish purple
  openrouter: '#E69F00', // orange
  groq: '#56B4E9',       // sky blue
};

/** Model id → safe chart filename fragment. OpenRouter ids carry `/` and `:`
 *  (`qwen/qwen3-coder:free`), which would otherwise nest or break the path. */
export const fileSlug = (id: string) => id.replace(/[/:]/g, '-').replace(/-+/g, '-');
const FALLBACK_COLOR = '#999999';
const INK = '#222222';
const MUTED = '#888888';
const GRID = '#e5e5e5';
const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

/** The accuracy axis, shared by every chart here: a log scale over the error
 *  rate, from 60% accuracy (0.40 error) up to 99% (0.01 error). The floor sits
 *  just under the worst result ever recorded (61%), so nothing falls off the
 *  bottom and no vertical space is spent on scores no model produces. Ticks are
 *  labelled as accuracy, so nobody has to think in error rates to read it. */
export const ACC_MIN = 0.60;
const ERR_MAX = 1 - ACC_MIN, ERR_MIN = 0.01;
export const ACC_TICKS = [0.65, 0.75, 0.85, 0.9, 0.93, 0.95, 0.97, 0.99];

/** Accuracy → 0 (bottom of the axis) .. 1 (top). */
export function accPos(acc: number): number {
  const err = Math.min(ERR_MAX, Math.max(ERR_MIN, 1 - acc));
  return (Math.log10(ERR_MAX) - Math.log10(err)) / (Math.log10(ERR_MAX) - Math.log10(ERR_MIN));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const usd = (v: number) => `$${v.toFixed(v < 1 ? 4 : 2)}`;
const secs = (v: number) => `${v.toFixed(0)}s`;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const step of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (v <= step * mag) return step * mag;
  }
  return 10 * mag;
}

/** Push labels apart along y so overlapping points stay readable. Labels are
 *  placed in y order and each one is nudged below the last if it would collide;
 *  with a dozen models on one chart, two or three always land within a few
 *  pixels of each other. */
function stackLabels(items: Array<{ y: number; i: number }>, minGap: number): Map<number, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const out = new Map<number, number>();
  let last = -Infinity;
  for (const it of sorted) {
    const y = Math.max(it.y, last + minGap);
    out.set(it.i, y);
    last = y;
  }
  return out;
}

/** The Pareto frontier: the points nothing else beats on both axes. Cheaper and
 *  faster are both better, so we walk left to right and keep every point more
 *  accurate than everything cheaper than it. Coordinates are SVG pixels, where
 *  **smaller y is more accurate**. Getting that backwards traces the bottom
 *  envelope, which is the exact opposite of the answer. */
function paretoFront(pts: Array<{ x: number; y: number; i: number }>): number[] {
  const sorted = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const front: number[] = [];
  let best = Infinity;
  for (const p of sorted) {
    if (p.y < best) { front.push(p.i); best = p.y; }
  }
  return front;
}

export interface TradeoffOpts {
  title: string;
  /** What the x-axis measures. */
  axis: 'cost' | 'time';
  /** Plot only rows at this batch size, so one model is one point. */
  batchSize?: number;
  width?: number;
  height?: number;
  /** Provenance line under the title. The run dates go here. */
  subtitle?: string;
}

/** Chart 1: accuracy (y) vs cost or time (x), one point per model, with the
 *  Pareto frontier drawn through the points nothing beats on both axes. */
export function tradeoffChart(results: readonly ResultRow[], opts: TradeoffOpts): string {
  const W = opts.width ?? 820, H = opts.height ?? 520;
  const m = { top: opts.subtitle ? 64 : 48, right: 32, bottom: 56, left: 68 };
  const plotW = W - m.left - m.right, plotH = H - m.top - m.bottom;
  const rows = opts.batchSize == null ? results : results.filter((r) => r.batchSize === opts.batchSize);
  const xOf = (r: ResultRow) => (opts.axis === 'cost' ? r.costUsd : r.timeMs / 1000);
  const fmtX = opts.axis === 'cost' ? usd : secs;

  const maxX = niceMax(Math.max(0.0001, ...rows.map(xOf)));
  const x = (v: number) => m.left + (v / maxX) * plotW;
  const y = (acc: number) => m.top + (1 - accPos(acc)) * plotH;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`);
  parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  parts.push(`<text x="${m.left}" y="24" font-size="15" font-weight="600" fill="${INK}">${esc(opts.title)}</text>`);
  if (opts.subtitle) parts.push(`<text x="${m.left}" y="42" font-size="11" fill="${MUTED}">${esc(opts.subtitle)}</text>`);

  for (const a of ACC_TICKS) {
    const yy = y(a);
    parts.push(`<line x1="${m.left}" y1="${yy.toFixed(1)}" x2="${m.left + plotW}" y2="${yy.toFixed(1)}" stroke="${GRID}"/>`);
    parts.push(`<text x="${m.left - 8}" y="${(yy + 4).toFixed(1)}" font-size="11" text-anchor="end" fill="${INK}">${pct(a)}</text>`);
  }
  for (let i = 0; i <= 4; i++) {
    const v = (maxX / 4) * i, xx = x(v);
    parts.push(`<line x1="${xx.toFixed(1)}" y1="${m.top}" x2="${xx.toFixed(1)}" y2="${m.top + plotH}" stroke="${GRID}"/>`);
    parts.push(`<text x="${xx.toFixed(1)}" y="${m.top + plotH + 18}" font-size="11" text-anchor="middle" fill="${INK}">${fmtX(v)}</text>`);
  }
  parts.push(`<text x="${m.left + plotW / 2}" y="${H - 12}" font-size="12" text-anchor="middle" fill="${INK}">${opts.axis === 'cost' ? 'Cost per task (USD)' : 'Time per task (seconds)'}</text>`);
  parts.push(`<text x="14" y="${m.top + plotH / 2}" font-size="12" text-anchor="middle" fill="${INK}" transform="rotate(-90 14 ${m.top + plotH / 2})">Accuracy</text>`);

  // Pareto frontier first, so points and labels sit on top of it.
  const pts = rows.map((r, i) => ({ x: x(xOf(r)), y: y(r.accuracy), i }));
  const front = paretoFront(pts);
  if (front.length > 1) {
    const line = front.map((i) => `${pts[i]!.x.toFixed(1)},${pts[i]!.y.toFixed(1)}`).join(' ');
    parts.push(`<polyline points="${line}" fill="none" stroke="#bbbbbb" stroke-width="1.5" stroke-dasharray="5 4"/>`);
  }

  // Labels are laid out left of the plot's right edge where a point sits far
  // right, so a late point's text cannot run off the canvas.
  // Each label is two lines, so it needs the height of two to clear its
  // neighbour, and the left- and right-anchored labels never collide with each
  // other, so they stack separately or the two sides push each other around.
  const side = (p: { x: number }) => p.x > m.left + plotW * 0.62;
  const labelY = new Map<number, number>([
    ...stackLabels(pts.filter((p) => !side(p)).map((p) => ({ y: p.y, i: p.i })), 25),
    ...stackLabels(pts.filter(side).map((p) => ({ y: p.y, i: p.i })), 25),
  ]);
  rows.forEach((r, i) => {
    const p = pts[i]!;
    const onFront = front.includes(i);
    const color = PROVIDER_COLOR[r.provider] ?? FALLBACK_COLOR;
    parts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${onFront ? 6 : 4.5}" fill="${color}"${onFront ? ' stroke="#ffffff" stroke-width="1.5"' : ''}/>`);
  });
  // Labels last, in one pass over the finished points: interleaved, a later
  // point's dot landed on top of an earlier point's text.
  rows.forEach((r, i) => {
    const p = pts[i]!;
    const color = PROVIDER_COLOR[r.provider] ?? FALLBACK_COLOR;
    const ly = labelY.get(i) ?? p.y;
    const flip = side(p);
    const lx = flip ? p.x - 10 : p.x + 10;
    const anchor = flip ? 'end' : 'start';
    // A leader line, because a nudged label no longer touches its point.
    if (Math.abs(ly - p.y) > 2) {
      parts.push(`<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${(ly - 4).toFixed(1)}" stroke="${color}" stroke-width="0.75" opacity="0.5"/>`);
    }
    parts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="11" text-anchor="${anchor}" fill="${color}">${esc(r.cellModel)}</text>`);
    parts.push(`<text x="${lx.toFixed(1)}" y="${(ly + 11).toFixed(1)}" font-size="9.5" text-anchor="${anchor}" fill="${MUTED}">${pct1(r.accuracy)} · ${fmtX(xOf(r))}</text>`);
  });
  parts.push('</svg>');
  return parts.join('\n');
}

/** Chart 2: three stacked panels (accuracy, cost, time) vs batch size for one
 *  cell model. Accuracy uses the shared fixed log-error scale, so a knee here is
 *  the same size as a knee on any other model's chart; cost and time scale to
 *  their own data, which has no comparable ceiling. */
export function batchSweepChart(results: readonly ResultRow[], cellModel: string, opts: { width?: number; subtitle?: string } = {}): string {
  const rows = results.filter((r) => r.cellModel === cellModel).sort((a, b) => a.batchSize - b.batchSize);
  const panelH = 120, gap = 52, top = opts.subtitle ? 74 : 60, left = 68, right = 34;
  const W = opts.width ?? 660, plotW = W - left - right;
  const H = top + panelH * 3 + gap * 2 + 44;
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
  parts.push(`<text x="${left}" y="24" font-size="15" font-weight="600" fill="${INK}">Batch-size sweep: ${esc(cellModel)}</text>`);
  if (opts.subtitle) parts.push(`<text x="${left}" y="42" font-size="11" fill="${MUTED}">${esc(opts.subtitle)}</text>`);

  const panel = (
    idx: number,
    label: string,
    value: (r: ResultRow) => number,
    fmt: (v: number) => string,
    scale: 'accuracy' | 'auto',
  ) => {
    const pTop = top + idx * (panelH + gap);
    const vmax = scale === 'accuracy' ? 1 : niceMax(Math.max(0.0001, ...rows.map(value)));
    const vmin = scale === 'accuracy' ? ACC_MIN : 0;
    const py = (v: number) => scale === 'accuracy'
      ? pTop + (1 - accPos(v)) * panelH
      : pTop + (1 - (v - vmin) / (vmax - vmin)) * panelH;
    parts.push(`<text x="${left}" y="${pTop - 16}" font-size="12" font-weight="600" fill="${INK}">${esc(label)}</text>`);
    parts.push(`<line x1="${left}" y1="${pTop}" x2="${left + plotW}" y2="${pTop}" stroke="${GRID}"/>`);
    parts.push(`<line x1="${left}" y1="${pTop + panelH}" x2="${left + plotW}" y2="${pTop + panelH}" stroke="${GRID}"/>`);
    parts.push(`<text x="${left - 8}" y="${pTop + 4}" font-size="10" text-anchor="end" fill="${INK}">${fmt(scale === 'accuracy' ? 0.99 : vmax)}</text>`);
    parts.push(`<text x="${left - 8}" y="${pTop + panelH + 4}" font-size="10" text-anchor="end" fill="${INK}">${fmt(vmin)}</text>`);
    // The accuracy panel gets a mid gridline too: on a log-error scale the
    // midpoint is nowhere near the arithmetic middle, and without it the eye
    // reads the curve as linear.
    if (scale === 'accuracy') {
      const mid = py(0.9);
      parts.push(`<line x1="${left}" y1="${mid.toFixed(1)}" x2="${left + plotW}" y2="${mid.toFixed(1)}" stroke="${GRID}" stroke-dasharray="3 3"/>`);
      parts.push(`<text x="${left - 8}" y="${(mid + 4).toFixed(1)}" font-size="10" text-anchor="end" fill="${MUTED}">90%</text>`);
    }
    const pts = rows.map((r) => `${bx(r.batchSize).toFixed(1)},${py(value(r)).toFixed(1)}`);
    if (pts.length > 1) parts.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`);
    rows.forEach((r, i) => {
      const cx = bx(r.batchSize), cy = py(value(r));
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" fill="${color}"/>`);
      // The value beside every point: reading a number off a line was the one
      // thing these charts could not do. The end points anchor inwards so their
      // text cannot run over the axis labels or off the right edge.
      const anchor = i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle';
      parts.push(`<text x="${cx.toFixed(1)}" y="${(cy - 9).toFixed(1)}" font-size="9.5" text-anchor="${anchor}" fill="${INK}">${fmt(value(r))}</text>`);
    });
  };

  panel(0, 'Accuracy', (r) => r.accuracy, pct, 'accuracy');
  panel(1, 'Cost (USD)', (r) => r.costUsd, usd, 'auto');
  panel(2, 'Time (s)', (r) => r.timeMs / 1000, secs, 'auto');

  const xAxisY = top + 3 * panelH + 2 * gap + 22;
  for (const r of rows) {
    parts.push(`<text x="${bx(r.batchSize).toFixed(1)}" y="${xAxisY}" font-size="11" text-anchor="middle" fill="${INK}">${r.batchSize}</text>`);
  }
  parts.push(`<text x="${left + plotW / 2}" y="${xAxisY + 20}" font-size="12" text-anchor="middle" fill="${INK}">Batch size (rows per model call)</text>`);
  parts.push('</svg>');
  return parts.join('\n');
}
