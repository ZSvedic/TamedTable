// #Cassettes — record-mode network transport. Bun's fetch cannot traverse the
// Claude sandbox's proxy, so record mode shells the live model calls out to
// curl, which honours HTTPS_PROXY and the CA bundle — that is what lets
// `bun run test:record` work from a sandbox session. Replay never uses this:
// it serves every call from the cassette on disk. Uses node:child_process, not
// Bun.spawn — the cucumber-js bin runs under Node, where the Bun global is
// undefined.
import { spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FetchLike } from '@tamedtable/cassette';

function run(args: string[], stdin?: string): Promise<{ code: number; stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(args[0]!, args.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    proc.stdout.on('data', (c: Buffer) => out.push(c));
    proc.stderr.on('data', (c: Buffer) => err.push(c));
    proc.on('error', reject);
    proc.on('close', (code) =>
      resolve({ code: code ?? -1, stdout: Buffer.concat(out), stderr: Buffer.concat(err).toString() }),
    );
    if (stdin !== undefined) proc.stdin.write(stdin);
    proc.stdin.end();
  });
}

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
    const { code, stdout, stderr } = await run(args, init?.body !== undefined ? String(init.body) : undefined);
    if (code !== 0) throw new Error(`curl failed (${code}): ${stderr.slice(0, 300)}`);
    const rawHeaders = await readFile(headerFile, 'utf8').catch(() => '');
    await unlink(headerFile).catch(() => { /* best effort */ });
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
    return new Response(stdout, { status, statusText, headers });
  };
}
