// #UiKit
// Icon sync. marketing/icons/*.svg is the canonical source of the glyph
// artwork — one 16×16 SVG per icon name; this regenerates the package's
// importable catalogue (packages/ui-kit/icons.ts) so the two can't drift.
// A filled glyph (stop, play) says fill="currentColor" on its <svg>; every
// other glyph is stroked. Run from src/: `bun run sync:icons`. The guard test
// fails CI if icons.ts is stale. renderIconsTs is exported so the guard can
// recompute it.

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const ICON_DIR = '../marketing/icons';
const CATALOGUE = 'packages/ui-kit/icons.ts';

export interface Glyph {
  name: string;
  d: string;
  filled: boolean;
}

/** Parse one icon SVG: the path data and whether the glyph is filled. */
export function parseIconSvg(name: string, svg: string): Glyph {
  const d = svg.match(/<path d="([^"]+)"/)?.[1];
  if (!d) throw new Error(`${name}.svg: no <path d="..."> found`);
  return { name, d, filled: /<svg[^>]*fill="currentColor"/.test(svg) };
}

export function readGlyphs(dir: string): Glyph[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .sort()
    .map((f) => parseIconSvg(basename(f, '.svg'), readFileSync(join(dir, f), 'utf8')));
}

export function renderIconsTs(glyphs: Glyph[]): string {
  const names = glyphs.map((g) => `  | '${g.name}'`).join('\n');
  const paths = glyphs.map((g) => `  ${g.name}: '${g.d}',`).join('\n');
  const filled = glyphs.filter((g) => g.filled).map((g) => `'${g.name}'`).join(', ');
  return `// GENERATED from marketing/icons/*.svg by \`bun run sync:icons\` — do not edit
// by hand. marketing/icons/ is the canonical source of the glyph artwork.

export type IconName =
${names};

export const PATHS: Record<IconName, string> = {
${paths}
};

/** Glyphs drawn filled (fill="currentColor" on the source SVG) — every other
 *  glyph is stroked. */
export const FILLED: ReadonlySet<IconName> = new Set<IconName>([${filled}]);

/** Every icon name, sorted — the demo's icon grid renders these. */
export const ICON_NAMES = Object.keys(PATHS) as IconName[];
`;
}

async function main(): Promise<void> {
  const glyphs = readGlyphs(ICON_DIR);
  await Bun.write(CATALOGUE, renderIconsTs(glyphs));
  console.log(`synced ${CATALOGUE} from ${glyphs.length} glyphs in ${ICON_DIR}`);
}

if (import.meta.main) void main();
