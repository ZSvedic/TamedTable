import { afterEach, expect, test } from "bun:test";
import { createHeadlessRunner } from "./index.ts";

const root = globalThis as unknown as { puter?: unknown };
afterEach(() => {
  delete root.puter;
});

test("Puter adapter turns the SDK reply into the stream used by key measurement", async () => {
  let calledModel = "";
  root.puter = {
    ai: {
      chat: async (_prompt: string, options: { model: string }) => {
        calledModel = options.model;
        return { message: { content: "one two three" } };
      },
    },
  };
  const runner = createHeadlessRunner({
    model: "puter/gemini-2.5-flash",
    cellModel: "puter/gemini-2.5-flash-lite",
  });
  const result = await runner.testConnection();
  expect(calledModel).toBe("gemini-2.5-flash-lite");
  expect(result.model).toBe("puter/gemini-2.5-flash-lite");
  expect(result.estimated1000TokenSec).toBeGreaterThanOrEqual(0);
});
