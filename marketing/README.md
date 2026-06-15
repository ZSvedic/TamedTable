# Marketing

The marketing source of truth for TamedTable. This dir owns outward-facing copy — positioning, taglines, feature claims, website text; it does not own the product spec (that lives in [spec/](../spec/)) or the brand visuals (those live in [design/brand/](../design/brand/)).

Read the docs in order — each one feeds the next, so a claim is written once and reused:

1. [positioning.md](positioning.md) — who it's for, the problem, the one-line value prop, what makes it different. The source every other doc pulls from.
2. [taglines.md](taglines.md) — the primary tagline and approved alternates, all derived from the value prop.
3. [features.md](features.md) — the top features, each tied to the benefit a reader cares about.
4. [website.md](website.md) — landing-page copy, assembled from the three docs above.

## Rules

- A claim lives in exactly one place. The other docs link to it rather than restating it — same rule as the rest of the repo.
- Keep facts true to the product. If marketing wants to say something the product doesn't do yet, fix the product or cut the claim — don't ship the gap.
- Visual style (colors, wordmark, logo) is set by [design/brand/brand.md](../design/brand/brand.md). This dir writes words, not pixels.
- Markdown follows [spec/writing-style.md](../spec/writing-style.md).
