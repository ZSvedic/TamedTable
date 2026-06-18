// TamedTable — brand mark + wordmark + lockup.
//
// The mark is a 9 × 5 pixel grid:
//   row 0: ████◆████          ← top bar (◆ = accent at col 4)
//   row 1: .█.....█.
//   row 2: .█.███.█.          ← upper cross-bar
//   row 3: .█.....█.
//   row 4: .█.███.█.          ← lower cross-bar
//
// Three rendering modes:
//   crisp   (≤ 80 px height) — cells touch, no gaps, empty cells are white
//   grid    (> 80 px height) — 4-unit silver gap between every cell + outer
//   reverse (on dark surfaces) — ink cells go white, no icon bg, no grid

const MARK_GRID = [
  ['i', 'i', 'i', 'i', 'a', 'i', 'i', 'i', 'i'],
  ['.', 'i', '.', '.', '.', '.', '.', 'i', '.'],
  ['.', 'i', '.', 'i', 'i', 'i', '.', 'i', '.'],
  ['.', 'i', '.', '.', '.', '.', '.', 'i', '.'],
  ['.', 'i', '.', 'i', 'i', 'i', '.', 'i', '.'],
];
const MARK_COLS = 9;
const MARK_ROWS = 5;

function Mark({ height = 18, mode, style, title }) {
  // auto-pick crisp vs grid by display height per the brand sizing rules
  const m = mode || (height > 80 ? 'grid' : 'crisp');
  const isRev  = m === 'reverse';
  const isGrid = m === 'grid';

  // Geometry — unit cell = 100.
  // grid mode adds a 4-unit silver strip on every edge AND between cells;
  // crisp + reverse render cells touching.
  const off = isGrid ? 4 : 0;
  const cellSize = isGrid ? 96 : 100;
  const vbW = isGrid ? MARK_COLS * 100 + 4 : MARK_COLS * 100;
  const vbH = isGrid ? MARK_ROWS * 100 + 4 : MARK_ROWS * 100;
  const w   = height * (vbW / vbH);

  // Colors
  const inkColor    = isRev ? TT_BRAND.white : TT_BRAND.ink;
  const accentColor = TT_BRAND.accent;                              // always pale sky
  const emptyColor  = TT_BRAND.white;
  const lineColor   = TT_BRAND.line;

  const rects = [];
  if (isGrid) {
    rects.push(<rect key="bg" x="0" y="0" width={vbW} height={vbH} fill={lineColor} />);
  }
  for (let r = 0; r < MARK_ROWS; r++) {
    for (let c = 0; c < MARK_COLS; c++) {
      const v = MARK_GRID[r][c];
      let fill = null;
      if (v === 'i')      fill = inkColor;
      else if (v === 'a') fill = accentColor;
      else if (v === '.') fill = isRev ? null : emptyColor;
      if (fill === null) continue;
      rects.push(
        <rect key={`${r}-${c}`}
          x={c * 100 + off} y={r * 100 + off}
          width={cellSize} height={cellSize}
          fill={fill} />
      );
    }
  }

  return (
    <svg
      width={w} height={height}
      viewBox={`0 0 ${vbW} ${vbH}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      style={{ flex: '0 0 auto', display: 'block', ...style }}
    >
      {rects}
    </svg>
  );
}

// Wordmark — "TamedTable", Outfit 500, small caps, +0.005em tracking.
// Both T's stay full-size capitals; the lowercase letters render as small caps.
function Wordmark({ size = 14, color, style }) {
  return (
    <span style={{
      fontFamily: TT_TYPE.brand,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: '0.005em',
      fontVariantCaps: 'small-caps',
      color: color || TT_BRAND.ink,
      whiteSpace: 'nowrap',
      display: 'inline-block',
      ...style,
    }}>TamedTable</span>
  );
}

// Lockup — single row by default ([icon] TamedTable). twoRow stacks the wordmark
// into Tamed / Table with a taller icon.
//
// Icon sizing: cap-height aligned — the mark's top/bottom line up with the
// top/baseline of the T's in the wordmark (≈ 0.72em for Outfit 500).
function Lockup({ size = 14, color, dark = false, twoRow = false, style }) {
  const iconH = twoRow ? size * 1.65 : size * 0.72;
  const markMode = dark ? 'reverse' : (iconH > 80 ? 'grid' : 'crisp');
  if (twoRow) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.42, ...style }}>
        <Mark height={iconH} mode={markMode} />
        <span style={{
          fontFamily: TT_TYPE.brand, fontWeight: 500, fontSize: size,
          lineHeight: 0.96, letterSpacing: '0.005em',
          fontVariantCaps: 'small-caps', color: color || TT_BRAND.ink,
          display: 'inline-flex', flexDirection: 'column',
        }}>
          <span>Tamed</span><span>Table</span>
        </span>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.34, ...style }}>
      <Mark height={iconH} mode={markMode} />
      <Wordmark size={size} color={color} />
    </span>
  );
}

Object.assign(window, { Mark, Wordmark, Lockup, MARK_GRID });
