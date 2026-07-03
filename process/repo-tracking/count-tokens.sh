#!/bin/bash
# Tokens per dir (// and /* */ comments excluded). Usage: ./count-tokens-dirs.sh [dir...]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

FILES=$(git ls-files "${@:-src}" | grep -E '\.(tsx?|jsx?|mjs|cjs|html|css|json|md|ya?ml|feature|sh)$')

strip() { perl -0777 -pe 's{("(?:\\.|[^"])*"|'"'"'(?:\\.|[^'"'"'])*'"'"'|`(?:\\.|[^`])*`)|//[^\n]*|/\*.*?\*/}{$1 // ""}ges'; }
count() { strip | rg -o '"(\\.|[^"])*"|'"'"'(\\.|[^'"'"'])*'"'"'|\w+|[^\s]' | wc -l; }

TOTAL=0
for dir in $(echo "$FILES" | xargs -n1 dirname | sort -u); do
  N=$(echo "$FILES" | awk -v d="$dir/" 'index($0,d)==1 && substr($0,length(d)+1) !~ "/"' | tr '\n' '\0' | xargs -0 cat | count)
  printf '%10d  %s\n' "$N" "$dir"
  TOTAL=$((TOTAL + N))
done
printf '%10d  TOTAL\n' "$TOTAL"