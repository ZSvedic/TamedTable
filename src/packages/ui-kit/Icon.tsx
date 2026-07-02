// #UiKit
// Inline SVG icons — a 16×16 viewBox, 1.5 stroke, currentColor. Ported from
// the design system (marketing/claude-design-app/components.jsx). Use as
// <Icon name="folder" /> inside any element that sets a text color.

import type { ReactNode } from 'react';

export type IconName =
  | 'folder'
  | 'save'
  | 'undo'
  | 'redo'
  | 'wrench'
  | 'send'
  | 'stop'
  | 'chevron'
  | 'x'
  | 'err'
  | 'ok'
  | 'upload'
  | 'grip'
  | 'eye'
  | 'eyeOff'
  | 'sun'
  | 'moon'
  | 'mic'
  | 'wave'
  | 'copy'
  | 'menu'
  | 'keyboard'
  | 'link'
  | 'sparkle'
  | 'clock'
  | 'play'
  | 'file'
  | 'code'
  | 'tour'
  | 'check'
  | 'chevLeft'
  | 'chevRight';

const PATHS: Record<IconName, string> = {
  folder:
    'M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6a1 1 0 0 1 .7.3l1 1H12.5A1.5 1.5 0 0 1 14 5.8v5.7A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5z',
  save: 'M3 3h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M5 3v3h5V3 M5 13v-4h6v4',
  undo: 'M5 5 2.5 7.5 5 10 M2.5 7.5h7.5a3.5 3.5 0 1 1 0 7H7',
  redo: 'm11 5 2.5 2.5L11 10 M13.5 7.5H6a3.5 3.5 0 1 0 0 7h3',
  // Wrench — Settings. (The old cog was a circle with radiating ticks, which
  // read as a second sun next to the theme toggle.)
  wrench:
    'M9.8 4.2a.67.67 0 0 0 0 .94l1.06 1.06a.67.67 0 0 0 .94 0l2.51-2.51a4 4 0 0 1-5.29 5.29l-4.61 4.61a1.41 1.41 0 0 1-2-2l4.61-4.61a4 4 0 0 1 5.29-5.29L9.8 4.2Z',
  send: 'm2.5 8 11-5-3 12-3-5-5-2Z',
  stop: 'M5 5h6v6H5z',
  chevron: 'm4 6 4 4 4-4',
  x: 'm4 4 8 8 M12 4l-8 8',
  err: 'M8 2 14 13H2L8 2Z M8 7v3 M8 12v.01',
  ok: 'm3 8 3.5 3.5L13 5',
  upload: 'M8 10V3 M5 6l3-3 3 3 M2.5 11.5v1A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-1',
  grip: 'M6 4v8 M10 4v8',
  eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  eyeOff: 'M6.2 6.2A2 2 0 0 0 9.8 9.8 M3 3l10 10 M5.2 5.3C2.9 6.6 1.5 8 1.5 8S4 12.5 8 12.5c1 0 1.9-.2 2.7-.6 M10.8 10.7C13 9.4 14.5 8 14.5 8S12 3.5 8 3.5',
  sun: 'M8 5.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z M8 1.4v1.8 M8 12.8v1.8 M1.4 8h1.8 M12.8 8h1.8 M3.4 3.4l1.3 1.3 M11.3 11.3l1.3 1.3 M3.4 12.6l1.3-1.3 M11.3 4.7l1.3-1.3',
  moon: 'M13.2 9.4A5.5 5.5 0 0 1 6.6 2.8 5.5 5.5 0 1 0 13.2 9.4Z',
  mic: 'M8 2.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-4 0V4.5a2 2 0 0 1 2-2Z M4.5 8a3.5 3.5 0 0 0 7 0 M8 11.5V14 M6 14h4',
  // An audio waveform — five bars of rising/falling height for continuous voice.
  wave: 'M2.5 6.5v3 M5.25 4v8 M8 2v12 M10.75 4v8 M13.5 6.5v3',
  copy: 'M6 6h7v7H6Z M10 6V3.5A.5.5 0 0 0 9.5 3h-6a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5H6',
  // Hamburger menu — three rules.
  menu: 'M2.5 4.5h11 M2.5 8h11 M2.5 11.5h11',
  // On-screen keyboard — wider rounded frame, five evenly-spaced key dots, and a
  // space bar (the mobile prototype's glyph — reads crisp at the dock's 28px).
  keyboard:
    'M2 4.75h12A1.25 1.25 0 0 1 15.25 6v4A1.25 1.25 0 0 1 14 11.25H2A1.25 1.25 0 0 1 .75 10V6A1.25 1.25 0 0 1 2 4.75Z M3.4 7.4h.01 M5.7 7.4h.01 M8 7.4h.01 M10.3 7.4h.01 M12.6 7.4h.01 M5.2 9.6h5.6',
  // Chain link.
  link: 'M6.6 9.4 9.4 6.6 M7.2 5 8.2 4a2.5 2.5 0 0 1 3.5 3.5l-1 1 M8.8 11l-1 1a2.5 2.5 0 0 1-3.5-3.5l1-1',
  // Four-point sparkle.
  sparkle: 'M8 2.5 9.2 5.8 12.5 7 9.2 8.2 8 11.5 6.8 8.2 3.5 7 6.8 5.8Z',
  // Clock — the undo-history dock action.
  clock: 'M8 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z M8 5.3V8l2 1.3',
  // Filled play triangle — the voice-sheet send control.
  play: 'M5 3.4 12.5 8 5 12.6Z',
  // Document — Save recipe.
  file: 'M9 2H4.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5z M9 2v3h3',
  // Angle brackets — Save recipe as Python.
  code: 'M6 5 3 8l3 3 M10 5l3 3-3 3',
  // Compass — Tours.
  tour: 'M8 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z M10.3 5.7 9 9 5.7 10.3 7 7z',
  // Check — the selected sample/option.
  check: 'm3 8 3.5 3.5L13 5',
  // Left / right chevrons — the app-bar pager.
  chevLeft: 'M10 4 6 8l4 4',
  chevRight: 'M6 4l4 4-4 4',
};

/** Every icon name, in catalogue order — the demo's icon grid renders these. */
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

const FILLED: ReadonlySet<IconName> = new Set<IconName>(['stop', 'play']);

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
