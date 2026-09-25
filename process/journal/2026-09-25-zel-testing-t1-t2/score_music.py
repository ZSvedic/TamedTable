"""Score a host-exported CSV against TamedTable's hand-labelled videos.

The headline counts every labelled video with a known answer. A missing row, a blank
or unreadable answer, or a duplicated video id counts as wrong, so a host cannot
score well by answering only the easy rows.
"""

import csv
import json
import sys
from pathlib import Path

YES = {"true", "yes", "1", "y", "t"}
NO = {"false", "no", "0", "n", "f"}


def main(labels_path: Path, output_path: Path) -> None:
    truth = {}
    with labels_path.open(encoding="utf-8") as source:
        for line in source:
            if line.strip():
                label = json.loads(line)
                truth[label["videoId"]] = label["music"]
    known = {video_id for video_id, music in truth.items() if music is not None}

    with output_path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        columns = {name.strip().lower(): name for name in (reader.fieldnames or [])}
        if "videoid" not in columns or "music" not in columns:
            raise ValueError("CSV needs videoId and Music columns")
        rows = list(reader)

    answers, present, duplicates, invalid = {}, set(), set(), set()
    for row in rows:
        video_id = (row[columns["videoid"]] or "").strip()
        if video_id in present:
            duplicates.add(video_id)
        present.add(video_id)
        value = (row[columns["music"]] or "").strip().lower()
        if value in YES:
            answers[video_id] = True
        elif value in NO:
            answers[video_id] = False
        else:
            invalid.add(video_id)

    valid = (known & answers.keys()) - invalid - duplicates
    correct = sum(answers[video_id] == truth[video_id] for video_id in valid)
    print(f"output rows: {len(rows)}")
    print(f"labelled videos with a known answer: {len(known)} (plus {len(truth) - len(known)} marked unsure, not scored)")
    print(f"answered with true/false: {len(valid)}/{len(known)}")
    print(f"missing rows: {len(known - present)}, blank or unreadable: {len(known & invalid)}, duplicated: {len(known & duplicates)}")
    print(f"accuracy: {correct}/{len(known)} = {correct / len(known):.1%}  (anything unanswered counts as wrong)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: python3 score_music.py LABELS.jsonl OUTPUT.csv")
    main(Path(sys.argv[1]), Path(sys.argv[2]))
