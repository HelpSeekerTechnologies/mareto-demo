"""Page set for a factory-built sandbox namespace: home, and a list page plus a record page per core module.

Generic and canon-worded; the org's own words appear only in the home page content and the seeded rows.
Idempotent on page handles. Layouts are written and read back (the layout is what renders).

  python sandbox/factory_pages.py --ns sb-<slug> [--org "Name"]
"""
from __future__ import annotations
import argparse, sys
from pathlib import Path
sys.path.insert(0, r"C:\Users\alina\.claude\jobs\98050f0d\tmp")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from demo_api import get, post
from sandbox.provision_pages import layout

# handle, list title, list columns (first that exist), weight
CORE = [
    ("person", "People", ["person_full_name", "person_first_name", "person_last_name", "person_type_id", "status_type_id", "person_email", "person_phone"], 2),
    ("organization", "Organizations", ["organization_name", "characteristic_type_id", "organization_phone", "organization_email", "organization_is_active"], 3),
    ("program", "Programs", ["program_name", "program_code", "program_type_id", "status_type1_id", "program_capacity", "program_start_date"], 4),
    ("case", "Cases", ["case_name", "case_type_id", "status_type_id", "person_id", "program_id", "case_start_date"], 5),
    ("event", "Events", ["event_name", "event_type_id", "event_date", "person_id", "case_id", "status_type_id"], 6),
    ("goal", "Goals", ["goal_name", "goal_type_id", "status_type_id", "person_id", "case_id"], 7),
    ("outcome", "Outcomes", ["outcome_name", "outcome_type_id", "person_id", "program_id"], 8),
    ("resource", "Resources", ["resource_name", "resource_type_id", "status_type_id", "organization_id"], 9),
    ("artifact", "Documents", ["artifact_name", "artifact_type_id", "person_id", "case_id"], 10),
]
HIDDEN_LISTS = [("measurement", "Measurements"), ("target", "Targets"), ("geography", "Geography")]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--ns", required=True); ap.add_argument("--org", default=""); a = ap.parse_args()
    ns = get(f"/api/compose/namespace/?slug={a.ns}")["response"]["set"][0]; nsid = ns["namespaceID"]; org = a.org or ns["name"]
    mods = {m["handle"]: m for m in get(f"/api/compose/namespace/{nsid}/module/?limit=200")["response"]["set"]}
    pages = {p["handle"]: p for p in get(f"/api/compose/namespace/{nsid}/page/?limit=200")["response"]["set"]}
    progs = get(f"/api/compose/namespace/{nsid}/module/{mods['program']['moduleID']}/record/?limit=50")["response"]["set"]
    prog_names = [{x.get("name"): x.get("value") for x in r["values"]}.get("program_name", "") for r in progs]

    def ensure(handle, title, module_id, blocks, weight, visible=True):
        if handle in pages:
            return pages[handle]
        r = post(f"/api/compose/namespace/{nsid}/page/", {"title": title, "handle": handle, "moduleID": module_id, "selfID": "0", "visible": visible, "weight": weight,
                 "config": {"navItem": {"expanded": False, "icon": {"src": ""}}}, "meta": {"allowPersonalLayouts": False, "notifications": {"enabled": True}}, "blocks": blocks, "description": ""})
        if "response" not in r:
            print("  page failed", handle, str(r)[:200]); return None
        pages[handle] = r["response"]; print("  page", handle, r["response"]["pageID"]); return r["response"]

    # record pages first so the lists can point at them
    rec_ids = {}
    for handle, title, cols, weight in CORE + [(h, t, [], 90) for h, t in HIDDEN_LISTS]:
        m = mods.get(handle)
        if not m:
            continue
        rb = [{"blockID": "1", "kind": "Record", "title": title[:-1] if title.endswith("s") else title, "xywh": [0, 0, 48, 90], "options": {"fields": m["fields"], "recordSelectorShowAddRecordButton": False, "magnifyOption": "", "inlineRecordEditEnabled": False}, "style": {"variants": {}}}]
        p = ensure(f"{handle}_record", title[:-1] if title.endswith("s") else title, m["moduleID"], rb, 100, visible=False)
        if p:
            layout(nsid, p, f"{handle}_record_layout", rb, buttons=True); rec_ids[handle] = p["pageID"]
    # home
    body = f"<h1>{org}</h1><p>Your Mareto sandbox. Programs: {', '.join(n for n in prog_names if n) or 'none yet'}.</p><p>Everything here is shaped from what you told us. People, programs, cases and events are the four things staff touch daily; the rest sits behind them. Thirty days from your invite we either promote this to your own build or delete it.</p>"
    hb = [{"blockID": "1", "kind": "Content", "title": "", "xywh": [0, 0, 48, 20], "options": {"body": body, "magnifyOption": ""}, "style": {"variants": {}}},
          {"blockID": "2", "kind": "RecordList", "title": "Programs", "xywh": [0, 20, 48, 40], "style": {"variants": {}}, "options": listopts(mods["program"], ["program_name", "program_code", "program_type_id", "status_type1_id"], rec_ids.get("program"))}]
    hp = ensure("home", "Home", "0", hb, 1)
    if hp:
        layout(nsid, hp, "home_layout", hb)
    # lists
    for handle, title, cols, weight in CORE:
        m = mods.get(handle)
        if not m:
            continue
        lb = [{"blockID": "1", "kind": "RecordList", "title": title, "xywh": [0, 0, 48, 90], "style": {"variants": {}}, "options": listopts(m, cols, rec_ids.get(handle))}]
        p = ensure(f"{handle}_list", title, "0", lb, weight)
        if p:
            layout(nsid, p, f"{handle}_list_layout", lb)
    print(f"pages now: {len(get(f'/api/compose/namespace/{nsid}/page/?limit=200')['response']['set'])}")
    print(f"open: https://demo.mareto.helpseeker.org/compose/ns/{a.ns}/pages/{pages['home']['pageID']}")


def listopts(m, cols, record_page_id):
    by = {f["name"]: f for f in m["fields"]}
    fields = [by[c] for c in cols if c in by] or [f for f in m["fields"] if f["kind"] != "Record"][:6]
    return {"moduleID": m["moduleID"], "fields": fields, "prefilter": "", "presort": "createdAt DESC", "perPage": 20, "recordPageID": record_page_id or "0",
            "hideHeader": False, "hideAddButton": False, "hideSearch": False, "hidePaging": False, "hideSorting": False, "hideRecordReminderButton": True, "hideRecordCloneButton": True, "hideRecordEditButton": False, "hideRecordViewButton": False,
            "allowExport": True, "bulkRecordEditEnabled": False, "editable": False, "editFields": [], "draggable": False, "customFilterPresets": False, "customSummaries": False,
            "enableRecordPageNavigation": True, "addRecordDisplayOption": "sameTab", "editRecordDisplayOption": "sameTab", "viewRecordDisplayOption": "sameTab", "magnifyOption": "", "showTotalCount": True, "showDeletedRecordsOption": False, "fullPageNavigation": True, "filterPresets": []}


if __name__ == "__main__":
    main()
