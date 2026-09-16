// #Analyze #DuckDB: browser-level E2E for a question about the data. The
// Cucumber @web suite drives WebController in Node, where the engine's
// `@duckdb/node-api` import is the real native module; only the real browser
// build runs the query through src/shims/duckdb.ts → duckdb-wasm. This proves
// the whole answer path in the production build: the model's query runs in
// the browser, the reply renders with its result table, and the table on
// screen is untouched.
import { test, expect } from '@playwright/test';

const SAMPLE_URL = 'http://localhost:5173/TamedTable/app/samples/customers-input.csv';

/** A canned Anthropic /v1/messages reply with one tool call. */
function toolUse(name: string, input: Record<string, unknown>): string {
  return JSON.stringify({
    model: 'scripted',
    id: `msg_${name}`,
    type: 'message',
    role: 'assistant',
    content: [{ type: 'tool_use', id: `toolu_${name}`, name, input }],
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  });
}

const QUERY_REPLY = toolUse('query_table', {
  sql: 'SELECT Country, count(*) AS customers FROM t GROUP BY Country ORDER BY customers DESC LIMIT 3',
});
const ANSWER_REPLY = toolUse('reply', { text: 'USA has the most customers: 3 of 20.' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'tamedtable.config',
      JSON.stringify({ provider: 'anthropic', anthropicKey: 'e2e-test-key' }),
    );
  });
});

test('a question runs its query in the browser and answers without changing the table', async ({ page }) => {
  const wasmRequests: string[] = [];
  const isWasmPayload = (url: string): boolean =>
    /duckdb/i.test(url) && !/shims\/duckdb\.ts(\?|$)/.test(url);
  page.on('request', (req) => {
    if (isWasmPayload(req.url())) wasmRequests.push(req.url());
  });

  // Two model steps: the first call gets the query, the second (whose body
  // carries the query's tool_result) gets the reply.
  await page.route('**/v1/messages*', (route) => {
    const body = route.request().postData() ?? '';
    const reply = body.includes('tool_result') ? ANSWER_REPLY : QUERY_REPLY;
    route.fulfill({ status: 200, contentType: 'application/json', body: reply });
  });

  await page.goto('/TamedTable/app/');

  await page.locator('[data-uk-menubtn]').first().click();
  await page.locator('[data-uk-menu-item="Open URL…"]').click();
  const dialog = page.locator('[data-tb-dialog]');
  await dialog.locator('[data-tb-url-input]').fill(SAMPLE_URL);
  await dialog.getByRole('button', { name: 'Load' }).click();
  await expect(page.locator('[data-tv-cell="0:Country"]')).toHaveText('USA');
  expect(wasmRequests).toEqual([]);

  await page.getByPlaceholder('Describe a transformation…').fill('Which country has the most customers?');
  await page.locator('[data-cp-send]').click();

  // The answer lands with its marker and the result table the query
  // produced. Generous timeout: the first query fetches and instantiates
  // the wasm.
  const answer = page.locator('[data-cp-message="assistant"]:has([data-status-dot="answer"])');
  await expect(answer).toContainText('USA has the most customers', { timeout: 60_000 });
  await expect(answer.locator('[data-cp-answer-table]')).toContainText('Country');
  await expect(answer.locator('[data-cp-answer-table]')).toContainText('USA');
  expect(wasmRequests.length).toBeGreaterThan(0);

  // The table is untouched: same first cell, no step to undo.
  await expect(page.locator('[data-tv-cell="0:Country"]')).toHaveText('USA');
  await expect(page.getByRole('button', { name: /^Undo/ })).toBeDisabled();
});
