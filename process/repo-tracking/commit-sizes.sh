#!/usr/bin/env bash
#
# Run this to refresh repo-size tracking.
#   1. Writes temp/commit-sizes.csv — per-commit byte sizes of the git-tracked
#      files under process/ (formerly ops/), spec/, src/, plus the tracked TOTAL.
#   2. Invokes _chart.py to render temp/commit-sizes.png.
# Both outputs land in temp/ and are gitignored — disposable artifacts,
# fully regenerable from git history by re-running this script.
#
set -euo pipefail

cd "$(dirname "$0")"
OUT="../../temp/commit-sizes.csv"

echo "date,commit,process,spec,src,total,message" > "$OUT"

git -C ../.. log --reverse --format=%H |
while read -r c; do
  date=$(git -C ../.. show -s --format=%cs "$c")
  short=$(git -C ../.. rev-parse --short "$c")
  msg=$(git -C ../.. show -s --format=%s "$c" | sed 's/"/""/g')

  # Sum blob sizes per top-level dir. git ls-tree -l puts "mode type sha size"
  # before a TAB and the path after it, so -F'\t' keeps paths-with-spaces intact.
  sizes=$(git -C ../.. ls-tree -r -l "$c" | awk -F'\t' '
    { split($1, m, " "); size = m[4]; path = $2
      total += size
      # Fold the old ops/ name into process/ so the history stays continuous.
      if      (path ~ /^(process|ops)\//) process += size
      else if (path ~ /^spec\//)          spec    += size
      else if (path ~ /^src\//)           src     += size
    }
    END { printf "%d,%d,%d,%d", process + 0, spec + 0, src + 0, total + 0 }
  ')

  echo "$date,$short,$sizes,\"$msg\"" >> "$OUT"
done

echo "Saved $OUT"

# Render the chart. _chart.py is a helper — invoked here, not run by hand.
uv run _chart.py
