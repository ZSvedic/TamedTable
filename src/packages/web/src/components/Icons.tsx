// Inline SVG icons — a 16×16 viewBox, 1.5 stroke, currentColor. Ported from
// the design system (design/claude-design/components.jsx). Use as
// <Icon name="folder" /> inside any element that sets a text color.

import type { ReactNode } from 'react';

export type IconName =
  | 'folder'
  | 'save'
  | 'undo'
  | 'redo'
  | 'cog'
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
  | 'mic';

const PATHS: Record<IconName, string> = {
  folder:
    'M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6a1 1 0 0 1 .7.3l1 1H12.5A1.5 1.5 0 0 1 14 5.8v5.7A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5z',
  save: 'M3 3h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M5 3v3h5V3 M5 13v-4h6v4',
  undo: 'M5 5 2.5 7.5 5 10 M2.5 7.5h7.5a3.5 3.5 0 1 1 0 7H7',
  redo: 'm11 5 2.5 2.5L11 10 M13.5 7.5H6a3.5 3.5 0 1 0 0 7h3',
  cog: 'M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z M8 2v1.5 M8 12.5V14 M2 8h1.5 M12.5 8H14 M3.5 3.5l1.1 1.1 M11.4 11.4l1.1 1.1 M3.5 12.5l1.1-1.1 M11.4 4.6l1.1-1.1',
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
};

const FILLED: ReadonlySet<IconName> = new Set<IconName>(['stop']);

export function Icon({ name, size = 14 }: { name: IconName; size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={FILLED.has(name) ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: '0 0 auto', display: 'block' }}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
