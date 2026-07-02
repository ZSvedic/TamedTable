// Binds WebController to the generic table grid — the grid itself (paging,
// selection, inline edit, header drag) lives in @tamedtable/table-view. Only
// the empty state stays here: it is app copy wired to the app's file dialogs.
import { useState, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { useTheme, Icon, type IconName } from '@tamedtable/ui-kit/components';
import { Mark } from '@tamedtable/toolbar/components';
import { TableView as TableGrid } from '@tamedtable/table-view/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { ToursLink } from './ToursLink.tsx';

// The three open actions — the same trio the toolbar and the mobile drawer
// offer, here stacked as the first-run choices.
function openOptions(
  controller: WebController,
): { icon: IconName; label: string; onClick: () => void }[] {
  return [
    { icon: 'sparkle', label: 'Open sample…', onClick: () => controller.openSampleDialog() },
    { icon: 'folder', label: 'Open local…', onClick: () => void controller.openCsv() },
    { icon: 'link', label: 'Open URL…', onClick: () => controller.openUrlDialog() },
  ];
}

function OptionRow({
  icon,
  label,
  onClick,
  t,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  t: Theme;
}): ReactNode {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      data-tv-open={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: space.px10,
        padding: '11px 14px',
        border: `1px solid ${hover ? t.ink3 : t.line}`,
        borderRadius: space.radius,
        background: hover ? t.surface3 : t.surface,
        color: t.ink,
        cursor: 'pointer',
        fontFamily: typography.ui,
        fontSize: typography.size.base,
        textAlign: 'left',
        transition: 'border-color .12s, background .12s',
      }}
    >
      <span style={{ color: t.ink3, display: 'flex' }}>
        <Icon name={icon} size={18} />
      </span>
      {label}
    </button>
  );
}

function EmptyState({ controller, t }: { controller: WebController; t: Theme }): ReactNode {
  return (
    <div
      data-tv-empty=""
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: t.surface,
        minWidth: 0,
        padding: space.px24,
      }}
    >
      <div
        style={{
          width: 320,
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: space.px16,
        }}
      >
        <Mark height={44} mode={t.name === 'dark' ? 'reverse' : 'crisp'} />
        <div
          style={{
            fontFamily: typography.ui,
            fontSize: typography.size.lg,
            fontWeight: 600,
            color: t.ink,
          }}
        >
          What table can I tame?
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: space.px8 }}>
          {openOptions(controller).map((o) => (
            <OptionRow key={o.label} icon={o.icon} label={o.label} onClick={o.onClick} t={t} />
          ))}
        </div>
        <ToursLink t={t} onOpen={() => controller.openTutorial()} />
      </div>
    </div>
  );
}

export function TableView({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();

  if (!controller.isLoaded()) {
    return <EmptyState controller={controller} t={t} />;
  }

  return (
    <TableGrid
      id="tutorial-table-view"
      columns={controller.displaySpec().columns.map((c) => c.id)}
      rows={controller.pageRows()}
      pageStart={(controller.currentPage() - 1) * controller.pageSize}
      totalRows={controller.totalRows()}
      page={controller.currentPage()}
      pageCount={controller.pageCount()}
      onPageChange={(p) => controller.goToPage(p)}
      selection={controller.selection}
      onSelectCell={(row, column) => controller.selectCell(row, column)}
      onEditCell={(row, column, value) => void controller.editCell(row, column, value)}
      onReorderColumns={(order) => void controller.reorderColumns(order)}
      streaming={controller.streaming}
      status={controller.activityStatus()}
    />
  );
}
