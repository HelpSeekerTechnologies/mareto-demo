"""Act as a sandbox seat without a browser and report what it can read.

Ports the proven form-login flow (mareto-heartwood hw_mint_jwt.py): GET /auth/login for the same-site
token, POST credentials with https Origin and Referer and keep-session, then POST
/auth/oauth2/exchange-session with Sec-Fetch-Site same-origin. Credentials come from the private
seat file on N: and are never printed.

  python sandbox/seat_check.py --ns sb-<slug> [--seat counsellor]
"""
from __future__ import annotations
import argparse, http.cookiejar, json, re, urllib.parse, urllib.request
from pathlib import Path

BASE = "https://demo.mareto.helpseeker.org"
GW = {"Origin": BASE, "Referer": BASE + "/auth/login", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128 Safari/537.36"}


def login(email: str, pw: str) -> str:
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    html = op.open(urllib.request.Request(BASE + "/auth/login", headers=GW), timeout=30).read().decode("utf-8", "ignore")
    m = re.search(r'name="same-site-authenticity-token"[^>]*value="([^"]+)"', html)
    fields = {"email": email, "password": pw, "keep-session": "true"}
    if m:
        fields["same-site-authenticity-token"] = m.group(1)
    op.open(urllib.request.Request(BASE + "/auth/login", data=urllib.parse.urlencode(fields).encode(), headers=dict(GW, **{"Content-Type": "application/x-www-form-urlencoded"})), timeout=30).read()
    h3 = dict(GW, **{"Referer": BASE + "/auth/", "Sec-Fetch-Site": "same-origin", "Sec-Fetch-Mode": "cors", "Sec-Fetch-Dest": "empty", "X-Requested-With": "XMLHttpRequest"})
    tok = json.load(op.open(urllib.request.Request(BASE + "/auth/oauth2/exchange-session", data=b"", headers=h3), timeout=30))
    return tok["access_token"]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--ns", required=True); ap.add_argument("--seat", default="counsellor"); a = ap.parse_args()
    d = json.loads((Path(r"N:\HelpSeeker\Alina\Desktop\mareto-sandbox\seats") / f"{a.ns}.json").read_text(encoding="utf-8"))
    seat = next(s for s in d["seats"] if s["seat"] == a.seat); ns = d["namespaceID"]
    tok = login(seat["email"], seat["password"]); print(f"{a.seat}: login ok, token len {len(tok)}")
    H = {"Authorization": "Bearer " + tok, "User-Agent": GW["User-Agent"], "Accept": "application/json"}

    def get(p):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(BASE + p, headers=H), timeout=30))
        except Exception as e:  # noqa: BLE001
            return f"ERR {e}"
        if "error" in r:
            return "DENIED " + r["error"].get("message", "")[:60]
        s = r.get("response")
        return f"ok ({len(s['set'])} rows)" if isinstance(s, dict) and "set" in s else "ok"
    pages = get(f"/api/compose/namespace/{ns}/page/")
    checks = [("namespace read", f"/api/compose/namespace/{ns}"), ("namespaces list", "/api/compose/namespace/?limit=50"), ("modules search", f"/api/compose/namespace/{ns}/module/"), ("pages search", f"/api/compose/namespace/{ns}/page/")]
    for label, p in checks:
        print(f"  {label:18} {get(p)}")
    mods = urllib.request.urlopen(urllib.request.Request(BASE + f"/api/compose/namespace/{ns}/module/?handle=program", headers=H), timeout=30)
    mj = json.load(mods).get("response", {}).get("set") or []
    if mj:
        mid = mj[0]["moduleID"]
        print(f"  {'program records':18} {get(f'/api/compose/namespace/{ns}/module/{mid}/record/?limit=5')}")
    pj = json.load(urllib.request.urlopen(urllib.request.Request(BASE + f"/api/compose/namespace/{ns}/page/?handle=home", headers=H), timeout=30)).get("response", {}).get("set") or []
    if pj:
        pid = pj[0]["pageID"]
        print(f"  {'home page read':18} {get(f'/api/compose/namespace/{ns}/page/{pid}')}")
        print(f"  {'home layouts':18} {get(f'/api/compose/namespace/{ns}/page/{pid}/layout/')}")
    print(f"  {'heartwood ns read':18} {get('/api/compose/namespace/492981269441871873')}")


if __name__ == "__main__":
    main()
