#!/usr/bin/env bash
# Assemble the GitHub Pages site under $OUT_DIR for the address prefix $SITE_BASE.
#
# The prefix is the single knob that distinguishes prod from a PR preview:
#   prod      SITE_BASE=/                       → served at the domain root
#   preview   SITE_BASE=/pr-preview/pr-<N>/     → served at that subdir
# The site is published to the custom domain (www.tamedtable.com), which serves
# the repo at the root — hence "/" rather than "/TamedTable/". A preview lives at
# a different URL, so its baked-in asset links must carry the matching prefix or
# they 404. Run from anywhere after `bun install` in src/.
#
# Layout produced (mirrors the live site):
#   $OUT/            ← marketing/web/ (homepage, root; symlinks dereferenced)
#   $OUT/app/        ← vite build of src/packages/web (base $SITE_BASE + app/)
#   $OUT/demos/<n>/  ← per-package demo bundles (public-path $SITE_BASE + demos/<n>/)
set -euo pipefail

# Normalise to exactly one trailing slash so the concatenations below are clean.
BASE="${SITE_BASE:-/}"
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

# Privacy page: single-sourced from spec/legal/privacy.md, rendered into the
# page chrome (privacy.template.html) so the policy is edited in one place.
bun .github/scripts/render-md.ts spec/legal/privacy.md marketing/web/privacy.template.html "$OUT/privacy.html"
rm -f "$OUT/privacy.template.html"  # the template is a build input, not a page

# Standalone module demos under /demos/<name>/.
for name in chat-panel file-io gherkin-tour model-config table-view toolbar ui-kit voice-input; do
  ( cd src && bun build "packages/$name/demo.html" \
      --outdir "$OUT/demos/$name" \
      --public-path="${BASE}demos/$name/" )
done

# Retarget the marketing pages' absolute links (Open Web App, og:url, canonical,
# feature demos) onto the current prefix. The source writes them against the
# prod root (https://www.tamedtable.com/); prod (BASE=/) leaves them unchanged,
# a preview (BASE=/pr-preview/pr-<N>/) re-roots them to
# .../pr-preview/pr-<N>/app/ etc. Anchored on the full origin so
# github.com/.../TamedTable repo links are untouched.
if [ "$BASE" != "/" ]; then
  mapfile -t html < <(grep -rl 'https://www.tamedtable.com/' "$OUT" --include='*.html' || true)
  for f in "${html[@]}"; do
    [ -n "$f" ] || continue
    sed -i "s#https://www.tamedtable.com/#https://www.tamedtable.com${BASE}#g" "$f"
  done
fi

# #SeoIndexing — search-engine directives. A preview and prod share one indexable domain
# (www.tamedtable.com), so the two cases are opposites: prod publishes the
# canonical URL set, a preview asks to be left out of the index entirely.
if [ "$BASE" = "/" ]; then
  # sitemap.xml lists only the three crawlable content pages, in their canonical
  # extensionless form — the same URLs the pages' <link rel="canonical"> and
  # every internal link use. /app/ and /demos/ are omitted on purpose: they are
  # client-side bundles whose markup carries no content to index.
  # No <lastmod>: the deploy checkout is shallow, so any date we could compute
  # here would be the build date rather than the page's, and a lastmod that
  # changes on every unrelated deploy is worse than none.
  {
    echo '<?xml version="1.0" encoding="UTF-8"?>'
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    for path in '' 'FAQ' 'privacy'; do
      echo "  <url><loc>https://www.tamedtable.com/${path}</loc></url>"
    done
    echo '</urlset>'
  } > "$OUT/sitemap.xml"

  # robots.txt allows everything and points at the sitemap. Note it deliberately
  # does NOT `Disallow: /pr-preview/`: a disallowed path is never fetched, so
  # Google would never read the previews' noindex tag and could still index a
  # preview URL it found elsewhere. Crawlable + noindex is what actually keeps
  # them out of the index.
  {
    echo 'User-agent: *'
    echo 'Allow: /'
    echo ''
    echo 'Sitemap: https://www.tamedtable.com/sitemap.xml'
  } > "$OUT/robots.txt"
else
  # PR previews are served from the live domain, so without this they compete
  # with prod for the same queries as duplicate content. Tag every page in the
  # preview, app and demo bundles included.
  # Two page shapes to cover: the marketing/app pages open an explicit <head>,
  # while marketing/illustrations/gallery.html relies on HTML5's implicit one
  # and starts straight at <!doctype html>. Insert after whichever comes first;
  # a meta placed there lands in the head either way.
  mapfile -t previews < <(find "$OUT" -name '*.html')
  for f in "${previews[@]}"; do
    if grep -qi '<head>' "$f"; then
      sed -i '0,/<[hH][eE][aA][dD]>/s##&\n<meta name="robots" content="noindex, nofollow">#' "$f"
    elif grep -qi '<!doctype html>' "$f"; then
      sed -i '0,/<![dD][oO][cC][tT][yY][pP][eE] [hH][tT][mM][lL]>/s##&\n<meta name="robots" content="noindex, nofollow">#' "$f"
    else
      echo "no <head> or doctype in $f, cannot mark it noindex" >&2
      exit 1
    fi
  done
fi
