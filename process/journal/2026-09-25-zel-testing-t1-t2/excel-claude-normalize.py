#!/usr/bin/env python3
"""Normalise country names and convert phone numbers to E.164.

Usage:
    python normalize_contacts.py customers-input.csv customers-clean.csv
    python normalize_contacts.py in.csv out.csv --country-col Country --phone-col Phone
"""
import argparse
import csv
import re
import sys

# Variant spelling (lower-case) -> full English name
COUNTRY_ALIASES = {
    "usa": "United States", "us": "United States", "u.s.": "United States",
    "u.s.a.": "United States", "united states": "United States",
    "united states of america": "United States", "america": "United States",
    "uk": "United Kingdom", "u.k.": "United Kingdom", "gb": "United Kingdom",
    "great britain": "United Kingdom", "britain": "United Kingdom",
    "england": "United Kingdom", "scotland": "United Kingdom",
    "wales": "United Kingdom", "northern ireland": "United Kingdom",
    "united kingdom": "United Kingdom",
    "the bahamas": "Bahamas", "bahamas": "Bahamas",
    "deutschland": "Germany", "germany": "Germany",
    "españa": "Spain", "espana": "Spain", "spain": "Spain",
    "hrvatska": "Croatia", "croatia": "Croatia",
    "canada": "Canada", "australia": "Australia",
    "china": "China", "prc": "China", "japan": "Japan", "nippon": "Japan",
    "saudi arabia": "Saudi Arabia", "ksa": "Saudi Arabia",
}

# Full English name -> dial code
DIAL_CODES = {
    "United States": "1", "Canada": "1", "Bahamas": "1",
    "United Kingdom": "44", "Australia": "61", "Croatia": "385",
    "Germany": "49", "Spain": "34", "China": "86", "Japan": "81",
    "Saudi Arabia": "966",
}

# Expected total digit count in E.164 (country code included)
EXPECTED_DIGITS = {
    "1": {11}, "44": {12}, "61": {11}, "385": {11, 12},
    "49": {10, 11, 12, 13}, "34": {11}, "86": {12, 13},
    "81": {11, 12}, "966": {12},
}


def normalize_country(raw: str) -> str:
    s = " ".join((raw or "").split())
    return COUNTRY_ALIASES.get(s.casefold(), s)


def to_e164(phone: str, country: str) -> str:
    raw = (phone or "").strip()
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return ""
    if raw.startswith("+"):
        return "+" + digits
    if digits.startswith("00"):
        return "+" + digits[2:]
    cc = DIAL_CODES.get(country)
    if cc is None:
        return "+?" + digits          # country missing from DIAL_CODES
    if digits.startswith("0"):        # drop trunk prefix
        digits = digits[1:]
    return "+" + cc + digits


def length_ok(e164: str) -> bool:
    digits = e164.lstrip("+")
    for cc in sorted(EXPECTED_DIGITS, key=len, reverse=True):
        if digits.startswith(cc):
            return len(digits) in EXPECTED_DIGITS[cc]
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--country-col", default="Country")
    ap.add_argument("--phone-col", default="Phone")
    ap.add_argument("--out-col", default="Phone (E.164)")
    args = ap.parse_args()

    with open(args.input, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fields = list(reader.fieldnames or [])
        rows = list(reader)

    for col in (args.country_col, args.phone_col):
        if col not in fields:
            sys.exit(f"Column '{col}' not found. Columns: {fields}")
    if args.out_col not in fields:
        fields.append(args.out_col)

    changes, flagged = {}, []
    for i, row in enumerate(rows, start=2):   # row 1 = header
        old = row[args.country_col]
        new = normalize_country(old)
        if new != old:
            changes[old] = new
        row[args.country_col] = new
        e164 = to_e164(row[args.phone_col], new)
        row[args.out_col] = e164
        if e164 and not length_ok(e164):
            flagged.append((i, row[args.phone_col], e164))

    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {args.output}")
    for old, new in changes.items():
        print(f"  country: {old!r} -> {new!r}")
    if flagged:
        print(f"{len(flagged)} numbers have an unexpected length:")
        for i, src, e164 in flagged:
            print(f"  row {i}: {src!r} -> {e164}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())