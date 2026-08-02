// RED-UI-1 (TableView sites) — regression tests (red inventory): Enter pressed
// to confirm an IME composition (KeyboardEvent.isComposing === true, the
// keystroke a Japanese/Chinese/Korean user types to accept a conversion)
// commits the half-composed cell edit and applies the half-composed column
// filter. "Enter or blur commits" — spec/packages/table-view/behavior.md:51
// — describes the user's Enter; the standard composer guard
// (`e.isComposing || e.keyCode === 229`) is missing from both handlers:
// the inline cell editor (TableView.tsx:578-585) and the column-menu filter
// input (TableView.tsx:793-796) check only `e.key === 'Enter'` and never
// read `e.nativeEvent.isComposing`.
import { afterAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { win, h, act, mount, setValue, enterEvent, unmountAll, setupReact } from '../../tests/ui-dom-harness.tsx';

// react-dom must evaluate AFTER the harness plants the DOM globals (a static
// import can beat the harness to it), so everything React loads dynamically.
setupReact(await import('react'), await import('react-dom/client'));
const { ThemeProvider } = await import('@tamedtable/ui-kit/components');
const { TableView } = await import('./TableView.tsx');

afterAll(unmountAll);

const click = (el: Element): void => {
  act(() => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }) as unknown as globalThis.Event); });
};

function mountGrid(hooks: { onEditCell?: (r: number, c: string, v: string) => void; onFilterChange?: (c: string, t: string) => void }): Element {
  const { el } = mount(
    h(ThemeProvider, null, h(TableView, {
      columns: ['name'],
      rows: [{ name: 'Ada' }],
      pageStart: 0,
      totalRows: 1,
      page: 1,
      pageCount: 1,
      onPageChange: () => {},
      selection: null,
      onSelectCell: () => {},
      onEditCell: hooks.onEditCell ?? (() => {}),
      onReorderColumns: () => {},
      ...(hooks.onFilterChange ? { onFilterChange: hooks.onFilterChange } : {}),
    })),
  );
  return el;
}

function openEditor(el: Element): Element {
  act(() => {
    el.querySelector('[data-tv-cell="0:name"]')!
      .dispatchEvent(new win.MouseEvent('dblclick', { bubbles: true }) as unknown as globalThis.Event);
  });
  return el.querySelector('[data-tv-edit]')!;
}

test('RED-UI-1: Enter during IME composition commits the half-composed cell edit and closes the editor', () => {
  // Harness sanity first: a plain Enter must commit. If this throws, the
  // failure is a broken harness, not RED-UI-1.
  const control: string[] = [];
  const controlInput = openEditor(mountGrid({ onEditCell: (r, c, v) => control.push(`${r}:${c}=${v}`) }));
  setValue(controlInput, 'とう', win.HTMLTextAreaElement.prototype);
  act(() => { controlInput.dispatchEvent(enterEvent(false)); });
  if (control.length !== 1) {
    throw new Error(`harness broken (not RED-UI-1): plain Enter should have committed once, got ${JSON.stringify(control)}`);
  }

  // The bug: the same Enter with isComposing:true — an IME conversion
  // confirm — must neither commit nor close the editor.
  const edits: string[] = [];
  const el = mountGrid({ onEditCell: (r, c, v) => edits.push(`${r}:${c}=${v}`) });
  const input = openEditor(el);
  setValue(input, 'とう', win.HTMLTextAreaElement.prototype);
  act(() => { input.dispatchEvent(enterEvent(true)); });
  assert.deepEqual(
    edits,
    [],
    'RED-UI-1 (spec/packages/table-view/behavior.md:51): "Enter or blur commits" means the user\'s Enter — an IME conversion-confirm Enter (isComposing:true) must not commit the half-composed kana as the cell value, but it did (TableView.tsx:578-585 never checks e.nativeEvent.isComposing)',
  );
  assert.notEqual(
    el.querySelector('[data-tv-edit]'),
    null,
    'RED-UI-1 (spec/packages/table-view/behavior.md:51): the inline editor must stay open across an IME conversion-confirm Enter, but it closed mid-word',
  );
});

test('RED-UI-1: Enter during IME composition applies the half-composed column filter', () => {
  // Harness sanity first: a plain Enter must apply the filter. If this
  // throws, the failure is a broken harness, not RED-UI-1.
  const openFilter = (el: Element): Element => {
    click(el.querySelector('[data-tv-menu="name"]')!);
    click(el.querySelector('[data-tv-menu-item="filter"]')!);
    return el.querySelector('[data-tv-filter-input]')!;
  };
  const control: string[] = [];
  const controlInput = openFilter(mountGrid({ onFilterChange: (c, t) => control.push(`${c}=${t}`) }));
  setValue(controlInput, 'とう', win.HTMLInputElement.prototype);
  act(() => { controlInput.dispatchEvent(enterEvent(false)); });
  if (control.length !== 1) {
    throw new Error(`harness broken (not RED-UI-1): plain Enter should have applied the filter once, got ${JSON.stringify(control)}`);
  }

  const filters: string[] = [];
  const input = openFilter(mountGrid({ onFilterChange: (c, t) => filters.push(`${c}=${t}`) }));
  setValue(input, 'とう', win.HTMLInputElement.prototype);
  act(() => { input.dispatchEvent(enterEvent(true)); });
  assert.deepEqual(
    filters,
    [],
    'RED-UI-1 (spec/packages/table-view/behavior.md:51 — same user-Enter contract): an IME conversion-confirm Enter (isComposing:true) must not apply the half-composed filter text, but it did (TableView.tsx:793-796 never checks e.nativeEvent.isComposing)',
  );
});
