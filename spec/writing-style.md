# Writing style

Conventions for every markdown file in this repo — specs, READMEs, ops docs, prompts. Modeled on the PonyPen spec dir and the in-project [rationale.md](rationale.md).

## Write like you speak
- Active voice. *"The runner replays transformations,"* not *"transformations are replayed by the runner."*
- Short concrete words. *"While a request is running"* beats *"in flight."* *"Half-succeeds"* beats *"resolves with partial application."* *"Cancel a running request"* beats *"the only legal concurrent operation is the surface-specific cancel signal."*
- Direct subject-verb-object. Skip noun stacks like *"the surface-agnostic facade step definitions drive."*
- Cut metaphors that don't earn their keep. No *"in flight,"* *"resolves cleanly,"* *"side channel,"* *"facade,"* *"surface,"* *"primitive,"* *"emits,"* unless the precise meaning matters and a plain word can't carry it.
- Read each paragraph out loud. If it sounds like a press release or a CEO email, rewrite it.

## Picture before details
- Open every section with the simple sentence a reader needs to follow the rest. Component lists, method-by-method writeups, and feature tables come *after* the picture, not before.
- A section that dives straight into bullet item #1 or method #1 is missing its first sentence.

## Lists are lists, prose is prose
- If items are parallel and don't flow into each other, write a list. *"At three points: X, Y, Z"* and *"The harness has five parts. **A** does P. **B** does Q. ..."* are masked lists — turn them into bullets.
- A numbered list is the right call when order matters (sequence of steps, exit-code precedence). Bullets when order doesn't.
- Prose carries genuine narrative — cause and effect, state changes, the why behind a choice — not parallel-item enumeration.

## Code over prose when it's shorter
- Pseudocode is welcome when a sequence is shorter and clearer in code than in English. *"The runner applies the patch, validates, re-runs the transformations, and commits"* reads cleaner as four labeled lines (or a numbered list).
- Drop types, drop boilerplate, drop syntax that doesn't carry meaning. Keep just what conveys the idea. Self-explanatory beats syntactically valid.
- ASCII diagrams welcome when they earn their keep — lifecycle, data flow, state.

## Structure
- Each doc opens with two sentences — what this thing owns, what it explicitly does not own.
- The second section is always a worked example, so readers see concrete usage before details. For surfaces with multiple modes (REPL + batch, factory + process entry), show one example per mode.
- Section headers follow the natural shape of the thing (Lifecycle, Methods, Format), not a fixed template. No "Scope" / "Out of scope" headers if the opener already does that work.

## Voice
- Declarative present tense: *"The CLI uses ASCII output."* Not *"shall use,"* not *"this document specifies."*
- Errors and edge cases live inline at the section they apply to, not in a per-doc "Errors" heading.

## Size
- 40–80 lines per doc. The cap is information density.

## Test before publishing
- Would a reader who hasn't seen the other docs understand what *this* doc is for from the first paragraph?
- Does each section's first sentence tell me what I'm about to read about?
- Would you say it out loud to a colleague without sounding like a vendor pitch?
- Is each list a real list, and each block of prose a real story?
- Could a pseudocode block say the same thing in fewer characters than the paragraph?
