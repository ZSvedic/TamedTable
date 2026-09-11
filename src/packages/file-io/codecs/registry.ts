// #FileIO #IoFormats
// The load-on-demand codec registry. A new format is a codec file plus one row
// here. Detection reads the synchronous descriptor table (id + extensions +
// content types); the codec itself, and its parser, is pulled lazily by
// `loadCodec`, so a request that never touches a format never imports its parser.
import type { FormatCodec } from '@tamedtable/table-plan';

/** The format ids the registry currently serves. */
export type FormatId = 'csv' | 'jsonl' | 'parquet' | 'arrow' | 'xlsx' | 'html';

interface CodecDescriptor {
  id: FormatId;
  extensions: string[];
  contentTypes: string[];
  /** False for a load-only format (its codec has no `serialize`). */
  save: boolean;
  load: () => Promise<FormatCodec>;
}

const DESCRIPTORS: CodecDescriptor[] = [
  {
    id: 'csv',
    extensions: ['.csv'],
    contentTypes: ['csv'],
    save: true,
    load: () => import('./csv.ts').then((m) => m.csvCodec),
  },
  {
    id: 'jsonl',
    extensions: ['.jsonl', '.ndjson'],
    contentTypes: ['jsonl', 'ndjson'],
    save: true,
    load: () => import('./jsonl.ts').then((m) => m.jsonlCodec),
  },
  {
    // Parquet rides the shared DuckDB reader (read_parquet / COPY TO PARQUET);
    // the heavy engine is pulled only when this codec loads.
    id: 'parquet',
    extensions: ['.parquet', '.pq'],
    contentTypes: ['parquet'],
    save: true,
    load: () => import('./parquet.ts').then((m) => m.parquetCodec),
  },
  {
    // Arrow IPC / Feather, via apache-arrow (pure JS, no DuckDB extension).
    id: 'arrow',
    extensions: ['.arrow', '.feather', '.arrows'],
    contentTypes: ['arrow', 'feather', 'vnd.apache.arrow'],
    save: true,
    load: () => import('./arrow.ts').then((m) => m.arrowCodec),
  },
  {
    // #TablePick: an Excel workbook, pure JS (fflate + an OOXML reader);
    // every sheet or Excel table object is a candidate table.
    id: 'xlsx',
    extensions: ['.xlsx'],
    contentTypes: ['spreadsheetml'],
    save: true,
    load: () => import('./xlsx.ts').then((m) => m.xlsxCodec),
  },
  {
    // #TablePick: the <table>s on a web page, load-only. A page address
    // rarely carries the extension: the text/html Content-Type detects it.
    id: 'html',
    extensions: ['.html', '.htm'],
    contentTypes: ['html'],
    save: false,
    load: () => import('./html.ts').then((m) => m.htmlCodec),
  },
];

/** The format id a file path's extension claims, or null if none does. A
 *  trailing `#pick` (#TablePick: `report.xlsx#Orders`) does not hide the
 *  extension: the part before the last `#` is tried when the whole fails. */
export function formatForExtension(pathname: string): FormatId | null {
  const byExtension = (p: string): FormatId | null => {
    const lower = p.toLowerCase();
    for (const d of DESCRIPTORS) {
      if (d.extensions.some((ext) => lower.endsWith(ext))) return d.id;
    }
    return null;
  };
  const whole = byExtension(pathname);
  if (whole) return whole;
  const hash = pathname.lastIndexOf('#');
  return hash > 0 ? byExtension(pathname.slice(0, hash)) : null;
}

/** Whether the format saves as well as loads (html does not). */
export function canSerialize(id: FormatId): boolean {
  return DESCRIPTORS.find((d) => d.id === id)?.save ?? false;
}

/** Detect the format from a URL path and (optionally) a Content-Type header.
 *  The path extension wins; Content-Type only decides when the path has no
 *  table extension (query-style download URLs). */
export function detectFormat(pathname: string, contentType: string | null): FormatId | null {
  const byExt = formatForExtension(pathname);
  if (byExt) return byExt;
  const ct = contentType?.toLowerCase() ?? '';
  for (const d of DESCRIPTORS) {
    if (d.contentTypes.some((frag) => ct.includes(frag))) return d.id;
  }
  return null;
}

/** Lazily import the codec for a format id, pulling its parser only now. */
export function loadCodec(id: FormatId): Promise<FormatCodec> {
  const d = DESCRIPTORS.find((x) => x.id === id);
  if (!d) throw new Error(`unknown format: ${id}`);
  return d.load();
}
