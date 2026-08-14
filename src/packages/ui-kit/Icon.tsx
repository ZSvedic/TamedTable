// #UiKit
// Inline SVG icons: a 16×16 viewBox, 1.5 stroke, currentColor. The glyph
// artwork is canonical in marketing/icons/ (one SVG per name); icons.ts is
// generated from it by `bun run sync:icons`. Use as <Icon name="folder" />
// inside any element that sets a text color.

import type { ReactNode } from 'react';
import { PATHS, FILLED, type IconName } from './icons.ts';

export { ICON_NAMES, type IconName } from './icons.ts';

export function Icon({
  name,
  size = 14,
  strokeWidth = 1.5,
}: {
  name: IconName;
  size?: number;
  /** Stroke weight. The default suits 14–20px; the mobile dock renders larger
   *  glyphs (28px) at a thinner ~1.15 so they read crisp, not chunky. */
  strokeWidth?: number;
}): ReactNode {
  return (
    <svg
      data-uk-icon={name}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={FILLED.has(name) ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: '0 0 auto', display: 'block' }}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
