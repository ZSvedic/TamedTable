#!/usr/bin/env -S uv run --script
# /// script
# dependencies = [
#   "pandas",
#   "matplotlib",
# ]
# ///
"""Helper for commit-sizes.sh — not meant to be run by hand.

Reads temp/commit-sizes.csv and renders temp/commit-sizes.png: two vertically
stacked subplots.  Chart 1 shows the full commit history with index-number
x-axis ticks (every 10).  Chart 2 zooms in on the last 20 commits with full
short-hash + message labels at 45°.  Both charts use a stacked area for
process/ spec/ src/ byte sizes and overlay the tracked TOTAL as a line.  The gap
between the stack top and the TOTAL line is the root files (README.md,
LICENSE, .gitignore)."""

import os
import pandas as pd
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
TEMP = os.path.join(HERE, "..", "..", "temp")
df = pd.read_csv(os.path.join(TEMP, "commit-sizes.csv"))


def label(row):
    msg = str(row["message"])
    if len(msg) > 55:
        msg = msg[:54] + "…"
    return f'{row["commit"]}  {msg}'


kb = lambda col: df[col] / 1024
recent = df.tail(20).copy()
recent_labels = recent.apply(label, axis=1)

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 14))

# --- Chart 1: full history, index-number x-axis ---
x_all = range(len(df))
ax1.stackplot(
    x_all, kb("process"), kb("spec"), kb("src"),
    labels=["process/", "spec/", "src/"], alpha=0.85,
)
ax1.plot(x_all, kb("total"), color="black", linewidth=1.5, marker="o", markersize=3, label="TOTAL")
tick_positions = list(range(0, len(df), 10))
ax1.set_xticks(tick_positions)
ax1.set_xticklabels(tick_positions)
ax1.set_ylabel("Tracked file size (KB)")
ax1.set_title("Git Project Size — All Commits")
ax1.legend(loc="upper left")

# --- Chart 2: last 20 commits, full labels ---
x_recent = range(len(recent))
kb_recent = lambda col: recent[col] / 1024
ax2.stackplot(
    x_recent, kb_recent("process"), kb_recent("spec"), kb_recent("src"),
    labels=["process/", "spec/", "src/"], alpha=0.85,
)
ax2.plot(x_recent, kb_recent("total"), color="black", linewidth=1.5, marker="o", markersize=3, label="TOTAL")
ax2.set_xticks(list(x_recent))
ax2.set_xticklabels(recent_labels, rotation=45, ha="right", fontsize=8)
ax2.set_ylabel("Tracked file size (KB)")
ax2.set_title("Git Project Size — Last 20 Commits")
ax2.legend(loc="upper left")

fig.tight_layout()
fig.subplots_adjust(bottom=0.18)

OUT_PNG = os.path.join(TEMP, "commit-sizes.png")
fig.savefig(OUT_PNG, dpi=200)
print(f"Saved {OUT_PNG}")
