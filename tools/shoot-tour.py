"""Re-shoot the product tour's seven screenshots from the canon demo board and place the pins from measured
element boxes.

  python -m http.server 8793 --bind 127.0.0.1      # from the repo root, in another window
  python tools/shoot-tour.py [http://127.0.0.1:8793]

Needs Playwright (PLAYWRIGHT_BROWSERS_PATH set) and Pillow. Writes the screenshots and the two lockups into
mareto-general-product-tour.html as data URIs (the same way Kim shipped them), updates every hotspot's top/left
from the element it points at, and prints what it measured.
"""
from __future__ import annotations

import base64
import io
import os
import pathlib
import re
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "mareto-general-product-tour.html"
BASE = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith("http") else "http://127.0.0.1:8793"
LOGO = pathlib.Path(r"N:\HelpSeeker\Alina\Desktop\Logo Files\PB_Mareto Logo-01.png")
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", r"C:\Users\alina\AppData\Local\ms-playwright")

# step -> (board page id, [pin target selectors in pin order])
SHOTS = {
    1: ("home", [".quick-actions", "#page-home .card-row .card:nth-child(1)", "#page-home .bar-chart", "text=Special Announcements", ".sidebar .nav-list"]),
    2: ("person", ["#page-person .card table", "#page-person .btn-add", "#page-person .card th:nth-child(3)"]),
    3: ("case", ["#page-case .card-row", "#page-case .btn-add", "#page-case .kanban, #page-case .kanban-board, #caseKanban"]),
    4: ("event", ["#eventTabs", "#event-records table, #page-event .card table"]),
    5: ("intake", ["#page-intake .card-row", "#page-intake .btn-add, #page-intake .btn-gradient"]),
    6: ("strategic", ["#page-strategic .text-tabs", "#page-strategic .strat-kpi-row", "#page-strategic .btn-teal"]),
    7: ("programs", ["#page-programs .bar-chart, #page-programs .hs-bars", ".nav-children.show, .nav-item[data-page=\"programs\"]"]),
}


def data_uri(png: bytes) -> str:
    return "data:image/png;base64," + base64.b64encode(png).decode()


def small_logo(width: int) -> str:
    im = Image.open(LOGO).convert("RGBA")
    im.thumbnail((width, width))
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
    return data_uri(buf.getvalue())


def go(page, pid: str) -> None:
    ok = page.evaluate(f"""() => {{
      const el = document.querySelector('[data-page="{pid}"]');
      if (!el) return false;
      const parent = el.closest('.nav-children');
      if (parent && !parent.classList.contains('show')) {{ const p = parent.previousElementSibling; if (p) p.click(); }}
      el.click(); return true; }}""")
    if not ok:
        raise SystemExit(f"no nav entry for page {pid}")
    page.wait_for_timeout(700)
    page.evaluate("window.scrollTo(0,0); document.querySelector('.content-area').scrollTop = 0")
    page.wait_for_timeout(200)


def main() -> None:
    t = PAGE.read_text(encoding="utf-8")
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={"width": 1280, "height": 1000}, device_scale_factor=1.5)
        pg = ctx.new_page()
        pg.goto(f"{BASE}/mareto-interactive-demo.html", wait_until="load")
        pg.wait_for_timeout(1200)
        for step, (pid, targets) in SHOTS.items():
            go(pg, pid)
            active = pg.evaluate(f"!!document.querySelector('#page-{pid}.active')")
            png = pg.screenshot(type="png")
            boxes = []
            for sel in targets:
                finder = (f"[...document.querySelectorAll('#page-{pid} *')].find(x => x.children.length === 0 && x.textContent.trim() === '{sel[5:]}')" if sel.startswith("text=") else f"document.querySelector('{sel}')")
                r = pg.evaluate(f"""() => {{ const e = {finder}; if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width/2, r.top + Math.min(r.height/2, 40), r.width, r.height]; }}""")
                boxes.append(r)
            print(f"step {step} page {pid} active={active} shot={len(png)//1024}KB boxes={[[round(x) for x in bx] if bx else None for bx in boxes]}")
            # the screenshot for this step
            m = re.search(rf'(<div class="slide" data-step="{step}">[\s\S]*?<img src=")([^"]+)(")', t)
            t = t[:m.start(2)] + data_uri(png) + t[m.end(2):]
            # the pins: viewport pixels to percentages of the 1280x860 shot
            for n, bx in enumerate(boxes, 1):
                if not bx:
                    print(f"  pin {n}: target not found, position kept")
                    continue
                left = round(100 * bx[0] / 1280, 1); top = round(100 * bx[1] / 1000, 1)
                t, k = re.subn(rf'(<div class="slide" data-step="{step}">[\s\S]*?<div class="hotspot" style=")top:[0-9.]+%;left:[0-9.]+%(" data-n="{n}")', rf'\g<1>top:{top}%;left:{left}%\g<2>', t, count=1)
                # the card opens away from the nearer edge
                side = 'right: 34px; top: -8px;' if left > 58 else 'left: 34px; top: -8px;'
                t = re.sub(rf'(<div class="slide" data-step="{step}">[\s\S]*?<div class="hotspot-card" data-n="{n}" style=")[^"]*(")', rf'\g<1>{side}\g<2>', t, count=1)
                if not k:
                    print(f"  pin {n}: hotspot markup not found")
        b.close()
    # lockups: one small PNG for the nav brand and the landing
    logo = small_logo(560)
    t = re.sub(r'(<div class="brand"><img src=")[^"]+(")', rf'\g<1>{logo}\g<2>', t, count=1)
    t = re.sub(r'(<img class="logo-img" src=")[^"]+(")', rf'\g<1>{logo}\g<2>', t, count=1)
    PAGE.write_text(t, encoding="utf-8")
    print("written:", len(t) // 1024, "KB")


if __name__ == "__main__":
    main()
