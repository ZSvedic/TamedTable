// #TableView demo logic — mounts the real TableView over 95 generated rows
// at page size 10, with plain React state playing the host. Every callback
// appends to the #out event log; #out is non-empty on load (the demo smoke
// test's ready signal).
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
  }));
}

function Demo(): ReactNode {
  const t = useTheme();
  const [rows, setRows] = useState<TableRow[]>(sampleRows);
  const [columns, setColumns] = useState(['ID', 'name', 'age', 'city']);
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [log, setLog] = useState<string[]>(['ready']);

  const report = (event: string): void => setLog((l) => [...l, event]);
  const pageCount = pageCountFor(rows.length, PAGE_SIZE);
  const current = clampPage(page, pageCount);

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
        table-view — 95 sample rows, page size {PAGE_SIZE}
        <span style={{ flex: 1 }} />
        <Button variant="chrome" onClick={() => setStreaming((v) => !v)}>
          Toggle streaming
        </Button>
      </div>

      <TableView
        columns={columns}
        rows={pageSlice(rows, current, PAGE_SIZE)}
        pageStart={(current - 1) * PAGE_SIZE}
        totalRows={rows.length}
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
          setRows((all) => all.map((r, i) => (i === row ? { ...r, [column]: value } : r)));
          report(`edit ${row}:${column}=${value}`);
        }}
        onReorderColumns={(order) => {
          setColumns(order);
          report(`reorder ${order.join(',')}`);
        }}
        streaming={streaming}
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
