// #NestedCells #MobileShell
// The phone grid renders cells itself (it is not the table-view component),
// so it needs its own proof that a cell holding a list prints as compact JSON
// rather than JavaScript's "[object Object]". Spec: spec/behavior.md
// § Nested values in a cell.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { win, h, mount, unmountAll, setupReact } from '../../../../../tests/ui-dom-harness.tsx';

// react-dom must evaluate AFTER the harness plants the DOM globals.
setupReact(await import('react'), await import('react-dom/client'));
const { lightTheme } = await import('@tamedtable/ui-kit');
const { MobileTable } = await import('./MobileTable.tsx');

test('a nested cell shows its compact JSON on the phone grid', () => {
  const { el } = mount(
    h(MobileTable, {
      t: lightTheme,
      columns: ['conversations', 'subreddit'],
      rows: [{
        conversations: [{ from: 'human', value: 'Knock knock.' }],
        subreddit: 'oneliners',
      }],
      pageStart: 0,
      selection: null,
      onSelect: () => {},
    }),
  );
  const text = el.textContent ?? '';
  assert.ok(
    text.includes('[{"from":"human","value":"Knock knock."}]'),
    `phone grid did not show the cell's JSON. Rendered: ${text}`,
  );
  assert.ok(!text.includes('[object Object]'), `phone grid shows "[object Object]": ${text}`);
  unmountAll();
});

// Keep the shared window alive for whatever test file runs next.
void win;
