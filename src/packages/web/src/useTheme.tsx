// Theme context — provides the active Theme object and a light/dark toggle.
// The mode preference persists across visits in localStorage; the brand's
// default is light.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { darkTheme, lightTheme, type Theme } from './theme.ts';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MODE_STORAGE = 'tamedtable.theme';

function initialMode(): ThemeMode {
  return localStorage.getItem(MODE_STORAGE) === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  // The page background lives outside #root, so paint it from here too.
  useEffect(() => {
    document.body.style.background = theme.bg;
    document.documentElement.style.colorScheme = mode;
  }, [theme.bg, mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mode,
      toggle: () =>
        setMode((m) => {
          const next: ThemeMode = m === 'dark' ? 'light' : 'dark';
          localStorage.setItem(MODE_STORAGE, next);
          return next;
        }),
    }),
    [theme, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The active Theme object. */
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx.theme;
}

/** The current mode and the toggle that switches it. */
export function useThemeControls(): { mode: ThemeMode; toggle: () => void } {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeControls must be used within a ThemeProvider');
  return { mode: ctx.mode, toggle: ctx.toggle };
}
