// #DuckDB #SqlExpr: browser-level E2E for web {sql}, which the Cucumber @web
// suite cannot see: that suite drives WebController in Node, where the engine's
// `@duckdb/node-api` import is the real native module. Only the real browser
// build exercises src/shims/duckdb.ts → duckdb-wasm. This test proves two
// things at once:
//   1. Lazy bundle: opening a CSV never fetches a duckdb asset.
//   2. Web SQL works: a {sql} transform loads the wasm and computes correctly.
import { test, expect } from '@playwright/test';

// The bundled sample, served same-origin by the dev server (vite.config.ts).
const SAMPLE_URL = 'http://localhost:5173/TamedTable/app/samples/customers-input.csv';

// A canned Anthropic /v1/messages reply with one apply_spec_patch tool call
// that appends an {sql} mutate: the same shape sql.steps.ts scripts in Node.
// `upper(Country)` keeps the assertion a plain string compare; row 2's
// "Canada" → "CANADA" is a real case change, so a pass means SQL actually ran.
const SQL_PATCH_REPLY = JSON.stringify({
  model: 'scripted',
  id: 'msg_e2e',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_e2e',
      name: 'apply_spec_patch',
      input: {
        operations: [
          { op: 'add', path: '/columns/-', value: { id: 'UpperCountry' } },
          {
            op: 'add',
            path: '/transformations/-',
            value: { kind: 'mutate', columns: 'UpperCountry', value: { sql: 'upper(Country)' } },
          },
        ],
      },
    },
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
});

test.beforeEach(async ({ page }) => {
  // Seed a non-empty Anthropic key so the controller fires the request: it
  // rejects before any network call when the key is empty. The value is
  // irrelevant; the model call is intercepted below.
  await page.addInitScript(() => {
    localStorage.setItem(
      'tamedtable.config',
      JSON.stringify({ provider: 'anthropic', anthropicKey: 'e2e-test-key' }),
    );
  });
});

test('a CSV session never loads duckdb-wasm; a {sql} transform does and runs in the browser', async ({ page }) => {
  // The eager adapter (src/shims/duckdb.ts) is in the headless import graph and
  // always loads, but it imports no duckdb-wasm. The lazy payload is the
  // duckdb-wasm-impl chunk plus the .wasm and worker assets; only those count
  // as "the wasm loaded". (In a production build the adapter is folded into the
  // entry chunk and makes no request at all; in dev it is its own module.)
  const wasmRequests: string[] = [];
  const isWasmPayload = (url: string): boolean =>
    /duckdb/i.test(url) && !/shims\/duckdb\.ts(\?|$)/.test(url);
  page.on('request', (req) => {
    if (isWasmPayload(req.url())) wasmRequests.push(req.url());
  });

  await page.route('**/v1/messages*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: SQL_PATCH_REPLY }),
  );

  await page.goto('/TamedTable/app/');

  // Load the bundled CSV sample through the Open URL dialog.
  await page.locator('[data-uk-menubtn]').first().click();
  await page.locator('[data-uk-menu-item="Open URL…"]').click();
  const dialog = page.locator('[data-tb-dialog]');
  await dialog.locator('[data-tb-url-input]').fill(SAMPLE_URL);
  await dialog.getByRole('button', { name: 'Load' }).click();

  // Table rendered: the first data row's Country cell shows the source value.
  await expect(page.locator('[data-tv-cell="0:Country"]')).toHaveText('USA');

  // The golden path pulled no wasm payload: neither the impl chunk nor the
  // wasm/worker assets.
  expect(wasmRequests).toEqual([]);

  // Ask for a SQL transform.
  await page.getByPlaceholder('Describe a transformation…').fill('uppercase Country via SQL');
  await page.locator('[data-cp-send]').click();

  // duckdb-wasm computes it in the browser: "Canada" → "CANADA". Generous
  // timeout: the first SQL use fetches and instantiates the wasm.
  await expect(page.locator('[data-tv-cell="1:UpperCountry"]')).toHaveText('CANADA', {
    timeout: 60_000,
  });

  // …and the lazy chunk / wasm did load this time.
  expect(wasmRequests.length).toBeGreaterThan(0);
});
