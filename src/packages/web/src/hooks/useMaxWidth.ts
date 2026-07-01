// #WebUI
// True when the viewport is at or below `px` wide, recomputed live as the
// window (or device) is resized. The shared engine behind the responsive
// breakpoints (`useIsMobile`, `useIsNarrow`) so their logic lives in one place.
import { useEffect, useState } from 'react';

export function useMaxWidth(px: number): boolean {
  const query = `(max-width: ${px}px)`;
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = (): void => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
