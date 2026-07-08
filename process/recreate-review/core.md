# core — keep the original boundary

Compares `src/packages/core` here (5.5 KB) with the recreate's (23 KB). The
size gap is one decision: the recreate moved the transformation engine and the
DuckDB SQL engine out of headless and into core.

## Analysis

`spec/code-contract.md` says core owns byte reading (`node:fs`) only, and puts
the engine in headless. The recreate broke that rule. The move had a good
motive — the engine as its own file is easier to read and unit-test — but the
right home for those files is inside headless, not core. That refactor is
planned in [headless.md](headless.md).

The rest is cosmetic: `loadFile` renamed to `loadTable`, a few extra re-exports.
No behavior differences found in the code both cores share.

## Questions for you

None.

## Plan

Nothing to do in this package. The file split the recreate hinted at happens
inside headless — see [headless.md](headless.md).
