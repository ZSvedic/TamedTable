/**
 * @file Entry point.
 *
 * `bun main.ts --stdio` is what Claude Desktop launches: one process, one
 * table, and the local-file tools switched on because the machine is yours.
 *
 * `bun main.ts` serves Streamable HTTP on :3001 for the reference host and for
 * a public deployment. There it keeps one table per MCP session, and the
 * local-file tools stay off unless TINYTABLE_LOCAL_FILES=1 says otherwise.
 */
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import type { McpServer } from "@modelcontextprotocol/server";
import cors from "cors";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { createServer } from "./server.js";

type Session = { server: McpServer; transport: NodeStreamableHTTPServerTransport };

async function startHttp(): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const localFiles = process.env.TINYTABLE_LOCAL_FILES === "1";
  const sessions = new Map<string, Session>();

  const app = createMcpExpressApp({ host: "0.0.0.0" });
  // Claude connects from Anthropic's cloud, so any origin has to be allowed,
  // and the session header has to survive the preflight.
  app.use(cors({ exposedHeaders: ["mcp-session-id"], allowedHeaders: ["*"] }));

  app.get("/", (_req: Request, res: Response) => {
    res.type("text/plain").send("TinyTable MCP server. Connect an MCP client to /mcp.\n");
  });

  app.all("/mcp", async (req: Request, res: Response) => {
    try {
      const id = req.headers["mcp-session-id"];
      const existing = typeof id === "string" ? sessions.get(id) : undefined;

      if (existing) {
        await existing.transport.handleRequest(req, res, req.body);
        return;
      }

      const server = createServer({ localFiles });
      const transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
        server.close().catch(() => {});
      };
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      if (transport.sessionId) sessions.set(transport.sessionId, { server, transport });
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
