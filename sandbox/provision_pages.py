"""Travis's review queue on demo.mareto: a list page over sandbox_request and a record page.

Idempotent on handles. Page create is POST on the collection; page update is POST on the item; the
layout is a separate POST and is what renders (memory: corteza-page-layout-is-what-renders).

  python sandbox/provision_pages.py
"""
from __future__ import annotations
import json, sys
sys.path.insert(0, r"C:\Users\alina\.claude\jobs\98050f0d\tmp")
from demo_api import get, post

NS_SLUG = "sandbox-intake"; MOD = "sandbox_request"
LIST_FIELDS = ["org", "province", "email", "timeline", "source", "score_points", "score_band", "size_band", "status"]
RECORD_FIELDS = ["status", "score_points", "score_band", "size_band", "score_reasons", "org", "province", "website", "email", "role", "second",
                 "timeline", "contract_end", "source", "programs", "roles", "notes", "tenant_slug", "invited_at", "expires_at", "forms", "samples"]


def main():
    ns = get(f"/api/compose/namespace/?slug={NS_SLUG}")["response"]["set"][0]; nsid = ns["namespaceID"]
    mod = get(f"/api/compose/namespace/{nsid}/module/?handle={MOD}")["response"]["set"][0]; mid = mod["moduleID"]
    by_name = {f["name"]: f for f in mod["fields"]}
    pages = {p["handle"]: p for p in get(f"/api/compose/namespace/{nsid}/page/?limit=100")["response"]["set"]}

    # record page first so the list can navigate into it
    rec = pages.get("sandbox_request_record")
    rec_blocks = [
        {"blockID": "1", "kind": "Content", "title": "", "xywh": [0, 0, 48, 10], "options": {"body": "<h2>Sandbox request</h2><p>Score, build, invite. Set the status as you go; the page itself does nothing automatic.</p>", "magnifyOption": ""}, "style": {"variants": {}}},
        {"blockID": "2", "kind": "Record", "title": "Request", "xywh": [0, 10, 48, 80], "options": {"fields": [by_name[n] for n in RECORD_FIELDS if n in by_name], "recordSelectorShowAddRecordButton": False, "magnifyOption": "", "inlineRecordEditEnabled": False}, "style": {"variants": {}}},
    ]
    if not rec:
        r = post(f"/api/compose/namespace/{nsid}/page/", {"title": "Sandbox request", "handle": "sandbox_request_record", "moduleID": mid, "selfID": "0", "visible": True, "weight": 2,
                 "config": {"navItem": {"expanded": False, "icon": {"src": ""}}}, "meta": {"allowPersonalLayouts": False, "notifications": {"enabled": True}}, "blocks": rec_blocks, "description": ""})
        rec = r["response"]; print("record page created", rec["pageID"])
    else:
        print("record page exists", rec["pageID"])
    layout(nsid, rec, "sandbox_request_record_layout", rec_blocks, buttons=True)

    lst = pages.get("sandbox_requests")
    list_blocks = [
        {"blockID": "1", "kind": "Content", "title": "", "xywh": [0, 0, 48, 10], "options": {"body": "<h1>Sandbox requests</h1><p>Newest first. Score runs within the hour of a request landing; a band of sandbox means build it, waitlist means nurture.</p>", "magnifyOption": ""}, "style": {"variants": {}}},
        {"blockID": "2", "kind": "RecordList", "title": "Queue", "xywh": [0, 10, 48, 80], "style": {"variants": {}}, "options": {
            "moduleID": mid, "fields": [by_name[n] for n in LIST_FIELDS if n in by_name], "prefilter": "", "presort": "createdAt DESC", "perPage": 25,
            "hideHeader": False, "hideAddButton": True, "hideSearch": False, "hidePaging": False, "hideSorting": False, "hideRecordReminderButton": True, "hideRecordCloneButton": True, "hideRecordEditButton": False, "hideRecordViewButton": False,
            "allowExport": True, "bulkRecordEditEnabled": False, "editable": False, "editFields": [], "draggable": False, "customFilterPresets": False, "customSummaries": False,
            "enableRecordPageNavigation": True, "addRecordDisplayOption": "sameTab", "editRecordDisplayOption": "sameTab", "viewRecordDisplayOption": "sameTab", "magnifyOption": "", "showTotalCount": True, "showDeletedRecordsOption": False, "fullPageNavigation": True,
            "filterPresets": [{"name": "Needs a score", "filter": [[{"field": "status", "operator": "=", "value": "received"}]], "roles": []}, {"name": "Sandbox band", "filter": [[{"field": "score_band", "operator": "=", "value": "sandbox"}]], "roles": []}, {"name": "Waitlist", "filter": [[{"field": "score_band", "operator": "!=", "value": "sandbox"}]], "roles": []}]}},
    ]
    if not lst:
        r = post(f"/api/compose/namespace/{nsid}/page/", {"title": "Sandbox requests", "handle": "sandbox_requests", "moduleID": "0", "selfID": "0", "visible": True, "weight": 1,
                 "config": {"navItem": {"expanded": False, "icon": {"src": ""}}}, "meta": {"allowPersonalLayouts": False, "notifications": {"enabled": True}}, "blocks": list_blocks, "description": ""})
        lst = r["response"]; print("list page created", lst["pageID"])
    else:
        print("list page exists", lst["pageID"])
    layout(nsid, lst, "sandbox_requests_layout", list_blocks)
    print(f"open: https://demo.mareto.helpseeker.org/compose/ns/{NS_SLUG}/pages/{lst['pageID']}")


def layout(nsid, page, handle, blocks, buttons=False):
    live = get(f"/api/compose/namespace/{nsid}/page/{page['pageID']}")["response"]  # ids are renumbered after a write; read live
    ids = [b["blockID"] for b in live["blocks"]]
    lays = get(f"/api/compose/namespace/{nsid}/page/{page['pageID']}/layout/")["response"]["set"]
    btn = {k: {"enabled": buttons and k in ("edit", "submit", "back"), "label": ""} for k in ("new", "edit", "submit", "delete", "clone", "back")}
    body = {"handle": handle, "meta": {"title": page["title"], "description": "", "style": {}}, "weight": 1,
            "blocks": [{"blockID": bid, "xywh": blocks[i]["xywh"], "meta": {"hidden": False, "visibility": {"expression": "", "roles": []}}} for i, bid in enumerate(ids)],
            "config": {"visibility": {"expression": ""}, "buttons": btn, "validation": {}, "useTitle": True}}
    if lays:
        r = post(f"/api/compose/namespace/{nsid}/page/{page['pageID']}/layout/{lays[0]['pageLayoutID']}", body)
    else:
        r = post(f"/api/compose/namespace/{nsid}/page/{page['pageID']}/layout/", body)
    back = get(f"/api/compose/namespace/{nsid}/page/{page['pageID']}/layout/")["response"]["set"]
    ok = back and [b["blockID"] for b in back[0]["blocks"]] == ids
    print("  layout", handle, "ok" if ok else "MISMATCH " + str(r)[:200])


if __name__ == "__main__":
    main()
