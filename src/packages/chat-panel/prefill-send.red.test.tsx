// RED-UI-2 — red unit test (bug inventory): the tutorial prefill typing
// animation keeps typing into the draft after the user sends. Sending
// mid-animation fires the truncated draft, `send()` clears the box — and the
// still-running interval (ChatPanel.tsx:449-453; never cleared by `send()`,
// ChatPanel.tsx:479-487) silently refills the full prefill text, priming an
// accidental duplicate request. Spec: a non-null prefill "syncs into the
// draft" (spec/packages/chat-panel/behavior.md:94); nothing anticipates the
// box refilling itself after a send — and downstream a truncated tutorial
// request has no recording, which ends the tour with "Tour ended — the
// guided replay went off-script." (spec/behavior.md:1650-1653). Excluded
// from `bun test` by bunfig pathIgnorePatterns; run via
// `cd src && bun run test:red:unit`.
import { afterAll, test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { win, h, act, mount, sleep, unmountAll, setupReact } from '../../tests/red/ui-dom-harness.tsx';

// react-dom must evaluate AFTER the harness plants the DOM globals (a static
// import can beat the harness to it), so everything React loads dynamically.
setupReact(await import('react'), await import('react-dom/client'));
const { ThemeProvider } = await import('@tamedtable/ui-kit/components');
const { ChatPanel } = await import('./ChatPanel.tsx');
const { TYPING_MS_PER_CHAR } = await import('@tamedtable/ui-kit');

afterAll(unmountAll);

const PREFILL = 'Keep rows where age >= 18'; // 25 chars ≈ 1s of typing at 40ms/char

test('RED-UI-2: prefill typing animation keeps typing after the user sends — the cleared draft silently refills', async () => {
  const sent: string[] = [];
  const { el } = mount(
    h(ThemeProvider, null, h(ChatPanel, {
      messages: [],
      streaming: false,
      requestCount: 0,
      prefill: PREFILL,
      onSend: (t: string) => sent.push(t),
      onCancel: () => {},
    })),
  );
  const ta = el.querySelector('textarea') as unknown as { value: string };
  const sendBtn = el.querySelector('[data-cp-send]')!;

  // Let the animation type a few characters, then the user clicks Send.
  await act(async () => { await sleep(8 * TYPING_MS_PER_CHAR); });
  if (ta.value.length < 2 || ta.value === PREFILL) {
    throw new Error(`harness broken (not RED-UI-2): expected a partially typed draft after ${8 * TYPING_MS_PER_CHAR}ms, got ${JSON.stringify(ta.value)}`);
  }
  act(() => { sendBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }) as unknown as globalThis.Event); });
  if (sent.length !== 1) {
    throw new Error(`harness broken (not RED-UI-2): Send click should have sent the partial draft once, got ${JSON.stringify(sent)}`);
  }

  // Spec-correct behavior: send() cleared the draft; nothing may refill it.
  // Wait past the end of the animation window and look again.
  await act(async () => { await sleep(PREFILL.length * TYPING_MS_PER_CHAR + 400); });
  assert.equal(
    ta.value,
    '',
    `RED-UI-2 (spec/packages/chat-panel/behavior.md:94; spec/behavior.md:1650-1653): after sending mid-animation the cleared draft must stay empty, but the prefill typing interval (ChatPanel.tsx:449-453) kept running after send() (ChatPanel.tsx:479-487 never clears typing.current.timer) and refilled the box — a truncated request already went out (${JSON.stringify(sent)}) and the refilled draft primes a duplicate`,
  );
}, 15000);
