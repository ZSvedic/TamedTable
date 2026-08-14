// RED-UI-4: regression test (red inventory): Cmd/Ctrl+C cell copy is dead when
// CapsLock is on. With CapsLock engaged the browser reports the C key as
// `key: 'C'` (KeyboardEvent.key reflects CapsLock: standard UI Events
// behavior), and the copy handler's case-sensitive comparison
// `e.key !== 'c'` (TableView.tsx:153) silently no-ops. Spec: "with a cell
// selected (and not editing), Cmd/Ctrl+C copies its text to the clipboard
// and reports `onCopyCell(row, column, text)`":
// spec/packages/table-view/behavior.md:114-116, no CapsLock carve-out.
// import { afterAll, beforeAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { win, h, act, mount, unmountAll, setupReact } from '../../tests/ui-dom-harness.tsx';

// react-dom must evaluate AFTER the harness plants the DOM globals (a static
// import can beat the harness to it), so everything React loads dynamically.
setupReact(await import('react'), await import('react-dom/client'));
const { ThemeProvider } = await import('@tamedtable/ui-kit/components');
const { TableView } = await import('./TableView.tsx');

// The handler calls navigator.clipboard?.writeText: give the shared window
// a permission-free stub for the duration of this file, then restore.
const realNavigator = (globalThis as { navigator: unknown }).navigator;
beforeAll(() => {
  (globalThis as { navigator: unknown }).navigator = { clipboard: { writeText: async () => {} } };
});
afterAll(() => {
  (globalThis as { navigator: unknown }).navigator = realNavigator;
  unmountAll();
});

test('RED-UI-4: Ctrl/Cmd+C cell copy dead with CapsLock (key reported as uppercase C)', () => {
  const copies: string[] = [];
  mount(
    h(ThemeProvider, null, h(TableView, {
      columns: ['name'],
      rows: [{ name: 'Ada' }],
      pageStart: 0,
      totalRows: 1,
      page: 1,
      pageCount: 1,
      onPageChange: () => {},
      selection: { row: 0, column: 'name' },
      onSelectCell: () => {},
      onEditCell: () => {},
      onReorderColumns: () => {},
      onCopyCell: (r: number, c: string, t: string) => copies.push(`${r}:${c}=${t}`),
    })),
  );
  const fire = (key: string): void => {
    act(() => {
      win.document.dispatchEvent(
        new win.KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true } as never) as unknown as globalThis.Event,
      );
    });
  };

  // Harness sanity first: plain Ctrl+c must copy. If this throws, the
  // failure is a broken harness, not RED-UI-4.
  fire('c');
  if (copies.length !== 1) {
    throw new Error(`harness broken (not RED-UI-4): Ctrl+c should have copied once, got ${JSON.stringify(copies)}`);
  }
  copies.length = 0;

  // The bug: with CapsLock the browser reports key 'C', the copy must still
  // fire.
  fire('C');
  assert.deepEqual(
    copies,
    ['0:name=Ada'],
    "RED-UI-4 (spec/packages/table-view/behavior.md:114-116): Cmd/Ctrl+C must copy the selected cell with no CapsLock carve-out, but with CapsLock (key 'C') the shortcut silently does nothing, TableView.tsx:153 compares e.key !== 'c' case-sensitively",
  );
});
