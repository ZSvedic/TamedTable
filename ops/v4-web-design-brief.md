# TamedTable — Web UI design brief

A single, complete brief for **Claude Design**. Design the screens,
components, states, and a design system for the web interface of
TamedTable from this document alone.

This is deliberately a **design-only** brief — no code, no APIs, no data
formats, no library names. Everything here is about what the user sees and
how it should feel.

---

## 1. What TamedTable is

TamedTable lets people transform data tables by typing plain-English
requests. You load a spreadsheet, type something like *"normalize the
phone numbers"* or *"sort by date, newest first, keep the top 20"*, and the
table updates. It is a working tool for cleaning and reshaping data —
filtering rows, splitting columns, removing duplicates, grouping,
sorting.

## 2. Who uses it, and how it should feel

The users are developers and data-minded professionals. They work in
long, focused sessions and care about three things: **speed, density, and
legibility**. They are scanning hundreds of rows, not admiring the
interface.

The product should feel like a **precise, calm, professional instrument** —
in the family of a good database client (TablePlus, DataGrip), a code
editor, or Linear. It should feel fast, quiet, and dense with information
that is easy to read.

**Explicitly avoid:** parallax scrolling, 3D elements, video backgrounds,
hero sections, large decorative imagery, gradients-as-decoration, and
showy animation. There is no landing page and no marketing surface here —
only the working tool. Motion is allowed *only* where it communicates
something real: a cell filling in with its new value, a new row
appearing. Every element must earn its place.

## 3. The screen

There is one main working screen: a two-pane layout beneath a thin top
bar.

```
┌─────────────────────────────────────────────────────────────┐
│  TamedTable        Open · Save · Undo · Redo · Settings      │  top bar
├──────────────────┬──────────────────────────────────────────┤
│                  │                                          │
│   Chat sidebar   │             Table view                   │
│   (requests +    │   (the data — the dominant pane)         │
│    responses)    │                                          │
│                  │                                          │
│  ────────────    │                                          │
│  [ type here ]   │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

- **Top bar** — full width, slim. Product name on the left; on the right,
  the actions: Open, Save, Undo, Redo, Settings. Nothing decorative.
- **Chat sidebar** — left, the narrower pane (roughly one-third width),
  with a draggable divider so the user can resize it.
- **Table view** — right, the dominant pane. This is where attention
  lives.

## 4. Components in detail

### 4.1 Top bar

A single slim row. Left: the product name (small, confident, not a logo
treatment). Right, a compact row of actions:

- **Open** — opens a file picker to load a spreadsheet.
- **Save** — opens a save dialog to write the current table to a file.
- **Undo** / **Redo** — revert or reapply the last request. Visibly
  disabled when there is nothing to undo or redo.
- **Settings** — opens the settings panel (§4.5).

### 4.2 Chat sidebar

A vertical, scrolling conversation with an input pinned to the bottom.

- **Each user request** appears as a message — the plain-English text the
  user typed.
- **Each completed request** shows a short, plain-language result line
  beneath it — e.g. *"Normalized 20 phone numbers"*, *"Sorted by Score;
  kept the top 10 rows"*.
- **Per-request technical detail** — under each completed request, a
  collapsible, dim, small-type strip ("details"). Collapsed by default.
  Expanded, it shows the under-the-hood specifics and timing for users who
  want them. It must never compete with the result line for attention.
- **While a request is running** — an inline, calm progress indicator: a
  few sample changes streaming past (e.g. *"row 3 · Phone · 555-1234 →
  +15551234"*), or a simple progress line. Quiet, not a spinner-heavy
  spectacle.
- **The input** — a multi-line-capable text field pinned to the bottom,
  with a send affordance. The placeholder suggests real examples
  (*"normalize phone numbers" · "drop duplicate emails" · "sort by date,
  newest first"*). While a request runs, the send control becomes a
  **Stop** control to cancel it.

### 4.3 Table view

The data, and the heart of the screen.

- **Column headers** — sticky along the top. Each shows the column name.
  Headers can be **resized** (drag the edge) and **reordered** (drag the
  header itself). Show a clear drag affordance and a drop indicator.
- **Rows and cells** — compact rows; a cell is **editable inline** when
  clicked. The selected cell or row is clearly but quietly highlighted.
- **Scrolling** — both axes scroll; headers stay pinned. When rows or
  columns extend beyond the view, show an unobtrusive marker that more
  exist (e.g. a count: *"…12 more rows"*).
- **Empty / blank cells** — render distinctly (a faint dash or a muted
  treatment) so a missing value is never confused with an empty string.
- **Live updates** — while an AI transformation is filling a column, its
  cells update in place; each cell briefly highlights as its new value
  arrives, then settles to normal. This is the one place lively motion
  belongs.
- **Row/column count** — show the table's size somewhere unobtrusive
  (e.g. *"20 rows × 6 columns"*).

### 4.4 Toasts and confirmations

- **Errors** appear as a **toast** — a plain-language, non-blocking,
  dismissible message (e.g. *"Couldn't apply that change — try rephrasing
  it."*). The table stays as it was.
- **Successes** are quiet — a brief confirmation (e.g. *"Saved"*), not a
  celebratory moment.

### 4.5 Settings panel

A small panel or side sheet. It holds the **API key** field (entered like a
password, with show/hide) and any model options. Include a short line
explaining the key is required to make requests. Treat it as
session-scoped — this panel belongs to the current browser tab.

### 4.6 File dialogs

Opening and saving use native-feeling file dialogs. The empty state
(§5) also supports **drag-and-drop** of a file onto the table area.

## 5. States to design

Design the main screen in each of these states:

1. **Empty** — no file loaded. The table area shows a clear, friendly
   call to action: an Open button plus a drag-and-drop target. The chat
   input is present but visibly waiting on a file.
2. **Loaded, idle** — table populated, ready for a request. The default
   working state.
3. **Request running** — the chat shows streaming progress, the input's
   send control has become Stop, and table cells are updating live.
4. **Error** — a toast is visible; the table is unchanged underneath.
5. **Saving / saved** — a brief, quiet confirmation.

## 6. Design system to produce

Deliver a coherent set of tokens, in **both light and dark themes** (dark
matters to this audience):

- **Color** — a neutral base (a considered gray ramp), **one** accent for
  primary actions, focus rings, and links, and semantic colors for success
  and error. The data area must stay highly legible in both themes; avoid
  low-contrast text on data.
- **Typography** — a clean UI sans for the chrome (top bar, chat,
  buttons); for table data, use tabular/aligned figures so numeric columns
  line up — a monospace or a sans with tabular numerals. A clear,
  restrained type scale.
- **Spacing** — a tight, consistent scale. Rows should be compact enough
  to see many at once without feeling cramped; this is a dense tool, so
  err toward compact.
- **Lines and surfaces** — subtle dividers; the table needs just enough
  cell separation to scan quickly without heavy gridlines. Modest corner
  radii. Few, soft shadows — only to lift panels and toasts.

## 7. Responsive behavior

Desktop-first — this is a workstation tool. It should degrade gracefully
on a narrow window: the chat sidebar collapses to a toggle so the table
gets the full width. It does not need a mobile/touch-first layout.

## 8. What to deliver

- The main screen in each of the five states in §5.
- The component set: top bar, chat message, chat result line, the
  collapsible detail strip, chat input (send and stop variants), table
  (header cell, data cell, edit state, blank cell), truncation markers,
  toast, settings panel, empty-state call to action.
- The design tokens from §6, in light and dark.

Keep it cohesive, calm, and fast-feeling — a tool a professional would be
happy to stare at all day.
