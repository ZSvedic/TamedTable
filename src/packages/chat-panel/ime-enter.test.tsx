// RED-UI-1 (ChatPanel site): regression test (red inventory): Enter pressed to
// confirm an IME composition (KeyboardEvent.isComposing === true, the
// keystroke a Japanese/Chinese/Korean user types to accept a conversion)
// SENDS the half-composed draft. "Enter sends":
// spec/packages/chat-panel/behavior.md:90, describes the user's Enter; every
// mainstream composer (ChatPanel.tsx:677 cites "the shape every mainstream
// chat composer uses") ignores Enter while composing via the
// `e.isComposing || e.keyCode === 229` guard. The textarea onKeyDown
// (ChatPanel.tsx:698-703) checks only `e.key === 'Enter'` and never reads
// `e.nativeEvent.isComposing`, so the mid-composition draft fires a real
// model request.
import { afterAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { win, h, act, mount, setValue, enterEvent, unmountAll, setupReact } from '../../tests/ui-dom-harness.tsx';

// react-dom must evaluate AFTER the harness plants the DOM globals (a static
// import can beat the harness to it), so everything React loads dynamically.
setupReact(await import('react'), await import('react-dom/client'));
const { ThemeProvider } = await import('@tamedtable/ui-kit/components');
const { ChatPanel } = await import('./ChatPanel.tsx');

afterAll(unmountAll);

function mountPanel(sent: string[]): Element {
  const { el } = mount(
    h(ThemeProvider, null, h(ChatPanel, {
      messages: [],
      streaming: false,
      requestCount: 0,
      onSend: (t: string) => sent.push(t),
      onCancel: () => {},
    })),
  );
  return el;
}

test('RED-UI-1: Enter during IME composition sends the half-composed chat draft', () => {
  // Harness sanity first: a plain Enter must send. If this throws, the
  // failure is a broken harness, not RED-UI-1.
  const control: string[] = [];
  const controlEl = mountPanel(control);
  const controlTa = controlEl.querySelector('textarea')!;
  setValue(controlTa, 'とうきょ', win.HTMLTextAreaElement.prototype);
  void act(() => { controlTa.dispatchEvent(enterEvent(false)); });
  if (control.length !== 1) {
    throw new Error(`harness broken (not RED-UI-1): plain Enter should have sent once, got ${JSON.stringify(control)}`);
  }

  // The bug: the same Enter with isComposing:true, an IME conversion
  // confirm: must NOT send.
  const sent: string[] = [];
  const el = mountPanel(sent);
  const ta = el.querySelector('textarea')!;
  setValue(ta, 'とうきょ', win.HTMLTextAreaElement.prototype);
  void act(() => { ta.dispatchEvent(enterEvent(true)); });
  assert.deepEqual(
    sent,
    [],
    'RED-UI-1 (spec/packages/chat-panel/behavior.md:90): "Enter sends" means the user\'s Enter. An IME conversion-confirm Enter (isComposing:true) must not send, but the half-composed draft was fired as a request (ChatPanel.tsx:698-703 never checks e.nativeEvent.isComposing)',
  );
});
