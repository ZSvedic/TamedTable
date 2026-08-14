# Writing style

Conventions for every markdown file in this repo: specs, READMEs, ops docs, prompts. Modeled on the PonyPen spec dir and the in-project [rationale.md](rationale.md).

## Write like you speak
- Active voice. *"The runner replays transformations,"* not *"transformations are replayed by the runner."*
- Short concrete words. *"While a request is running"* beats *"in flight."* *"Half-succeeds"* beats *"resolves with partial application."* *"Cancel a running request"* beats *"the only legal concurrent operation is the surface-specific cancel signal."*
- Direct subject-verb-object. Skip noun stacks like *"the surface-agnostic facade step definitions drive."*
- Cut metaphors that don't earn their keep. No *"in flight,"* *"resolves cleanly,"* *"side channel,"* *"facade,"* *"surface,"* *"primitive,"* *"emits,"* unless the precise meaning matters and a plain word can't carry it.
- Read each paragraph out loud. If it sounds like a press release or a CEO email, rewrite it.

## Four things that make writing read as machine-written

Readers now spot generated prose by its habits, and these four are the ones
they spot first. They apply to everything we ship (UI copy, marketing, docs) at
least as hard as to specs, and to code comments too. They bind what you write
from now on; `process/journal/` and the frozen design handoff keep their
originals, because those are records of what was said at the time.

1. **No em dashes.** Every one of them is a colon, a comma, a full stop or a
   pair of brackets wearing a costume. Pick the one you meant. If you cannot
   tell which, the sentence is doing too much: split it.
2. **No negative parallelism.** *"It's not a spreadsheet, it's a conversation"*,
   *"not just fast, but accurate"*, *"no setup, no server, just a key"*. The
   shape sells rather than says. Write the positive half and stop: *"It's a
   conversation."* A plain contrast (*"the cell model runs on every row, the
   chat model runs once"*) is not this, and is fine.
3. **No inflated vocabulary.** No *delve*, *tapestry*, *realm*, *landscape*,
   *testament to*, *leverage*, *seamless*, *robust*, *pivotal*, *cutting-edge*,
   *game-changer*, *harness* (the verb), *unlock*, *empower*, *elevate*,
   *crucial*, *vital*, *myriad*. Every one has a shorter word that says more:
   *use* for *leverage*, *important* for *crucial*, *area* for *landscape*.
4. **No filler transitions or throat-clearing.** No *"it's worth noting"*,
   *"it's important to note"*, *"at its core"*, *"in today's fast-paced
   world"*, *"let's dive in"*, *"in conclusion"*. If the note is worth making,
   make it; the words in front of it say nothing.

Two habits we do not police: the rule of three (*"loads, transforms, saves"*
is often just the truth), and starting a sentence with *and* or *but*.

Some em dashes stay, and a sweep must skip them: model-facing text, whose bytes
are hashed into every cassette key (`spec/prompt-app-edit.md`, the thrown
messages in `headless/engine.ts`); recorded data (`cassettes/`, the labelled
CSVs); a lone `—` in a table cell or UI slot, which means *no value*; and the
records above.

## Picture before details
- Open every section with the simple sentence a reader needs to follow the rest. Component lists, method-by-method writeups, and feature tables come *after* the picture, not before.
- A section that dives straight into bullet item #1 or method #1 is missing its first sentence.

## Lists are lists, prose is prose
- If items are parallel and don't flow into each other, write a list. *"At three points: X, Y, Z"* and *"The harness has five parts. **A** does P. **B** does Q. ..."* are masked lists: turn them into bullets.
- A numbered list is the right call when order matters (sequence of steps, exit-code precedence). Bullets when order doesn't.
- Prose carries genuine narrative (cause and effect, state changes, the why behind a choice) not parallel-item enumeration.

## Code over prose when it's shorter
- Pseudocode is welcome when a sequence is shorter and clearer in code than in English. *"The runner applies the patch, validates, re-runs the transformations, and commits"* reads cleaner as four labeled lines (or a numbered list).
- Drop types, drop boilerplate, drop syntax that doesn't carry meaning. Keep just what conveys the idea. Self-explanatory beats syntactically valid.
- ASCII diagrams welcome when they earn their keep: lifecycle, data flow, state.

## Structure
- Each doc opens with two sentences: what this thing owns, what it explicitly does not own.
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
