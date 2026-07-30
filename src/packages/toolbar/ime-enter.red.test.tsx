// RED-UI-1 (OpenUrlDialog site) — red unit test (bug inventory): Enter
// pressed to confirm an IME composition (KeyboardEvent.isComposing === true,
// the keystroke a Japanese/Chinese/Korean user types to accept a conversion)
// submits the Open-from-URL dialog with the half-composed URL. The dialog's
// onKeyDown (OpenUrlDialog.tsx:57-65) checks only `e.key === 'Enter'` and
// never reads `e.nativeEvent.isComposing` — the standard composer guard
// (`e.isComposing || e.keyCode === 229`) is missing, so typing an
// international domain (e.g. https://例え.jp/…) fires the load mid-word.
// Excluded from `bun test` by bunfig pathIgnorePatterns; run via
// `cd src && bun run test:red:unit`.
import { afterAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { win, h, act, mount, setValue, enterEvent, unmountAll, setupReact, sleep } from '../../tests/red/ui-dom-harness.tsx';

// react-dom must evaluate AFTER the harness plants the DOM globals (a static
// import can beat the harness to it), so everything React loads dynamically.
setupReact(await import('react'), await import('react-dom/client'));
const { ThemeProvider } = await import('@tamedtable/ui-kit/components');
const { OpenUrlDialog } = await import('./OpenUrlDialog.tsx');

afterAll(unmountAll);

function mountDialog(submitted: string[]): Element {
  const { el } = mount(
    h(ThemeProvider, null, h(OpenUrlDialog, {
      open: true,
      onSubmit: async (u: string) => { submitted.push(u); },
      onClose: () => {},
    })),
  );
  return el;
}

test('RED-UI-1: Enter during IME composition submits the URL dialog with the half-composed URL', async () => {
  // Harness sanity first: a plain Enter must submit. If this throws, the
  // failure is a broken harness, not RED-UI-1.
  const control: string[] = [];
  const controlInput = mountDialog(control).querySelector('[data-tb-url-input]')!;
  setValue(controlInput, 'https://例え.jp/デ', win.HTMLInputElement.prototype);
  await act(async () => {
    controlInput.dispatchEvent(enterEvent(false));
    await sleep(10);
  });
  if (control.length !== 1) {
    throw new Error(`harness broken (not RED-UI-1): plain Enter should have submitted once, got ${JSON.stringify(control)}`);
  }

  // The bug: the same Enter with isComposing:true — an IME conversion
  // confirm — must not submit.
  const submitted: string[] = [];
  const input = mountDialog(submitted).querySelector('[data-tb-url-input]')!;
  setValue(input, 'https://例え.jp/デ', win.HTMLInputElement.prototype);
  await act(async () => {
    input.dispatchEvent(enterEvent(true));
    await sleep(10);
  });
  assert.deepEqual(
    submitted,
    [],
    'RED-UI-1 (spec/packages/table-view/behavior.md:51 sibling contract; spec/behavior.md:48 "in the user\'s own words and language"): an IME conversion-confirm Enter (isComposing:true) must not submit the Open-from-URL dialog, but the half-composed URL was submitted (OpenUrlDialog.tsx:57-65 never checks e.nativeEvent.isComposing)',
  );
});
