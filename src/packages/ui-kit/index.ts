// #UiKit
// Single source of truth for every visual choice — the TamedTable brand
// system expressed as design tokens. The token *values* live in one neutral
// data file, ./tokens.json, so both this package and the standalone design
// base (design/claude-design/) can read the same numbers without a second
// hand-maintained copy. This module gives them types and names; components
// read the active theme through useTheme() and never hard-code a color or
// pixel value, so the visual design lives in this one package. This entry is
// React-free; the components live in ./components.
// Spec: spec/packages/ui-kit/behavior.md.
//
// Brand system (see design/claude-design/uploads/brand.md):
//   Ink     · Aubergine  #281C60   replaces black throughout
//   Accent  · Pale Sky   #96BED7   the mark's accent cell + focus only
//   Lines   · Silver     #DCDCDC
//   White   · #FFFFFF              icon empty cells, panel surface
//   Ground  · Mist       #ECF0F7   cool page background

import tokens from './tokens.json';

/** Brand-literal hex constants — used verbatim by the pixel mark. */
export const brand = tokens.brand;

/** Typography — Outfit for the wordmark, Inter for UI, JetBrains Mono for data. */
export const typography = tokens.typography;

/** Spacing, fixed dimensions, and corner radii. */
export const space = tokens.space;

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
  rec: string; // recording red (mic active)
  onRec: string; // text/icon on a recording-red fill
  // highlights
  cellHi: string;
  cellHi2: string;
  shadow: string;
  shadowLg: string;
}

// Light — cool pale-blue Mist ground, Aubergine ink. The default theme.
export const lightTheme = tokens.themes.light as Theme;

// Dark — deep aubergine field. Same density; the accent stays pale sky.
export const darkTheme = tokens.themes.dark as Theme;
