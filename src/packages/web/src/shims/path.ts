// Browser shim for `node:path` (POSIX semantics) — the engine only ever
// joins, splits, and resolves virtual paths inside the in-memory fs shim.

function normalize(parts: string[]): string {
  const joined = parts.filter((p) => p.length > 0).join('/');
  const absolute = joined.startsWith('/');
  const out: string[] = [];
  for (const seg of joined.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') out.pop();
      else if (!absolute) out.push('..');
    } else {
      out.push(seg);
    }
  }
  const body = out.join('/');
  return absolute ? '/' + body : body || '.';
}

export function join(...parts: string[]): string {
  return normalize(parts);
}

export function resolve(...parts: string[]): string {
  const joined = normalize(parts);
  return joined.startsWith('/') ? joined : '/' + joined;
}

export function dirname(p: string): string {
  const trimmed = p.replace(/\/+$/, '');
  const i = trimmed.lastIndexOf('/');
  if (i < 0) return '.';
  if (i === 0) return '/';
  return trimmed.slice(0, i);
}

export function basename(p: string, ext?: string): string {
  let base = p.replace(/\/+$/, '').split('/').pop() ?? '';
  if (ext && base.endsWith(ext) && base !== ext) base = base.slice(0, -ext.length);
  return base;
}

export function isAbsolute(p: string): boolean {
  return p.startsWith('/');
}

export function relative(from: string, to: string): string {
  const a = normalize([from]).split('/').filter(Boolean);
  const b = normalize([to]).split('/').filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/');
}

export default { join, resolve, dirname, basename, isAbsolute, relative };
