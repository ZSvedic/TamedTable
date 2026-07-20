// #TableView
// Pager — prev/next chevrons around the buildPageList number window. Pure
// props in, callbacks out; the host owns the current page.
import type { CSSProperties, ReactNode } from 'react';
import { space, typography } from '@tamedtable/ui-kit';
import { useTheme, Icon } from '@tamedtable/ui-kit/components';
import { buildPageList } from './index.ts';

export function Pagination({
  page,
  pageCount,
  onPageChange,
  markedPages,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** 1-based pages carrying pending rows — each gets a small dot mark
   *  (#LazyExec). */
  markedPages?: number[];
}): ReactNode {
  const t = useTheme();
  const pages = buildPageList(page, pageCount);
  const marked = new Set(markedPages ?? []);

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
    const disabled = dir === 'prev' ? page <= 1 : page >= pageCount;
    const target = dir === 'prev' ? page - 1 : page + 1;
    return (
      <button
        type="button"
        data-tv-prev={dir === 'prev' ? '' : undefined}
        data-tv-next={dir === 'next' ? '' : undefined}
        title={dir === 'prev' ? 'Previous page' : 'Next page'}
        disabled={disabled}
        onClick={() => onPageChange(target)}
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
            data-tv-page={p}
            data-tv-pending={marked.has(p) ? '' : undefined}
            title={marked.has(p) ? 'This page has rows the AI steps have not reached yet' : undefined}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            style={{
              ...cell,
              position: 'relative',
              cursor: 'pointer',
              color: p === page ? t.ink : t.ink2,
              fontWeight: p === page ? 600 : 500,
              borderColor: p === page ? t.line2 : 'transparent',
              background: p === page ? t.surface : 'transparent',
            }}
          >
            {p}
            {marked.has(p) && (
              <span
                style={{
                  position: 'absolute',
                  top: 1,
                  right: 1,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: t.accent,
                }}
              />
            )}
          </button>
        ),
      )}
      {nav('next')}
    </div>
  );
}
