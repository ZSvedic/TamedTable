// #WebUI
// True when the viewport is phone-width (≤768px). The app switches to the
// table-first dock layout below this width; the controller is unchanged — only
// the chrome differs. Recomputes live as the window (or device) is resized.
import { useEffect, useState } from 'react';

/** The width at and below which the mobile dock layout takes over. */
export const MOBILE_MAX_WIDTH = 768;

const QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(QUERY).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    const onChange = (): void => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
