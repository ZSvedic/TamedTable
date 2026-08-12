// #ModelConfig — what a card row actually renders for each speed state.
//
// The @web scenarios drive the demo page, whose stub provider always answers,
// so the two states a *broken* provider produces — the measurement that failed
// and the row that was never measured — have no browser scenario that can
// reach them. This renders the pure component directly instead. No DOM needed:
// the component holds no state, so a server render is the whole output.
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { ModelChooser, type ConnectedCard, type RoleRow } from './ModelChooser.tsx';
import { speedOf } from './storage.ts';

/** One selected Google card, its primary row in the state under test. */
function render(speed: RoleRow['speed']): string {
  const row = (s: RoleRow['speed']): RoleRow => ({
    model: 'gemini-3.6-flash',
    inUsdPer1kTok: 0.0015,
    outUsdPer1kTok: 0.0075,
    speed: s,
  });
  const card: ConnectedCard = {
    id: 'gemini', tier: 'paid', voice: true,
    primary: row(speed),
    secondary: row(null),
  };
  return renderToString(h(ModelChooser, {
    connected: [card],
    selected: 'gemini',
    keyInput: '',
    error: '',
    busy: false,
    onKeyInputChange: () => {},
    onAdd: () => {},
    onSelect: () => {},
    onRemove: () => {},
    onRefresh: () => {},
  }));
}

test('a measured row shows the catalogue prices and the estimated seconds', () => {
  const html = render({ ttftSec: 0.4, tokPerSec: 111.1 });
  assert.ok(
    html.includes('$0.0015 in / $0.0075 out per 1000 tok, ~9.4 sec'),
    `expected the priced line with its seconds; got ${html.slice(0, 400)}`,
  );
});

test('a row still measuring says so rather than showing a number', () => {
  const html = render('measuring');
  assert.ok(html.includes('measuring'), 'expected the measuring… tail');
  assert.ok(!html.includes(' sec'), 'a row still measuring must not show seconds');
});

test('a failed measurement says the speed is unknown, and keeps the price', () => {
  const html = render('failed');
  // The point of the state: blank is what an unmeasured row looks like, so a
  // measurement that failed has to say something different.
  assert.ok(html.includes('speed unknown'), 'expected "speed unknown" on a failed measurement');
  assert.ok(html.includes('$0.0015 in'), 'the catalogue price survives a failed measurement');
});

test('a row that was never measured shows the price and nothing else', () => {
  const html = render(null);
  assert.ok(html.includes('$0.0015 in / $0.0075 out per 1000 tok'), 'expected the priced line');
  assert.ok(!html.includes('speed unknown'), 'an unmeasured row has not failed');
  assert.ok(!html.includes('measuring'), 'an unmeasured row is not measuring');
});

test('both role labels read the same weight and name the role', () => {
  const html = render(null);
  assert.ok(html.includes('Primary model'), 'expected the "Primary model" label');
  assert.ok(html.includes('Secondary model'), 'expected the "Secondary model" label');
});

test('the icon buttons carry an accessible name, not just a tooltip', () => {
  const html = render(null);
  assert.ok(html.includes('aria-label="Re-measure Google API"'), 'the ⟳ button needs a label');
  assert.ok(html.includes('aria-label="Remove Google API"'), 'the delete button needs a label');
});

/** The Puter sign-in button's own markup — the whole page also holds a
 *  disabled Add button, so `disabled` has to be looked for on this tag alone. */
function puterButton(html: string): string {
  const start = html.indexOf('<button', html.indexOf('data-mc-puter') - 300);
  assert.notEqual(start, -1, 'no Puter sign-in button rendered');
  return html.slice(start, html.indexOf('</button>', start));
}

/** The Puter block, rendered with nothing connected. */
function renderPuter(props: { busy?: boolean; puterBusy?: boolean } = {}): string {
  return renderToString(h(ModelChooser, {
    connected: [],
    selected: null,
    keyInput: '',
    error: '',
    busy: props.busy ?? false,
    puterBusy: props.puterBusy ?? false,
    onKeyInputChange: () => {},
    onAdd: () => {},
    onSelect: () => {},
    onRemove: () => {},
    onPuterSignIn: () => {},
  }));
}

test('the Puter button says the sign-in started, and cannot be clicked twice', () => {
  // The sign-in opens a window in front of the panel. A panel that looks
  // untouched when the user comes back reads as a click that never registered.
  const idle = puterButton(renderPuter());
  assert.ok(idle.includes('Sign in / Sign up to Puter.js'), 'expected the idle label');
  assert.ok(!idle.includes('disabled'), 'the idle button is clickable');

  const busy = puterButton(renderPuter({ busy: true, puterBusy: true }));
  assert.ok(busy.includes('Signing in…'), 'expected the in-flight label');
  assert.ok(busy.includes('disabled'), 'the in-flight button is disabled');
});

test('a pasted-key connect disables the Puter button without relabelling it', () => {
  // One connect at a time, but this one is not the Puter sign-in.
  const html = puterButton(renderPuter({ busy: true, puterBusy: false }));
  assert.ok(html.includes('Sign in / Sign up to Puter.js'), 'the label belongs to the Puter flow');
  assert.ok(html.includes('disabled'), 'a connect in flight still blocks a second one');
});

test('speedOf tells "never measured" from "measured and failed"', () => {
  assert.equal(speedOf(undefined, false), null);
  assert.equal(speedOf(undefined, true), 'measuring');
  assert.equal(speedOf(null, false), 'failed');
  // A measuring flag does not outrank a reading that already came back.
  assert.equal(speedOf(null, true), 'failed');
  const reading = { ttftSec: 0.4, tokPerSec: 100, model: 'gemini-3.6-flash', at: Date.now() };
  assert.equal(speedOf(reading, false), reading);
});
