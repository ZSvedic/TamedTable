// #UiKit
// Guard: packages/ui-kit/icons.ts is generated from marketing/icons/*.svg.
// The canonical glyph artwork lives at marketing/icons/ so it survives a
// src/ regeneration; this test fails CI if the generated catalogue drifts.

import { describe, it, expect } from 'bun:test';
import { readGlyphs, renderIconsTs } from '../packages/ui-kit/sync-icons.ts';

describe('icon catalogue sync', () => {
  it('ui-kit icons.ts is generated from marketing/icons/*.svg', async () => {
    const current = await Bun.file('packages/ui-kit/icons.ts').text();
    expect(current, 'ui-kit/icons.ts is stale — run `bun run sync:icons`').toBe(
      renderIconsTs(readGlyphs('../marketing/icons'))
    );
  });
});
