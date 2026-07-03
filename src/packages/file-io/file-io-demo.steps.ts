// #FileIO
// Step defs for the @web file-io scenarios. They drive the package's demo
// page (see tests/demo-harness.ts) and assert through the demo's #fio-*
// elements. Table URLs the scenarios fetch are served from a per-scenario
// fixture map by the same request interceptor — no network. A CORS header on
// fixture responses lets the demo's cross-origin fetchTable call through.
import { Given, Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { bindDemoPage, expectText } from '../../tests/demo-harness.ts';

interface Fixture {
  status: number;
  body: string;
  contentType?: string;
}

const fixturesByWorld = new WeakMap<object, Map<string, Fixture>>();

function fixtures(world: object): Map<string, Fixture> {
  let m = fixturesByWorld.get(world);
  if (!m) {
    m = new Map();
    fixturesByWorld.set(world, m);
  }
  return m;
}

const page = bindDemoPage({
  name: 'file-io',
  pkgDir: import.meta.dirname,
  onRoute: async (route, world) => {
    const fixture = fixturesByWorld.get(world)?.get(route.request().url());
    if (!fixture) return false;
    await route.fulfill({
      status: fixture.status,
      body: fixture.body,
      contentType: fixture.contentType,
      headers: { 'access-control-allow-origin': '*' },
    });
    return true;
  },
});

/** Quoted step arguments write newlines as the two characters `\n`. */
const unescape = (s: string): string => s.replaceAll('\\n', '\n');

// ── steps ────────────────────────────────────────────────────────────────────

Given(
  'the demo network serves {string} with body {string} and content type {string}',
  function (this: object, url: string, body: string, contentType: string) {
    fixtures(this).set(url, { status: 200, body: unescape(body), contentType });
  },
);

Given(
  'the demo network serves {string} with status {int}',
  function (this: object, url: string, status: number) {
    fixtures(this).set(url, { status, body: '' });
  },
);

When('the user fetches {string} in the demo', async function (this: object, url: string) {
  const p = page(this);
  await p.fill('#fio-url', url);
  await p.click('#fio-fetch');
});

Then('the demo shows file name {string}', async function (this: object, expected: string) {
  await expectText(page(this), '#fio-name', expected);
});

Then('the demo shows format {string}', async function (this: object, expected: string) {
  await expectText(page(this), '#fio-format', expected);
});

Then('the demo preview contains {string}', async function (this: object, expected: string) {
  await expectText(page(this), '#fio-preview', expected);
});

Then(
  'the demo shows an error mentioning {string}',
  async function (this: object, expected: string) {
    await expectText(page(this), '#fio-error', expected);
  },
);

Then('the demo capability line reports the File System Access API', async function (
  this: object,
) {
  const text = (await page(this).textContent('#fio-fsa')) ?? '';
  assert.match(text, /File System Access API: (available|missing)/);
});
