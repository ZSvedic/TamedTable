// Shared DOM harness for the UI-package red unit tests (*.red.test.tsx) —
// real React 19 client renders inside happy-dom, no browser. Used only by
// the red bug inventory (`bun run test:red:unit`); plain `bun test` never
// loads it (no .test in the name), and cucumber's import glob
// (`tests/**/!(*.test).ts`) matches .ts only, so no green profile sees it.
//
// Bun's isolated installs put react inside each package's node_modules, not
// at the src root — so each red test file imports its own package-resolved
// `react` / `react-dom/client` and hands them to `setupReact()` before
// calling `mount()`. That also guarantees the test renders with the exact
// React instance the component under test resolves.
import { Window } from 'happy-dom';

export const win = new Window({ url: 'https://localhost/' });
const g = globalThis as unknown as Record<string, unknown>;
g.window = win;
g.document = win.document;
g.navigator = win.navigator;
g.HTMLElement = win.HTMLElement;
g.HTMLInputElement = win.HTMLInputElement;
g.HTMLTextAreaElement = win.HTMLTextAreaElement;
g.Element = win.Element;
g.Node = win.Node;
g.Event = win.Event;
g.MouseEvent = win.MouseEvent;
g.KeyboardEvent = win.KeyboardEvent;
g.CSS = { escape: (s: string) => s };
g.getComputedStyle = win.getComputedStyle.bind(win);
g.IS_REACT_ACT_ENVIRONMENT = true;

type ActFn = (cb: () => unknown) => unknown;
type CreateRootFn = (el: unknown) => { render: (node: unknown) => void; unmount: () => void };

let actFn: ActFn | null = null;
let createRootFn: CreateRootFn | null = null;
let createElementFn: ((...args: unknown[]) => unknown) | null = null;

/** Register the package-resolved React before mounting anything. */
export function setupReact(
  react: { act: unknown; createElement: unknown },
  client: { createRoot: unknown },
): void {
  actFn = react.act as ActFn;
  createElementFn = react.createElement as (...args: unknown[]) => unknown;
  createRootFn = client.createRoot as CreateRootFn;
}

/** React act(). Sync callbacks may ignore the return value; async callbacks
 *  must `await act(...)` so the flush completes before asserting. */
export function act(cb: () => unknown): unknown {
  if (!actFn) throw new Error('ui-dom-harness: call setupReact() first');
  return actFn(cb);
}

/** React.createElement shorthand (JSX-free, so no tsx config is needed). */
export function h(...args: unknown[]): unknown {
  if (!createElementFn) throw new Error('ui-dom-harness: call setupReact() first');
  return createElementFn(...args);
}

const mounted: { el: Element; root: { unmount: () => void } }[] = [];

/** Render `node` into a fresh div on the shared happy-dom body. */
export function mount(node: unknown): { el: Element } {
  if (!createRootFn) throw new Error('ui-dom-harness: call setupReact() first');
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const root = createRootFn(el);
  act(() => root.render(node));
  const domEl = el as unknown as Element;
  mounted.push({ el: domEl, root });
  return { el: domEl };
}

/** Unmount everything this file mounted — call in afterAll so document-level
 *  listeners (e.g. TableView's copy handler) never leak into the next file. */
export function unmountAll(): void {
  for (const { el, root } of mounted.splice(0)) {
    act(() => root.unmount());
    (el as unknown as { remove: () => void }).remove();
  }
}

/** Set a controlled input/textarea value the way a real user edit does. */
export function setValue(input: Element, value: string, proto: object): void {
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new win.Event('input', { bubbles: true }) as unknown as globalThis.Event);
  });
}

/** A keydown Enter as the browser delivers it: plain, or the IME
 *  conversion-confirm keystroke (`isComposing: true`, per UI Events). */
export function enterEvent(composing: boolean): globalThis.Event {
  return new win.KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
    ...(composing ? { isComposing: true } : {}),
  } as never) as unknown as globalThis.Event;
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
