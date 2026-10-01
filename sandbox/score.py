"""The hidden fit-and-size score behind the to-spec sandbox offer.

Inputs: the fit-finder answers (Stage A), an org name and province, and optional signals from
Navigi, HubSpot and the news job. Output: points, the band (sandbox / waitlist_dated / waitlist),
and the reasons, for Travis's queue. The score never appears on a public page.

Weights are the first cut from the 30 Sep plan; tune after twenty real runs by re-scoring
historical HubSpot deals (won must out-score lost).

Usage as a library:
    from sandbox.score import score, cra_match
    s = score(answers, org_name="...", province="AB", navigi={...}, hubspot={...}, news={...})

CLI:
    python sandbox/score.py --org "Riverbend Family Services" --province AB --answers answers.json
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import dataclass, field, asdict
from pathlib import Path

from rapidfuzz import fuzz, process

from sandbox.cra_index import DEFAULT_DATA, norm

THRESHOLD_SANDBOX = 12
THRESHOLD_DATED = 8


@dataclass
class CraMatch:
    bn: str
    name: str
    city: str
    province: str
    revenue: int | None
    expenditure: int | None
    staff_ft: int | None
    staff_pt: int | None
    confidence: int  # 0..100 token-set ratio on the normalised name


@dataclass
class Score:
    points: int
    band: str  # sandbox | waitlist_dated | waitlist
    reasons: list[str] = field(default_factory=list)
    cra: CraMatch | None = None
    size_band: str = "essentials"  # essentials | standard | complex, from CRA size and program count
    indigenous_or_public: bool = False

    def to_json(self) -> str:
        d = asdict(self)
        return json.dumps(d, indent=2)


def cra_match(org_name: str, province: str | None = None, year: int = 2024, data: Path = DEFAULT_DATA,
              min_confidence: int = 86) -> CraMatch | None:
    """Best CRA charity for an org name, restricted to the province when given.

    Match on the normalised name with a token-set ratio; the province narrows the candidate pool so
    common names (Family Services, Friendship Centre) resolve to the right one.
    """
    db = data / f"cra_{year}.sqlite"
    if not db.exists():
        return None
    q = norm(org_name)
    if not q:
        return None
    con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row
    first = q.split()[0]
    sql = "select * from charity where norm_name like ?"
    args: list = [f"%{first}%"]
    if province:
        sql += " and province = ?"
        args.append(province.upper())
    rows = con.execute(sql, args).fetchall()
    con.close()
    if not rows:
        return None
    choices = {i: r["norm_name"] for i, r in enumerate(rows)}
    best = process.extractOne(q, choices, scorer=fuzz.token_set_ratio)
    if not best or best[1] < min_confidence:
        return None
    r = rows[best[2]]
    return CraMatch(bn=r["bn"], name=r["account_name"] or r["legal_name"], city=r["city"], province=r["province"],
                    revenue=r["revenue"], expenditure=r["expenditure"], staff_ft=r["staff_ft"], staff_pt=r["staff_pt"],
                    confidence=int(best[1]))


def score(answers: dict, org_name: str = "", province: str | None = None, navigi: dict | None = None,
          hubspot: dict | None = None, news: dict | None = None, cra: CraMatch | None = None) -> Score:
    """Points per the plan's table. `answers` uses the fit-finder ids (role, timeline, budget, source_system,
    org_type, programs). navigi: {listed, claimed, programs}. hubspot: {contact, demo, deal}. news: {signal}.
    """
    pts, why = 0, []
    role = answers.get("role")
    if role == "decision_maker":
        pts += 3; why.append("decision-maker +3")
    elif role == "evaluator":
        pts += 2; why.append("evaluator +2")
    tl = answers.get("timeline")
    if tl == "immediate":
        pts += 3; why.append("timeline now +3")
    elif tl == "3months":
        pts += 3; why.append("timeline 3 months +3")
    elif tl == "6months":
        pts += 2; why.append("timeline 6 months +2")
    b = answers.get("budget")
    if b in ("15-40k", "40k+"):
        pts += 3; why.append(f"budget {b} +3")
    elif b == "5-15k":
        pts += 2; why.append("budget 5-15k +2")
    elif b == "unknown":
        pts += 1; why.append("budget not set +1")
    src = answers.get("source_system")
    if src in ("spreadsheets", "paper", "none"):
        pts += 2; why.append(f"runs on {src} +2")
    elif src == "product" and answers.get("renewal_known"):
        pts += 2; why.append("incumbent with a renewal date +2")
    elif src == "product":
        pts += 1; why.append("incumbent product +1")

    if cra is None and org_name:
        cra = cra_match(org_name, province)
    size = "essentials"
    if cra:
        rev = cra.revenue or 0
        if rev >= 1_000_000:
            pts += 3; why.append(f"CRA revenue {rev:,} +3"); size = "standard"
        elif rev >= 250_000:
            pts += 2; why.append(f"CRA revenue {rev:,} +2")
        elif rev > 0:
            pts += 1; why.append(f"CRA revenue {rev:,} +1")
        ft = cra.staff_ft or 0
        if ft >= 25:
            pts += 2; why.append(f"{ft} full-time staff +2"); size = "complex" if rev >= 5_000_000 else "standard"
        elif ft >= 10:
            pts += 2; why.append(f"{ft} full-time staff +2")
            if size == "essentials":
                size = "standard"
        elif ft >= 3:
            pts += 1; why.append(f"{ft} full-time staff +1")
    nv = navigi or {}
    if nv.get("listed"):
        pts += 1; why.append("listed in Navigi +1")
        if nv.get("programs", 0) >= 3 and not (cra and (cra.staff_ft or 0) >= 10):
            pts += 1; why.append(f"{nv['programs']} programs in Navigi +1")
    prog = answers.get("programs")
    if prog in ("6-10", "10+"):
        size = "complex" if prog == "10+" else ("standard" if size == "essentials" else size)
    elif prog == "3-5" and size == "essentials":
        size = "standard"
    hs = hubspot or {}
    if hs.get("deal"):
        pts += 3; why.append("open HubSpot deal +3")
    elif hs.get("demo"):
        pts += 2; why.append("attended a demo +2")
    elif hs.get("contact"):
        pts += 1; why.append("known contact +1")
    nw = news or {}
    if nw.get("signal"):
        pts += 2; why.append(f"news: {nw['signal']} +2")
    ind = answers.get("org_type") in ("indigenous", "municipal", "other_gov")
    if ind:
        pts += 1; why.append("Indigenous-governed or public body +1")

    band = "sandbox" if pts >= THRESHOLD_SANDBOX else ("waitlist_dated" if pts >= THRESHOLD_DATED else "waitlist")
    return Score(points=pts, band=band, reasons=why, cra=cra, size_band=size, indigenous_or_public=ind)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--org", required=True)
    ap.add_argument("--province")
    ap.add_argument("--answers", type=Path, help="JSON file of fit-finder answers")
    a = ap.parse_args()
    ans = json.loads(a.answers.read_text(encoding="utf-8")) if a.answers else {}
    print(score(ans, org_name=a.org, province=a.province).to_json())
