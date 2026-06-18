// #UiKit
// Token sync. marketing/tokens.json is the canonical source of
// truth; this regenerates the two derived copies so neither can drift:
//   - packages/ui-kit/tokens.json               the app's importable copy (byte copy)
//   - marketing/claude-design-app/tokens.jsx    the in-browser design-canvas globals
// Run from src/: `bun run sync:tokens`. The guard test fails CI if either copy
// is stale. renderTokensJsx is exported so the guard can recompute it.

export interface Tokens {
  brand: Record<string, string>;
  typography: { ui: string; mono: string; brand: string; size: Record<string, number> };
  space: Record<string, number>;
  themes: { light: Record<string, unknown>; dark: Record<string, unknown> };
}

const MASTER = '../marketing/tokens.json';
const UIKIT_COPY = 'packages/ui-kit/tokens.json';
const CANVAS_JSX = '../marketing/claude-design-app/tokens.jsx';

/**
 * The TT_* globals the Babel canvas (index.html / Prototype.html) loads,
 * generated 1:1 from tokens.json — TT_TYPE flattens typography.size up so the
 * canvas reads TT_TYPE.base etc., matching the rest of the canvas files.
 */
export function renderTokensJsx(tokens: Tokens): string {
  const { brand, typography, space, themes } = tokens;
  const ttType = {
    ui: typography.ui,
    mono: typography.mono,
    brand: typography.brand,
    ...typography.size,
  };
  const lit = (o: unknown): string => JSON.stringify(o, null, 2);
  return `// GENERATED from tokens.json by \`bun run sync:tokens\` — do not edit by hand.
// marketing/tokens.json is the canonical source of truth.
const TT_BRAND = ${lit(brand)};
const TT_LIGHT = ${lit(themes.light)};
const TT_DARK = ${lit(themes.dark)};
const TT_TYPE = ${lit(ttType)};
const TT_S = ${lit(space)};

Object.assign(window, { TT_LIGHT, TT_DARK, TT_TYPE, TT_S, TT_BRAND });
`;
}

async function main(): Promise<void> {
  const masterText = await Bun.file(MASTER).text();
  const tokens = JSON.parse(masterText) as Tokens;
  await Bun.write(UIKIT_COPY, masterText); // exact bytes — keeps the JSON copy identical
  await Bun.write(CANVAS_JSX, renderTokensJsx(tokens));
  console.log(`synced ${UIKIT_COPY} and ${CANVAS_JSX} from ${MASTER}`);
}

if (import.meta.main) void main();
