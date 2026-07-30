// The ASCII viewport renderer. spec/code-contract.md § CLI: truncation markers
// render "in place of cells", so a marker's text is part of its column's width
// and every " | " on a marker line sits under the header's. Sizing the columns
// before injecting the marker (the RED-CLI-7 bug inventory, now fixed) shifted
// every separator on that line.
import { describe, it, expect } from 'bun:test';
import type { Row, TablePlan } from '@tamedtable/core';
import { renderTable } from './index.ts';

function separatorPositions(line: string): number[] {
  const positions: number[] = [];
  for (let i = 0; i < line.length; i++) if (line[i] === '|') positions.push(i);
  return positions;
}

describe('renderTable truncation markers', () => {
  // Two short columns so the "...10 more rows." marker (16 chars) is wider than
  // its first column; 25 rows with the cursor on the middle page produce a
  // marker row above AND below.
  const spec = { columns: [{ id: 'ID' }, { id: 'Name' }], transformations: [] } as unknown as TablePlan;
  const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({ ID: `r${i + 1}`, Name: `n${i + 1}` }));

  it('keeps a marker row aligned with the header separators', () => {
    const lines = renderTable(spec, rows, 10, 0, undefined, 10, 5).split('\n');
    const header = lines[0]!;
    const markerLines = lines.filter((l) => l.includes('more rows.'));
    expect(markerLines).toHaveLength(2);
    for (const marker of markerLines) {
      expect(separatorPositions(marker)).toEqual(separatorPositions(header));
    }
  });

  it('still prints the marker text itself', () => {
    const out = renderTable(spec, rows, 10, 0, undefined, 10, 5);
    expect(out).toContain('...10 more rows.');
    expect(out).toContain('...5 more rows.');
  });
});
