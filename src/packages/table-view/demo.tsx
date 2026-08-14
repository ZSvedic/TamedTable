// #TableView demo logic: mounts the real TableView over 95 generated rows
// at page size 10, with plain React state playing the host. Every callback
// appends to the #out event log; #out is non-empty on load (the demo smoke
// test's ready signal). The host state includes the grid upgrades
// (#LazyExec): column-menu sort/filter, original row numbers, row status
// marks (IDs 91–95 pending, ID 7 failed), pager dots, and changed cells.
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { typography } from '@tamedtable/ui-kit';
import { Button, ThemeProvider, useTheme } from '@tamedtable/ui-kit/components';
import { clampPage, pageCountFor, pageSlice, type TableRow } from './index.ts';
import { TableView, type CellSelection } from './components.tsx';

const PAGE_SIZE = 10;
const CITIES = ['Zagreb', 'Lisbon', 'Osaka', 'Quito', 'Tallinn'];

function sampleRows(): TableRow[] {
  return Array.from({ length: 95 }, (_, i) => ({
    ID: i + 1,
    name: `Person ${i + 1}`,
    age: 20 + ((i * 7) % 50),
    city: CITIES[i % CITIES.length],
    // Every third row holds a real URL (renders as a link); the rest hold
    // dotted-but-not-URL text that must stay plain.
    site: i % 3 === 0 ? `https://example.org/p/${i + 1}` : 'justify.me',
  }));
}

/** Numeric-aware compare, matching the grid host's ordering rules. */
function compare(a: unknown, b: unknown): number {
  const an = Number(a);
  const bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(a ?? '') < String(b ?? '') ? -1 : String(a ?? '') > String(b ?? '') ? 1 : 0;
}

function Demo(): ReactNode {
  const t = useTheme();
  const [rows, setRows] = useState<TableRow[]>(sampleRows);
  const [columns, setColumns] = useState(['ID', 'name', 'age', 'city', 'site']);
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [sort, setSort] = useState<{ column: string; dir: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [changed, setChanged] = useState<Record<string, unknown>>({});
  const [log, setLog] = useState<string[]>(['ready']);

  const report = (event: string): void => setLog((l) => [...l, event]);

  // The host applies its own view state: filters narrow, sort reorders, and
  // the Row # column keeps each row's original number.
  let order = rows.map((_, i) => i);
  for (const [col, text] of Object.entries(filters)) {
    const needle = text.toLowerCase();
    order = order.filter((i) => String(rows[i]?.[col] ?? '').toLowerCase().includes(needle));
  }
  if (sort) {
    const sign = sort.dir === 'desc' ? -1 : 1;
    order = order.slice().sort((a, b) => sign * compare(rows[a]?.[sort.column], rows[b]?.[sort.column]));
  }
  const viewRows = order.map((i) => rows[i]!);
  // Changed-cell marks are stored by SOURCE row (the edit's identity) and
  // remapped to view-absolute keys per render: a sort or filter moves the
  // mark with its row instead of leaving it on the old view slot.
  const viewSlot = new Map(order.map((src, view) => [src, view]));
  const changedView: Record<string, unknown> = {};
  for (const [key, was] of Object.entries(changed)) {
    const sep = key.indexOf(':');
    const view = viewSlot.get(Number(key.slice(0, sep)));
    if (view !== undefined) changedView[`${view}${key.slice(sep)}`] = was;
  }
  const pageCount = pageCountFor(viewRows.length, PAGE_SIZE);
  const current = clampPage(page, pageCount);
  const pageOrder = pageSlice(order, current, PAGE_SIZE);
  // Demo row status: IDs 91–95 pending (they live on page 10 unsorted),
  // ID 7 failed: page 10 carries the pager dot.
  const statusFor = (i: number): 'pending' | 'failed' | undefined => {
    const idn = Number(rows[i]?.ID);
    return idn === 7 ? 'failed' : idn > 90 ? 'pending' : undefined;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: `1px solid ${t.line}`,
          background: t.surface2,
          color: t.ink,
          font: `600 14px/1.4 ${typography.ui}`,
        }}
      >
        table-view: 95 sample rows, page size {PAGE_SIZE}
        <span style={{ flex: 1 }} />
        <Button variant="chrome" onClick={() => setStreaming((v) => !v)}>
          Toggle streaming
        </Button>
      </div>

      <TableView
        columns={columns}
        rows={pageSlice(viewRows, current, PAGE_SIZE)}
        pageStart={(current - 1) * PAGE_SIZE}
        totalRows={viewRows.length}
        page={current}
        pageCount={pageCount}
        onPageChange={(p) => {
          setPage(p);
          report(`page ${p}`);
        }}
        selection={selection}
        onSelectCell={(row, column) => {
          setSelection({ row, column });
          report(`select ${row}:${column}`);
        }}
        onEditCell={(row, column, value) => {
          // `row` is view-absolute; order maps it back to the source row,
          // which is also the key the mark is stored under (see changedView).
          const src = order[row]!;
          setChanged((c) => ({ ...c, [`${src}:${column}`]: rows[src]?.[column] ?? null }));
          setRows((all) => all.map((r, i) => (i === src ? { ...r, [column]: value } : r)));
          report(`edit ${row}:${column}=${value}`);
        }}
        onReorderColumns={(colOrder) => {
          setColumns(colOrder);
          report(`reorder ${colOrder.join(',')}`);
        }}
        streaming={streaming}
        rowNumbers={pageOrder.map((i) => i + 1)}
        rowNumberHint="Original row numbers"
        rowStatus={pageOrder.map(statusFor)}
        changedCells={changedView}
        sort={sort}
        filters={filters}
        onSortChange={(column, dir) => {
          setSort(dir ? { column, dir } : null);
          report(`sort ${column} ${dir ?? 'off'}`);
        }}
        onFilterChange={(column, text) => {
          setFilters((f) => {
            const next = { ...f };
            if (text.trim() === '') delete next[column];
            else next[column] = text;
            return next;
          });
          setPage(1);
          report(`filter ${column}=${text}`);
        }}
        onDeleteColumn={(column) => {
          setColumns((cols) => cols.filter((c) => c !== column));
          report(`delete ${column}`);
        }}
        markedPages={[10]}
        onCopyCell={(row, column, text) => report(`copy ${row}:${column}=${text}`)}
      />

      <pre
        id="out"
        style={{
          flex: '0 0 auto',
          maxHeight: '18vh',
          overflow: 'auto',
          margin: 0,
          padding: '.5rem .75rem',
          font: `11px/1.5 ${typography.mono}`,
          background: t.surface2,
          color: t.ink2,
          borderTop: `1px solid ${t.line}`,
        }}
      >
        {log.join('\n')}
      </pre>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <Demo />
  </ThemeProvider>,
);
