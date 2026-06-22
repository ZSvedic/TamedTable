#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["pillow"]
# ///
"""Render the crisp favicon PNGs from the two crisp SVGs in this dir.

Two sets ship so a browser tab tells the marketing homepage and the web app
apart (see brand.md § Favicons):

  dark-on-white   icon-square-crisp.svg      -> favicon-{16,32,48}.png
  white-on-dark   icon-square-ink-crisp.svg  -> favicon-ink-{16,32,48}.png

`icon-square-ink-crisp.svg` is `icon-square-crisp.svg` with Ink (#281C60) and
Icon Background (#FFFFFF) swapped; the Pale Sky accent cell (#96BED7) is left
untouched. This script regenerates that SVG too, so the mark only ever needs
editing in `icon-square-crisp.svg`.

The marks are crisp axis-aligned-rect SVGs, so a real rasterizer is overkill:
edges are snapped to the device pixel grid (emulating `shape-rendering:
crispEdges`) and each cell is filled as a solid block — no anti-aliasing fuzz
at favicon sizes. Run from anywhere: `marketing/brand/gen-favicons.py`.
"""

import re
from pathlib import Path

from PIL import Image, ImageDraw

BRAND = Path(__file__).resolve().parent


def build_ink_svg() -> str:
    """Swap Ink <-> Icon Background; keep the accent cell. Write + return it."""
    src = (BRAND / "icon-square-crisp.svg").read_text()
    ink = (
        src.replace("#FFFFFF", "@@WHITE@@")
        .replace("#281C60", "#FFFFFF")
        .replace("@@WHITE@@", "#281C60")
    )
    (BRAND / "icon-square-ink-crisp.svg").write_text(ink)
    return ink


def parse(svg: str):
    bg = re.search(
        r'<rect x="0" y="0" width="1000" height="1000" fill="(#[0-9A-Fa-f]+)"', svg
    ).group(1)
    tx, ty, s = re.search(r"translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)", svg).groups()
    tx, ty, s = float(tx), float(ty), float(s)
    rects = []
    for m in re.finditer(
        r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="(#[0-9A-Fa-f]+)">',
        svg,
    ):
        x, y, w, h, fill = m.groups()
        if (float(x), float(y), float(w), float(h)) == (0.0, 0.0, 1000.0, 1000.0):
            continue  # the background rect, already captured
        rects.append((float(x), float(y), float(w), float(h), fill))
    return bg, tx, ty, s, rects


def render(svg: str, n: int) -> Image.Image:
    bg, tx, ty, s, rects = parse(svg)
    f = n / 1000.0
    img = Image.new("RGBA", (n, n), bg)
    d = ImageDraw.Draw(img)
    for x, y, w, h, fill in rects:
        x0 = round((tx + x * s) * f)
        y0 = round((ty + y * s) * f)
        x1 = round((tx + (x + w) * s) * f)
        y1 = round((ty + (y + h) * s) * f)
        if x1 > x0 and y1 > y0:
            d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=fill)
    return img


def main() -> None:
    light = (BRAND / "icon-square-crisp.svg").read_text()
    dark = build_ink_svg()
    for n in (16, 32, 48):
        render(light, n).save(BRAND / f"favicon-{n}.png")
        render(dark, n).save(BRAND / f"favicon-ink-{n}.png")
    print("regenerated favicon-{16,32,48}.png and favicon-ink-{16,32,48}.png")


if __name__ == "__main__":
    main()
