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

test('speedOf tells "never measured" from "measured and failed"', () => {
  assert.equal(speedOf(undefined, false), null);
  assert.equal(speedOf(undefined, true), 'measuring');
  assert.equal(speedOf(null, false), 'failed');
  // A measuring flag does not outrank a reading that already came back.
  assert.equal(speedOf(null, true), 'failed');
  const reading = { ttftSec: 0.4, tokPerSec: 100, model: 'gemini-3.6-flash', at: Date.now() };
  assert.equal(speedOf(reading, false), reading);
});
