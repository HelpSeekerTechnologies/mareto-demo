"""Build the CRA T3010 lookup index used by the sandbox fit score.

Source: the CRA "List of charities" open data (open.canada.ca), one year at a time.
Reads the identification, financial and Schedule 3 compensation CSVs from the data folder on N:
and writes one SQLite file beside them with a single `charity` table and a normalised name column
for matching. Only org-level public data: legal name, city, province, category, total revenue
(line 4700), total expenditure (line 4950), full-time and part-time compensated positions
(Schedule 3 lines 300 and 370). No people.

Run:  python sandbox/cra_index.py [--year 2024] [--data N:\\HelpSeeker\\Alina\\Desktop\\mareto-sandbox\\cra]
"""
from __future__ import annotations

import argparse
import csv
import re
import sqlite3
import sys
from pathlib import Path

DEFAULT_DATA = Path(r"N:\HelpSeeker\Alina\Desktop\mareto-sandbox\cra")
STOP = {"the", "of", "and", "for", "society", "association", "inc", "incorporated", "ltd", "foundation",
        "centre", "center", "services", "service", "community", "canada", "canadian", "la", "le", "les",
        "de", "des", "du", "d", "l", "a", "an", "org", "organization", "organisation", "corp", "corporation"}


def norm(name: str) -> str:
    """Lower-case, strip punctuation and accents-as-ascii, drop stop words. Used for the match key."""
    s = name.lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    toks = [t for t in s.split() if t and t not in STOP]
    return " ".join(toks)


def to_int(v: str) -> int | None:
    v = (v or "").strip().replace(",", "")
    if not v:
        return None
    try:
        return int(float(v))
    except ValueError:
        return None


def build(year: int, data: Path) -> Path:
    ident = data / f"ident_{year}.csv"
    fin = data / f"financial_{year}.csv"
    comp = data / f"compensation_{year}.csv"
    out = data / f"cra_{year}.sqlite"
    for p in (ident, fin):
        if not p.exists():
            sys.exit(f"missing {p}")

    revenue: dict[str, tuple[int | None, int | None, str]] = {}
    with fin.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            bn = row["BN"].strip()
            revenue[bn] = (to_int(row.get("4700")), to_int(row.get("4950")), row.get("FPE", ""))

    staff: dict[str, tuple[int | None, int | None]] = {}
    if comp.exists():
        with comp.open(encoding="utf-8-sig", newline="") as f:
            r = csv.DictReader(f)
            ft_col = next((c for c in r.fieldnames or [] if c.strip() == "300"), None)
            pt_col = next((c for c in r.fieldnames or [] if c.strip() == "370"), None)
            for row in r:
                bn = row["BN"].strip()
                staff[bn] = (to_int(row.get(ft_col, "")) if ft_col else None,
                             to_int(row.get(pt_col, "")) if pt_col else None)

    if out.exists():
        out.unlink()
    con = sqlite3.connect(out)
    con.execute("""create table charity (
        bn text primary key, legal_name text, account_name text, norm_name text,
        city text, province text, postal text, category text, sub_category text, designation text,
        fpe text, revenue integer, expenditure integer, staff_ft integer, staff_pt integer)""")
    con.execute("create index ix_norm on charity(norm_name)")
    con.execute("create index ix_prov on charity(province)")
    n = 0
    with ident.open(encoding="utf-8-sig", newline="") as f:
        batch = []
        for row in csv.DictReader(f):
            bn = row["BN"].strip()
            rev = revenue.get(bn, (None, None, ""))
            st = staff.get(bn, (None, None))
            name = row.get("Account Name") or row.get("Legal Name") or ""
            batch.append((bn, row.get("Legal Name", ""), row.get("Account Name", ""), norm(name),
                          row.get("City", ""), row.get("Province", ""), row.get("Postal Code", ""),
                          row.get("Category", ""), row.get("Sub Category", ""), row.get("Designation", ""),
                          rev[2], rev[0], rev[1], st[0], st[1]))
            n += 1
            if len(batch) >= 5000:
                con.executemany("insert or replace into charity values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", batch)
                batch = []
        if batch:
            con.executemany("insert or replace into charity values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", batch)
    con.commit()
    con.close()
    print(f"cra_{year}.sqlite: {n} charities, {sum(1 for v in revenue.values() if v[0] is not None)} with revenue, {len(staff)} with staff rows")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, default=2024)
    ap.add_argument("--data", type=Path, default=DEFAULT_DATA)
    a = ap.parse_args()
    build(a.year, a.data)
