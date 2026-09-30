"""Put a buyer-journey page on the Mareto canon (MARETO-UI-TARGET-V1.md v1.4, product lane).

  python tools/canonize.py mareto-interactive-demo.html [--dry-run]

What it does, in order: drops the Material Symbols link and pins Lato to 400/700; maps every off-canon hex in
CSS, inline styles and SVG to its canon token colour; folds font weights to 400/700; removes uppercase except the
11px stat eyebrow (re-applied by canon.css); turns every doughnut into bar rows; injects tools/canon.css after the
page's own <style>; on the board, adds the phone drawer (menu button, backdrop, Escape). Idempotent: a page that
already carries the canon block gets the block replaced, not doubled.
"""
from __future__ import annotations

import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
CANON = (HERE / "canon.css").read_text(encoding="utf-8")
MARK_START, MARK_END = "<!-- mareto-canon:start -->", "<!-- mareto-canon:end -->"

# off-canon -> canon. Bright teal survives only inside a gradient (handled before the map runs).
HEX = {
    "#0f1c3f": "#0B1F33", "#1a2d5a": "#1E3A5F", "#1a2d5c": "#1E3A5F", "#0a1628": "#0B1F33", "#0b2637": "#102A43",
    "#1a1a2e": "#2D3748", "#333333": "#2D3748", "#555555": "#4A5568", "#666666": "#4A5568", "#888888": "#4A5568",
    "#999999": "#4A5568", "#aaaaaa": "#4A5568", "#94a3b8": "#4A5568", "#9ca3af": "#4A5568", "#6b7280": "#4A5568",
    "#2ab5b2": "#0B7770", "#33ccc9": "#0B7770", "#0fb9b1": "#0B7770", "#1a8a88": "#0E8C86", "#76d7c4": "#7EDDD5",
    "#28bcb8": "#0B7770", "#3b6cf5": "#275C99", "#3b8ebf": "#4A8FD4", "#1a5276": "#1E3A5F", "#6366f1": "#2C5282",
    "#7c3aed": "#1E3A5F", "#8b5cf6": "#1E3A5F", "#a855f7": "#1E3A5F", "#f59e0b": "#4A8FD4", "#fbbf24": "#4A8FD4",
    "#d97706": "#4A8FD4", "#ef4444": "#1E3A5F", "#e74c3c": "#1E3A5F", "#dc2626": "#1E3A5F", "#dc3545": "#1E3A5F",
    "#e63946": "#1E3A5F", "#22c55e": "#0B7770", "#10b981": "#0B7770", "#22a55d": "#0B7770", "#27ae60": "#0B7770",
    "#065f46": "#0B7770", "#92400e": "#1E3A5F", "#991b1b": "#1E3A5F", "#d1fae5": "#E0F0EE", "#fef3c7": "#EDF5F4",
    "#fee2e2": "#EDF5F4", "#e6faf9": "#E0F0EE", "#e8f8f7": "#EDF5F4", "#eef2ff": "#EDF5F4", "#e8ecf5": "#EDF5F4",
    "#f0f2f7": "#F9FAFB", "#f0f2f5": "#EDF5F4", "#f8f9fb": "#F9FAFB", "#f8f9fa": "#F9FAFB", "#f8fafa": "#F9FAFB",
    "#059669": "#0B7770", "#0d8a87": "#0E8C86", "#166534": "#0B7770", "#1a2744": "#0B1F33", "#1e40af": "#2C5282",
    "#3730a3": "#1E3A5F", "#3b6fa0": "#2C5282", "#4ade80": "#7EDDD5", "#4b5563": "#4A5568", "#854d0e": "#1E3A5F",
    "#b2e6e4": "#E0F0EE", "#c5e8e6": "#E0F0EE", "#d1d5db": "#E5E7EB", "#d4f3f1": "#E0F0EE", "#dbeafe": "#EDF5F4",
    "#dcfce7": "#E0F0EE", "#e0e7ff": "#EDF5F4", "#e0f5f5": "#E0F0EE", "#e0f7f6": "#E0F0EE", "#e8e9ed": "#EDF5F4",
    "#e8f6f3": "#EDF5F4", "#ec4899": "#1E3A5F", "#f0f0f0": "#EDF5F4", "#f0fafa": "#F9FAFB", "#f39c12": "#4A8FD4",
    "#f7fafa": "#F9FAFB", "#fef9c3": "#EDF5F4", "#ff6b6b": "#1E3A5F", "#ffc107": "#4A8FD4", "#fff3cd": "#EDF5F4",
    "#f3f4f6": "#EDF5F4", "#fafafa": "#F9FAFB", "#e2e6ec": "#E5E7EB", "#e5e7eb": "#E5E7EB", "#0f1e3a": "#0B1F33",
}
SHORT = {"#333": "#2D3748", "#555": "#4A5568", "#666": "#4A5568", "#888": "#4A5568", "#999": "#4A5568", "#aaa": "#4A5568", "#ccc": "#E5E7EB", "#ddd": "#E5E7EB", "#eee": "#EDF5F4"}
GRADIENT_RE = re.compile(r"linear-gradient\([^()]*(?:\([^()]*\)[^()]*)*\)", re.I)


def canon_gradient(g: str) -> str:
    """Every off-canon gradient becomes one of the two sanctioned ones: a tint band stays a mist tint; anything
    else is the action gradient (light text sits on it)."""
    low = g.lower()
    if any(x in low for x in ("#e8f8f7", "#f0f2f7", "#e6faf9", "rgba(15,185,177,0.0", "rgba(42,181,178,.0", "rgba(42,181,178,0.0")):
        return "linear-gradient(135deg,#EDF5F4,#F9FAFB)"
    return "linear-gradient(135deg,#0B1F33 22%,#336FB5 100%)"


def map_colours(t: str) -> str:
    t = GRADIENT_RE.sub(lambda m: canon_gradient(m.group(0)), t)
    def hex6(m):
        h = m.group(0).lower()
        return HEX.get(h, m.group(0))
    t = re.sub(r"#[0-9a-fA-F]{6}\b", hex6, t)
    t = re.sub(r"#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])", lambda m: SHORT.get(m.group(0).lower(), m.group(0)), t)
    # navy-tinted shadows, never black
    t = re.sub(r"rgba\(0,\s*0,\s*0,\s*([0-9.]+)\)", r"rgba(11,31,51,\1)", t)
    # Kim's teal alphas -> canon teal alphas
    t = re.sub(r"rgba\(42,\s*181,\s*178,\s*([0-9.]+)\)", r"rgba(15,185,177,\1)", t)
    return t


def fold_weights(t: str) -> str:
    t = re.sub(r"font-weight:\s*(900|800|600|500)\b", "font-weight:700", t)
    t = re.sub(r"font-weight:\s*(300|200|100)\b", "font-weight:400", t)
    t = re.sub(r"Lato:wght@[0-9;]+", "Lato:wght@400;700", t)
    return t


def drop_uppercase(t: str) -> str:
    return re.sub(r"text-transform:\s*uppercase;?", "", t)


def fix_labels(t: str) -> str:
    """Kim's demo data carries a literal "undefined" referral source; a person reads "Not recorded"."""
    t = t.replace('data-tip="undefined|', 'data-tip="Not recorded|')
    t = re.sub(r'(<div class="(?:rep-)?legend-dot"[^>]*></div>)\s*undefined', r'Not recorded', t)
    return t.replace('>undefined<', '>Not recorded<')


def drop_material(t: str) -> str:
    return re.sub(r'<link[^>]+Material\+Symbols[^>]*>\s*', "", t)


def _balanced_div(t: str, start: int) -> int:
    """Index just past the </div> that closes the <div at `start`."""
    depth = 0
    for m in re.finditer(r"<div\b|</div>", t[start:]):
        depth += 1 if m.group(0) == "<div" else -1
        if depth == 0:
            return start + m.end()
    raise ValueError("unbalanced div")


def _legend_items(block: str) -> list[tuple[str, str]]:
    out = []
    for m in re.finditer(r'class="(?:rep-)?legend-item"[^>]*>\s*<div[^>]*></div>\s*([^<]+)', block):
        text = m.group(1).strip()
        mm = re.match(r"(.*?)\s*\(([^)]*)\)\s*$", text)
        out.append((mm.group(1), mm.group(2)) if mm else (text, ""))
    return out


def bars_html(rows: list[tuple[str, str, float]], total: str | None) -> str:
    top = max([r[2] for r in rows] + [1e-9])
    li = "".join(
        f'<div class="hs-bar"><span class="hs-bar__l">{lab}</span><span class="hs-bar__t"><span class="hs-bar__f" style="width:{round(100 * pct / top)}%"></span></span><span class="hs-bar__v">{val}</span></div>'
        for lab, val, pct in rows)
    tot = f'<div class="hs-bars--total">Total {total}</div>' if total else ""
    return f'<div class="hs-bars">{li}</div>{tot}'


def donuts_to_bars(t: str) -> tuple[str, int]:
    """Each donut-wrap (svg of dasharray circles) becomes bar rows. Labels come from each slice's data-tip
    ("Label|Count: N") or, failing that, from the legend items that sit beside the donut, in slice order; that
    legend is then removed because the rows carry the labels."""
    n = 0
    while True:
        i = t.find('<div class="donut-wrap"')
        if i < 0:
            break
        j = _balanced_div(t, i)
        wrap = t[i:j]
        circles = re.findall(r"<circle[^>]*stroke-dasharray=\"([0-9.]+)[^\"]*\"[^>]*>", wrap)
        tips = re.findall(r'data-tip="([^"|]*)\|(?:Count:\s*)?([^"]*)"', wrap)
        total_m = re.search(r'class="dc-val"[^>]*>([^<]*)<', wrap)
        total = total_m.group(1).strip() if total_m else None
        rows: list[tuple[str, str, float]] = []
        removed_legend = False
        if tips and len(tips) == len(circles):
            rows = [(lab.strip() or "Not recorded", val.strip(), float(p)) for (lab, val), p in zip(tips, circles)]
        else:
            # legend beside the donut: look in the enclosing flex container
            # (the previous "<div" that encloses i), then use its legend items
            k = t.rfind("<div", 0, i)
            enc_end = _balanced_div(t, k) if k >= 0 else j
            enc = t[k:enc_end]
            legend = _legend_items(enc)
            if legend and len(legend) >= len(circles):
                rows = [(lab, val, float(p)) for (lab, val), p in zip(legend, circles)]
                # replace the whole enclosing container (donut + legend) with the rows
                t = t[:k] + bars_html(rows, total) + t[enc_end:]
                removed_legend = True
                n += 1
                continue
            rows = [(f"Series {ix + 1}", "", float(p)) for ix, p in enumerate(circles)]
        t = t[:i] + bars_html(rows, total) + t[j:]
        n += 1
    # a legend that still sits beside converted bars (tips case) is redundant: drop legends immediately preceding hs-bars
    t = re.sub(r'<div class="rep-legend"[^>]*>(?:\s*<div class="rep-legend-item">.*?</div>)+\s*</div>\s*(?=<div class="rep-chart-wrap">\s*<div class="hs-bars">)', "", t, flags=re.S)
    # a legend block that sits right before or after converted rows says the same thing twice: drop it
    legend_block = r'<div(?:\s[^>]*)?>(?:\s*<div class="(?:rep-)?legend-item">(?:<div[^>]*></div>)?[^<]*</div>)+\s*</div>'
    rows_block = r'(<div class="hs-bars">(?:<div class="hs-bar">(?:<span[^>]*>(?:<span[^>]*></span>)?[^<]*</span>)+</div>)+</div>(?:<div class="hs-bars--total">[^<]*</div>)?)'
    t = re.sub(rows_block + r'\s*' + legend_block, r'\1', t)
    t = re.sub(legend_block + r'\s*(?=<div class="hs-bars">)', '', t)
    return t, n


def inject_canon(t: str) -> str:
    block = f'{MARK_START}<style id="mareto-canon">\n{CANON}\n</style>{MARK_END}'
    if MARK_START in t:
        return re.sub(re.escape(MARK_START) + r"[\s\S]*?" + re.escape(MARK_END), lambda _: block, t)
    return t.replace("</head>", block + "\n</head>", 1)


BOARD_DRAWER = """<!-- mareto-canon:drawer -->
<div class="hs-backdrop" id="hsBackdrop"></div>
<script>
(function(){
  var sb=document.getElementById('sidebar'),bd=document.getElementById('hsBackdrop'),tb=document.querySelector('.top-bar');
  if(!sb||!tb)return;
  var btn=document.createElement('button');btn.className='hs-menu';btn.type='button';btn.setAttribute('aria-label','Open menu');btn.setAttribute('aria-expanded','false');
  btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  tb.insertBefore(btn,tb.firstChild);
  function open(){sb.classList.add('open');document.body.classList.add('hs-drawer-open');btn.setAttribute('aria-expanded','true')}
  function close(){sb.classList.remove('open');document.body.classList.remove('hs-drawer-open');btn.setAttribute('aria-expanded','false')}
  btn.addEventListener('click',function(){sb.classList.contains('open')?close():open()});
  bd.addEventListener('click',close);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  var x=sb.querySelector('.sidebar-close');if(x)x.addEventListener('click',function(e){e.preventDefault();close()});
  sb.addEventListener('click',function(e){var it=e.target.closest('.nav-item,.nav-child');if(it&&!it.querySelector('.chevron')&&window.innerWidth<1024)setTimeout(close,120)});
})();
</script>
<!-- /mareto-canon:drawer -->"""


def board_extras(t: str) -> str:
    if "mareto-canon:drawer" in t:
        return t
    return t.replace("</body>", BOARD_DRAWER + "\n</body>", 1)


def run(path: pathlib.Path, dry: bool) -> None:
    t = path.read_text(encoding="utf-8")
    before = len(t)
    t = drop_material(t)
    t = fix_labels(t)
    t = fold_weights(t)
    t = drop_uppercase(t)
    t = map_colours(t)
    t, n_donuts = donuts_to_bars(t)
    t = inject_canon(t)
    if "interactive-demo" in path.name:
        t = board_extras(t)
    left = sorted(set(h.lower() for h in re.findall(r"#[0-9a-fA-F]{6}\b", re.sub(r"data:image/[^\"']+", "", t))))
    canon = {v.lower() for v in HEX.values()} | {"#ffffff", "#000000", "#336fb5", "#3d9b96", "#0e8c86", "#0fb9b1", "#4fd1c5", "#7eddd5", "#e0f0ee", "#edf5f4", "#0b7770", "#275c99", "#2c5282", "#4a8fd4", "#1e3a5f", "#102a43", "#0b1f33", "#2d3748", "#4a5568", "#f9fafb", "#e5e7eb"}
    odd = [h for h in left if h not in canon]
    print(f"{path.name}: {before} -> {len(t)} chars; doughnuts converted {n_donuts}; off-canon hex left: {odd}")
    if not dry:
        path.write_text(t, encoding="utf-8")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    for a in sys.argv[1:]:
        if a.startswith("--"):
            continue
        run(ROOT / a if not pathlib.Path(a).is_absolute() else pathlib.Path(a), dry)
