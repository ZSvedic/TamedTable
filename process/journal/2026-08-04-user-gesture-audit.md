# User-gesture audit — 2026-08-04

Triggered by [#278](https://github.com/ZSvedic/TamedTable/issues/278): "Save as
Python" never opened a file dialog. The model call that writes the script
outlives the click that started it, and Chrome then refuses the picker —
`Failed to execute 'showSaveFilePicker' on 'Window': Must be handling a user
gesture to show a file picker.` The reporter hit it five times in a row.

The fix for that one save shipped in [#280](https://github.com/ZSvedic/TamedTable/pull/280).
This is the sweep that followed: **where else does the app call a
gesture-gated browser API after work that takes real time?**

## What was checked

Every call site of an API browsers gate on user activation — file pickers
(`showOpenFilePicker`, `showSaveFilePicker`), clipboard writes, `window.open`,
`Audio.play`, `getUserMedia` — cross-referenced against what runs before it.
A call is at risk when a model call, a run, or any network round trip sits
between the click and the call.

## Findings

| Path | Gated call | Verdict |
|---|---|---|
| Save / Save as, rows pending (`#LazyExec`) | save picker | **Safe** — the run-all dialog is followed by the save gate's fresh click. Was fixed when lazy execution shipped. |
| Save recipe as Python (`#PyExport`) | save picker | **Was broken** (#278). Now behind the save gate. |
| Lookup file for a join (`#LookupJoin`) | open picker | **Safe** — the model answers with a join, the run pauses, and its dialog collects the click. Same shape, already correct. |
| Save / Save as, nothing pending | save picker | **Safe** — only a codec `import()` before the picker, inside the click. |
| Save recipe as .flow | save picker | **Safe** — serialization is synchronous. |
| Copy report, copy cell, copy request detail | clipboard | **Safe** — each is its own click, nothing in between. |
| Report bug (`#Diagnostics`) | `window.open` | **Near miss** — awaits the clipboard write first. Sub-millisecond and no network, so activation survives; a blocked popup already degrades to a toast naming the fallback. Left alone. |
| Hands-free voice turns (`#VoiceInput`) | `getUserMedia` | **Safe** — the mic opens once per session and stays open; a transcribed turn does not reopen it. |
| Tour voice steps (`#TutorialMode`) | `Audio.play` | **Safe enough** — autoplay after a fetch, but the tour starts from a click and a blocked clip resolves instead of throwing. |

Three paths need the pattern; all three now have it.

## What changed as a result

The three were three separate implementations of one idea. They are now one:
a **save gate** (`#SaveGate`) — the controller parks what it will write, the
dialog says what it is waiting for, and its button click is the gesture the
picker opens from. The Python export additionally shows a waiting bar while
its one model call runs, because unlike the other two it has no dialog of its
own to sit behind.

See [spec/behavior.md § The save gate](../../spec/behavior.md#the-save-gate-savegate).

## The rule this leaves behind

Anything gated on user activation must be reached from inside the handler that
the user's click ran. If work has to happen first, the work gets a dialog and
the dialog's button gets the gated call. Awaiting a model call and then opening
a picker is always a bug, and never one the `@web` Cucumber profile can catch —
it drives the controller with no browser to enforce the rule, which is what let
#278 ship green.
