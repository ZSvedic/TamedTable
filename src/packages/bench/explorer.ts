// #BenchSweep
// Generates benchmarks/charts/explorer.html: the whole results table, plus
// filters and a scatter plot, in one file you open by double-clicking it.
//
// The CSV is embedded rather than fetched. A page opened from disk cannot fetch
// a sibling file (the browser blocks file:// requests as cross-origin), so a
// page that loaded sweeps.csv at runtime would work on a web server and show an
// empty chart everywhere else. Embedding costs a few kilobytes and always works.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function explorerPage(csv: string, generatedOn: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TamedTable benchmark explorer</title>
<style>
  :root { --ink:#222; --muted:#777; --grid:#e5e5e5; --line:#d5d9de; }
  body { font: 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: var(--ink); margin: 0; padding: 24px; background: #fff; }
  h1 { font-size: 19px; margin: 0 0 2px; }
  .sub { color: var(--muted); font-size: 12px; margin-bottom: 18px; }
  .filters { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start; border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; }
  .filter { min-width: 120px; }
  .filter h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin: 0 0 6px; }
  label { display: block; font-size: 13px; cursor: pointer; white-space: nowrap; }
  select { font: inherit; padding: 3px 6px; border: 1px solid var(--line); border-radius: 5px; }
  .count { color: var(--muted); font-size: 12px; margin: 8px 0 14px; }
  svg { border: 1px solid var(--line); border-radius: 8px; max-width: 100%; }
  table { border-collapse: collapse; font-size: 12.5px; margin-top: 18px; width: 100%; }
  th, td { text-align: left; padding: 5px 9px; border-bottom: 1px solid var(--grid); white-space: nowrap; }
  th { cursor: pointer; user-select: none; background: #fafafa; position: sticky; top: 0; }
  th:hover { background: #f0f0f0; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .wrap { max-height: 460px; overflow: auto; border: 1px solid var(--line); border-radius: 8px; }
</style>
</head>
<body>
<h1>TamedTable benchmark explorer</h1>
<div class="sub">Every sweep this benchmark has run. Generated ${esc(generatedOn)} from <code>benchmarks/results/sweeps.csv</code>.</div>

<div class="filters">
  <div class="filter"><h3>Tier</h3><div id="f-tier"></div></div>
  <div class="filter"><h3>Free tier</h3><div id="f-freeTier"></div></div>
  <div class="filter"><h3>Provider</h3><div id="f-provider"></div></div>
  <div class="filter"><h3>Batch size</h3><div id="f-batchSize"></div></div>
  <div class="filter"><h3>Run date</h3><div id="f-date"></div></div>
  <div class="filter">
    <h3>X axis</h3>
    <select id="axis"><option value="costUsd">Cost per task (USD)</option><option value="timeSec">Time per task (s)</option></select>
  </div>
</div>

<div class="count" id="count"></div>
<div id="chart"></div>
<div class="wrap"><table id="table"></table></div>

<script>
const CSV = ${JSON.stringify(csv)};

function splitLine(line) {
  const out = []; let f = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i+1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(f); f = ''; }
    else f += c;
  }
  out.push(f); return out;
}
const NUMERIC = new Set(['batchSize','accuracyPct','costUsd','timeSec','rows','scored','missing','calls','inTokens','outTokens']);
const lines = CSV.split('\\n').filter(l => l.trim());
const HEADER = splitLine(lines[0]);
const ROWS = lines.slice(1).map(l => {
  const c = splitLine(l), o = {};
  HEADER.forEach((h, i) => { o[h] = NUMERIC.has(h) ? Number(c[i]) : c[i]; });
  return o;
});

const COLOR = { anthropic:'#D55E00', gemini:'#0072B2', openai:'#009E73', cerebras:'#CC79A7', openrouter:'#E69F00', groq:'#56B4E9' };
// Same log-error accuracy scale as the committed SVGs (see charts.ts), so the
// page and the files agree on what a gap between two models looks like.
const ACC_MIN = 60, ERR_MAX = 100 - ACC_MIN, ERR_MIN = 1;
const ACC_TICKS = [65, 75, 85, 90, 93, 95, 97, 99];
const accPos = a => (Math.log10(ERR_MAX) - Math.log10(Math.min(ERR_MAX, Math.max(ERR_MIN, 100 - a)))) / (Math.log10(ERR_MAX) - Math.log10(ERR_MIN));
const FACETS = ['tier','freeTier','provider','batchSize','date'];
const state = {};
for (const f of FACETS) state[f] = new Set(uniq(f));
// Open on one batch size: every batch size at once puts six points on the chart
// per model, and the first thing anyone wants is one point per model.
const OPEN_BATCH = mode(ROWS.map(r => r.batchSize));
state.batchSize = new Set([OPEN_BATCH]);
function mode(xs) {
  const c = new Map();
  for (const x of xs) c.set(x, (c.get(x) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function uniq(field) {
  return [...new Set(ROWS.map(r => r[field]))].sort((a,b) => typeof a === 'number' ? a-b : String(a).localeCompare(String(b)));
}
function buildFilters() {
  for (const f of FACETS) {
    const host = document.getElementById('f-' + f);
    host.innerHTML = '';
    for (const v of uniq(f)) {
      const id = f + '-' + v;
      const lab = document.createElement('label');
      lab.innerHTML = '<input type="checkbox"' + (state[f].has(v) ? ' checked' : '') + ' id="' + id + '"> ' + v;
      lab.querySelector('input').addEventListener('change', e => {
        if (e.target.checked) state[f].add(v); else state[f].delete(v);
        render();
      });
      host.appendChild(lab);
    }
  }
}
const visible = () => ROWS.filter(r => FACETS.every(f => state[f].has(r[f])));

// The Pareto frontier of the filtered set: nothing is cheaper/faster AND more
// accurate than a point on it. y is in SVG pixels, so smaller y is better.
function pareto(pts) {
  const sorted = [...pts].sort((a,b) => a.x - b.x || a.y - b.y);
  const out = []; let best = Infinity;
  for (const p of sorted) if (p.y < best) { out.push(p); best = p.y; }
  return out;
}
function niceMax(v) {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const s of [1,2,2.5,5,10]) if (v <= s*mag) return s*mag;
  return 10*mag;
}
const svgEl = (n, attrs) => {
  const e = document.createElementNS('http://www.w3.org/2000/svg', n);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

function drawChart(rows) {
  const axis = document.getElementById('axis').value;
  const W = Math.min(900, document.body.clientWidth - 48), H = 480;
  const m = { top: 20, right: 28, bottom: 46, left: 62 };
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const host = document.getElementById('chart');
  host.innerHTML = '';
  const svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, font_family: 'inherit' });
  if (!rows.length) { host.appendChild(svg); return; }

  const maxX = niceMax(Math.max(...rows.map(r => r[axis]), 0.0001));
  const X = v => m.left + (v / maxX) * pw;
  const Y = a => m.top + (1 - accPos(a)) * ph;
  const fmtX = v => axis === 'costUsd' ? '$' + v.toFixed(4) : v.toFixed(0) + 's';

  for (const a of ACC_TICKS) {
    svg.appendChild(svgEl('line', { x1: m.left, y1: Y(a), x2: m.left + pw, y2: Y(a), stroke: '#e5e5e5' }));
    const t = svgEl('text', { x: m.left - 8, y: Y(a) + 4, 'font-size': 11, 'text-anchor': 'end', fill: '#222' });
    t.textContent = a + '%'; svg.appendChild(t);
  }
  for (let i = 0; i <= 4; i++) {
    const v = (maxX / 4) * i;
    svg.appendChild(svgEl('line', { x1: X(v), y1: m.top, x2: X(v), y2: m.top + ph, stroke: '#e5e5e5' }));
    const t = svgEl('text', { x: X(v), y: m.top + ph + 18, 'font-size': 11, 'text-anchor': 'middle', fill: '#222' });
    t.textContent = fmtX(v); svg.appendChild(t);
  }
  const xl = svgEl('text', { x: m.left + pw/2, y: H - 10, 'font-size': 12, 'text-anchor': 'middle', fill: '#222' });
  xl.textContent = axis === 'costUsd' ? 'Cost per task (USD)' : 'Time per task (seconds)';
  svg.appendChild(xl);

  const pts = rows.map(r => ({ x: X(r[axis]), y: Y(r.accuracyPct), r }));
  const front = pareto(pts);
  if (front.length > 1) {
    svg.appendChild(svgEl('polyline', {
      points: front.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' '),
      fill: 'none', stroke: '#bbb', 'stroke-width': 1.5, 'stroke-dasharray': '5 4',
    }));
  }
  const onFront = new Set(front.map(p => p.r));
  for (const p of pts) {
    const c = svgEl('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: onFront.has(p.r) ? 6 : 4, fill: COLOR[p.r.provider] || '#999' });
    if (onFront.has(p.r)) { c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', 1.5); }
    const title = svgEl('title', {});
    title.textContent = p.r.cellModel + ' at batch ' + p.r.batchSize + ', ' + p.r.accuracyPct + '%, $' + p.r.costUsd + ', ' + p.r.timeSec + 's (' + p.r.date + ')';
    c.appendChild(title);
    svg.appendChild(c);
  }
  // Label only the frontier. Labelling every point is what made the committed
  // SVGs unreadable; hover carries the rest.
  const used = [];
  for (const p of [...front].sort((a,b) => a.y - b.y)) {
    let y = p.y + 4;
    while (used.some(u => Math.abs(u - y) < 12)) y += 12;
    used.push(y);
    const flip = p.x > m.left + pw * 0.62;
    const t = svgEl('text', { x: flip ? p.x - 9 : p.x + 9, y, 'font-size': 11, 'text-anchor': flip ? 'end' : 'start', fill: COLOR[p.r.provider] || '#999' });
    t.textContent = p.r.cellModel + ' (' + p.r.accuracyPct + '%)';
    svg.appendChild(t);
  }
  host.appendChild(svg);
}

let sortKey = 'accuracyPct', sortDir = -1;
function drawTable(rows) {
  const sorted = [...rows].sort((a, b) => {
    const x = a[sortKey], y = b[sortKey];
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * sortDir;
  });
  const t = document.getElementById('table');
  t.innerHTML = '';
  const thead = document.createElement('thead'), tr = document.createElement('tr');
  for (const h of HEADER) {
    const th = document.createElement('th');
    th.textContent = h + (h === sortKey ? (sortDir < 0 ? ' ▾' : ' ▴') : '');
    if (NUMERIC.has(h)) th.className = 'num';
    th.addEventListener('click', () => {
      if (sortKey === h) sortDir = -sortDir; else { sortKey = h; sortDir = NUMERIC.has(h) ? -1 : 1; }
      render();
    });
    tr.appendChild(th);
  }
  thead.appendChild(tr); t.appendChild(thead);
  const tb = document.createElement('tbody');
  for (const r of sorted) {
    const row = document.createElement('tr');
    for (const h of HEADER) {
      const td = document.createElement('td');
      td.textContent = r[h];
      if (NUMERIC.has(h)) td.className = 'num';
      row.appendChild(td);
    }
    tb.appendChild(row);
  }
  t.appendChild(tb);
}

function render() {
  const rows = visible();
  document.getElementById('count').textContent = rows.length + ' of ' + ROWS.length + ' configs shown';
  drawChart(rows);
  drawTable(rows);
}
document.getElementById('axis').addEventListener('change', render);
window.addEventListener('resize', render);
buildFilters();
render();
</script>
</body>
</html>
`;
}
