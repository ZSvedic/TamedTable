import { expect, test } from "bun:test";
import { createHeadlessRunner } from "./index.ts";

test("Groq routes to its OpenAI-compatible API and strips the routing prefix", async () => {
  let request:
    | { url: string; authorization: string; model: string }
    | undefined;
  const fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body)) as { model: string };
    request = {
      url,
      authorization: headers.get("authorization") ?? "",
      model: body.model,
    };
    const chunk = {
      id: "groq-test",
      object: "chat.completion.chunk",
      created: 1,
      model: body.model,
      choices: [
        {
          index: 0,
          delta: { role: "assistant", content: "OK" },
          finish_reason: "stop",
        },
      ],
    };
    return new Response(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };
  const runner = createHeadlessRunner({
    model: "groq/openai/gpt-oss-120b",
    cellModel: "groq/llama-3.1-8b-instant",
    apiKey: "gsk_test",
    fetch,
  });
  await runner.testConnection();
  expect(request?.url).toBe("https://api.groq.com/openai/v1/chat/completions");
  expect(request?.authorization).toBe("Bearer gsk_test");
  expect(request?.model).toBe("llama-3.1-8b-instant");
});
