// Binds WebController to the generic table grid: the grid itself (paging,
// selection, inline edit, header drag) lives in @tamedtable/table-view. Only
// the empty state stays here: it is app copy wired to the app's file dialogs.
import { useState, type DragEvent, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { useTheme, Button, Icon, type IconName } from '@tamedtable/ui-kit/components';
import { Mark } from '@tamedtable/toolbar/components';
import { TableView as TableGrid } from '@tamedtable/table-view/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';
import { ToursLink } from './ToursLink.tsx';

// The three open actions: the same trio the toolbar and the mobile drawer
// offer, here stacked as the first-run choices.
function openOptions(
  controller: WebController,
): { icon: IconName; label: string; onClick: () => void }[] {
  return [
    { icon: 'sparkle', label: 'Open sample…', onClick: () => controller.openSampleDialog() },
    { icon: 'upload', label: 'Open local…', onClick: () => void controller.openCsv() },
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

// Drop-target plumbing shared by the empty page and the loaded table:
// dragging a file over tints the area; dropping hands the bytes to
// controller.openDropped (which asks before replacing a loaded table).
// dragenter/leave fire on children too, so a depth counter keeps the tint
// from flickering while the drag crosses them.
function useFileDrop(controller: WebController): {
  dragging: boolean;
  dropProps: {
    onDragEnter: (e: DragEvent) => void;
    onDragLeave: () => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
} {
  const [dragDepth, setDragDepth] = useState(0);
  const dropFile = async (e: DragEvent): Promise<void> => {
    e.preventDefault();
    setDragDepth(0);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await controller.openDropped(file.name, new Uint8Array(await file.arrayBuffer()));
  };
  return {
    dragging: dragDepth > 0,
    dropProps: {
      onDragEnter: (e) => { e.preventDefault(); setDragDepth((d) => d + 1); },
      onDragLeave: () => setDragDepth((d) => Math.max(0, d - 1)),
      onDragOver: (e) => e.preventDefault(),
      onDrop: (e) => void dropFile(e),
    },
  };
}

function EmptyState({ controller, t }: { controller: WebController; t: Theme }): ReactNode {
  const { dragging, dropProps } = useFileDrop(controller);
  return (
    <div
      data-tv-empty=""
      {...dropProps}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: dragging ? t.surface3 : t.surface,
        outline: dragging ? `2px dashed ${t.ink3}` : 'none',
        outlineOffset: -8,
        transition: 'background .12s',
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
          <div
            style={{
              fontFamily: typography.ui,
              fontSize: typography.size.sm,
              color: t.ink3,
              textAlign: 'center',
            }}
          >
            …or drop a file here
          </div>
        </div>
        <div style={{ marginTop: space.px16 }}>
          <ToursLink t={t} onOpen={() => controller.openTutorial()} />
        </div>
      </div>
    </div>
  );
}

// #LazyExec: the pagination-bar readout: "N of M rows evaluated", plus the
// "Retry N failed rows" action while any row has failed.
export function EvaluatedReadout({ controller, t }: { controller: WebController; t: Theme }): ReactNode {
  const readout = controller.evaluatedReadout();
  if (!readout) return null;
  return (
    <span
      data-tt-readout=""
      style={{ fontFamily: typography.ui, fontSize: typography.size.xs, color: t.ink3, whiteSpace: 'nowrap' }}
    >
      <span style={{ color: t.ink2, fontWeight: 600 }}>
        {readout.done.toLocaleString()} of {readout.total.toLocaleString()}
      </span>{' '}
      rows evaluated
      {readout.failed > 0 && (
        <>
          {' · '}
          <button
            type="button"
            data-tt-retry=""
            onClick={() => void controller.retryFailedRows()}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              color: t.err,
              cursor: 'pointer',
              fontFamily: typography.ui,
              fontSize: typography.size.xs,
              textDecoration: 'underline',
            }}
          >
            Retry {readout.failed} failed row{readout.failed === 1 ? '' : 's'}
          </button>
        </>
      )}
    </span>
  );
}

export function TableView({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  // The loaded table stays a drop target (spec/behavior.md § Web UI): the
  // drop raises the replace-table confirmation instead of loading directly.
  const { dragging, dropProps } = useFileDrop(controller);

  if (!controller.isLoaded()) {
    return <EmptyState controller={controller} t={t} />;
  }

  const readout = controller.evaluatedReadout();
  return (
    <div
      data-tv-drop-target=""
      {...dropProps}
      style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      <TableGrid
        id="tutorial-table-view"
        columns={controller.displaySpec().columns.map((c) => c.id)}
        rows={controller.pageRows()}
        pageStart={(controller.currentPage() - 1) * controller.pageSize}
        totalRows={controller.totalRows()}
        page={controller.currentPage()}
        pageCount={controller.pageCount()}
        onPageChange={(p) => void controller.goToPage(p)}
        selection={controller.selection}
        onSelectCell={(row, column) => controller.selectCell(row, column)}
        onEditCell={(row, column, value) => void controller.editCell(row, column, value)}
        onReorderColumns={(order) => void controller.reorderColumns(order)}
        streaming={controller.streaming}
        // #LazyExec: row state, view state, and the grid upgrades.
        rowNumbers={controller.pageRowNumbers()}
        rowNumberHint={
          controller.shuffledView()
            ? 'Original row numbers: the view is shuffled; saving keeps this order.'
            : undefined
        }
        rowStatus={controller.pageRowStatus()}
        changedCells={controller.pageChangedCells()}
        reveal={controller.revealTarget()}
        sort={controller.viewSort()}
        filters={controller.viewFilters()}
        onSortChange={(column, dir) => void controller.setViewSort(column, dir)}
        onFilterChange={(column, text) => void controller.setViewFilter(column, text)}
        onDeleteColumn={(column) => void controller.deleteColumn(column)}
        markedPages={controller.pendingPages()}
        onCopyCell={() => controller.pushToast('info', 'Cell copied.')}
        barLeft={<EvaluatedReadout controller={controller} t={t} />}
        barRight={
          readout && readout.done + readout.failed < readout.total ? (
            // The id is the lazy tour's spotlight target for its estimate step.
            <span id="tutorial-runall-btn" data-tt-runall="" style={{ display: 'inline-flex' }}>
              <Button variant="primary" onClick={() => void controller.runOnAllRows()}>
                Run on all rows
              </Button>
            </span>
          ) : undefined
        }
      />
      {dragging && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: t.accentSoft,
            outline: `2px dashed ${t.ink3}`,
            outlineOffset: -8,
          }}
        />
      )}
    </div>
  );
}
