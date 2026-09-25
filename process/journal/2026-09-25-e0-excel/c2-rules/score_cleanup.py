"""Compare a cleaned customers CSV with cleanup-expected.csv, cell by cell.

Rows match by ID. Phones count as equal when they differ only by spaces, dashes or brackets.
Names are compared case-sensitively against a hand list (the golden leaves names lowercase).
If the host put the cleaned phone in a new column, name it with --phone-column.
"""
import csv, re, sys
from pathlib import Path

NAMES = {"I003": ("Bob", "McDonald"), "I008": ("Sarah", "van der Berg"), "I009": ("David", "O'Neil")}

def load(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return {r["ID"]: r for r in csv.DictReader(f)}

def phone(v):
    return re.sub(r"[\s\-()]", "", v or "")

def main():
    expected_path, output_path = sys.argv[1], sys.argv[2]
    phone_col = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == "--phone-column" else "Phone"
    exp, out = load(expected_path), load(output_path)
    print(f"{Path(output_path).name}: rows {len(out)}/{len(exp)}")
    for col in ["DOB", "Country", "Phone"]:
        miss = []
        for i, e in exp.items():
            o = out.get(i, {})
            got = o.get(phone_col if col == "Phone" else col, "")
            same = phone(got) == phone(e[col]) if col == "Phone" else (got or "").strip() == e[col]
            if not same:
                miss.append(f"{i} {got!r}≠{e[col]!r}")
        print(f"  {col}: {20 - len(miss)}/20 match" + ("; " + "; ".join(miss) if miss else ""))
    print("  names:", ", ".join(f"{i} {out.get(i, {}).get('FirstName')} {out.get(i, {}).get('LastName')}" for i in NAMES))

main()
