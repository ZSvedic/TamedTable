// #UiKit
// Single source of truth for every visual choice — the TamedTable brand
// system expressed as design tokens. Light and dark theme objects share one
// shape; components read the active theme through useTheme() and never
// hard-code a color or pixel value, so the visual design lives in this one
// package. This entry is React-free; the components live in ./components.
// Spec: spec/packages/ui-kit/behavior.md.
//
// Brand system (see design/claude-design/uploads/brand.md):
//   Ink     · Aubergine  #281C60   replaces black throughout
//   Accent  · Pale Sky   #96BED7   the mark's accent cell + focus only
//   Lines   · Silver     #DCDCDC
//   White   · #FFFFFF              icon empty cells, panel surface
//   Ground  · Mist       #ECF0F7   cool page background

/** Brand-literal hex constants — used verbatim by the pixel mark. */
export const brand = {
  ink: '#281C60', // Aubergine
  accent: '#96BED7', // Pale Sky
  line: '#DCDCDC', // Silver
  white: '#FFFFFF',
  ground: '#ECF0F7', // Mist
  linen: '#F6F2EB', // Linen — warm callouts when needed
} as const;

/** Typography — Outfit for the wordmark, Inter for UI, JetBrains Mono for data. */
export const typography = {
  ui: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  brand: '"Outfit", "Inter", ui-sans-serif, system-ui, sans-serif',
  size: {
    micro: 10.5,
    xs: 11.5,
    sm: 12.5,
    base: 13,
    md: 14,
    lg: 16,
    xl: 20,
  },
} as const;

/** Spacing, fixed dimensions, and corner radii. */
export const space = {
  px1: 1,
  px2: 2,
  px4: 4,
  px6: 6,
  px8: 8,
  px10: 10,
  px12: 12,
  px14: 14,
  px16: 16,
  px20: 20,
  px24: 24,
  px32: 32,
  rowH: 28,
  headerH: 32,
  topbarH: 40,
  radiusSm: 4,
  radius: 6,
  radiusLg: 10,
} as const;

export interface Theme {
  name: 'light' | 'dark';
  // surfaces
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  overlay: string;
  // ink
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  inkOnAcc: string;
  inkOnInk: string;
  // lines
  line: string;
  line2: string;
  ring: string;
  // accent + semantics
  accent: string;
  accentHover: string;
  accentSoft: string;
  ok: string;
  okSoft: string;
  err: string;
  errSoft: string;
  // highlights
  cellHi: string;
  cellHi2: string;
  shadow: string;
  shadowLg: string;
}

// Light — cool pale-blue Mist ground, Aubergine ink. The default theme.
export const lightTheme: Theme = {
  name: 'light',
  bg: 'oklch(0.962 0.014 250)', // Mist — page ground
  surface: 'oklch(1.00 0 0)', // white panels (table body, chat content)
  surface2: 'oklch(0.975 0.010 250)', // chat sidebar
  surface3: 'oklch(0.940 0.015 250)', // hover / subtle fill
  overlay: 'oklch(0.20 0.10 287 / 0.45)', // aubergine-tinted veil

  ink: 'oklch(0.26 0.13 287)', // Aubergine #281C60
  ink2: 'oklch(0.42 0.10 287)', // secondary text
  ink3: 'oklch(0.58 0.06 287)', // tertiary / mono captions
  ink4: 'oklch(0.74 0.03 287)', // disabled / blank cell
  inkOnAcc: 'oklch(0.26 0.13 287)', // aubergine reads on pale sky
  inkOnInk: 'oklch(0.97 0.012 89)', // linen-white on aubergine

  line: 'oklch(0.89 0 0)', // Silver #DCDCDC
  line2: 'oklch(0.84 0 0)', // stronger (table grid)
  ring: 'oklch(0.77 0.06 240 / 0.55)', // pale-sky focus ring

  accent: 'oklch(0.77 0.06 240)', // Pale Sky #96BED7
  accentHover: 'oklch(0.72 0.07 240)',
  accentSoft: 'oklch(0.94 0.025 240)', // pale-sky wash for selection / user bubble
  ok: 'oklch(0.55 0.11 150)',
  okSoft: 'oklch(0.94 0.04 150)',
  err: 'oklch(0.54 0.18 25)',
  errSoft: 'oklch(0.95 0.04 25)',

  cellHi: 'oklch(0.86 0.08 240)', // pale-sky flash on AI update
  cellHi2: 'oklch(0.93 0.04 240)',
  shadow: '0 1px 2px rgba(40,28,96,.05), 0 4px 16px rgba(40,28,96,.07)',
  shadowLg: '0 10px 32px rgba(40,28,96,.14), 0 1px 0 rgba(40,28,96,.04)',
};

// Dark — deep aubergine field. Same density; the accent stays pale sky.
export const darkTheme: Theme = {
  name: 'dark',
  bg: 'oklch(0.16 0.06 287)', // deep aubergine
  surface: 'oklch(0.20 0.08 287)',
  surface2: 'oklch(0.23 0.09 287)',
  surface3: 'oklch(0.27 0.10 287)',
  overlay: 'oklch(0.10 0.05 287 / 0.65)',

  ink: 'oklch(0.96 0.010 89)', // linen-white
  ink2: 'oklch(0.78 0.012 240)',
  ink3: 'oklch(0.62 0.020 240)',
  ink4: 'oklch(0.48 0.025 240)',
  inkOnAcc: 'oklch(0.26 0.13 287)', // aubergine on pale sky
  inkOnInk: 'oklch(0.96 0.010 89)',

  line: 'oklch(0.32 0.05 287)',
  line2: 'oklch(0.38 0.06 287)',
  ring: 'oklch(0.77 0.06 240 / 0.65)',

  accent: 'oklch(0.77 0.06 240)', // Pale Sky — same on dark (reverse-mode rule)
  accentHover: 'oklch(0.82 0.07 240)',
  accentSoft: 'oklch(0.32 0.07 240)',
  ok: 'oklch(0.74 0.13 150)',
  okSoft: 'oklch(0.30 0.06 150)',
  err: 'oklch(0.70 0.17 25)',
  errSoft: 'oklch(0.30 0.10 25)',

  cellHi: 'oklch(0.46 0.10 240)',
  cellHi2: 'oklch(0.34 0.07 240)',
  shadow: '0 1px 2px rgba(0,0,0,.40), 0 6px 18px rgba(0,0,0,.40)',
  shadowLg: '0 12px 40px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.04)',
};
