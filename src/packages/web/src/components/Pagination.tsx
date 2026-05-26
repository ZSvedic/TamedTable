import type { CSSProperties, ReactNode } from 'react';
import { space, typography } from '../lib/theme.ts';
import type { WebController } from '../controller.ts';
import { useTheme } from '../hooks/useTheme.tsx';
import { buildPageList } from '../lib/pagination.ts';
import { Icon } from './Icons.tsx';

export function Pagination({ controller }: { controller: WebController }): ReactNode {
  const t = useTheme();
  const current = controller.currentPage();
  const total = controller.pageCount();
  const pages = buildPageList(current, total);

  const cell: CSSProperties = {
    height: 24,
    minWidth: 24,
    padding: `0 ${space.px6}px`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: space.radiusSm,
    border: '1px solid transparent',
    background: 'transparent',
    fontFamily: typography.ui,
    fontSize: typography.size.sm,
    fontVariantNumeric: 'tabular-nums',
  };

  const nav = (dir: 'prev' | 'next'): ReactNode => {
    const disabled = dir === 'prev' ? current <= 1 : current >= total;
    const target = dir === 'prev' ? current - 1 : current + 1;
    return (
      <button
        type="button"
        title={dir === 'prev' ? 'Previous page' : 'Next page'}
        disabled={disabled}
        onClick={() => controller.goToPage(target)}
        style={{
          ...cell,
          color: disabled ? t.ink4 : t.ink2,
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            transform: dir === 'prev' ? 'rotate(90deg)' : 'rotate(-90deg)',
          }}
        >
          <Icon name="chevron" size={12} />
        </span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {nav('prev')}
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} style={{ ...cell, color: t.ink3 }}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => controller.goToPage(p)}
            aria-current={p === current ? 'page' : undefined}
            style={{
              ...cell,
              cursor: 'pointer',
              color: p === current ? t.ink : t.ink2,
              fontWeight: p === current ? 600 : 500,
              borderColor: p === current ? t.line2 : 'transparent',
              background: p === current ? t.surface : 'transparent',
            }}
          >
            {p}
          </button>
        ),
      )}
      {nav('next')}
    </div>
  );
}
