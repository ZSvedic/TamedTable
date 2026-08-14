// #UiKit
// Step defs for the @headless ui-kit scenarios: pure token assertions, no
// browser. The package's own steps live next to the code (see
// spec/packages/README.md); they import nothing from the app harness.
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { brand, darkTheme, lightTheme, toastDurationMs, type Theme } from './index.ts';

interface UiKitWorld {
  _ukKeys?: { light: string[]; dark: string[] };
}

When('the light and dark themes are compared', function (this: UiKitWorld) {
  this._ukKeys = {
    light: Object.keys(lightTheme).sort(),
    dark: Object.keys(darkTheme).sort(),
  };
});

Then('both themes have identical key sets', function (this: UiKitWorld) {
  assert.deepEqual(this._ukKeys!.light, this._ukKeys!.dark);
});

Then('the themes differ in their values', function (this: UiKitWorld) {
  assert.notEqual(lightTheme.bg, darkTheme.bg);
  assert.notEqual(lightTheme.ink, darkTheme.ink);
  assert.equal(lightTheme.name, 'light');
  assert.equal(darkTheme.name, 'dark');
});

Then('brand ink is {string}', function (expected: string) {
  assert.equal(brand.ink, expected);
});

Then('brand accent is {string}', function (expected: string) {
  assert.equal(brand.accent, expected);
});

Then('brand line is {string}', function (expected: string) {
  assert.equal(brand.line, expected);
});

Then(
  'a toast reading {string} stays on screen for {int} ms',
  function (message: string, ms: number) {
    assert.equal(toastDurationMs(message), ms);
  },
);

Then(
  'a toast reading a {int}-character message stays on screen for {int} ms',
  function (len: number, ms: number) {
    assert.equal(toastDurationMs('x'.repeat(len)), ms);
  },
);

// Each on-color labels a matching filled surface; the two must contrast in every
// theme (their oklch lightness differs by a clear margin), or a filled control
// reads as same-on-same: the dark-mode inkOnInk regression that shipped once.
const ON_COLOR_PAIRS: Array<[keyof Theme, keyof Theme]> = [
  ['inkOnInk', 'ink'], // primary button label on its ink fill
  ['inkOnAcc', 'accent'], // label on an accent fill (e.g. the voice send button)
];
const MIN_LIGHTNESS_DELTA = 0.4;

// The lightness channel of an `oklch(L C H …)` color, in 0–1.
function oklchLightness(color: string): number {
  const m = /^oklch\(\s*([\d.]+)/.exec(color);
  assert.ok(m, `expected an oklch() color, got "${color}"`);
  return Number(m[1]);
}

Then('every on-color clearly contrasts with its surface in both themes', function () {
  for (const theme of [lightTheme, darkTheme]) {
    for (const [on, surface] of ON_COLOR_PAIRS) {
      const delta = Math.abs(oklchLightness(theme[on]) - oklchLightness(theme[surface]));
      assert.ok(
        delta >= MIN_LIGHTNESS_DELTA,
        `${theme.name}: ${on} (${theme[on]}) barely contrasts with ${surface} (${theme[surface]}), ΔL ${delta.toFixed(2)} < ${MIN_LIGHTNESS_DELTA}`,
      );
    }
  }
});
