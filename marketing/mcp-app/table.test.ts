import { expect, test } from "bun:test";
import { applyEdits, parseCsv, toCsv, splitCsvLine } from "./table.js";

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

test("applyEdits applies every edit in one pass, in order", () => {
  const t = parseCsv("name,phone\nAda,1\nAlan,2\nGrace,3\n", "t");
  const after = applyEdits(t, [
    { op: "set-cell", row: 0, column: "phone", value: "+1" },
    { op: "set-cell", row: 1, column: "phone", value: "+2" },
    { op: "delete-row", row: 2 },
  ]);
  expect(after.rows).toEqual([["Ada", "+1"], ["Alan", "+2"]]);
});

test("applyEdits changes nothing when one edit is bad", () => {
  const t = parseCsv("name\nAda\n", "t");
  expect(() =>
    applyEdits(t, [
      { op: "set-cell", row: 0, column: "name", value: "Ada King" },
      { op: "set-cell", row: 5, column: "name", value: "x" },
    ]),
  ).toThrow(/Edit 2 \(set-cell\).*No edits were applied/);
  expect(t.rows).toEqual([["Ada"]]);
});
