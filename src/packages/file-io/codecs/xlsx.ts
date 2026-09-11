// #TablePick #IoFormats
// XLSX codec: an Excel workbook is a zip of OOXML parts. fflate unzips/zips,
// htmlparser2 (XML mode) reads the parts, so the same pure-JS code runs in
// Node and the browser and nothing downloads at run time. Every sheet (or
// Excel table object) is a candidate table. Per-format notes:
// spec/packages/file-io/formats/xlsx.md.
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { Parser } from 'htmlparser2';
import { cellAt, type FormatCodec, type ParsedTable, type Row } from '@tamedtable/table-plan';
import { warnIfHuge } from './values.ts';
import { columnNames, gridToTable, type TableCandidate } from './tables.ts';

// ── XML scanning ─────────────────────────────────────────────────────────────

type Attrs = Record<string, string>;
interface XmlHandlers {
  open?: (name: string, attrs: Attrs) => void;
  text?: (text: string) => void;
  close?: (name: string) => void;
}

/** SAX-walk one XML part. Tag names lose their namespace prefix. */
function scanXml(xml: string, h: XmlHandlers): void {
  const local = (n: string): string => n.slice(n.indexOf(':') + 1);
  const parser = new Parser(
    {
      onopentag: (name, attrs) => h.open?.(local(name), attrs),
      ontext: (t) => h.text?.(t),
      onclosetag: (name) => h.close?.(local(name)),
    },
    { xmlMode: true, decodeEntities: true },
  );
  parser.write(xml);
  parser.end();
}

/** Excel writes a control character as `_x000D_`; read it back. */
const unescapeExcel = (s: string): string =>
  s.replace(/_x([0-9A-Fa-f]{4})_/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));

// ── Cell references ──────────────────────────────────────────────────────────

/** "B3" → { col: 2, row: 3 } (both 1-based). */
function parseRef(ref: string): { col: number; row: number } {
  const m = /^([A-Z]+)(\d+)$/i.exec(ref);
  if (!m) throw new Error(`bad cell reference: ${ref}`);
  let col = 0;
  for (const ch of m[1]!.toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]) };
}

function colLetters(col: number): string {
  let s = '';
  for (let n = col; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

// ── Dates ────────────────────────────────────────────────────────────────────

// The built-in number formats Excel treats as dates or times.
const BUILTIN_DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/** A custom format code is a date/time format when it carries a day, month,
 *  year, hour, or second code outside quoted text and [brackets]. */
function isDateFormat(code: string): boolean {
  const bare = code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '');
  return /[ymdhs]/i.test(bare);
}

/** Excel serial → ISO text: the date alone for a whole day, else date + time. */
function serialToIso(serial: number, date1904: boolean): string {
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const ms = Math.round(serial * 86400) * 1000;
  const iso = new Date(epoch + ms).toISOString();
  return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso.slice(0, 19);
}

// ── Workbook reading ─────────────────────────────────────────────────────────

interface Sheet {
  name: string;
  /** row → col → value (1-based, non-empty cells only). */
  cells: Map<number, Map<number, unknown>>;
  /** Excel table objects on the sheet: name + A1 range. */
  tables: Array<{ name: string; ref: string }>;
  /** Merged ranges, 1-based. A title line above a table is usually merged
   *  across it, which is how a two-column table's title is recognised. */
  merges: Array<{ r1: number; c1: number; r2: number; c2: number }>;
}

interface Workbook { sheets: Sheet[] }

/** Resolve `a/b/../c` → `a/c`. */
function normalize(path: string): string {
  const out: string[] = [];
  for (const seg of path.split('/')) {
    if (seg === '..') out.pop();
    else if (seg !== '.' && seg !== '') out.push(seg);
  }
  return out.join('/');
}

function readWorkbook(bytes: Uint8Array, name: string): Workbook {
  let parts: Record<string, Uint8Array>;
  try {
    parts = unzipSync(bytes);
  } catch (e) {
    throw new Error(`${name}: not an .xlsx workbook (${(e as Error).message})`);
  }
  const part = (path: string): string | undefined => {
    const data = parts[path] ?? parts[path.replace(/^\//, '')];
    return data ? strFromU8(data) : undefined;
  };
  const workbookXml = part('xl/workbook.xml');
  if (!workbookXml) throw new Error(`${name}: not an .xlsx workbook (no xl/workbook.xml)`);

  // Relationship id → target, resolved against the rels file's own directory.
  const readRels = (relsPath: string, baseDir: string): Map<string, { target: string; type: string }> => {
    const rels = new Map<string, { target: string; type: string }>();
    const xml = part(relsPath);
    if (!xml) return rels;
    scanXml(xml, {
      open(tag, a) {
        if (tag !== 'Relationship') return;
        const raw = a['Target'] ?? '';
        const target = raw.startsWith('/') ? raw.slice(1) : normalize(`${baseDir}/${raw}`);
        rels.set(a['Id'] ?? '', { target, type: a['Type'] ?? '' });
      },
    });
    return rels;
  };

  // Shared strings, rich-text runs concatenated.
  const shared: string[] = [];
  const sharedXml = part('xl/sharedStrings.xml');
  if (sharedXml) {
    let current: string | null = null;
    let inText = false;
    scanXml(sharedXml, {
      open(tag) {
        if (tag === 'si') current = '';
        else if (tag === 't') inText = true;
      },
      text(t) { if (inText && current !== null) current += t; },
      close(tag) {
        if (tag === 't') inText = false;
        else if (tag === 'si' && current !== null) { shared.push(unescapeExcel(current)); current = null; }
      },
    });
  }

  // Styles: which cell-format indexes are dates.
  const dateStyles = new Set<number>();
  const stylesXml = part('xl/styles.xml');
  if (stylesXml) {
    const customDates = new Set<number>();
    let inCellXfs = false;
    let xfIndex = 0;
    scanXml(stylesXml, {
      open(tag, a) {
        if (tag === 'numFmt') {
          if (isDateFormat(a['formatCode'] ?? '')) customDates.add(Number(a['numFmtId']));
        } else if (tag === 'cellXfs') inCellXfs = true;
        else if (tag === 'xf' && inCellXfs) {
          const id = Number(a['numFmtId'] ?? 0);
          if (BUILTIN_DATE_IDS.has(id) || customDates.has(id)) dateStyles.add(xfIndex);
          xfIndex++;
        }
      },
      close(tag) { if (tag === 'cellXfs') inCellXfs = false; },
    });
  }

  // The sheet list, in workbook order, with the 1904 flag.
  let date1904 = false;
  const sheetRefs: Array<{ name: string; rid: string }> = [];
  scanXml(workbookXml, {
    open(tag, a) {
      if (tag === 'workbookPr') date1904 = a['date1904'] === '1' || a['date1904'] === 'true';
      else if (tag === 'sheet') sheetRefs.push({ name: a['name'] ?? '', rid: a['r:id'] ?? a['id'] ?? '' });
    },
  });
  const workbookRels = readRels('xl/_rels/workbook.xml.rels', 'xl');

  const cellValue = (type: string, raw: string | null, inline: string | null, style: number): unknown => {
    if (type === 'inlineStr') return inline === null ? null : unescapeExcel(inline);
    if (raw === null) return null;
    switch (type) {
      case 's': return shared[Number(raw)] ?? null;
      case 'str': return unescapeExcel(raw);
      case 'b': return raw === '1' || raw === 'true';
      case 'e': return raw;
      case 'd': return raw;
      default: {
        const n = Number(raw);
        if (Number.isNaN(n)) return raw;
        return dateStyles.has(style) ? serialToIso(n, date1904) : n;
      }
    }
  };

  const sheets: Sheet[] = [];
  for (const ref of sheetRefs) {
    const target = workbookRels.get(ref.rid)?.target;
    const sheetXml = target ? part(target) : undefined;
    if (!target || !sheetXml) continue;
    const cells = new Map<number, Map<number, unknown>>();
    const merges: Sheet['merges'] = [];
    let row = 0;
    let col = 0;
    let cell: { col: number; row: number; type: string; style: number } | null = null;
    let v: string | null = null;
    let inValue = false;
    let inlineText: string | null = null;
    let inInlineT = false;
    const put = (r: number, c: number, value: unknown): void => {
      if (value === null || value === '') return;
      let line = cells.get(r);
      if (!line) { line = new Map(); cells.set(r, line); }
      line.set(c, value);
    };
    scanXml(sheetXml, {
      open(tag, a) {
        if (tag === 'row') { row = Number(a['r'] ?? row + 1); col = 0; }
        else if (tag === 'c') {
          const pos = a['r'] ? parseRef(a['r']) : { col: col + 1, row };
          col = pos.col;
          cell = { col: pos.col, row: pos.row, type: a['t'] ?? 'n', style: Number(a['s'] ?? -1) };
          v = null;
          inlineText = null;
        } else if (tag === 'mergeCell') {
          const [from, to] = (a['ref'] ?? '').split(':');
          if (from && to) {
            const m1 = parseRef(from);
            const m2 = parseRef(to);
            merges.push({ r1: m1.row, c1: m1.col, r2: m2.row, c2: m2.col });
          }
        } else if (tag === 'v') { inValue = true; v = ''; }
        else if (tag === 'is') inlineText = '';
        else if (tag === 't' && inlineText !== null) inInlineT = true;
      },
      text(t) {
        if (inValue) v = (v ?? '') + t;
        else if (inInlineT) inlineText = (inlineText ?? '') + t;
      },
      close(tag) {
        if (tag === 'v') inValue = false;
        else if (tag === 't') inInlineT = false;
        else if (tag === 'c' && cell) {
          put(cell.row, cell.col, cellValue(cell.type, v, inlineText, cell.style));
          cell = null;
        }
      },
    });
    // Excel table objects: the sheet's rels point at xl/tables/*.xml.
    const sheetDir = target.slice(0, target.lastIndexOf('/'));
    const sheetFile = target.slice(target.lastIndexOf('/') + 1);
    const tables: Sheet['tables'] = [];
    for (const rel of readRels(`${sheetDir}/_rels/${sheetFile}.rels`, sheetDir).values()) {
      if (!rel.type.endsWith('/table')) continue;
      const tableXml = part(rel.target);
      if (!tableXml) continue;
      scanXml(tableXml, {
        open(tag, a) {
          if (tag === 'table') tables.push({ name: a['displayName'] ?? a['name'] ?? '', ref: a['ref'] ?? '' });
        },
      });
    }
    sheets.push({ name: ref.name, cells, tables, merges });
  }
  return { sheets };
}

// ── Candidates ───────────────────────────────────────────────────────────────

interface Block { sheet: Sheet; name: string; r1: number; c1: number; r2: number; c2: number }

const isEmpty = (v: unknown): boolean => v === null || v === undefined || v === '';

/** Where the header sits in a sheet block: leading **title** rows are not
 *  headers. A row is a title when it fills fewer than half the cells the
 *  widest row fills (a one-cell heading, a blank spacer), or when a merge
 *  covers it across at least half the block's width. Skipping stops at the
 *  first row that is neither. A block whose widest row fills a single cell is
 *  a one-column list, so it keeps its first row. Spec:
 *  spec/packages/file-io/formats/xlsx.md. */
function headerRowOf(sheet: Sheet, r1: number, c1: number, r2: number, c2: number): number {
  const width = c2 - c1 + 1;
  const filled = (r: number): number => {
    const line = sheet.cells.get(r);
    if (!line) return 0;
    let n = 0;
    for (let c = c1; c <= c2; c++) if (!isEmpty(line.get(c))) n++;
    return n;
  };
  let widest = 0;
  for (let r = r1; r <= r2; r++) widest = Math.max(widest, filled(r));
  if (widest <= 1) return r1;
  const mergedAcross = (r: number): boolean =>
    sheet.merges.some((m) => m.r1 <= r && r <= m.r2 && (m.c2 - m.c1 + 1) * 2 >= width);
  let header = r1;
  while (header < r2 && (filled(header) * 2 < widest || mergedAcross(header))) header++;
  return header;
}

/** Every table the workbook holds, in sheet order: each Excel table object,
 *  or, on a sheet with none, the sheet's data block. Empty sheets list nothing. */
function blocks(wb: Workbook): Block[] {
  const out: Block[] = [];
  for (const sheet of wb.sheets) {
    if (sheet.tables.length > 0) {
      for (const t of sheet.tables) {
        const [from, to] = t.ref.split(':');
        const a = parseRef(from!);
        const b = to ? parseRef(to) : a;
        out.push({ sheet, name: t.name, r1: a.row, c1: a.col, r2: b.row, c2: b.col });
      }
      continue;
    }
    let r1 = Infinity, r2 = 0, c1 = Infinity, c2 = 0;
    for (const [r, line] of sheet.cells) {
      if (line.size === 0) continue;
      r1 = Math.min(r1, r); r2 = Math.max(r2, r);
      for (const c of line.keys()) { c1 = Math.min(c1, c); c2 = Math.max(c2, c); }
    }
    if (r2 === 0) continue;
    // A title above the table is not the header, and a title wider than the
    // table must not widen it: re-measure the columns after skipping.
    const header = headerRowOf(sheet, r1, c1, r2, c2);
    if (header > r1) {
      let nc1 = Infinity, nc2 = 0;
      for (let r = header; r <= r2; r++) {
        const line = sheet.cells.get(r);
        if (!line) continue;
        for (const [c, v] of line) {
          if (isEmpty(v)) continue;
          nc1 = Math.min(nc1, c); nc2 = Math.max(nc2, c);
        }
      }
      if (nc2 > 0) { r1 = header; c1 = nc1; c2 = nc2; }
    }
    out.push({ sheet, name: sheet.name, r1, c1, r2, c2 });
  }
  return out;
}

/** A block as a value grid, header row first, empty cells null. */
function blockGrid(b: Block): unknown[][] {
  const grid: unknown[][] = [];
  for (let r = b.r1; r <= b.r2; r++) {
    const line = b.sheet.cells.get(r);
    const cells: unknown[] = [];
    for (let c = b.c1; c <= b.c2; c++) cells.push(line?.get(c) ?? null);
    grid.push(cells);
  }
  return grid;
}

function candidates(wb: Workbook): { candidates: TableCandidate[]; grids: unknown[][][] } {
  const bs = blocks(wb);
  const grids = bs.map(blockGrid);
  const out = bs.map((b, i) => {
    const grid = grids[i]!;
    return {
      index: i + 1,
      name: b.name,
      location: `${b.sheet.name}!${colLetters(b.c1)}${b.r1}:${colLetters(b.c2)}${b.r2}`,
      rowCount: grid.slice(1).filter((r) => r.some((v) => v !== null)).length,
      columns: columnNames((grid[0] ?? []).map((v) => (v === null ? null : String(v)))),
    };
  });
  return { candidates: out, grids };
}

// ── Writing ──────────────────────────────────────────────────────────────────

const xmlEscape = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Control characters are not XML: Excel's own `_xHHHH_` escape keeps them.
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, (ch) => `_x${ch.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}_`);

function cellXml(ref: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
  if (typeof value === 'boolean') return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const preserve = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
  return `<c r="${ref}" t="inlineStr"><is><t${preserve}>${xmlEscape(text)}</t></is></c>`;
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function sheetXml(rows: Row[], columns: string[], headers: string[]): string {
  const rowXml = (r: number, values: unknown[]): string =>
    `<row r="${r}">${values.map((v, i) => cellXml(`${colLetters(i + 1)}${r}`, v)).join('')}</row>`;
  const lines = [rowXml(1, headers)];
  rows.forEach((row, i) => lines.push(rowXml(i + 2, columns.map((col) => cellAt(row, col)))));
  const last = `${colLetters(Math.max(1, columns.length))}${rows.length + 1}`;
  return (
    `${XML_HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${last}"/><sheetData>${lines.join('')}</sheetData></worksheet>`
  );
}

const STATIC_PARTS: Record<string, string> = {
  '[Content_Types].xml':
    `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>',
  '_rels/.rels':
    `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>',
  'xl/workbook.xml':
    `${XML_HEAD}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':
    `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>',
  'xl/styles.xml':
    `${XML_HEAD}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>',
};

// ── The codec ────────────────────────────────────────────────────────────────

export const xlsxCodec: FormatCodec = {
  id: 'xlsx',
  extensions: ['.xlsx'],
  contentTypes: ['spreadsheetml'],

  listTables(bytes: Uint8Array, name: string): TableCandidate[] {
    return candidates(readWorkbook(bytes, name)).candidates;
  },

  parse(bytes: Uint8Array, name: string, table = 1): ParsedTable {
    warnIfHuge(bytes, name);
    const { grids } = candidates(readWorkbook(bytes, name));
    const grid = grids[table - 1];
    if (!grid) throw new Error(`${name}: no table ${table}`);
    return gridToTable(grid);
  },

  serialize(rows: Row[], columns: string[], headers?: string[]): Uint8Array {
    const files: Record<string, Uint8Array> = {};
    for (const [path, xml] of Object.entries(STATIC_PARTS)) files[path] = strToU8(xml);
    files['xl/worksheets/sheet1.xml'] = strToU8(sheetXml(rows, columns, headers ?? columns));
    return zipSync(files, { level: 6 });
  },
};
