// #TutorialMode — "New here? Check Tours.": the empty page's guided path
// into the Tours panel, shared by the desktop and phone empty states so a
// first-time visitor finds the tours without hunting for the toolbar button.
// Styled like the "What table can I tame?" heading so it reads as the second
// first-run invitation, not fine print.
import type { ReactNode } from 'react';
import { typography, type Theme } from '@tamedtable/ui-kit';

export function ToursLink({ t, onOpen }: { t: Theme; onOpen: () => void }): ReactNode {
  return (
    <div
      style={{
        fontFamily: typography.ui,
        fontSize: typography.size.lg,
        fontWeight: 600,
        color: t.ink,
      }}
    >
      New here?{' '}
      <button
        type="button"
        data-open-tours=""
        onClick={onOpen}
        style={{
          background: 'transparent',
          border: 0,
          padding: 0,
          fontFamily: typography.ui,
          fontSize: typography.size.lg,
          fontWeight: 600,
          color: t.accent,
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        Check Tours
      </button>
      .
    </div>
  );
}
