// RED-CLI-7 — red unit test (bug inventory): truncation marker rows break
// column alignment. spec/code-contract.md:509-512 — when rows fall outside the
// viewport, the truncated edge renders "...{N} more rows." markers *in place
// of cells*, i.e. inside the padEnd-aligned grid, so the " | " separators line
// up with the header's. render.ts computes column widths from header + body
// only (render.ts:66-78) and injects the marker text afterwards
// (render.ts:84-96); a marker longer than its first column shifts every
// separator on that line. (behavior.md:345-349 names only the marker text, so
// the spec-violation reading rests on the contract's "in place of cells".)
// Runs via `bun run test:red:unit`; excluded from the green `bun test` by
// bunfig [test] pathIgnorePatterns.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import type { Row, TablePlan } from '@tamedtable/core';
import { renderTable } from '@tamedtable/cli';

function separatorPositions(line: string): number[] {
  const positions: number[] = [];
  for (let i = 0; i < line.length; i++) if (line[i] === '|') positions.push(i);
  return positions;
}

test('RED-CLI-7: truncation marker row keeps the header separator positions', () => {
  // Two short columns so the "...10 more rows." marker (16 chars) is wider
  // than its first column; 25 rows with the cursor on the middle page produce
  // a marker row above AND below.
  const spec = {
    columns: [{ id: 'ID' }, { id: 'Name' }],
    transformations: [],
  } as unknown as TablePlan;
  const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({
    ID: `r${i + 1}`,
    Name: `n${i + 1}`,
  }));

  const out = renderTable(spec, rows, 10, 0, undefined, 10, 5);
  const lines = out.split('\n');
  const header = lines[0]!;
  const markerLines = lines.filter((l) => l.includes('more rows.'));
  assert.equal(markerLines.length, 2,
    'RED-CLI-7 harness: expected a marker row above and below the middle page — not the bug itself');

  const headerSeps = separatorPositions(header);
  for (const marker of markerLines) {
    assert.deepEqual(separatorPositions(marker), headerSeps,
      'RED-CLI-7 (spec/code-contract.md:509-512): marker rows render "in place of cells", so their " | " separators must align with the header\'s — but render.ts sizes columns before injecting the marker (render.ts:66-96), shifting every separator on the marker line.\n' +
      `header: ${JSON.stringify(header)}\nmarker: ${JSON.stringify(marker)}`);
  }
});
