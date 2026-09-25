# mcp-server

TamedTable MCP: the server that runs TamedTable inside Claude and ChatGPT as an MCP App. It is the fourth app over the shared engine, next to headless, CLI and Web. Why it is built this way: [mcp-rationale.md](../../../process/journal/2026-09-24-mcp-app/mcp-rationale.md); the plan it follows: [mcp-product-plan.md](../../../process/journal/2026-09-24-mcp-app/mcp-product-plan.md).

Today the package holds the tool contract and the server instructions, which experiment E1 measures. The table store, the tool handlers, the transports and the grid (`mcp-view`) come next, with their Gherkin here.

| What | Where |
|---|---|
| Behavior spec | [behavior.md](behavior.md) |
| Server instructions (prompt text) | [prompt-app-edit.md § MCP_INSTRUCTIONS](../../prompt-app-edit.md) |
| Code | [../../../src/packages/mcp-server/](../../../src/packages/mcp-server/) |
| E1: can the chat model write recipe steps? | [benchmarks/mcp-e1/](../../../benchmarks/mcp-e1/) |
| The frozen TinyTable prototype | [process/prototypes/tinytable-mcp/](../../../process/prototypes/tinytable-mcp/) |
