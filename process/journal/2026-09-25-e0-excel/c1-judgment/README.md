# C1. Judgment on every row (T7)

Fixture: `spec/test-cases/performance-liked-videos.csv`, 1,821 videos, loaded as an all-text sheet (see [../README.md](../README.md#how-the-run-worked)). Prompts sent in one fresh side-panel chat per host, word for word: "Show me this dataset and summarize its columns.", "Sort by duration, longest first.", "Add a boolean column Music that is true for music videos. Give me the full result as a CSV file." Scored with `score_music.py` against the 116 hand-labelled videos.

## Excel + ChatGPT (GPT-5.6 Terra)

- **v1, about 1 minute.** It said "I'll add a `Music` flag using title/channel signals" and "I'm applying a conservative music classifier". It wrote fixed TRUE/FALSE values into G2:G1822, 290 TRUE. [Answer](chatgpt-v1-answer.png).
- **Score v1: 74/116 = 63.8%.** All 1,821 rows answered.
- Because v1 used title and channel signals, the plan's follow-up went in: "Please judge every row yourself instead of using rules."
- **v2, about 2 to 3 minutes.** It said it would "re-review every title and channel individually", then that "The URLs made the review batches too large" and it narrowed them. The result changed only 11 rows, all TRUE to FALSE ("corrected clear false positives such as music theory, interviews, commentary, and lessons"). Its own caveat: "this is a title/channel-metadata judgment pass". [Answer](chatgpt-v2-answer.png).
- **Score v2: 76/116 = 65.5%.**
- **Progress:** step labels only ("Flag music videos", "Verify music flags"), no row count. It did not stop to ask.
- **CSV:** "I can't attach or generate a downloadable CSV file in this session." It told the user to save from Excel.
- Side effect of the sort: it rewrote the duration text as time values (`00:9:14` became `0:09:14`).

## Excel + Claude (Opus 5.5)

- **v1, about 1.5 to 2 minutes.** It said "I went through the titles and channels myself; no formula drives this column. Because they're my judgment calls, some borderline cases may be wrong". It wrote fixed values with "Set Cell Range", 704 TRUE, and left a note in H1 with its rules. [Method](claude-v1-method.png), [answer](claude-v1-answer.png).
- **Score v1: 108/116 = 93.1%.** All 1,821 rows answered.
- No follow-up sent: it judged rows, so the plan's "judge every row yourself" did not apply.
- **Progress:** step labels only ("Deciding which videos qualify as music content", "Ran 5 scripts"), no row count. It did not stop to ask about Music. It asked for edit permission once, on the sort step (Allow once).
- **CSV:** "I can't create a file for you to download." It told the user to use File > Save As > CSV UTF-8.
- Side effect of the sort: it added a helper column `duration_time` to sort text durations.

## Result

Claude judged every row and came close to TamedTable level (93.1% against the 95% bar). ChatGPT used title and channel signals, and asking it to judge every row changed 11 of 1,821 rows. Neither showed per-row progress. Both left every row answered.
