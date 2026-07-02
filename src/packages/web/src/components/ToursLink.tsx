// #TutorialMode — "Or start one of the tours": the empty page's guided path
// into the Tours panel, shared by the desktop and phone empty states so a
// first-time visitor finds the tours without hunting for the toolbar button.
import type { ReactNode } from 'react';
import { typography, type Theme } from '@tamedtable/ui-kit';

export function ToursLink({ t, onOpen }: { t: Theme; onOpen: () => void }): ReactNode {
  return (
    <div style={{ fontFamily: typography.ui, fontSize: typography.size.sm, color: t.ink3 }}>
      Or{' '}
      <button
        type="button"
        data-open-tours=""
        onClick={onOpen}
        style={{
          background: 'transparent',
          border: 0,
          padding: 0,
          fontFamily: typography.ui,
          fontSize: typography.size.sm,
          color: t.accent,
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        start one of the tours
      </button>
    </div>
  );
}
