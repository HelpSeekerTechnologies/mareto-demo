"""Domain work for the buyer journey (SEO lane recommendation, 30 Sep 2026: mareto.helpseeker.org on the same
GitHub Pages repo via CNAME).

  python tools/domain.py prepare   # safe on any host: HubSpot tracking on all three pages, relative internal
                                   # links, noindex on the demo boards. Run today.
  python tools/domain.py cutover   # ONLY after the DNS CNAME resolves: writes the CNAME file, canonical tags,
                                   # absolute links in the results email, and a redirect note for old links.

Never run cutover before `nslookup mareto.helpseeker.org` answers with helpseekertechnologies.github.io: with a
CNAME file in the repo, GitHub Pages serves only the custom domain and the github.io URLs redirect to it.
"""
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOST = "mareto.helpseeker.org"
OLD = "https://helpseekertechnologies.github.io/mareto-demo/"
PAGES = ["mareto-general-product-tour.html", "mareto-fit-finder.html", "mareto-interactive-demo.html"]
BOARDS = ["mareto-interactive-demo.html", "mareto-demo-cfs.html", "mareto-demo-housing.html"]
HS = '<script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/5183115.js"></script>'


def prepare() -> None:
    for name in PAGES + BOARDS[1:]:
        p = ROOT / name
        t = p.read_text(encoding="utf-8")
        if "js.hs-scripts.com/5183115.js" not in t:
            t = t.replace("</head>", HS + "\n</head>", 1)
        # internal links survive a host change when they are relative
        t = t.replace(OLD, "./")
        if name in BOARDS and 'name="robots"' not in t:
            t = t.replace("<head>", '<head>\n<meta name="robots" content="noindex, nofollow">', 1)
        p.write_text(t, encoding="utf-8")
        print(name, "prepared")
    s = ROOT / "scripts" / "send-results-email.mjs"
    print("email script links still on", OLD, "until cutover")


def cutover() -> None:
    (ROOT / "CNAME").write_text(HOST + "\n", encoding="utf-8")
    for name in PAGES + BOARDS[1:]:
        p = ROOT / name
        t = p.read_text(encoding="utf-8")
        t = re.sub(r'<link rel="canonical"[^>]*>\n?', "", t)
        t = t.replace("<head>", f'<head>\n<link rel="canonical" href="https://{HOST}/{name}">', 1)
        p.write_text(t, encoding="utf-8")
    s = ROOT / "scripts" / "send-results-email.mjs"
    t = s.read_text(encoding="utf-8").replace(OLD, f"https://{HOST}/")
    s.write_text(t, encoding="utf-8")
    for name in PAGES:
        t = (ROOT / name).read_text(encoding="utf-8")
        t = re.sub(r"\./(mareto-[a-z-]+\.html)", rf"https://{HOST}/\1", t)
        (ROOT / name).write_text(t, encoding="utf-8")
    print("cutover written: CNAME, canonicals, absolute links on", HOST, "; commit, push, then enable Enforce HTTPS in Pages settings")


if __name__ == "__main__":
    {"prepare": prepare, "cutover": cutover}[sys.argv[1]]()
