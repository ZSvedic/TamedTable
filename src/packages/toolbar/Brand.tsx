// #Toolbar
// TamedTable brand mark + wordmark + lockup. Ported from the design system
// (marketing/claude-design-app/brand.jsx). The toolbar is its only consumer, so it
// lives here rather than in ui-kit.
//
// The mark is a 9 × 5 pixel grid:
//   row 0: ████◆████          top bar (◆ = accent at col 4)
//   row 1: .█.....█.
//   row 2: .█.███.█.          upper cross-bar
//   row 3: .█.....█.
//   row 4: .█.███.█.          lower cross-bar
//
// Rendering modes:
//   crisp   (≤ 80 px) — cells touch, no gaps, empty cells white
//   grid    (> 80 px) — 4-unit silver gap between every cell + outer edge
//   reverse (dark UI) — ink cells go white, no icon bg, no grid lines

import type { CSSProperties, ReactNode } from 'react';
import { brand, typography } from '@tamedtable/ui-kit';

type Mode = 'crisp' | 'grid' | 'reverse';

const MARK_GRID: ReadonlyArray<ReadonlyArray<string>> = [
  ['i', 'i', 'i', 'i', 'a', 'i', 'i', 'i', 'i'],
  ['.', 'i', '.', '.', '.', '.', '.', 'i', '.'],
  ['.', 'i', '.', 'i', 'i', 'i', '.', 'i', '.'],
  ['.', 'i', '.', '.', '.', '.', '.', 'i', '.'],
  ['.', 'i', '.', 'i', 'i', 'i', '.', 'i', '.'],
];
const MARK_COLS = 9;
const MARK_ROWS = 5;

interface MarkProps {
  height?: number;
  mode?: Mode;
  style?: CSSProperties;
  title?: string;
}

export function Mark({ height = 18, mode, style, title }: MarkProps): ReactNode {
  // Auto-pick crisp vs grid by display height, per the brand sizing rules.
  const m: Mode = mode ?? (height > 80 ? 'grid' : 'crisp');
  const isRev = m === 'reverse';
  const isGrid = m === 'grid';

  // Unit cell = 100. Grid mode adds a 4-unit silver strip on every edge and
  // between cells; crisp + reverse render cells touching.
  const off = isGrid ? 4 : 0;
  const cellSize = isGrid ? 96 : 100;
  const vbW = isGrid ? MARK_COLS * 100 + 4 : MARK_COLS * 100;
  const vbH = isGrid ? MARK_ROWS * 100 + 4 : MARK_ROWS * 100;
  const w = height * (vbW / vbH);

  const inkColor = isRev ? brand.white : brand.ink;
  const accentColor = brand.accent; // always pale sky
  const emptyColor = brand.white;

  const rects: ReactNode[] = [];
  if (isGrid) {
    rects.push(<rect key="bg" x="0" y="0" width={vbW} height={vbH} fill={brand.line} />);
  }
  for (let r = 0; r < MARK_ROWS; r++) {
    for (let c = 0; c < MARK_COLS; c++) {
      const v = MARK_GRID[r]?.[c];
      let fill: string | null = null;
      if (v === 'i') fill = inkColor;
      else if (v === 'a') fill = accentColor;
      else if (v === '.') fill = isRev ? null : emptyColor;
      if (fill === null) continue;
      rects.push(
        <rect
          key={`${r}-${c}`}
          x={c * 100 + off}
          y={r * 100 + off}
          width={cellSize}
          height={cellSize}
          fill={fill}
        />,
      );
    }
  }

  return (
    <svg
      width={w}
      height={height}
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

interface WordmarkProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

/** "TamedTable" — Outfit 500, small caps, +0.005em tracking. */
export function Wordmark({ size = 14, color, style }: WordmarkProps): ReactNode {
  return (
    <span
      style={{
        fontFamily: typography.brand,
        fontWeight: 500,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: '0.005em',
        fontVariantCaps: 'small-caps',
        color: color ?? brand.ink,
        whiteSpace: 'nowrap',
        display: 'inline-block',
        ...style,
      }}
    >
      TamedTable
    </span>
  );
}

interface LockupProps {
  size?: number;
  color?: string;
  dark?: boolean;
  style?: CSSProperties;
}

/** Single-row lockup: [icon] TamedTable. The icon is cap-height aligned. */
export function Lockup({ size = 14, color, dark = false, style }: LockupProps): ReactNode {
  const iconH = size * 0.72;
  const markMode: Mode = dark ? 'reverse' : 'crisp';
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.34, ...style }}
    >
      <Mark height={iconH} mode={markMode} title="TamedTable" />
      <Wordmark size={size} color={color} />
    </span>
  );
}
