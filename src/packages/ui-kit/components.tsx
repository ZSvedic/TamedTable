// #UiKit
// React entry point — kept separate so the main entry (design tokens) stays
// React-free; `react` is a peer dependency of this entry only.

export { ThemeProvider, useTheme, useThemeControls, type ThemeMode } from './ThemeProvider.tsx';
export { Icon, ICON_NAMES, type IconName } from './Icon.tsx';
export { Button } from './Button.tsx';
export {
  MenuButton,
  type MenuButtonItem,
  type MenuButtonSection,
  type MenuButtonSubItem,
} from './MenuButton.tsx';
export { Toasts, type ToastItem } from './Toasts.tsx';

/** True when a keydown belongs to an IME composition — the Enter a
 *  Japanese/Chinese/Korean user presses to confirm a conversion, which every
 *  mainstream composer ignores (`isComposing`, with `keyCode === 229` as the
 *  legacy-browser fallback). Every "Enter submits" keydown handler must gate
 *  on this, or half-composed text sends/commits/applies mid-word. */
export function isImeComposingEvent(e: { keyCode?: number; nativeEvent?: { isComposing?: boolean } }): boolean {
  return e.nativeEvent?.isComposing === true || e.keyCode === 229;
}
