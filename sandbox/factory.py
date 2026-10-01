"""The sandbox factory, first cut: a namespace shaped like one sandbox request.

Reads a sandbox_request record on demo.mareto, creates a namespace `sb-<slug>`, replays the canonical
module definitions from the template namespace (MayBell v2, the only zero-non-canonical build) with
Record fields remapped to the new module ids, then seeds the organization, one program type and one
program per program the requester described. Pages, roles, personas and forms come in the next cut.
Writes tenant_slug and status = building back on the request.

  python sandbox/factory.py --request <recordID> [--template maybell-developments-v2] [--dry]
"""
from __future__ import annotations
import argparse, json, re, sys, time
from pathlib import Path
sys.path.insert(0, r"C:\Users\alina\.claude\jobs\98050f0d\tmp")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from demo_api import get, post, call

NS_SLUG = "sandbox-intake"; MOD = "sandbox_request"
# type modules first so Record fields on the others resolve in one remap pass
ORDER_FIRST = ["person_type", "case_type", "event_type", "program_type", "status_type", "characteristic_type", "service_type", "role_type",
               "condition_type", "driver_type", "need_type", "risk_type", "acuity_type", "capacity_type", "goal_type", "outcome_type",
               "resource_type", "timeframe_type", "limitation_type", "geography_type", "indicator_type"]
FIELD_KEEP = ("name", "label", "kind", "options", "isMulti", "isRequired", "isSystem", "isQueryable", "isFilterable", "isSortable", "defaultValue", "expressions", "maxLength")


def slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return ("sb-" + s)[:48].rstrip("-")


def values(rec: dict) -> dict:
    return {x.get("name"): x.get("value", "") for x in rec.get("values", [])}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--request", required=True); ap.add_argument("--template", default="maybell-developments-v2"); ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    intake = get(f"/api/compose/namespace/?slug={NS_SLUG}")["response"]["set"][0]["namespaceID"]
    reqmod = get(f"/api/compose/namespace/{intake}/module/?handle={MOD}")["response"]["set"][0]["moduleID"]
    req = get(f"/api/compose/namespace/{intake}/module/{reqmod}/record/{a.request}")["response"]; v = values(req)
    programs = json.loads(v.get("programs") or "[]")
    sl = slug(v["org"]); print(f"request {a.request}: {v['org']!r} -> namespace {sl}, {len(programs)} programs")
    tpl = get(f"/api/compose/namespace/?slug={a.template}")["response"]["set"][0]["namespaceID"]
    tmods = get(f"/api/compose/namespace/{tpl}/module/?limit=200")["response"]["set"]
    print(f"template {a.template}: {len(tmods)} modules")
    if a.dry:
        return

    ex = get(f"/api/compose/namespace/?slug={sl}")["response"]["set"]
    if ex:
        nsid = ex[0]["namespaceID"]; print("namespace exists", nsid)
    else:
        r = post("/api/compose/namespace/", {"name": v["org"], "slug": sl, "enabled": True, "meta": {"subtitle": "Mareto sandbox, 30 days", "description": f"Built from sandbox request {a.request} on {time.strftime('%Y-%m-%d')}."}})
        nsid = r["response"]["namespaceID"]; print("namespace created", nsid)
    have = {m["handle"]: m for m in get(f"/api/compose/namespace/{nsid}/module/?limit=200")["response"]["set"]}
    order = sorted(tmods, key=lambda m: (0 if m["handle"] in ORDER_FIRST else 1, m["handle"]))
    idmap = {}  # template moduleID -> new moduleID
    # pass 1: create every module with its non-Record fields
    for m in order:
        if m["handle"] in have:
            idmap[m["moduleID"]] = have[m["handle"]]["moduleID"]; continue
        fields = [{k: f[k] for k in FIELD_KEEP if k in f} for f in m["fields"] if f["kind"] != "Record"]
        r = post(f"/api/compose/namespace/{nsid}/module/", {"name": m["name"], "handle": m["handle"], "fields": fields, "meta": m.get("meta") or {}, "config": {}})
        if "response" not in r:
            print("  FAILED", m["handle"], str(r)[:200]); continue
        idmap[m["moduleID"]] = r["response"]["moduleID"]; have[m["handle"]] = r["response"]
    print(f"pass 1: {len(idmap)} modules present")
    # pass 2: add the Record fields with moduleID remapped (module update is POST on the item; build from the live module)
    added = 0
    for m in order:
        recf = [f for f in m["fields"] if f["kind"] == "Record"]
        if not recf or m["moduleID"] not in idmap:
            continue
        live = get(f"/api/compose/namespace/{nsid}/module/{idmap[m['moduleID']]}")["response"]
        names = {f["name"] for f in live["fields"]}
        new = []
        for f in recf:
            if f["name"] in names:
                continue
            g = {k: f[k] for k in FIELD_KEEP if k in f}; g["options"] = dict(g.get("options") or {})
            tgt = g["options"].get("moduleID")
            if tgt in idmap:
                g["options"]["moduleID"] = idmap[tgt]
            else:
                continue  # points outside the template; skip rather than dangle
            new.append(g)
        if not new:
            continue
        body = {k: live[k] for k in ("name", "handle", "meta", "config")}; body["fields"] = live["fields"] + new; body["updatedAt"] = live.get("updatedAt")
        r = post(f"/api/compose/namespace/{nsid}/module/{live['moduleID']}", body)
        back = get(f"/api/compose/namespace/{nsid}/module/{live['moduleID']}")["response"]
        got = len(back["fields"]) - len(live["fields"]); added += got
        if got != len(new):
            print("  record fields short on", m["handle"], got, "of", len(new), str(r)[:160])
    print(f"pass 2: {added} record fields added")
    mods = {m["handle"]: m for m in get(f"/api/compose/namespace/{nsid}/module/?limit=200")["response"]["set"]}

    # seed: the organization, one program type per care/service shape, one program per described program
    def find(handle, key, val):
        rows = get(f"/api/compose/namespace/{nsid}/module/{mods[handle]['moduleID']}/record/?limit=200")["response"]["set"]
        for r in rows:
            if {x.get("name"): x.get("value") for x in r["values"]}.get(key) == val:
                return r["recordID"]
    def create(handle, vals, key=None):
        if key and vals.get(key) is not None:
            found = find(handle, key, str(vals[key]))
            if found:
                return found
        r = post(f"/api/compose/namespace/{nsid}/module/{mods[handle]['moduleID']}/record/", {"values": [{"name": k, "value": str(val)} for k, val in vals.items() if val not in (None, "")]})
        return r.get("response", {}).get("recordID") or print("  seed failed", handle, str(r)[:200])
    org = get(f"/api/compose/namespace/{nsid}/module/{mods['organization']['moduleID']}/record/?limit=1")["response"]["set"]
    org_id = org[0]["recordID"] if org else create("organization", {"organization_name": v["org"], "organization_website": ("https://" + v["website"]) if v.get("website") and not v["website"].startswith("http") else v.get("website"), "organization_is_active": 1, "organization_email": v.get("email")})
    pt = create("program_type", {"program_type_name": "Program", "program_type_category": "PROGRAM_KIND", "program_type_is_active": 1, "program_type_display_order": 1, "program_type_code": "PROGRAM"}, key="program_type_code")
    st = create("status_type", {"status_type_name": "Open for registration", "status_type_category": "PROGRAM_STATUS", "status_type_is_active": 1, "status_type_display_order": 1, "status_type_code": "OPEN"}, key="status_type_code")
    for i, p in enumerate(programs, 1):
        create("program", {"program_name": p.get("name"), "program_description": "; ".join(x for x in (p.get("serves"), p.get("funder") and "Funded by " + p["funder"], p.get("outcomes") and "Outcomes: " + p["outcomes"]) if x),
                           "program_code": f"P{i:02d}", "program_type_id": pt, "status_type1_id": st, "organization_id": org_id, "program_notes": f"Intake: {p.get('intake','')}; model: {p.get('model','')}"}, key="program_code")
    n_prog = len(get(f"/api/compose/namespace/{nsid}/module/{mods['program']['moduleID']}/record/?limit=50")["response"]["set"])
    print(f"seeded: organization 1, program types 1, programs {n_prog}")
    # write back on the request
    live = get(f"/api/compose/namespace/{intake}/module/{reqmod}/record/{a.request}")["response"]
    new = {"tenant_slug": sl, "status": "building", "notes": (values(live).get("notes") or "") + f"\nFactory: namespace {sl} ({nsid}), {len(mods)} modules, {n_prog} programs, {time.strftime('%Y-%m-%d %H:%M')}"}
    vals = [x for x in live["values"] if x.get("name") not in new] + [{"name": k, "value": val} for k, val in new.items()]
    post(f"/api/compose/namespace/{intake}/module/{reqmod}/record/{a.request}", {"values": vals, "updatedAt": live.get("updatedAt")})
    print(f"open: https://demo.mareto.helpseeker.org/compose/ns/{sl}/pages")


if __name__ == "__main__":
    main()
