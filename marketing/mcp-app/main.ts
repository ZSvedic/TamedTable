/**
 * @file Entry point.
 *
 * `bun main.ts --stdio` is what Claude Desktop launches: one process, one
 * table, and the local-file tools switched on because the machine is yours.
 *
 * `bun main.ts` serves Streamable HTTP on :3001 for the reference host and for
 * a public deployment. The HTTP side is stateless: a fresh server and
 * transport per request, no session ids. Continuity comes from the table id
 * in the arguments, so a host that reconnects, or a free-tier host that
 * restarts the process, never meets a session it cannot resume. Local-file
 * tools stay off unless TINYTABLE_LOCAL_FILES=1 says otherwise.
 */
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { createServer } from "./server.js";
import * as store from "./store.js";
import { toCsv } from "./table.js";

async function startHttp(): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const localFiles = process.env.TINYTABLE_LOCAL_FILES === "1";

  const app = createMcpExpressApp({ host: "0.0.0.0" });
  // Claude connects from Anthropic's cloud, so any origin has to be allowed.
  app.use(cors());

  // A landing page with the two install buttons. Claude takes a prefilled
  // deep link; ChatGPT has no equivalent, so the page copies the URL instead.
  app.get("/", async (_req: Request, res: Response) => {
    try {
      res.type("text/html").send(await fs.readFile(path.join(import.meta.dirname, "install.html"), "utf-8"));
    } catch {
      res.type("text/plain").send("TinyTable MCP server. Connect an MCP client to /mcp.\n");
    }
  });

  // The way a file gets out of the sandbox: not from the iframe, but from an
  // ordinary link the host opens in the user's own browser. The attachment
  // header is what turns opening into saving.
  app.get("/download/:id.csv", (req: Request, res: Response) => {
    const id = req.params.id;
    const table = store.get(Array.isArray(id) ? id[0]! : id!);
    if (!table) {
      res.status(404).type("text/plain").send("No table with that id.\n");
      return;
    }
    res.type("text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="table.csv"');
    res.send(toCsv(table));
  });

  app.all("/mcp", async (req: Request, res: Response) => {
    const server = createServer({ localFiles });
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, (err) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
    console.log(`TinyTable MCP server on http://localhost:${port}/mcp (localFiles=${localFiles})`);
  });

  const shutdown = () => httpServer.close(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (process.argv.includes("--stdio")) {
  await createServer({ localFiles: true }).connect(new StdioServerTransport());
} else {
  await startHttp();
}
