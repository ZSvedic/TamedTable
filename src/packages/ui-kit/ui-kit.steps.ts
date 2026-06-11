// #UiKit
// Step defs for the @headless ui-kit scenarios — pure token assertions, no
// browser. The package's own steps live next to the code (see
// spec/packages/README.md); they import nothing from the app harness.
import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { brand, darkTheme, lightTheme } from './index.ts';

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
