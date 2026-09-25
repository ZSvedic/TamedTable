# Memory toggles

The switch states below were read from each settings page with the Chrome tools on 2026-09-25, from each switch's `aria-checked` value. The Chrome tools could not save screenshots to disk, and a screen capture of the Chrome window showed a different tab with personal chat titles, so this table is the record instead of screenshots.

## chatgpt.com, Settings > Personalization

The page now has one memory switch, "Enable memory", not the two the prompt names.

| Switch | Before | During the run | After the run |
|---|---|---|---|
| Enable ChatGPT memory | on | off | on |
| Reference record history | off | off (not touched) | off |
| Library search | on | off (followed memory) | on |

Turning memory off also switched "Library search" off; turning memory back on switched it back on. Every other switch on the page was the same before and after.

## claude.ai, Settings > Memory

Turning off "Generate memory from chats" opened a "Turn off memory" dialog. The run chose "Pause memory" (keeps all memories), not "Reset memory".

| Switch | Before | During the run | After the run |
|---|---|---|---|
| Search and reference chats | on | off | on |
| Generate memory from chats | on | off (paused) | on |
| Include sensitive topics in memory | off | hidden while paused | off |

## What memory off did not cover

Claude's saved skills stay on with memory off. A fresh Excel chat picked up Zel's `normalize-contacts` skill in C2; see [../c2-rules/README.md](../c2-rules/README.md).
