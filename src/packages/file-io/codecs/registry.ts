// #FileIO #IoFormats
// The load-on-demand codec registry. A new format is a codec file plus one row
// here. Detection reads the synchronous descriptor table (id + extensions +
// content types); the codec itself, and its parser, is pulled lazily by
// `loadCodec`, so a request that never touches a format never imports its parser.
import type { FormatCodec } from '@tamedtable/table-plan';

/** The format ids the registry currently serves. */
export type FormatId = 'csv' | 'jsonl' | 'parquet' | 'arrow';

interface CodecDescriptor {
  id: FormatId;
  extensions: string[];
  contentTypes: string[];
  load: () => Promise<FormatCodec>;
}

const DESCRIPTORS: CodecDescriptor[] = [
  {
    id: 'csv',
    extensions: ['.csv'],
    contentTypes: ['csv'],
    load: () => import('./csv.ts').then((m) => m.csvCodec),
  },
  {
    id: 'jsonl',
    extensions: ['.jsonl', '.ndjson'],
    contentTypes: ['jsonl', 'ndjson'],
    load: () => import('./jsonl.ts').then((m) => m.jsonlCodec),
  },
  {
    // Parquet rides the shared DuckDB reader (read_parquet / COPY TO PARQUET);
    // the heavy engine is pulled only when this codec loads.
    id: 'parquet',
    extensions: ['.parquet', '.pq'],
    contentTypes: ['parquet'],
    load: () => import('./parquet.ts').then((m) => m.parquetCodec),
  },
  {
    // Arrow IPC / Feather, via apache-arrow (pure JS, no DuckDB extension).
    id: 'arrow',
    extensions: ['.arrow', '.feather', '.arrows'],
    contentTypes: ['arrow', 'feather', 'vnd.apache.arrow'],
    load: () => import('./arrow.ts').then((m) => m.arrowCodec),
  },
];

/** The format id a file path's extension claims, or null if none does. */
export function formatForExtension(pathname: string): FormatId | null {
  const lower = pathname.toLowerCase();
  for (const d of DESCRIPTORS) {
    if (d.extensions.some((ext) => lower.endsWith(ext))) return d.id;
  }
  return null;
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
