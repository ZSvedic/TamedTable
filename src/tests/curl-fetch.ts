// #Cassettes — record-mode network transport. Bun's fetch cannot traverse the
// Claude sandbox's proxy, so record mode shells the live model calls out to
// curl, which honours HTTPS_PROXY and the CA bundle — that is what lets
// `bun run test:record` work from a sandbox session. Replay never uses this:
// it serves every call from the cassette on disk.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FetchLike } from '@tamedtable/cassette';

export function curlFetch(): FetchLike {
  return async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const headerFile = join(tmpdir(), `tt-curl-h-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
    const args = [
      'curl', '-sS', '--max-time', '180',
      '-X', init?.method ?? 'GET',
      '-D', headerFile,
      url,
    ];
    for (const [k, v] of Object.entries((init?.headers as Record<string, string>) ?? {})) {
      args.push('-H', `${k}: ${v}`);
    }
    if (init?.body !== undefined) args.push('--data-binary', '@-');
    const proc = Bun.spawn(args, {
      stdin: init?.body !== undefined ? new TextEncoder().encode(String(init.body)) : undefined,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [body, err] = await Promise.all([
      new Response(proc.stdout).arrayBuffer(),
      new Response(proc.stderr).text(),
    ]);
    const code = await proc.exited;
    if (code !== 0) throw new Error(`curl failed (${code}): ${err.slice(0, 300)}`);
    const rawHeaders = await Bun.file(headerFile).text().catch(() => '');
    await Bun.file(headerFile).delete?.().catch?.(() => { /* best effort */ });
    // The last header block (after any 100-continue / redirect blocks).
    const block = rawHeaders.trim().split(/\r?\n\r?\n/).pop() ?? '';
    const lines = block.split(/\r?\n/);
    const statusLine = lines[0] ?? 'HTTP/1.1 200 OK';
    const status = Number(statusLine.split(' ')[1] ?? 200);
    const statusText = statusLine.split(' ').slice(2).join(' ');
    const headers = new Headers();
    for (const line of lines.slice(1)) {
      const at = line.indexOf(':');
      if (at > 0) headers.set(line.slice(0, at).trim(), line.slice(at + 1).trim());
    }
    headers.delete('content-encoding'); // body arrives decoded
    headers.delete('content-length');
    return new Response(body, { status, statusText, headers });
  };
}
