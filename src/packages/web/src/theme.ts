// Single source of truth for every visual choice — colors, typography,
// spacing, radii. Components reference these tokens and never hard-code a
// color or pixel value, so a separate visual-design pass can swap this one
// module without touching component logic.

export const theme = {
  color: {
    bg: '#1c1c28',
    surface: '#24242f',
    surfaceAlt: '#2c2c3a',
    border: '#383848',
    text: '#e6e6ef',
    textDim: '#9494ab',
    accent: '#7c6cff',
    accentText: '#ffffff',
    accentDim: '#5a4fc0',
    error: '#ff6b6b',
    errorBg: '#3a2330',
    info: '#54c8b0',
    infoBg: '#1f352f',
    headerBg: '#2a2a38',
    streaming: '#3b3563',
    cellEdit: '#403a6e',
    shadow: 'rgba(0, 0, 0, 0.45)',
  },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"SF Mono", "JetBrains Mono", Menlo, Consolas, "Courier New", monospace',
    size: {
      xs: '11px',
      sm: '12px',
      md: '13px',
      lg: '15px',
      xl: '19px',
    },
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
  layout: {
    sidebarWidth: '360px',
    headerHeight: '52px',
  },
} as const;

export type Theme = typeof theme;
