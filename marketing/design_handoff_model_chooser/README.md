# Handoff: Model Chooser (settings panel)

## Overview
Redesign of TamedTable's provider/model configuration UI. The panel lets a user connect one or more AI providers by pasting an API key (or signing in to Puter.js), shows each connected provider's fixed primary/secondary models with measured cost and latency, and marks one provider as the default used for classification runs.

Key change from the previous chooser: the user no longer picks a provider from a static list before doing anything. They paste a key; the provider, its tier (Free/Paid) and its default models are detected from it. Free vs paid is a property of the key, not a separate choice — the same model (e.g. Gemini) may arrive via Google, OpenRouter or Puter.js, each as its own connected provider card.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing intended look and behavior, not production code to copy. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, etc.) using its established components, styling approach and state patterns. If no environment exists yet, choose the framework appropriate for the project and implement there. Provider detection, key validation, live pricing and latency measurement must be wired to real APIs; the prototype fakes all of them.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii and interaction states below are exact and should be reproduced faithfully, adapted to the app's existing design tokens where equivalents exist.

## Screens / Views

### Model chooser panel
**Purpose:** connect providers, see what each one will cost, choose the default.

**Layout**
- Panel card: width **400px** (designed for the right-hand settings column), `background #fff`, `border 1px solid #e3e6ea`, `border-radius 14px`, `padding 18px`, `box-shadow 0 1px 2px rgba(16,24,40,.05)`.
- Vertical flex, `gap 18px`, in this order: connected-provider list (or empty state) → "Already have an API key?" block → OR divider → "No API key?" block.
- Every group uses flex + `gap`; no margin-based spacing.

**1. Empty state** (shown when no provider is connected)
- Row: `padding 14px`, `border 1px dashed #d5d9de`, `border-radius 11px`, `background #fbfbfc`, flex row `gap 10px`, centered.
- Dot: 7×7px circle, `#b6bcc5`.
- Text: "No provider or model added." — 14px, weight 600, `#4a5260`.

**2. Connected provider cards** (list, `gap 8px`)
- Card: `border 1px solid #e8eaee`, `border-radius 11px`, `overflow hidden`, `background #fff`. Selected card: border `#1a73e8` (accent), background `#fbfcfe`.
- Header row (whole row is the click target, `cursor pointer`): `padding 11px 12px`, flex, `gap 9px`, `align-items center`.
  - Radio: 16×16px circle, `border 2px solid #c8cdd4` (selected: accent); inner dot 8×8px accent when selected.
  - Provider name: 14px, weight 650, `nowrap`. Values: "Google API", "OpenAI API", "Anthropic API", "OpenRouter API", "Groq API", "Puter.js".
  - Tags (flex `gap 5px`, takes remaining space): 10px monospace, weight 600, `letter-spacing .04em`, `padding 4px 6px`, `radius 4px`.
    - `FREE` → bg `#e7f6ec`, fg `#1a6b38`
    - `PAID` → bg `#eceef1`, fg `#4a5260`
    - `VOICE` → bg `#eef4fe`, fg `#1a4a8a`
    - Puter.js has no tier tag, only `VOICE`.
  - Delete button: 26×26px, transparent, `border-radius 6px`, trash icon 15×15 (stroke 2, round caps — Feather-style `trash-2`), color `#c0392f`. Hover: bg `#fbeceb`, color `#a3312b`, border `1px solid #eccfcd`. Click must `stopPropagation` so it doesn't also select the card.
- Expanded body — **only on the selected card**: `padding 0 12px 12px 37px` (left inset aligns under the provider name), flex column `gap 10px`. Two model blocks, each:
  - Line 1: label (12px, weight 650, fixed width **68px**, `nowrap`; "Primary" `#4a5260`, "Secondary" `#6b7280`) + model name (13px monospace, `flex: 1; min-width: 0`, ellipsis).
  - Line 2: cost/latency, 12px `#6b7280`, `padding-left 76px` so it aligns with the model name. Format: **`$0.0 / 9.4sec for 1000 tokens`**.

**3. "Already have an API key?" block** (flex column, `gap 9px`)
- Title: 14px weight 650 — "Already have an API key?"
- Subtitle on its own row: 13px `#5b6169`, `line-height 1.5` — "Paste it below, we do the rest."
- Input + button row, `gap 8px`:
  - Input: `flex 1`, 13px monospace, `padding 10px 11px`, `border 1px solid #d5d9de`, `radius 8px`, bg `#fbfbfc`; placeholder `AIza… / sk-proj-… / sk-ant-…`.
  - Add button: 13px weight 600, `padding 10px 18px`, `radius 8px`. Empty input → bg `#eceef1`, fg `#9aa1aa`, border `#e3e6ea`, `cursor default`. Non-empty → bg + border accent `#1a73e8`, fg `#fff`, `cursor pointer`.
- Subtitle row also carries the help link, baseline-aligned, `gap 8px`, wrapping allowed: 13px weight 600 accent — "How to get ↗" → `https://www.tamedtable.com/FAQ#byok`.
- Footer: supported providers, 12px `#6b7280` — "Google / OpenAI / Anthropic / OpenRouter / Groq".
- Error banner (conditional): `padding 10px 11px`, `radius 8px`, bg `#fbeceb`; 6×6 dot `#a3312b`; text 12px weight 600 `#8a2b26`, `line-height 1.45`.

**4. OR divider**
- Flex row `gap 12px`: 1px `#eceef1` rule, label "OR" (10px monospace, weight 600, `letter-spacing .1em`, `#9aa1aa`), 1px rule.

**5. "No API key?" block**
- Title 14px weight 650 — "No API key?"; subtitle row 13px `#5b6169` — "$25 in API credits on Puter.js sign up."
- Button, full width, centered, `gap 9px`, 13px weight 600, `padding 11px 14px`, `radius 9px`.
  - Not connected: bg `#fff`, border `1px solid #d5d9de`, fg `#1c1f23`, icon tile `#1f2a44`, label "Sign in / Sign up to Puter.js".
  - Connected: bg `#e7f6ec`, border `#bfe3cb`, fg `#1a6b38`, icon tile `#1a6b38`, label "Connected to Puter.js", `cursor default`.
  - Icon tile: 17×17px, `radius 5px` — replace with the real Puter logo.

## Interactions & Behavior
- **Add key.** On Add (or Enter — recommended, not in the prototype), trim the key and match a provider by prefix. On success: create a connected-provider card, set it as the selected default, clear the input, clear any error. In production this is also where the key is validated against the provider, the default model pair resolved, a test call issued, and cost/latency computed from the response.
- **Prefix → provider** (order matters; `sk-proj-` and `sk-ant-` must be tested before the generic `sk-`):
  `sk-proj-` → OpenAI (Paid) · `sk-ant-` → Anthropic (Paid) · `sk-or-` → OpenRouter (Free) · `gsk_` → Groq (Free) · `AIza` → Google (Free) · `sk-` → OpenAI (Paid).
  Tier in the prototype is a static property per provider; in production read it from the provider's API.
- **Unrecognised key:** inline error, input cleared — "Key not recognised. Supported prefixes: AIza…, sk-proj-…, sk-ant-…, sk-or-…, gsk_…".
- **Duplicate provider:** inline error — "<Provider> is already connected." (Consider replace-key-in-place instead.)
- **Typing** in the input clears the error.
- **Select default:** clicking any card header selects it; the previously selected card collapses. Only the selected card shows its model rows.
- **Delete:** removes the card; if it was the default, the default falls back to the last remaining card, or to none (empty state returns).
- **Puter.js:** the button adds Puter.js as an ordinary provider card and makes it the default; the button then switches to its connected state and is inert.
- No transitions are specified. If the codebase animates disclosure, a 120–160ms height/opacity ease-out on the expanded body is appropriate.
- Long model names truncate with ellipsis; tags, provider names and cost lines never wrap.

## State Management
- `connected: Provider[]` — ordered by time added.
- `selectedId: string` — the default provider; `''` when none.
- `keyInput: string`, `error: string`.
- `Provider`: `{ id, name, tier: 'Free'|'Paid'|'', voice: boolean, primaryModel, secondaryModel, primaryCost, primaryLatencySec, secondaryCost, secondaryLatencySec }`.
- Transitions: addKey → append + select + clear input; addPuter → append + select; remove(id) → filter + reselect fallback; select(id) → set default.
- Production data needs: key validation call per provider, model defaults per provider, price table, measured latency and cost from the test call. Keys are stored locally (as today) — never sent anywhere but the provider.

## Design Tokens
Colors
- Accent / selected / links: `#1a73e8` (hover `#1558b8`)
- Text primary `#1c1f23`, secondary `#5b6169`, tertiary `#6b7280`, label `#4a5260`, muted `#9aa1aa`
- Borders: `#e3e6ea` (card), `#e8eaee` (row), `#d5d9de` (input/dashed), `#c8cdd4` (radio idle), `#eceef1` (divider/disabled)
- Surfaces: `#fff`, `#fbfbfc` (input/empty), `#fbfcfe` (selected card), page `#f4f5f7`
- Success/free: bg `#e7f6ec`, fg `#1a6b38`, border `#bfe3cb`
- Info/voice: bg `#eef4fe`, fg `#1a4a8a`
- Danger: fg `#c0392f` / `#a3312b` / `#8a2b26`, bg `#fbeceb`, border `#eccfcd`

Typography — system UI stack for text, `ui-monospace, Menlo, monospace` for keys, model names and tags.
- Section title 14px/650 · body 13px/400 (`line-height 1.5`) · meta 12px · tag 10px monospace 600 `letter-spacing .04em` · divider label 10px monospace 600 `letter-spacing .1em` · model name 13px monospace · card title 14px/650

Spacing: 2, 3, 5, 8, 9, 10, 11, 12, 14, 18 px. Panel gap 18, list gap 8, control gap 9.
Radius: 4 (tag), 6 (icon button), 8 (input/button), 9 (Puter button), 11 (card/empty), 14 (panel).
Shadow: `0 1px 2px rgba(16,24,40,.05)`.
Fixed widths: panel 400, model label column 68 (+76 left pad for the cost line), radio 16, delete button 26.

## Assets
- Trash icon: inline SVG, Feather-style `trash-2`, 15×15, `stroke-width 2`, round caps — substitute the codebase's icon set.
- Puter.js logo: **not included.** The prototype uses a 17×17 rounded solid tile as a placeholder; supply the real mark.
- No images or fonts are bundled; the design uses system fonts only.

## Files
- `Model Chooser Redesign.dc.html` — the prototype. Open directly in a browser; it is interactive (paste a key with any supported prefix and press Add).
- `support.js` — runtime required by the prototype file. Not part of the design; do not port it.
- `screenshots/` — rendered panel states: `01-empty-state`, `02-key-typed-add-enabled`, `03-one-provider-google-added`, `04-two-providers-openai-default`, `05-puter-connected-default`, `06-error-unrecognised-key`.

## Notes / open items
- All model names, prices and latencies in the prototype are **placeholders** (`gpt-5.5`, `gemini-3.6-flash`, `$0.005 / 7.1sec`). Replace with the real default pairs and live measurements.
- The `VOICE` tag is currently hardcoded for Google and Puter.js; drive it from real provider capability.
- Not designed yet, worth adding: rate-limit/quota-exhausted state for free keys, invalid-key-rejected-by-provider state (as opposed to bad prefix), and a loading state while the test call runs.
