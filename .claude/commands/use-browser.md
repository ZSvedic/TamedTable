---
description: Set up headless browsing in this environment using the pre-installed container Chromium (Playwright CDN is blocked), then render a JS page to prove it works.
---

Render JavaScript-driven pages that `WebFetch` can't see (it fetches static HTML and never runs JS). This environment blocks the Playwright browser CDN, so **do not** run `playwright install` — point Playwright at the Chromium binary already baked into the image.

## Why the obvious recipe fails here

Three gotchas, all handled by the steps below — read them so you don't rediscover them mid-task:

1. **CDN blocked.** `cdn.playwright.dev` returns 403, so `playwright install [--with-deps] chromium` downloads nothing (and `--with-deps` exits 100 on blocked apt PPAs). The browser is already at `$PLAYWRIGHT_BROWSERS_PATH` (default `/opt/pw-browsers`) — use it via `executablePath`.
2. **Version skew.** The latest `playwright` npm package expects a newer Chromium build than the image ships, so its default launch path 404s. Passing an explicit `executablePath` sidesteps the version check entirely — any package version works.
3. **Proxy cert.** All egress goes through a TLS-intercepting proxy whose CA Chromium doesn't trust (curl trusts it via the system bundle; Chromium uses its own). Launch with `--ignore-certificate-errors` **and** context `ignoreHTTPSErrors: true`.

## Setup

Keep the driver outside the repo so you never dirty `src/package.json` or `bun.lock`. Run:

```bash
PW_DIR=/tmp/pw-driver
mkdir -p "$PW_DIR" && cd "$PW_DIR"
[ -d node_modules/playwright ] || { echo '{"name":"pw-driver","private":true}' > package.json; bun add playwright; }

# Discover the Chromium binary (build number varies across images — never hardcode it)
export PW_CHROME=$(ls -d "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"/chromium-*/chrome-linux/chrome 2>/dev/null | sort -V | tail -1)
echo "Using Chromium: $PW_CHROME"

cat > "$PW_DIR/render.mjs" <<'EOF'
import { chromium } from 'playwright';
const [url, selector] = process.argv.slice(2);
const b = await chromium.launch({
  executablePath: process.env.PW_CHROME,
  args: ['--no-sandbox', '--ignore-certificate-errors'],
});
const ctx = await b.newContext({ ignoreHTTPSErrors: true });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT, fullPage: true });
if (selector) {
  const v = await p.$eval(selector, el => el.value ?? el.innerText ?? el.textContent);
  console.log(v);
} else {
  console.log(await p.content());
}
await b.close();
EOF
```

Setup is ~1–9s (just the npm package; the browser is already present). If `$PW_CHROME` comes back empty, the image has no pre-installed browser — stop and tell the user, since the CDN download is blocked.

## Usage

Run the helper from `$PW_DIR` (so `playwright` resolves) with `PW_CHROME` exported:

```bash
cd /tmp/pw-driver

# Full rendered HTML after JS runs:
PW_CHROME="$PW_CHROME" node render.mjs "<url>"

# Just one element's text/value (textarea, div, etc.):
PW_CHROME="$PW_CHROME" node render.mjs "<url>" "<css-selector>"

# Also capture a full-page screenshot:
SHOT=/tmp/page.png PW_CHROME="$PW_CHROME" node render.mjs "<url>"
```

Use `SendUserFile` to surface any screenshot you capture.

## Verify

Prove it works before reporting ready — load this repo's own JS-rendered demo and read the editor textarea, which `WebFetch` cannot see:

```bash
cd /tmp/pw-driver
PW_CHROME="$PW_CHROME" node render.mjs "https://zsvedic.github.io/TamedTable/demos/gherkin-tour/demo.html" "#src"
```

Expect the sample feature text including `query "keep rows where age >= 18"`. Then report: Chromium path used, setup time, and that headless rendering is ready.
