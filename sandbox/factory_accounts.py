"""Five seat accounts for a factory-built sandbox: counsellor, manager, director, board, researcher.

Each seat is a Corteza user plus a role scoped to one namespace by RBAC. Passwords are generated here,
set through the admin password route, and written ONLY to a private file on N: for the invite email.
Nothing credential-shaped is printed. Idempotent on handle and email.

  python sandbox/factory_accounts.py --ns sb-<slug>
"""
from __future__ import annotations
import argparse, json, secrets, sys, time
from pathlib import Path
sys.path.insert(0, r"C:\Users\alina\.claude\jobs\98050f0d\tmp")
from demo_api import get, post, call

SEATS = [  # handle, label, what the seat may do
    ("counsellor", "Counsellor", "write"),
    ("manager", "Program manager", "write"),
    ("director", "Director", "write"),
    ("board", "Board member", "read"),
    ("researcher", "Researcher", "read"),
]
SECRETS_DIR = Path(r"N:\HelpSeeker\Alina\Desktop\mareto-sandbox\seats")
MAIL_DOMAIN = "sandbox.helpseeker.org"


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--ns", required=True); a = ap.parse_args()
    ns = get(f"/api/compose/namespace/?slug={a.ns}")["response"]["set"][0]; nsid = ns["namespaceID"]
    mods = get(f"/api/compose/namespace/{nsid}/module/?limit=200")["response"]["set"]
    pages = get(f"/api/compose/namespace/{nsid}/page/?limit=200")["response"]["set"]
    layouts = {p["pageID"]: [l["pageLayoutID"] for l in (get(f"/api/compose/namespace/{nsid}/page/{p['pageID']}/layout/").get("response") or {}).get("set", [])] for p in pages}
    roles = {r["handle"]: r for r in get("/api/system/roles/?limit=500")["response"]["set"]}
    users = {u["email"]: u for u in get("/api/system/users/?limit=500")["response"]["set"]}
    out = {"namespace": a.ns, "namespaceID": nsid, "host": "https://demo.mareto.helpseeker.org", "seats": [], "made": time.strftime("%Y-%m-%d %H:%M")}
    for seat, label, mode in SEATS:
        rh = f"{a.ns}-{seat}"; email = f"{a.ns}.{seat}@{MAIL_DOMAIN}"
        role = roles.get(rh)
        if not role:
            r = post("/api/system/roles/", {"name": f"{ns['name']}: {label}", "handle": rh, "meta": {"description": f"Sandbox seat {seat} for {a.ns}"}})
            role = r.get("response") or sys.exit(f"role failed {rh}: {str(r)[:200]}"); roles[rh] = role
        user = users.get(email)
        pwd = None
        if not user:
            r = post("/api/system/users/", {"email": email, "name": f"{label} ({ns['name']})", "handle": rh.replace("-", "_"), "kind": ""})
            user = r.get("response") or sys.exit(f"user failed {email}: {str(r)[:200]}"); users[email] = user
            pwd = secrets.token_urlsafe(14)
            pr = post(f"/api/system/users/{user['userID']}/password", {"password": pwd})
            if "success" not in pr and "response" not in pr:
                print("  password route answered", str(pr)[:120])
        if role["roleID"] not in (get(f"/api/system/users/{user['userID']}/membership").get("response") or []):
            call("POST", f"/api/system/roles/{role['roleID']}/member/{user['userID']}", {})
        # RBAC: the namespace, its modules and records, its pages. Read seats see everything, write seats also create and update.
        rules = [{"resource": f"corteza::compose:namespace/{nsid}", "operation": "read", "access": "allow"},
                 {"resource": f"corteza::compose:namespace/{nsid}", "operation": "modules.search", "access": "allow"},
                 {"resource": f"corteza::compose:namespace/{nsid}", "operation": "pages.search", "access": "allow"},
                 {"resource": "corteza::system/", "operation": "roles.search", "access": "allow"},
                 {"resource": "corteza::system/", "operation": "users.search", "access": "allow"}]
        for m in mods:
            rules += [{"resource": f"corteza::compose:module/{nsid}/{m['moduleID']}", "operation": "read", "access": "allow"},
                      {"resource": f"corteza::compose:module/{nsid}/{m['moduleID']}", "operation": "records.search", "access": "allow"},
                      {"resource": f"corteza::compose:record/{nsid}/{m['moduleID']}/*", "operation": "read", "access": "allow"}]
            if mode == "write":
                rules += [{"resource": f"corteza::compose:module/{nsid}/{m['moduleID']}", "operation": "record.create", "access": "allow"},
                          {"resource": f"corteza::compose:record/{nsid}/{m['moduleID']}/*", "operation": "update", "access": "allow"}]
            for f in m["fields"]:
                rules += [{"resource": f"corteza::compose:module-field/{nsid}/{m['moduleID']}/{f['fieldID']}", "operation": "record.value.read", "access": "allow"}]
                if mode == "write":
                    rules += [{"resource": f"corteza::compose:module-field/{nsid}/{m['moduleID']}/{f['fieldID']}", "operation": "record.value.update", "access": "allow"}]
        for p in pages:
            rules += [{"resource": f"corteza::compose:page/{nsid}/{p['pageID']}", "operation": "read", "access": "allow"},
                      {"resource": f"corteza::compose:page/{nsid}/{p['pageID']}", "operation": "page-layouts.search", "access": "allow"}]
            for l in layouts.get(p["pageID"], []):
                rules.append({"resource": f"corteza::compose:page-layout/{nsid}/{p['pageID']}/{l}", "operation": "read", "access": "allow"})
        sys_rules = [r for r in rules if r["resource"].startswith("corteza::system")]
        comp_rules = [r for r in rules if not r["resource"].startswith("corteza::system")] + [{"resource": "corteza::compose/", "operation": "namespaces.search", "access": "allow"}]
        call("PATCH", f"/api/system/permissions/{role['roleID']}/rules", {"rules": sys_rules})
        pr = call("PATCH", f"/api/compose/permissions/{role['roleID']}/rules", {"rules": comp_rules})
        back = get(f"/api/compose/permissions/{role['roleID']}/rules")
        n = len(back.get("response") or [])
        print(f"  {seat}: role {role['roleID']} user {user['userID']} rules sent {len(rules)} stored {n}" + ("" if n else " <- NOT STORED " + str(pr)[:120]))
        out["seats"].append({"seat": seat, "label": label, "email": email, "password": pwd, "roleID": role["roleID"], "userID": user["userID"]})
    SECRETS_DIR.mkdir(parents=True, exist_ok=True)
    f = SECRETS_DIR / f"{a.ns}.json"
    if f.exists():  # keep passwords from the first run for seats that already existed
        old = {s["seat"]: s for s in json.loads(f.read_text(encoding="utf-8")).get("seats", [])}
        for s in out["seats"]:
            if s["password"] is None and s["seat"] in old:
                s["password"] = old[s["seat"]].get("password")
    f.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"seat file: {f} (private, not in git, not in chat)")


if __name__ == "__main__":
    main()
