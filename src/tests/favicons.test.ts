// Favicon guard. The marketing homepage and the web app deliberately ship
// *different* favicons so a browser tab tells the two surfaces apart
// (marketing/brand/brand.md § Favicons, issue #162): the homepage uses the
// dark-on-white mark, the app uses the white-on-dark ("ink") mark. This locks
// that split in place — the brand set exists at the right sizes, the app's HTML
// and its bundled public/ assets point at the ink set, and the homepage stays
// dark-on-white.
import { describe, expect, it } from 'bun:test';

const BRAND = '../marketing/brand';
const APP = 'packages/web';

// Width/height live in the PNG IHDR chunk: 4-byte big-endian ints at offsets
// 16 and 20 (8-byte signature + 8-byte chunk header precede them).
async function pngSize(path: string): Promise<{ width: number; height: number }> {
  const buf = new DataView(await Bun.file(path).arrayBuffer());
  return { width: buf.getUint32(16), height: buf.getUint32(20) };
}

describe('favicon guard', () => {
  it('the brand dir ships the white-on-dark favicon set at the right sizes', async () => {
    for (const n of [16, 32, 48]) {
      const path = `${BRAND}/favicon-ink-${n}.png`;
      expect(await Bun.file(path).exists(), `${path} is missing`).toBe(true);
      expect(await pngSize(path)).toEqual({ width: n, height: n });
    }
    expect(await Bun.file(`${BRAND}/icon-square-ink-crisp.svg`).exists()).toBe(true);
  });

  it('the white-on-dark favicon differs from the dark-on-white one', async () => {
    const dark = await Bun.file(`${BRAND}/favicon-32.png`).bytes();
    const ink = await Bun.file(`${BRAND}/favicon-ink-32.png`).bytes();
    expect(Buffer.from(ink).equals(Buffer.from(dark))).toBe(false);
  });

  it('the web app points its favicon links at the white-on-dark set', async () => {
    const html = await Bun.file(`${APP}/index.html`).text();
    expect(html).toContain('/favicon-ink-32.png');
    expect(html).toContain('/favicon-ink-16.png');
    expect(html).toContain('/favicon-ink-48.png');
    expect(html).toContain('/icon-square-ink-crisp.svg');
    // No leftover dark-on-white references — those belong to the homepage.
    expect(html).not.toMatch(/href="\/favicon-(16|32|48)\.png"/);
    expect(html).not.toContain('/icon-square-crisp.svg');
  });

  it('the app bundles the white-on-dark assets it serves', async () => {
    for (const name of [
      'favicon-ink-16.png',
      'favicon-ink-32.png',
      'favicon-ink-48.png',
      'icon-square-ink-crisp.svg',
    ]) {
      const path = `${APP}/public/${name}`;
      expect(await Bun.file(path).exists(), `${path} is missing`).toBe(true);
    }
  });

  it('the marketing homepage keeps the dark-on-white favicon', async () => {
    const html = await Bun.file('../marketing/web/index.html').text();
    expect(html).toContain('favicon-32.png');
    expect(html).not.toContain('favicon-ink');
  });
});
