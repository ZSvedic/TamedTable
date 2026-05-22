// TamedTable design tokens — light + dark.
// Based on the TamedTable brand system:
//   Ink     · Aubergine  #281C60   (replaces black throughout)
//   Accent  · Pale Sky   #96BED7   (used sparingly; the single accent cell + focus)
//   Lines   · Silver     #DCDCDC
//   White   · #FFFFFF                (icon empty cells, panel surface)
//   Ground  · Linen      #F6F2EB    (warm page background)
//
// The whole UI is warm-cool: cool aubergine ink on warm linen ground.

// Brand-literal hex constants (used for the mark and verbatim swatches).
const TT_BRAND = {
  ink:     '#281C60',   // Aubergine
  accent:  '#96BED7',   // Pale Sky
  line:    '#DCDCDC',   // Silver
  white:   '#FFFFFF',
  ground:  '#ECF0F7',   // Mist — pale cool blue (page + sidebar ground)
  linen:   '#F6F2EB',   // Linen — kept for warm callouts when needed
};

const TT_LIGHT = {
  name: 'light',
  // surfaces — cool pale-blue ground (Mist), pulled from the Pale Sky hue (~240°)
  bg:        'oklch(0.962 0.014 250)',  // Mist — page ground
  surface:   'oklch(1.00 0 0)',         // white panels (table body, chat content)
  surface2:  'oklch(0.975 0.010 250)',  // chat sidebar (slightly cooler than bg)
  surface3:  'oklch(0.940 0.015 250)',  // hover / subtle fill
  overlay:   'oklch(0.20 0.10 287 / 0.45)',  // aubergine-tinted veil

  // ink — Aubergine at 26% L · 0.13 C · 287°, scaled down toward ink4
  ink:       'oklch(0.26 0.13 287)',    // Aubergine #281C60
  ink2:      'oklch(0.42 0.10 287)',    // secondary text
  ink3:      'oklch(0.58 0.06 287)',    // tertiary / mono captions
  ink4:      'oklch(0.74 0.03 287)',    // disabled / blank cell
  inkOnAcc:  'oklch(0.26 0.13 287)',    // ink ON pale sky — aubergine reads on sky
  inkOnInk:  'oklch(0.97 0.012 89)',    // linen-white on aubergine

  // lines — Silver
  line:      'oklch(0.89 0 0)',         // Silver #DCDCDC
  line2:     'oklch(0.84 0 0)',         // stronger (table grid)
  ring:      'oklch(0.77 0.06 240 / 0.55)',  // pale-sky focus ring

  // accent + soft tints + semantics
  accent:    'oklch(0.77 0.06 240)',    // Pale Sky #96BED7
  accentHover:'oklch(0.72 0.07 240)',
  accentSoft:'oklch(0.94 0.025 240)',   // pale-sky wash for selected row / user bubble
  ok:        'oklch(0.55 0.11 150)',
  okSoft:    'oklch(0.94 0.04 150)',
  err:       'oklch(0.54 0.18 25)',
  errSoft:   'oklch(0.95 0.04 25)',

  // highlights
  cellHi:    'oklch(0.86 0.08 240)',    // pale-sky flash on AI update (on-brand)
  cellHi2:   'oklch(0.93 0.04 240)',
  shadow:    '0 1px 2px rgba(40,28,96,.05), 0 4px 16px rgba(40,28,96,.07)',
  shadowLg:  '0 10px 32px rgba(40,28,96,.14), 0 1px 0 rgba(40,28,96,.04)',
};

const TT_DARK = {
  name: 'dark',
  // surfaces — deep aubergine field
  bg:        'oklch(0.16 0.06 287)',    // deep aubergine
  surface:   'oklch(0.20 0.08 287)',
  surface2:  'oklch(0.23 0.09 287)',
  surface3:  'oklch(0.27 0.10 287)',
  overlay:   'oklch(0.10 0.05 287 / 0.65)',

  ink:       'oklch(0.96 0.010 89)',    // linen-white
  ink2:      'oklch(0.78 0.012 240)',
  ink3:      'oklch(0.62 0.020 240)',
  ink4:      'oklch(0.48 0.025 240)',
  inkOnAcc:  'oklch(0.26 0.13 287)',    // aubergine on pale sky
  inkOnInk:  'oklch(0.96 0.010 89)',

  line:      'oklch(0.32 0.05 287)',
  line2:     'oklch(0.38 0.06 287)',
  ring:      'oklch(0.77 0.06 240 / 0.65)',

  accent:    'oklch(0.77 0.06 240)',    // Pale Sky — same on dark (reverse mode rule)
  accentHover:'oklch(0.82 0.07 240)',
  accentSoft:'oklch(0.32 0.07 240)',
  ok:        'oklch(0.74 0.13 150)',
  okSoft:    'oklch(0.30 0.06 150)',
  err:       'oklch(0.70 0.17 25)',
  errSoft:   'oklch(0.30 0.10 25)',

  cellHi:    'oklch(0.46 0.10 240)',
  cellHi2:   'oklch(0.34 0.07 240)',
  shadow:    '0 1px 2px rgba(0,0,0,.40), 0 6px 18px rgba(0,0,0,.40)',
  shadowLg:  '0 12px 40px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.04)',
};

// Type — Outfit for the wordmark, Inter for UI body, JetBrains Mono for data.
const TT_TYPE = {
  // Body / UI: Inter
  ui:    `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
  // Numbers, metadata, specs, captions: JetBrains Mono
  mono:  `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`,
  // Wordmark only: Outfit, with small-caps locked at 500 / +0.005em
  brand: `"Outfit", "Inter", ui-sans-serif, system-ui, sans-serif`,
  // sizes (px)
  micro: 10.5,
  xs:    11.5,
  sm:    12.5,
  base:  13,
  md:    14,
  lg:    16,
  xl:    20,
};

const TT_S = {  // spacing scale
  px1: 1, px2: 2, px4: 4, px6: 6, px8: 8, px10: 10, px12: 12, px14: 14, px16: 16, px20: 20, px24: 24, px32: 32,
  rowH: 28,
  headerH: 32,
  topbarH: 40,
  radius: 6,
  radiusSm: 4,
  radiusLg: 10,
};

Object.assign(window, { TT_LIGHT, TT_DARK, TT_TYPE, TT_S, TT_BRAND });
