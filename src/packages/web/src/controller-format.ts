// File format helpers — pure detection logic, no controller state.

/** Detect the file format from a URL path and (optionally) a Content-Type
 *  header. The path's extension wins; Content-Type only matters when the
 *  URL has no .csv/.jsonl ending (think query-style download URLs). */
export function detectFormat(
  pathname: string,
  contentType: string | null,
): 'csv' | 'jsonl' | null {
  const lower = pathname.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.jsonl') || lower.endsWith('.ndjson')) return 'jsonl';
  const ct = contentType?.toLowerCase() ?? '';
  if (ct.includes('csv')) return 'csv';
  if (ct.includes('jsonl') || ct.includes('ndjson')) return 'jsonl';
  return null;
}

/** Derive a friendly file name from a URL — the last path segment, or a
 *  fallback `download.<ext>` for URLs that don't expose one. */
export function sampleNameFromUrl(url: URL, format: 'csv' | 'jsonl'): string {
  const segment = url.pathname.split('/').filter(Boolean).pop() ?? '';
  if (segment) return segment;
  return `download.${format}`;
}
