# voice-input — keep the original, adopt two recreate ideas

Compares `src/packages/voice-input` here (28 KB) with the recreate's (21 KB).
The recreate is smaller mainly because it swapped the real voice detector for
a crude one — but it also added two things the original lacks.

## Analysis

What the recreate downgraded:

- Voice activity detection. The original wraps the Silero model (the real
  thing, with seven tuning knobs). The recreate hand-rolled a volume meter —
  it fires on any loud noise, not on speech. Do not adopt.

What the recreate added that the original lacks:

- **A 30-second cap on recording.** Reach it and the clip stops and sends on
  its own. The original records forever. The recreate even has a scenario for
  it; the original has neither the behavior nor the test.
- **Capability guards.** On a browser missing the mic APIs the recreate's
  ports return null and the UI can say so; the original assumes the APIs exist
  and would throw.

One small difference of taste: an audio file with an unknown extension — the
original raises an error, the recreate assumes `audio/mp4` and carries on.

## Questions for you

- [x] Adopt the 30-second auto-stop-and-send? Answer: yes to auto-stop
- [x] Unknown audio file extension: keep raising an error (original, current)
      or assume `audio/mp4` (recreate)? Answer: keep raising an error (original, current)

## Plan

1. If yes to auto-stop: spec sentence in `spec/behavior.md` (voice section),
   scenario in `spec/packages/voice-input/voice-input.feature` (the recreate's
   "a recording that reaches thirty seconds stops and sends on its own" is a
   good template), red first, then implement.
2. Add the capability guards: ports return null when `getUserMedia` /
   `MediaRecorder` / `AudioContext` are missing. Spec sentence + scenario
   first, red, then implement.
3. Write the extension answer into `spec/code-contract.md`; only a code change
   if the answer is "assume audio/mp4".
