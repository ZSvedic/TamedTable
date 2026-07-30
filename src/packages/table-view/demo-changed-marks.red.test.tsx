// RED-UI-5 — red unit test (bug inventory): the table-view demo keys
// changed-cell marks by VIEW slot, so after an edit plus a sort the mark
// lands on whatever row now occupies that slot. demo.tsx:113 stores
// `${row}:${column}` (view-absolute) into `changed` but never remaps it when
// sort/filters reorder `order` (demo.tsx:53-62) — after editing row 0 and
// sorting `age` descending, untouched "Person 8" is tinted changed with a
// false tooltip `was: Person 1`, while the actually-edited row carries no
// mark. Spec: the changed mark belongs to the edited cell — "the host passes
// per-cell changed flags with previous values; a changed cell tints, and
// hovering it shows a small `was: <previous>` tooltip"
// (spec/packages/table-view/behavior.md:78-81) — and the demo is deployed
// under /demos/table-view/ as the spec's reference host
// (spec/packages/README.md § demos; table-view/behavior.md:146). The real
// app remaps marks per derived row (web/src/controller-engine.ts), so this
// is demo-host-only. Drives the real demo.tsx in happy-dom — no browser.
// Excluded from `bun test` by bunfig pathIgnorePatterns; run via
// `cd src && bun run test:red:unit`.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { win, act, setValue, enterEvent, setupReact } from '../../tests/red/ui-dom-harness.tsx';

// react-dom must evaluate AFTER the harness plants the DOM globals (a static
// import can beat the harness to it), so everything React loads dynamically.
setupReact(await import('react'), await import('react-dom/client'));

test('RED-UI-5: demo keys changed-cell marks by view slot — after edit + sort desc an untouched cell shows the mark and false was-tooltip', async () => {
  // Importing demo.tsx mounts the Demo into #root (module scope).
  const rootDiv = win.document.createElement('div');
  rootDiv.id = 'root';
  win.document.body.appendChild(rootDiv);
  await act(async () => { await import('./demo.tsx'); });

  const q = (sel: string): Element | null => rootDiv.querySelector(sel) as unknown as Element | null;
  const qa = (sel: string): Element[] => Array.from(rootDiv.querySelectorAll(sel)) as unknown as Element[];
  const click = (el: Element): void => {
    act(() => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }) as unknown as globalThis.Event); });
  };

  // 1. Edit cell 0:name ("Person 1", age 20 — the demo's minimum age) to "Grace".
  act(() => {
    q('[data-tv-cell="0:name"]')!
      .dispatchEvent(new win.MouseEvent('dblclick', { bubbles: true }) as unknown as globalThis.Event);
  });
  const input = q('[data-tv-edit]')!;
  setValue(input, 'Grace', win.HTMLInputElement.prototype);
  act(() => { input.dispatchEvent(enterEvent(false)); });

  // Harness sanity: in the unsorted view the mark sits on the edited cell
  // (the green suite pins this — table-view.feature:187-190). If this
  // throws, the failure is a broken harness, not RED-UI-5.
  const marked = qa('[data-tv-changed]').map(
    (c) => `${c.getAttribute('data-tv-cell')} text=${c.textContent} title=${c.getAttribute('title')}`,
  );
  if (marked.length !== 1 || !marked[0]!.includes('text=Grace') || !marked[0]!.includes('was: Person 1')) {
    throw new Error(`harness broken (not RED-UI-5): after the edit the mark should sit on Grace with "was: Person 1", got ${JSON.stringify(marked)}`);
  }

  // 2. Sort descending on age via the column menu. Grace (age 20) sorts to
  //    the last page, so page 1 holds only untouched rows.
  click(q('[data-tv-menu="age"]')!);
  click(q('[data-tv-menu-item="sort-desc"]')!);
  const names = qa('tbody tr td:nth-child(3)').map((td) => td.textContent);
  if (names.includes('Grace') || names[0] !== 'Person 8') {
    throw new Error(`harness broken (not RED-UI-5): sort desc on age should put Person 8 first and move Grace off page 1, got ${JSON.stringify(names)}`);
  }

  // Spec-correct behavior: the changed mark belongs to the edited cell,
  // which is not on this page — no cell here may carry a mark.
  const markedAfterSort = qa('[data-tv-changed]').map(
    (c) => `${c.getAttribute('data-tv-cell')} text=${c.textContent} title=${c.getAttribute('title')}`,
  );
  assert.deepEqual(
    markedAfterSort,
    [],
    'RED-UI-5 (spec/packages/table-view/behavior.md:78-81; spec/packages/README.md — demos are deployed): after edit + sort desc the edited row (Grace) is off-page, so page 1 must show no changed marks — but the demo host keys marks by view slot (demo.tsx:113, never remapped when order changes, demo.tsx:53-62) and tints an untouched cell with a false "was: Person 1" tooltip',
  );
});
