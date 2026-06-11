// Binds WebController to the generic table grid — the grid itself (paging,
// selection, inline edit, header drag) lives in @tamedtable/table-view. Only
// the empty state stays here: it is app copy wired to the app's file dialogs.
import type { ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { useTheme, Icon, SplitButton } from '@tamedtable/ui-kit/components';
import { TableView as TableGrid } from '@tamedtable/table-view/components';
import type { WebController } from '../controller.ts';
import { useController } from '../hooks/useController.ts';

function EmptyState({ controller, t }: { controller: WebController; t: Theme }): ReactNode {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: t.surface,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 460,
          maxWidth: '88%',
          padding: space.px24,
          borderRadius: space.radiusLg,
          border: `1.5px dashed ${t.line2}`,
          background: t.surface2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: space.px14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: space.radius,
            background: t.accentSoft,
            color: t.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="upload" size={22} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.px4 }}>
          <div
            style={{
              fontFamily: typography.ui,
              fontSize: typography.size.lg,
              fontWeight: 600,
              color: t.ink,
            }}
          >
            No file loaded
          </div>
          <div
            style={{
              fontFamily: typography.ui,
              fontSize: typography.size.sm,
              lineHeight: 1.5,
              color: t.ink2,
            }}
          >
            Open a CSV or JSONL file, paste a URL, or pick a sample to begin —
            then describe changes in the chat.
          </div>
        </div>
        <SplitButton
          onClick={() => controller.openUrlDialog()}
          title="Open from a URL or pick a sample"
          caretTitle="More open options"
          menu={[
            { label: 'Open local…', onClick: () => void controller.openCsv() },
          ]}
        >
          <Icon name="folder" />
          Open URL or sample…
        </SplitButton>
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
