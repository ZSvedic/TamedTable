// #TablePick #IoFormats
// HTML codec: every <table> on a page is a candidate; load-only (no
// serialize). htmlparser2 is pure JS, so the same code runs in Node and the
// browser. Per-format notes: spec/packages/file-io/formats/html.md.
import { Parser } from 'htmlparser2';
import type { FormatCodec, ParsedTable } from '@tamedtable/table-plan';
import { columnNames, gridToTable, type TableCandidate } from './tables.ts';

interface RawCell { text: string; header: boolean; span: number }
interface RawTable { caption: string; id: string; rows: RawCell[][] }

/** Walk the page once and collect every table's rows as text cells. */
function scanTables(html: string): RawTable[] {
  const tables: RawTable[] = [];
  // Open tables, innermost last: a nested table is its own candidate and its
  // text also lands in the enclosing cell, as a browser would render it.
  const open: Array<{ table: RawTable; row: RawCell[] | null; cell: RawCell | null; inCaption: boolean }> = [];
  let skip = 0; // inside <script> / <style>
  const parser = new Parser(
    {
      onopentag(name, attrs) {
        if (name === 'script' || name === 'style') { skip++; return; }
        if (name === 'table') {
          const table: RawTable = { caption: '', id: attrs['id']?.trim() ?? '', rows: [] };
          tables.push(table);
          open.push({ table, row: null, cell: null, inCaption: false });
          return;
        }
        const top = open[open.length - 1];
        if (!top) return;
        if (name === 'caption') top.inCaption = true;
        else if (name === 'tr') { top.row = []; top.table.rows.push(top.row); }
        else if (name === 'td' || name === 'th') {
          if (!top.row) { top.row = []; top.table.rows.push(top.row); }
          const span = Math.max(1, Number.parseInt(attrs['colspan'] ?? '1', 10) || 1);
          top.cell = { text: '', header: name === 'th', span };
          top.row.push(top.cell);
        } else if (name === 'br' && top.cell) top.cell.text += ' ';
      },
      ontext(text) {
        if (skip > 0) return;
        for (const frame of open) {
          if (frame.inCaption) frame.table.caption += text;
          else if (frame.cell) frame.cell.text += text;
        }
      },
      onclosetag(name) {
        if (name === 'script' || name === 'style') { skip = Math.max(0, skip - 1); return; }
        if (name === 'table') { open.pop(); return; }
        const top = open[open.length - 1];
        if (!top) return;
        if (name === 'caption') top.inCaption = false;
        else if (name === 'tr') top.row = null;
        else if (name === 'td' || name === 'th') top.cell = null;
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();
  return tables;
}

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** A raw table as a value grid: header row first (the first row holding a
 *  <th>, else the first row), colspans expanded, empty cells null. */
function toGrid(table: RawTable): (string | null)[][] {
  const rows = table.rows.filter((r) => r.length > 0);
  const headerAt = Math.max(0, rows.findIndex((r) => r.some((c) => c.header)));
  return rows.slice(headerAt).map((r) =>
    r.flatMap((c) => {
      const text = clean(c.text);
      return [text || null, ...Array<null>(c.span - 1).fill(null)];
    }),
  );
}

function candidates(html: string): { candidates: TableCandidate[]; grids: (string | null)[][][] } {
  const tables = scanTables(html);
  const grids = tables.map(toGrid);
  const out = tables.map((t, i) => {
    const grid = grids[i]!;
    const name = clean(t.caption) || t.id || `Table ${i + 1}`;
    return {
      index: i + 1,
      name,
      location: `table ${i + 1} of ${tables.length}`,
      rowCount: grid.slice(1).filter((r) => r.some((v) => v !== null)).length,
      columns: columnNames(grid[0] ?? []),
    };
  });
  return { candidates: out, grids };
}

export const htmlCodec: FormatCodec = {
  id: 'html',
  extensions: ['.html', '.htm'],
  contentTypes: ['html'],

  listTables(bytes: Uint8Array): TableCandidate[] {
    return candidates(new TextDecoder().decode(bytes)).candidates;
  },

  parse(bytes: Uint8Array, name: string, table = 1): ParsedTable {
    const { grids } = candidates(new TextDecoder().decode(bytes));
    const grid = grids[table - 1];
    if (!grid) throw new Error(`${name}: no table ${table}`);
    return gridToTable(grid);
  },
};
