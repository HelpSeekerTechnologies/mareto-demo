"""Score every sandbox request that has none yet and write the result back to demo.mareto.

Reads records in sandbox_request with status = received, maps their answers to the fit-finder ids the
score expects, matches the organization to the CRA index, writes score_points, score_band, size_band and
score_reasons, and moves the status to scored. Nothing is sent to the requester here; Travis decides.

  python sandbox/score_queue.py            # score what is waiting
  python sandbox/score_queue.py --dry      # print, write nothing

To be scheduled only after Alina's explicit yes (memory: never schedule unattended jobs without asking).
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
sys.path.insert(0, r"C:\Users\alina\.claude\jobs\98050f0d\tmp")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from demo_api import get, post, put
from sandbox.score import score

NS_SLUG = "sandbox-intake"; MOD = "sandbox_request"
ROLE = {"ed": "decision_maker", "director": "decision_maker", "manager": "evaluator", "data": "evaluator", "other": "curious"}
TIMELINE = {"now": "immediate", "3m": "3months", "6m": "6months", "fy": "exploring"}
PROGRAMS = lambda n: "1-2" if n <= 2 else "3-5" if n <= 5 else "6-10" if n <= 10 else "10+"


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dry", action="store_true"); a = ap.parse_args()
    ns = get(f"/api/compose/namespace/?slug={NS_SLUG}")["response"]["set"][0]; nsid = ns["namespaceID"]
    mod = get(f"/api/compose/namespace/{nsid}/module/?handle={MOD}")["response"]["set"][0]; mid = mod["moduleID"]
    recs = get(f"/api/compose/namespace/{nsid}/module/{mid}/record/?query=status%3D%27received%27&limit=100")["response"]["set"]
    print("waiting:", len(recs))
    for rec in recs:
        v = {x.get("name"): x.get("value", "") for x in rec.get("values", [])}
        try:
            programs = json.loads(v.get("programs") or "[]")
        except ValueError:
            programs = []
        answers = {"role": ROLE.get(v.get("role"), "curious"), "timeline": TIMELINE.get(v.get("timeline"), "exploring"), "budget": "unknown",
                   "source_system": v.get("source") or "none", "renewal_known": bool(v.get("contract_end")), "org_type": "nonprofit", "programs": PROGRAMS(len(programs))}
        s = score(answers, org_name=v.get("org", ""), province=v.get("province") or None)
        line = f"{rec['recordID']} {v.get('org','')[:40]!r} -> {s.points} {s.band} {s.size_band}"
        if a.dry:
            print("DRY", line, "|", "; ".join(s.reasons)); continue
        live = get(f"/api/compose/namespace/{nsid}/module/{mid}/record/{rec['recordID']}")["response"]  # fresh updatedAt or the PUT no-ops silently
        new = {"score_points": str(s.points), "score_band": s.band, "size_band": s.size_band, "score_reasons": "\n".join(s.reasons) + (f"\nCRA: {s.cra.name} ({s.cra.confidence}%)" if s.cra else "\nCRA: no match"), "status": "scored"}
        vals = [x for x in live["values"] if x.get("name") not in new] + [{"name": k, "value": val} for k, val in new.items()]
        r = post(f"/api/compose/namespace/{nsid}/module/{mid}/record/{rec['recordID']}", {"values": vals, "updatedAt": live.get("updatedAt")})
        back = get(f"/api/compose/namespace/{nsid}/module/{mid}/record/{rec['recordID']}")["response"]
        got = {x.get("name"): x.get("value") for x in back["values"]}
        print("OK " if got.get("status") == "scored" and got.get("score_points") == str(s.points) else "NOT WRITTEN ", line, "" if "response" in r else str(r)[:120])


if __name__ == "__main__":
    main()
