#!/usr/bin/env bash
# Assemble the GitHub Pages site under $OUT_DIR for the address prefix $SITE_BASE.
#
# The prefix is the single knob that distinguishes prod from a PR preview:
#   prod      SITE_BASE=/TamedTable/                    → served at .../TamedTable/
#   preview   SITE_BASE=/TamedTable/pr-preview/pr-<N>/  → served at that subdir
# A preview lives at a different URL, so its baked-in asset links must carry the
# matching prefix or they 404. Run from anywhere after `bun install` in src/.
#
# Layout produced (mirrors the live site):
#   $OUT/            ← marketing/web/ (homepage, root; symlinks dereferenced)
#   $OUT/app/        ← vite build of src/packages/web (base $SITE_BASE + app/)
#   $OUT/demos/<n>/  ← per-package demo bundles (public-path $SITE_BASE + demos/<n>/)
set -euo pipefail

# Normalise to exactly one trailing slash so the concatenations below are clean.
BASE="${SITE_BASE:-/TamedTable/}"
BASE="${BASE%/}/"
OUT="${OUT_DIR:-_site}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# Resolve OUT to an absolute path for the demo bundler's --outdir (it runs from src/).
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
rm -rf "$OUT"
mkdir -p "$OUT/app"

# Web app — vite bakes $base into every asset URL.
( cd src/packages/web && TAMEDTABLE_WEB_BASE="${BASE}app/" bun run build )

# Marketing homepage at the root, web app under /app/.
cp -rL marketing/web/. "$OUT/"
cp -r src/packages/web/dist/. "$OUT/app/"

# Standalone module demos under /demos/<name>/.
for name in chat-panel file-io gherkin-tour model-config table-view toolbar ui-kit voice-input; do
  ( cd src && bun build "packages/$name/demo.html" \
      --outdir "$OUT/demos/$name" \
      --public-path="${BASE}demos/$name/" )
done

# Retarget the marketing pages' absolute links (Open Web App, og:url, feature
# demos) at the same prefix. For prod (BASE=/TamedTable/) this is a no-op; for a
# preview it rewrites .../TamedTable/app/ → .../TamedTable/pr-preview/pr-<N>/app/.
# Anchored on the full Pages origin so github.com/.../TamedTable links are untouched.
mapfile -t html < <(grep -rl 'https://zsvedic.github.io/TamedTable/' "$OUT" --include='*.html' || true)
for f in "${html[@]}"; do
  [ -n "$f" ] || continue
  sed -i "s#https://zsvedic.github.io/TamedTable/#https://zsvedic.github.io${BASE}#g" "$f"
done
