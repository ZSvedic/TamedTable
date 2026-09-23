import { expect, test } from "bun:test";
import { parseCsv, toCsv, splitCsvLine } from "./table.js";

test("a comma inside quotes survives the round trip", () => {
  const csv = 'name,phone\nGrace Hopper,"(202) 555-0172, ext 4"\n';
  const t = parseCsv(csv, "test");
  expect(t.rows[0]).toEqual(["Grace Hopper", "(202) 555-0172, ext 4"]);
  expect(toCsv(t)).toBe(csv);
});

test("a quote inside a cell survives the round trip", () => {
  const t = parseCsv('a\n"say ""hi"""\n', "test");
  expect(t.rows[0]).toEqual(['say "hi"']);
  expect(parseCsv(toCsv(t), "test").rows[0]).toEqual(['say "hi"']);
});

test("plain cells stay unquoted", () => {
  expect(toCsv(parseCsv("a,b\n1,2\n", "t"))).toBe("a,b\n1,2\n");
});

test("splitCsvLine keeps empty trailing cells", () => {
  expect(splitCsvLine("a,,")).toEqual(["a", "", ""]);
});
