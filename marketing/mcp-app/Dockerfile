# Runs the HTTP transport, which is what a remote MCP client (claude.ai,
# Claude Desktop connectors) needs. Local-file tools stay off: see main.ts.
FROM oven/bun:1.3-alpine

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

ENV PORT=8080
EXPOSE 8080
CMD ["bun", "main.ts"]
