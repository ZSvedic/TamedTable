// #IoFormats
// Step defs for formats.feature: the load→save→reload round-trip, surface-
// agnostic (every step goes through the shared Runner interface, so the same
// scenario runs on @headless, @cli, and @web). Saved files land in temp/.
import { When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { basename, join } from 'node:path';
import { TamedTableWorld, TEMP_DIR } from './world.ts';

interface RoundTrip {
  originalRows: string; // JSON snapshot of the loaded rows
  savedPath: string;
}
const roundTrip = new WeakMap<TamedTableWorld, RoundTrip>();

Then('the table has {int} data rows', function (this: TamedTableWorld, n: number) {
  assert.equal(this.ensureRunner().currentRows().length, n);
});

When('the table is saved as {string}', async function (this: TamedTableWorld, filename: string) {
  const runner = this.ensureRunner();
  const savedPath = join(TEMP_DIR, basename(filename));
  roundTrip.set(this, { originalRows: JSON.stringify(runner.currentRows()), savedPath });
  await runner.exportAs(savedPath);
});

When('the saved file is reloaded', async function (this: TamedTableWorld) {
  const rt = roundTrip.get(this);
  if (!rt) throw new Error('no saved file: missing "the table is saved as" step');
  await this.ensureRunner().loadInput(rt.savedPath);
});

Then('the reloaded rows match the originally loaded rows', function (this: TamedTableWorld) {
  const rt = roundTrip.get(this);
  if (!rt) throw new Error('no round-trip recorded');
  assert.equal(JSON.stringify(this.ensureRunner().currentRows()), rt.originalRows);
});
