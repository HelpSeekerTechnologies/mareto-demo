"""Rebuild the product tour's content on the approved copy (Alina, 30 Sep 2026), then put it on canon.

  python tools/tour.py            # rewrites mareto-general-product-tour.html in place
  python tools/canonize.py mareto-general-product-tour.html   # run after this

Per step: numbered navy pins (the red orbs go), a numbered callout list under the screenshot that mirrors the
pins, three insight cards with only claims a client can see today, one anonymised proof line, and the
"configured for you" callout. Adds the closing slide (the file only referenced #ctaSlide; it never existed) with
the transformation line and two actions. Screenshots are replaced separately by tools/shoot-tour.py.
"""
from __future__ import annotations

import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "mareto-general-product-tour.html"
QUIZ = "https://helpseekertechnologies.github.io/mareto-demo/mareto-fit-finder.html"
BOOK = "https://meetings.hubspot.com/travis-turner/meet-with-helpseeker-ma"

ICON = {
    "users": '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "bell": '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    "activity": '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    "user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
    "lock": '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    "layers": '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    "check": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    "search": '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    "file": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    "list": '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    "calendar": '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    "map-pin": '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    "settings": '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    "heart": '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    "database": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
}


def svg(name: str, stroke: str = "#fff") -> str:
    return f'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{ICON[name]}</svg>'


# Every word on the tour, per step. pins: (top%, left%, card side, title, text). Positions are against the
# canon board's screenshots at 1280 wide; tools/shoot-tour.py prints the element boxes to check them.
STEPS = [
    dict(step=1, title="Your daily dashboard", lede="The first thing staff see when they log in: a live snapshot of people, cases and activity across every program.",
         pins=[(19, 42, "left", "Quick actions", "Create a person, case, intake, event, appointment or announcement from the home screen. Staff never navigate away to start a record."),
               (33, 55, "left", "Live overview tiles", "People served, active cases, events logged, intakes, referrals and surveys, updated as staff work. Your organization picks what shows here."),
               (70, 50, "left", "Service area breakdown", "How your clients spread across service areas. Dashboard charts are configured to any dimension you track: demographics, referral sources, risk levels."),
               (86, 82, "right", "Announcements", "Priority notices every staff member sees on login: funder deadlines, policy changes, referral reminders."),
               (50, 8, "left", "Navigation", "Every module one click away. The sidebar is configured to your organization during setup, so staff only see what they need.")],
         cards=[("users", "Role-based views", "Each role sees a different dashboard: frontline workers, supervisors and directors each get what is relevant to them."),
                ("activity", "Computed, not typed", "Direct, collateral and indirect service hours appear on the tiles from the notes staff already write."),
                ("bell", "Always current", "Numbers update as staff work. No end-of-week exports, no manual reconciliation.")],
         proof=("KPI tiles are computed from the notes staff already write.", "In a four-program family-services build, direct, collateral and indirect hours appear on the landing page without anyone typing them."),
         configured="This dashboard is built around your organization's programs, KPIs and reporting needs. Every tile, chart and announcement is specific to how you operate."),
    dict(step=2, title="One person, one record", lede="Every individual has a single record no matter how many programs they touch. No duplicates, no silos.",
         pins=[(35, 50, "left", "One person, one record", "Every individual has exactly one record across every program. The system prompts staff to search before creating, so duplicates are prevented from day one."),
               (12, 84, "right", "Search and add", "Find anyone by name, date of birth or phone, across programs they left years ago. Export to CSV at any time: your data is yours."),
               (24, 60, "left", "Configurable columns", "Every column is configurable: role types, demographic fields, identity tracking, all set during implementation to match your terminology.")],
         cards=[("users", "One linked family", "A parent in the food bank and their child in the youth program are one connected family, not two strangers in two lists."),
                ("lock", "Privacy by design", "Sensitive fields are masked per role. A supervisor sees different data than a case worker, automatically."),
                ("download", "Export any time", "CSV export of your whole data model at no cost. No exit fees, no lock-in.")],
         proof=("One record per person, one linked family, across every program.", "The largest live build runs 19 programs on one person registry. Duplicate prevention at creation plus file merging when history has to be consolidated."),
         configured="The fields, roles and visibility rules on every person record are set during implementation to match your intake forms and privacy requirements."),
    dict(step=3, title="Case management", lede="Every case across every program at a glance, organized by status, assigned worker and program.",
         pins=[(20, 30, "left", "Dashboard cards", "Pin the metrics that matter to the top of any page: caseload by worker, cases needing attention, closures this month."),
               (12, 80, "right", "Create a case", "One-click case creation linked to an existing person. The case inherits the person's details; nothing is re-entered."),
               (55, 50, "left", "Cases by status", "Open, pending, on hold, transferred, closed: see where every case stands without opening a record. Columns match your workflow.")],
         cards=[("layers", "One case per enrolment", "A person enrolled in two programs has two cases and one record. Each program sees its own file; the history stays whole."),
                ("shield", "Program fences", "A note filed against another program's family is refused with the draft kept, so nothing crosses a line by accident."),
                ("clock", "Caseload in three bands", "Overdue, due now, upcoming. Workers see what needs them today, not a sorted table of everything.")],
         proof=("One case per program enrolment; the largest build runs 19 programs on one registry.", "Program isolation is proven live: a counsellor in one program cannot open, or be shown, another program's file."),
         configured="The status columns, alert thresholds and program categories are configured to your case management workflow, not a generic template."),
    dict(step=4, title="The event log", lede="Every interaction, session and touchpoint in one timeline: meetings, case notes, group sessions, crisis interventions, clinical notes.",
         pins=[(15, 30, "left", "Tabbed views with access rules", "Events are organized into tabs: general records, group sessions, crisis interventions, clinical notes. Each tab has its own access rules; clinical notes can be restricted to their author."),
               (45, 55, "left", "Every interaction, logged", "Home visits, phone calls, meetings, decisions: captured with person, type, date, duration and worker. Time tracking feeds service-hour reporting; no separate timesheets.")],
         cards=[("file", "Replaces paper and spreadsheets", "No more case notes scattered across email, paper files and shared drives. Every interaction is logged once, in one place."),
                ("clock", "Time tracking built in", "Start and end times, duration and event type are captured with the note and feed service-hour reporting."),
                ("search", "Searchable history", "Find any interaction by person, type, date or worker. A complete trail for accreditation and audits.")],
         proof=("One timeline for every interaction.", "The largest build carries 411 fields on a single event module across twelve programs; the form only shows the fields that apply to the event type chosen."),
         configured="Your event types, categories and access rules are defined during implementation. The system captures what your funders and accreditors require as a by-product of the work staff already do."),
    dict(step=5, title="Intake and referrals", lede="Track every referral from first contact to case assignment, with full visibility into where each intake stands and where it came from.",
         pins=[(20, 35, "left", "Intake at a glance", "Closed intakes, referral-source mix and the in-process count. Know where referrals come from and how fast you process them."),
               (12, 80, "right", "Create or receive intakes", "Start an intake in one click, or receive it through a public web form. When approved, an intake becomes a case in one click, carrying everything forward.")],
         cards=[("file", "Public web forms", "Referral sources submit through a form on your site and the data lands in the system. No retyping."),
                ("activity", "Intake analytics", "Referral mix, processing times and waitlist depth: what funders ask for and managers need."),
                ("check", "Intake to case", "An approved intake converts to a case in one click. No duplicate entry.")],
         proof=("Public referral forms feed the record directly.", "A four-program family-services build runs four live referral doors, one per program, with consent state shown on the record: expired, or expiring within 60 days."),
         configured="Your referral sources, intake statuses, required fields and waitlist rules are set to match your intake process, whether that is a single point of entry or program-specific pathways."),
    dict(step=6, title="Reporting", lede="Funder-ready numbers from your live data, filtered by any field, with every figure traceable to a record.",
         pins=[(22, 25, "left", "Filter by anything", "Any field you capture is a filter: program, period, demographics, status. Anything in, anything out."),
               (40, 55, "left", "Automatic KPIs", "People served, cases, events, service hours, risk flags: calculated from what staff enter daily. Every number traces back to a record."),
               (60, 80, "right", "Download for the funder", "Export the filtered result as CSV or an image for the submission. No manual counting, no Excel assembly.")],
         cards=[("list", "Rollup reports", "One report rolls every program up for a monthly funder requirement, and each program still gets its own numbers."),
                ("check", "Reconcilable", "Figures are deterministically reconcilable: a funder can ask for the list behind a number and get it."),
                ("calendar", "Any reporting period", "Monthly, quarterly, annual, or a custom range. Compare periods to show trends.")],
         proof=("Anything in, anything out.", "Buyers on demo calls describe weeks of manual assembly across three or four systems. In Mareto the funder number is a filter and a download, one number per person."),
         configured="Your report sections, KPIs and metrics are built around what your funders require. If a funder changes its template, we update the report, not your workflows."),
    dict(step=7, title="Many programs, one platform", lede="Run every program from one platform, each with its own caseload, workflows and reporting, all sharing one person registry.",
         pins=[(35, 35, "left", "Cross-program view", "How caseloads spread across your programs: where capacity is going and which programs are busiest."),
               (20, 80, "right", "Program pages", "Each program has its own page with dashboards, cases and reporting. Open Family Support, Youth Services, Counselling or any program to drill down.")],
         cards=[("layers", "Add a program without starting over", "A new program is new forms, fields, workflows and roles on the same registry, not a new system."),
                ("users", "Shared client records", "When a family moves between programs, their history follows them. No re-intake, no lost information."),
                ("database", "Grows without breaking the data model", "Most of what feels like a new feature is a vocabulary entry: in the largest build 220 of 301 modules are taxonomy.")],
         proof=("Each program has its own forms, workflows and roles.", "Builds range from a two-seat single program to 19 programs and 85 seats on one platform. Nine or more programs go live in waves rather than one cutover."),
         configured="Each program in Mareto has its own forms, fields, workflows and role permissions, configured to how that program operates. Add programs as your organization grows."),
]

NEXT = {1: "Next: person registry", 2: "Next: case management", 3: "Next: event log", 4: "Next: intake and referrals", 5: "Next: reporting", 6: "Next: programs", 7: "See if Mareto fits you"}


def slide_html(s: dict, img: str) -> str:
    n = s["step"]
    pins = []
    callouts = []
    for i, (top, left, side, title, text) in enumerate(s["pins"], 1):
        pos = 'right: 34px; top: -8px;' if side == "right" else 'left: 34px; top: -8px;'
        pins.append(f'<div class="hotspot" style="top:{top}%;left:{left}%" data-n="{i}" onclick="toggleHotspot(event,this)"><div class="hotspot-dot">{i}</div><div class="hotspot-card" data-n="{i}" style="{pos}"><strong>{html.escape(title)}</strong>{html.escape(text)}</div></div>')
        callouts.append(f'<li data-n="{i}" onclick="openHotspot({n},{i})"><span class="n">{i}</span><span><b>{html.escape(title)}.</b> {html.escape(text)}</span></li>')
    cards = "".join(f'<div class="insight-card"><div class="icon">{svg(ic)}</div><h4>{html.escape(t)}</h4><p>{html.escape(p)}</p></div>' for ic, t, p in s["cards"])
    proof_lead, proof_text = s["proof"]
    back = f'<button class="nav-btn prev" onclick="goToSlide({n - 1})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back</button>' if n > 1 else '<button class="nav-btn prev" style="visibility:hidden">Back</button>'
    nxt = f'<button class="nav-btn {"cta" if n == 7 else "next"}" onclick="goToSlide({n + 1})">{NEXT[n]} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>'
    return f'''<div class="slide" data-step="{n}">
    <div class="slide-inner">
      <div class="step-header">
        <div class="step-label">Step {n} of 7</div>
        <h2>{html.escape(s["title"])}</h2>
        <p>{html.escape(s["lede"])}</p>
      </div>
      <div class="screenshot-wrap">
        <img src="{img}" alt="Mareto, {html.escape(s["title"].lower())}">
        {"".join(pins)}
      </div>
      <ol class="hs-callouts" aria-label="What is on this screen">{"".join(callouts)}</ol>
      <div class="hs-proof"><span class="hs-medallion">{svg("check")}</span><div><b>{html.escape(proof_lead)}</b>{html.escape(proof_text)}</div></div>
      <div class="insights">{cards}</div>
      <div class="custom-callout"><div class="custom-icon">{svg("settings")}</div><p><strong>Configured for you:</strong> {html.escape(s["configured"])}</p></div>
      <div class="slide-nav">{back}{nxt}</div>
    </div>
  </div>
'''


CTA = f'''<div class="cta-slide" id="ctaSlide">
    <div class="cta-content">
      <span class="hs-medallion" style="width:56px;height:56px;margin:0 auto 18px">{svg("heart")}</span>
      <h2>Software is the easy part. We sort out the rest with you.</h2>
      <p>Every Mareto build starts with your impact model. We sit down with your team and work out the logic model, the referral pathways, the automations and the reporting, then configure the system to match. Our team comes from social impact, program evaluation and systems planning, and we hold your hand from discovery to go-live and after.</p>
      <div class="hs-actions">
        <a class="book-btn" href="{QUIZ}">Find out if Mareto fits you</a>
        <a class="hs-btn-secondary" href="{BOOK}" target="_blank" rel="noopener">Book a meeting</a>
      </div>
      <div class="cta-features">
        <div class="cta-feature"><div class="feat-icon">{svg("map-pin")}</div><strong>Data stays in Canada</strong>Hosted in Canada, two-factor sign-in on every login, export of your whole data model at any time at no cost.</div>
        <div class="cta-feature"><div class="feat-icon">{svg("database")}</div><strong>A receipt for every row you bring</strong>A family-services agency moved 89,560 notes in eleven days with zero mismatches on read-back. A youth shelter moved 126,259 events in one day.</div>
        <div class="cta-feature"><div class="feat-icon">{svg("layers")}</div><strong>Start small, grow without breaking it</strong>One program first if you like. New programs are new vocabulary and forms on the same data model, never a rebuild.</div>
      </div>
    </div>
  </div>
'''

LANDING = '''<div class="landing" id="landing">
  <img class="logo-img" src="{logo}" alt="Mareto by HelpSeeker Technologies">
  <h1>See Mareto <span>in action</span></h1>
  <p class="subtitle">A guided walk through how Mareto works for community service organizations: intake, case management, reporting and the programs in between.</p>
  <button class="start-btn" onclick="startTour()">Start the tour <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
  <p class="note">7 screens, about 2 minutes.<br>Every screen you see is configured to how your organization works.</p>
</div>
'''

JS_EXTRA = '''
function openHotspot(step,n){const s=document.querySelector('.slide[data-step="'+step+'"]');if(!s)return;closeAllHotspots();const h=s.querySelector('.hotspot[data-n="'+n+'"]');if(h){h.classList.add('open');h.scrollIntoView({block:'center',behavior:'smooth'})}syncCallouts()}
function syncCallouts(){document.querySelectorAll('.hs-callouts li').forEach(li=>li.classList.remove('on'));const o=document.querySelector('.hotspot.open');if(o){const li=o.closest('.slide').querySelector('.hs-callouts li[data-n="'+o.getAttribute('data-n')+'"]');if(li)li.classList.add('on')}}
document.addEventListener('click',()=>setTimeout(syncCallouts,0));
'''


def main() -> None:
    t = PAGE.read_text(encoding="utf-8")
    # keep Kim's embedded screenshots and logo, in order
    imgs = re.findall(r'<div class="slide" data-step="(\d)">[\s\S]*?<img src="([^"]+)"', t)
    by_step = {int(k): v for k, v in imgs}
    logo = re.search(r'<img class="logo-img" src="([^"]+)"', t).group(1)
    nav_logo = re.search(r'<div class="brand"><img src="([^"]+)"', t)
    head_end = t.index('<div class="landing"')
    tour_start = t.index('<div class="tour"')
    tour_open = t[tour_start:t.index('<div class="slide" data-step="1">')]
    script_start = t.index("<script>", tour_start)
    new = t[:head_end] + LANDING.format(logo=logo) + "\n" + tour_open + "".join(slide_html(s, by_step[s["step"]]) for s in STEPS) + CTA + "</div>\n\n" + t[script_start:]
    new = new.replace("</script>", JS_EXTRA + "</script>", 1)
    # copy on the nav: the exit button and the arrow keys stay as Kim wired them
    new = new.replace(">Exit Tour<", ">Exit tour<")
    PAGE.write_text(new, encoding="utf-8")
    print("tour rebuilt:", len(t), "->", len(new), "chars; steps", len(STEPS), "; nav logo kept:", bool(nav_logo))


if __name__ == "__main__":
    main()
