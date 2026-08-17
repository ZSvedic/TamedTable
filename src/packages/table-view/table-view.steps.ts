// #TableView
// Step defs for the @headless table-view scenarios: pure pagination-model
// assertions, no browser. The package's own steps live next to the code (see
// spec/packages/README.md); they import nothing from the app harness.
import { Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { buildPageList, cellText, clampPage, defaultColumnWidth, pageCountFor, pageSlice, urlHref } from './index.ts';

Then(
  'pageCountFor {int} rows at size {int} is {int}',
  function (rows: number, size: number, expected: number) {
    assert.equal(pageCountFor(rows, size), expected);
  },
);

Then(
  'clampPage {int} of {int} pages is {int}',
  function (page: number, pageCount: number, expected: number) {
    assert.equal(clampPage(page, pageCount), expected);
  },
);

Then(
  'pageSlice of {int} rows at size {int} page {int} has {int} rows',
  function (total: number, size: number, page: number, expected: number) {
    const rows = Array.from({ length: total }, (_, i) => i);
    assert.equal(pageSlice(rows, page, size).length, expected);
  },
);

Then(
  'the page list for page {int} of {int} is {string}',
  function (current: number, total: number, expected: string) {
    assert.equal(buildPageList(current, total).join(','), expected);
  },
);

Then('defaultColumnWidth of {string} is {int}', function (title: string, expected: number) {
  assert.equal(defaultColumnWidth(title), expected);
});

// #NestedCells: the scenario writes the input as JSON so a list, an object,
// and a scalar all reach cellText in their real types.
Then('cellText of the JSON value {string} is {string}', function (json: string, expected: string) {
  assert.equal(cellText(JSON.parse(json)), expected);
});

Then('urlHref of {string} is {string}', function (value: string, expected: string) {
  assert.equal(urlHref(value), expected);
});

Then('urlHref of {string} is null', function (value: string) {
  assert.equal(urlHref(value), null);
});
