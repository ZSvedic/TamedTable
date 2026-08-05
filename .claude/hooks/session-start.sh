#!/bin/bash
# SessionStart hook for Claude Code on the web.
# 1. Points bun/node at the sandbox egress proxy's CA so their fetch can
#    reach HTTPS endpoints (without this, bun's fetch resets mid-handshake).
# 2. Pins bun to a version whose fetch traverses the proxy cleanly.
# 3. Installs project dependencies so tests and linters work.
# Runs only in the remote sandbox; a local machine is left untouched.
set -euo pipefail

# Local runs (not Claude Code on the web) need none of this.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# --- 1. Trust the sandbox egress proxy's CA -------------------------------
# The remote proxy re-terminates TLS with a private CA. bun's and Node's
# built-in fetch must be pointed at the bundle or HTTPS calls (e.g. the
# benchmark model requests) reset after the CONNECT tunnel opens.
CA="/root/.ccr/ca-bundle.crt"
if [ -f "$CA" ]; then
  export NODE_EXTRA_CA_CERTS="$CA"
  export SSL_CERT_FILE="$CA"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export NODE_EXTRA_CA_CERTS=$CA" >> "$CLAUDE_ENV_FILE"
    echo "export SSL_CERT_FILE=$CA" >> "$CLAUDE_ENV_FILE"
  fi
fi

# --- 2. Pin bun -----------------------------------------------------------
# Reinstall only when the running bun differs from the pin, so a warm
# container skips the download.
WANT_BUN="1.3.11"
HAVE_BUN="$(bun --version 2>/dev/null || echo none)"
if [ "$HAVE_BUN" != "$WANT_BUN" ]; then
  curl -fsSL https://bun.sh/install | bash -s "bun-v$WANT_BUN"
fi
export PATH="$HOME/.bun/bin:$PATH"

# --- 3. Install dependencies ---------------------------------------------
# `bun install` (not `ci`) so a cached container reuses node_modules.
cd "$CLAUDE_PROJECT_DIR/src"
bun install
