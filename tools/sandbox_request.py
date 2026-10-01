"""Build mareto-sandbox-request.html: the Stage B questionnaire that feeds the to-spec sandbox.

  python tools/sandbox_request.py        # writes the page with canon.css and the hero image inlined

Plan: C:\\Users\\alina\\.claude\\plans\\cosmic-frolicking-pudding.md (30 Sep 2026). Six steps: organization,
programs, who does what, forms, data sample, agreement. Progress is saved in the browser and can be sent as a
resume link. Submission posts one JSON document to SANDBOX_API (a gateway route on demo.mareto); while that
route is unset the page keeps the draft locally and shows the "we are building it" screen so the flow can be
reviewed end to end. No competitor names, no client names, no prices on this page.
"""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
HERE = pathlib.Path(__file__).resolve().parent
PAGE = ROOT / "mareto-sandbox-request.html"
QUIZ = ROOT / "mareto-fit-finder.html"
BOOK = "https://meetings.hubspot.com/travis-turner/meet-with-helpseeker-ma"
DEMO = "./mareto-interactive-demo.html"

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Build my Mareto sandbox</title>
<meta name="description" content="Tell us how your organization works and we build a Mareto sandbox shaped like you: your programs, your roles, your forms.">
<link rel="canonical" href="https://demo.helpseeker.org/mareto-sandbox-request.html">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">
<!-- Start of HubSpot Embed Code -->
<script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/5183115.js"></script>
<!-- End of HubSpot Embed Code -->
<style>
{canon}
:root{--hs-hero-image:url("{hero}")}
/* sandbox request */
body{margin:0;background:var(--hs-page);color:var(--hs-ink);font-family:'Lato',system-ui,sans-serif}
.sr-wrap{max-width:860px;margin:0 auto;padding:28px 20px 80px}
.sr-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
.sr-top img{height:36px}
.sr-top a{color:var(--hs-link);font-weight:700;text-decoration:none;font-size:14px}
.sr-progress{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:0 0 22px}
.sr-progress span{height:8px;border-radius:999px;background:var(--hs-mist)}
.sr-progress span.on{background:var(--hs-action-gradient)}
.sr-progress span.done{background:var(--hs-pine)}
.sr-step{display:none}.sr-step.active{display:block}
.sr-step h2{font-size:26px;color:var(--hs-navy);margin:0 0 6px}
.sr-step .lede{color:var(--hs-muted);margin:0 0 20px;font-size:15px;line-height:1.5;max-width:640px}
.sr-card{background:var(--hs-surface);border-radius:var(--hs-radius-card);box-shadow:var(--sh2);padding:22px 24px;margin:0 0 14px}
.sr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.sr-field{display:grid;gap:6px}
.sr-field label{font-size:12.5px;font-weight:700;color:var(--hs-slate)}
.sr-field input,.sr-field select,.sr-field textarea{border:0;border-radius:var(--hs-radius-control);background:var(--hs-mist);box-shadow:var(--hs-inset);min-height:42px;padding:8px 14px;font:inherit;color:var(--hs-navy);width:100%;box-sizing:border-box}
.sr-field textarea{min-height:84px;border-radius:var(--hs-radius-field);resize:vertical}
.sr-field .hint{font-size:12px;color:var(--hs-muted)}
.sr-field.err input,.sr-field.err select{box-shadow:0 0 0 2px var(--hs-pine) inset}
.sr-chips{display:flex;flex-wrap:wrap;gap:8px}
.sr-chip{border:0;border-radius:999px;padding:9px 16px;background:var(--hs-mist);color:var(--hs-navy);font:inherit;font-weight:700;font-size:13.5px;cursor:pointer}
.sr-chip.on{background:var(--hs-pale);color:var(--hs-pine);box-shadow:var(--sh1)}
.sr-program{position:relative}
.sr-program .sr-x{position:absolute;top:12px;right:12px;border:0;background:var(--hs-mist);border-radius:999px;width:32px;height:32px;cursor:pointer;color:var(--hs-slate);font-size:18px}
.sr-program h3{margin:0 0 12px;font-size:16px;color:var(--hs-navy)}
.sr-add{border:0;border-radius:999px;padding:12px 22px;background:var(--hs-mist);color:var(--hs-navy);font:inherit;font-weight:700;cursor:pointer}
.sr-roles{display:grid;gap:10px}
.sr-role{display:grid;grid-template-columns:1fr 1.2fr;gap:12px;align-items:center;background:var(--hs-mist);border-radius:var(--hs-radius-field);padding:12px 14px}
.sr-role input{border:0;border-radius:var(--hs-radius-control);background:var(--hs-surface);box-shadow:var(--hs-inset);min-height:42px;padding:8px 14px;font:inherit;color:var(--hs-navy);width:100%;box-sizing:border-box}
.sr-role b{color:var(--hs-navy);font-size:14px}.sr-role small{display:block;color:var(--hs-muted);font-weight:400;font-size:12px}
.sr-drop{border:0;border-radius:var(--hs-radius-card);background:var(--hs-mist);padding:26px;text-align:center;color:var(--hs-muted);cursor:pointer}
.sr-drop.over{background:var(--hs-pale)}
.sr-drop b{display:block;color:var(--hs-navy);margin-bottom:4px}
.sr-files{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px}
.sr-files li{display:flex;justify-content:space-between;align-items:center;background:var(--hs-surface);box-shadow:var(--sh1);border-radius:var(--hs-radius-field);padding:8px 12px;font-size:13.5px}
.sr-files li i{width:8px;height:8px;border-radius:50%;background:var(--hs-pine);display:inline-block;margin-right:8px}
.sr-files li.bad i{background:var(--hs-slate)}
.sr-files li em{font-style:normal;color:var(--hs-muted);font-size:12px}
.sr-note{background:var(--hs-pale);border-radius:var(--hs-radius-field);padding:12px 14px;font-size:13.5px;color:var(--hs-pine);margin:12px 0 0;line-height:1.5}
.sr-nav{display:flex;justify-content:space-between;gap:12px;margin-top:22px;flex-wrap:wrap}
.sr-btn{text-decoration:none;display:inline-block;border:0;border-radius:999px;padding:13px 26px;font:inherit;font-weight:700;cursor:pointer;background:var(--hs-mist);color:var(--hs-navy)}
.sr-btn--primary{background:var(--hs-action-gradient);color:#fff;box-shadow:var(--sh2)}
.sr-btn--ghost{background:transparent;color:var(--hs-link)}
.sr-agree{display:grid;gap:10px;font-size:14px;line-height:1.55}
.sr-agree label{display:flex;gap:10px;align-items:flex-start}
.sr-agree input{margin-top:4px}
.sr-done .hs-hero{margin-bottom:18px}
.sr-done ol{padding-left:20px;line-height:1.6}
.sr-saved{font-size:12.5px;color:var(--hs-muted);text-align:right;margin-top:6px}
.sr-summary{display:grid;gap:8px;font-size:14px}
.sr-summary div{display:grid;grid-template-columns:160px 1fr;gap:12px}
.sr-summary b{color:var(--hs-slate);font-weight:700}
@media(max-width:640px){.sr-role{grid-template-columns:1fr}.sr-summary div{grid-template-columns:1fr}.sr-step h2{font-size:22px}}
</style>
</head>
<body>
<div class="sr-wrap">
  <div class="sr-top"><img src="{logo}" alt="Mareto by HelpSeeker Technologies"><a href="{demo}">Back to the demo</a></div>
  <div class="sr-progress" id="srProgress"><span></span><span></span><span></span><span></span><span></span><span></span></div>
"""

STEPS = """
  <section class="sr-step active" data-step="1">
    <h2>Your organization</h2>
    <p class="lede">We build the sandbox around who you are. Start typing your organization and we fill in what we already know from the Navigi directory; correct anything that is off.</p>
    <div class="sr-card">
      <div class="sr-grid">
        <div class="sr-field" style="grid-column:1/-1"><label for="org">Organization name</label><input id="org" name="org" list="orgList" placeholder="Legal or operating name" autocomplete="organization" required><datalist id="orgList"></datalist><span class="hint" id="orgHint">Matches from the Navigi directory appear as you type.</span></div>
        <div class="sr-field"><label for="province">Province or territory</label><select id="province" name="province"><option value="">Choose</option><option>AB</option><option>BC</option><option>MB</option><option>NB</option><option>NL</option><option>NS</option><option>NT</option><option>NU</option><option>ON</option><option>PE</option><option>QC</option><option>SK</option><option>YT</option></select></div>
        <div class="sr-field"><label for="website">Website</label><input id="website" name="website" placeholder="yourorg.ca" inputmode="url"></div>
        <div class="sr-field"><label for="email">Your work email</label><input id="email" name="email" type="email" placeholder="you@yourorg.ca" required><span class="hint">The sandbox invite and your resume link go here. Personal mailboxes are not accepted.</span></div>
        <div class="sr-field"><label for="role">Your role</label><select id="role" name="role"><option value="">Choose</option><option value="ed">Executive director or CEO</option><option value="director">Program director</option><option value="manager">Program manager</option><option value="data">Data, reporting or evaluation lead</option><option value="other">Other</option></select></div>
        <div class="sr-field"><label for="second">Who else should see this? (optional)</label><input id="second" name="second" placeholder="Name and role, for example Dana Reyes, program manager"><span class="hint">The invite goes to both of you.</span></div>
        <div class="sr-field"><label for="timeline">When do you want to decide?</label><select id="timeline" name="timeline"><option value="">Choose</option><option value="now">This month</option><option value="3m">Within 3 months</option><option value="6m">Within 6 months</option><option value="fy">Next fiscal year</option></select></div>
        <div class="sr-field"><label for="contract">If you have a current system, when does its contract end?</label><input id="contract" name="contract" type="month"></div>
      </div>
    </div>
  </section>

  <section class="sr-step" data-step="2">
    <h2>Your programs</h2>
    <p class="lede">One block per program. What you type here becomes the program list, the intake routes and the outcome fields in your sandbox. Three to five outcomes per program is plenty.</p>
    <div id="programs"></div>
    <button class="sr-add" type="button" onclick="addProgram()">+ Add another program</button>
  </section>

  <section class="sr-step" data-step="3">
    <h2>Who does what</h2>
    <p class="lede">Mareto shows each person only their own work. Tell us who sits in each seat and the sandbox opens with those seats ready.</p>
    <div class="sr-card"><div class="sr-roles" id="roles"></div></div>
  </section>

  <section class="sr-step" data-step="4">
    <h2>Your forms</h2>
    <p class="lede">Up to three intake or assessment forms you use today, and one funder report template. We map their fields into the sandbox so the first screen your staff see is the form they already know.</p>
    <div class="sr-card">
      <div class="sr-drop" id="dropForms" tabindex="0"><b>Drop forms here or click to choose</b>PDF or Word, up to 10 MB each. Blank forms, not completed ones.</div>
      <input type="file" id="fileForms" accept=".pdf,.doc,.docx" multiple hidden>
      <ul class="sr-files" id="listForms"></ul>
    </div>
  </section>

  <section class="sr-step" data-step="5">
    <h2>A sample of your data</h2>
    <p class="lede">So the sandbox can show your migration receipt, give us the column headers and about 20 rows from each table you keep today: people, cases, notes, whatever you have. CSV or Excel.</p>
    <div class="sr-card">
      <div class="sr-note">No real client names. Replace names with Person 1, Person 2 and so on, and remove dates of birth, phone numbers and addresses before you export. Structure, counts and dates are all we need. Files that look like they carry real names are refused here in your browser and never uploaded.</div>
      <div class="sr-drop" id="dropData" tabindex="0" style="margin-top:14px"><b>Drop sample files here or click to choose</b>CSV or XLSX, headers plus up to 20 rows each.</div>
      <input type="file" id="fileData" accept=".csv,.xlsx,.xls" multiple hidden>
      <ul class="sr-files" id="listData"></ul>
      <div class="sr-field" style="margin-top:14px"><label for="source">What runs your intake today?</label><select id="source" name="source"><option value="">Choose</option><option value="spreadsheets">Spreadsheets and forms</option><option value="product">A case management product</option><option value="portal">A funder portal</option><option value="paper">Paper files</option><option value="none">Nothing yet</option></select></div>
    </div>
  </section>

  <section class="sr-step" data-step="6">
    <h2>Before we build</h2>
    <p class="lede">Check what you told us, then agree to the sandbox terms. We start building as soon as you send this.</p>
    <div class="sr-card"><div class="sr-summary" id="summary"></div></div>
    <div class="sr-card"><div class="sr-agree">
      <label><input type="checkbox" id="agree1"> <span>The sandbox is yours for 30 days. It is hosted in Canada by HelpSeeker Technologies. On day 30 we either promote it to your own Mareto build or delete it; you can ask for a restore within 60 days.</span></label>
      <label><input type="checkbox" id="agree2"> <span>Nothing I upload contains real client names, dates of birth or contact details. Forms are blank templates.</span></label>
      <label><input type="checkbox" id="agree3"> <span>HelpSeeker may contact me and the second person I named about this sandbox. No other sales calls unless I book one.</span></label>
    </div></div>
  </section>

  <section class="sr-step sr-done" data-step="7">
    <div class="hs-hero"><span class="hs-medallion hs-medallion--lg"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><div class="hs-hero__inner"><p class="hs-hero__eyebrow">Sandbox request received</p><h1>We are building it</h1><p id="doneLede">Your sandbox is being shaped around your programs now. A person on our team checks it before the invite goes out, usually within one working day.</p></div></div>
    <div class="sr-card"><h3 style="margin:0 0 10px;color:var(--hs-navy)">What happens next</h3><ol>
      <li>Your programs, seats and forms are configured into a Mareto sandbox in Canada.</li>
      <li>We draft your impact model, logic model skeleton and referral pathways from what you told us and put them in the sandbox.</li>
      <li>You and the person you named get an invite by email. The 30-day clock starts then, not now.</li>
      <li>If Mareto fits, the sandbox becomes your build. Nothing is re-entered.</li>
    </ol></div>
    <div class="sr-nav"><a class="sr-btn" href="{demo}">Explore the demo meanwhile</a><a class="sr-btn sr-btn--primary" href="{book}">Book a call with us</a></div>
  </section>

  <div class="sr-nav" id="srNav">
    <button class="sr-btn" type="button" id="btnBack" onclick="go(-1)">Back</button>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="sr-btn sr-btn--ghost" type="button" onclick="emailLink()">Email me a link to finish later</button><button class="sr-btn sr-btn--primary" type="button" id="btnNext" onclick="go(1)">Continue</button></div>
  </div>
  <p class="sr-saved" id="srSaved"></p>
</div>
"""

SCRIPT = r"""
<script>
// Stage B of the Mareto buyer journey. Draft lives in this browser until it is sent. SANDBOX_API is the
// gateway route on demo.mareto; until it is set the page keeps the draft locally so the flow can be reviewed.
const SANDBOX_API = window.SANDBOX_API || '';
const NAVIGI_API = window.NAVIGI_API || '';
const KEY = 'mareto-sandbox-request';
const PUBLIC_MAIL = /@(gmail|yahoo|hotmail|outlook|live|icloud|me|aol|proton|protonmail)\./i;
const SEATS = [
  ['Intake', 'Takes the first call and opens the file', 'counsellor'],
  ['Case work and notes', 'Writes session notes and plans', 'counsellor'],
  ['Program management', 'Watches caseload and capacity for one program', 'manager'],
  ['Reporting', 'Builds the funder numbers', 'director'],
  ['Approvals', 'Signs off consents, closures and transfers', 'director'],
  ['Board or funder view', 'Sees outcomes and reach, no client detail', 'board'],
];
let step = 1; const draft = load();

function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
function save() {
  draft.org = v('org'); draft.province = v('province'); draft.website = v('website'); draft.email = v('email'); draft.role = v('role');
  draft.second = v('second'); draft.timeline = v('timeline'); draft.contract = v('contract'); draft.source = v('source');
  draft.programs = [...document.querySelectorAll('.sr-program')].map((p) => ({
    name: p.querySelector('[data-k=name]').value, serves: p.querySelector('[data-k=serves]').value, funder: p.querySelector('[data-k=funder]').value,
    intake: p.querySelector('[data-k=intake]').value, model: p.querySelector('[data-k=model]').value, outcomes: p.querySelector('[data-k=outcomes]').value }));
  draft.roles = [...document.querySelectorAll('.sr-role input')].map((i) => i.value);
  draft.step = step; draft.savedAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch (e) {}
  const s = document.getElementById('srSaved'); if (s) s.textContent = 'Saved in this browser ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function v(id) { const e = document.getElementById(id); return e ? e.value.trim() : ''; }
function set(id, val) { const e = document.getElementById(id); if (e && val != null) e.value = val; }

function addProgram(p) {
  p = p || {}; const n = document.querySelectorAll('.sr-program').length + 1;
  const d = document.createElement('div'); d.className = 'sr-card sr-program';
  d.innerHTML = `<button class="sr-x" type="button" aria-label="Remove program" onclick="this.closest('.sr-program').remove();renumber();save()">&times;</button><h3>Program ${n}</h3>
  <div class="sr-grid">
    <div class="sr-field"><label>Program name</label><input data-k="name" value="${esc(p.name)}" placeholder="Family support"></div>
    <div class="sr-field"><label>Who it serves</label><input data-k="serves" value="${esc(p.serves)}" placeholder="Parents of children under 6"></div>
    <div class="sr-field"><label>Main funder</label><input data-k="funder" value="${esc(p.funder)}" placeholder="Provincial ministry, United Way, municipal grant"></div>
    <div class="sr-field"><label>How people come in</label><select data-k="intake"><option value="">Choose</option>${opt(p.intake, [['self', 'They contact us'], ['referral', 'Referred by another agency'], ['internal', 'Referred from another of our programs'], ['mandated', 'Mandated or court-ordered'], ['outreach', 'We find them through outreach']])}</select></div>
    <div class="sr-field"><label>How you work</label><select data-k="model"><option value="">Choose</option>${opt(p.model, [['case', 'One worker, one file, over time'], ['group', 'Groups and sessions'], ['drop', 'Drop-in, no file'], ['mixed', 'A mix']])}</select></div>
    <div class="sr-field" style="grid-column:1/-1"><label>Three to five outcomes you report on</label><textarea data-k="outcomes" placeholder="Housed at 6 months; completed the parenting course; reduced crisis calls">${esc(p.outcomes)}</textarea></div>
  </div>`;
  document.getElementById('programs').appendChild(d);
  d.querySelectorAll('input,select,textarea').forEach((e) => e.addEventListener('change', save));
}
function renumber() { document.querySelectorAll('.sr-program h3').forEach((h, i) => (h.textContent = 'Program ' + (i + 1))); }
function opt(cur, list) { return list.map(([k, l]) => `<option value="${k}"${cur === k ? ' selected' : ''}>${l}</option>`).join(''); }
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

function buildRoles() {
  const r = document.getElementById('roles'); r.innerHTML = SEATS.map(([t, d, seat], i) => `<div class="sr-role"><div><b>${t}</b><small>${d}</small></div><input placeholder="Name or job title" value="${esc((draft.roles || [])[i])}" data-seat="${seat}"></div>`).join('');
  r.querySelectorAll('input').forEach((e) => e.addEventListener('change', save));
}

// files: forms are kept as File objects for upload; data samples are checked for real-looking names before anything leaves the browser
const files = { forms: [], data: [] };
function wireDrop(dropId, inputId, listId, kind) {
  const drop = document.getElementById(dropId), input = document.getElementById(inputId);
  drop.onclick = () => input.click(); drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); };
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); take(kind, [...e.dataTransfer.files], listId); };
  input.onchange = () => take(kind, [...input.files], listId);
}
async function take(kind, list, listId) {
  for (const f of list) {
    if (kind === 'forms' && files.forms.length >= 4) break;
    if (f.size > 10 * 1024 * 1024) { files[kind].push({ file: f, bad: 'over 10 MB' }); continue; }
    if (kind === 'data') { const why = await looksLikeRealNames(f); files.data.push({ file: f, bad: why }); }
    else files.forms.push({ file: f, bad: '' });
  }
  renderFiles(kind, listId);
}
function renderFiles(kind, listId) {
  document.getElementById(listId).innerHTML = files[kind].map((x, i) => `<li class="${x.bad ? 'bad' : ''}"><span><i></i>${esc(x.file.name)}</span><em>${x.bad ? 'Refused: ' + x.bad : Math.round(x.file.size / 1024) + ' KB'} <button class="sr-btn sr-btn--ghost" type="button" style="padding:4px 10px" onclick="files['${kind}'].splice(${i},1);renderFiles('${kind}','${listId}')">Remove</button></em></li>`).join('');
}
const FIRST = /^(james|mary|john|patricia|robert|jennifer|michael|linda|william|elizabeth|david|susan|richard|jessica|joseph|sarah|thomas|karen|daniel|lisa|matthew|nancy|anthony|betty|mark|sandra|donald|ashley|steven|emily|paul|kimberly|andrew|donna|joshua|michelle|kenneth|carol|kevin|amanda|brian|melissa|george|deborah|timothy|stephanie|ronald|rebecca|jason|sharon|edward|laura|jeffrey|cynthia|ryan|dorothy|jacob|amy|gary|kathleen|nicholas|angela|eric|shirley|jonathan|brenda|stephen|emma|larry|anna|justin|pamela|scott|nicole|brandon|samantha|benjamin|katherine|samuel|christine|gregory|helen|alexander|debra|patrick|rachel|frank|carolyn|raymond|janet|jack|maria|dennis|olivia|jerry|heather|tyler|diane|aaron|julie|jose|joyce|adam|victoria|nathan|ruth|henry|virginia|zachary|lauren|douglas|kelly|peter|christina|kyle|joan|noah|evelyn|ethan|judith|jeremy|andrea|walter|hannah|christian|megan|keith|cheryl|roger|jacqueline|terry|martha|austin|madison|sean|teresa|gerald|gloria|carl|sara|harold|janice|dylan|ann|arthur|kathryn|lawrence|abigail|jordan|sophia|jesse|frances|bryan|jean|billy|alice|bruce|judy|gabriel|isabella|joe|julia|logan|grace|alan|amber|juan|denise|albert|danielle|willie|marilyn|elijah|beverly|wayne|charlotte|randy|natalie|vincent|theresa|mason|diana|roy|brittany|ralph|doris|bobby|kayla|russell|alexis|bradley|lori|liam|ahmed|mohammed|fatima|aisha|wei|li|chen|singh|kaur|priya|raj|amina|omar|yusuf|sofia|mateo|lucas|elena|nadia|tariq)$/i;
async function looksLikeRealNames(file) {
  if (!/\.csv$/i.test(file.name)) return '';
  const text = (await file.slice(0, 200000).text()).split(/\r?\n/).filter(Boolean);
  if (text.length < 2) return 'empty file';
  if (text.length > 60) return 'more than 20 rows: keep it to headers plus 20';
  const head = text[0].toLowerCase().split(/[,;\t]/);
  const nameCols = head.map((h, i) => (/first|last|name|client|surname|given/.test(h) && !/program|org|agency|worker|staff|file|user/.test(h) ? i : -1)).filter((i) => i >= 0);
  const dobCols = head.map((h, i) => (/dob|birth/.test(h) ? i : -1)).filter((i) => i >= 0);
  let hits = 0, cells = 0;
  for (const line of text.slice(1)) { const c = line.split(/[,;\t]/); for (const i of nameCols) { const val = (c[i] || '').replace(/"/g, '').trim(); if (!val) continue; cells++; const tok = val.split(/[\s,]+/)[0]; if (FIRST.test(tok) || /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(val)) hits++; } }
  if (cells && hits / cells > 0.3) return 'name columns look like real names; use Person 1, Person 2';
  if (dobCols.length) return 'remove the date of birth column';
  return '';
}

function valid(s) {
  let ok = true; document.querySelectorAll('.sr-field.err').forEach((e) => e.classList.remove('err'));
  const need = (id) => { if (!v(id)) { document.getElementById(id).closest('.sr-field').classList.add('err'); ok = false; } };
  if (s === 1) { need('org'); need('province'); need('email'); need('role'); need('timeline'); if (v('email') && PUBLIC_MAIL.test(v('email'))) { document.getElementById('email').closest('.sr-field').classList.add('err'); ok = false; } }
  if (s === 2) { const ps = [...document.querySelectorAll('.sr-program')]; if (!ps.length || !ps[0].querySelector('[data-k=name]').value.trim()) { ok = false; alert('Add at least one program with a name.'); } }
  if (s === 5) { need('source'); if (files.data.some((x) => x.bad)) { ok = false; alert('Remove the refused files before continuing.'); } }
  if (s === 6) { if (!['agree1', 'agree2', 'agree3'].every((id) => document.getElementById(id).checked)) { ok = false; alert('Please agree to all three points.'); } }
  return ok;
}
function go(d) {
  if (d > 0 && !valid(step)) return;
  save();
  if (step === 6 && d > 0) return submit();
  step = Math.min(7, Math.max(1, step + d)); show();
}
function show() {
  document.querySelectorAll('.sr-step').forEach((s) => s.classList.toggle('active', +s.dataset.step === step));
  document.querySelectorAll('#srProgress span').forEach((b, i) => { b.className = i + 1 < step ? 'done' : i + 1 === step ? 'on' : ''; });
  document.getElementById('srNav').style.display = step === 7 ? 'none' : '';
  document.getElementById('btnBack').style.visibility = step === 1 ? 'hidden' : '';
  document.getElementById('btnNext').textContent = step === 6 ? 'Build my sandbox' : 'Continue';
  if (step === 6) summary();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function summary() {
  save(); const rows = [['Organization', `${draft.org} (${draft.province})`], ['Contact', `${draft.email}${draft.second ? ' and ' + draft.second : ''}`], ['Deciding', ({ now: 'this month', '3m': 'within 3 months', '6m': 'within 6 months', fy: 'next fiscal year' })[draft.timeline] || ''],
    ['Programs', draft.programs.filter((p) => p.name).map((p) => p.name).join(', ')], ['Seats filled', draft.roles.filter(Boolean).length + ' of ' + SEATS.length], ['Forms', files.forms.filter((x) => !x.bad).length + ' file(s)'], ['Data samples', files.data.filter((x) => !x.bad).length + ' file(s)'], ['Runs on today', draft.source || '']];
  document.getElementById('summary').innerHTML = rows.map(([k, val]) => `<div><b>${k}</b><span>${esc(val) || '<em style="color:var(--hs-muted)">not given</em>'}</span></div>`).join('');
}
async function submit() {
  save();
  const fd = new FormData(); fd.append('request', JSON.stringify(draft));
  files.forms.filter((x) => !x.bad).forEach((x) => fd.append('forms', x.file, x.file.name));
  files.data.filter((x) => !x.bad).forEach((x) => fd.append('samples', x.file, x.file.name));
  if (SANDBOX_API) {
    try { const r = await fetch(SANDBOX_API, { method: 'POST', body: fd }); if (!r.ok) throw new Error(r.status); }
    catch (e) { alert('We could not send this just now. Your answers are saved in this browser; try again in a minute.'); return; }
  }
  try { localStorage.setItem(KEY + ':sent', new Date().toISOString()); } catch (e) {}
  step = 7; show();
}
function emailLink() {
  save(); if (!v('email') || PUBLIC_MAIL.test(v('email'))) { alert('Enter your work email first.'); return; }
  if (SANDBOX_API) fetch(SANDBOX_API + '?resume=1', { method: 'POST', body: JSON.stringify({ email: v('email'), draft }), headers: { 'content-type': 'application/json' } }).catch(() => {});
  alert('A link to pick this up again is on its way to ' + v('email') + '. Your answers are also saved in this browser.');
}
// Navigi autocomplete: fills the datalist from the directory when the route is set; silent otherwise
let navT; document.getElementById('org').addEventListener('input', function () {
  clearTimeout(navT); const q = this.value.trim(); if (!NAVIGI_API || q.length < 3) return;
  navT = setTimeout(async () => { try { const r = await fetch(NAVIGI_API + '?q=' + encodeURIComponent(q) + (v('province') ? '&province=' + v('province') : '')); const list = await r.json();
    document.getElementById('orgList').innerHTML = (list || []).slice(0, 8).map((o) => `<option value="${esc(o.name)}">${esc(o.city || '')}</option>`).join('');
    document.getElementById('orgHint').textContent = list && list.length ? 'Pick your organization and we pre-fill your programs.' : 'Not listed yet? No problem, keep typing.'; } catch (e) {} }, 250);
});
document.getElementById('org').addEventListener('change', async function () {
  if (!NAVIGI_API) return; try { const r = await fetch(NAVIGI_API + '?name=' + encodeURIComponent(this.value)); const o = await r.json(); if (!o) return;
    if (o.province) set('province', o.province); if (o.website) set('website', o.website);
    if (o.programs && o.programs.length && !document.querySelectorAll('.sr-program').length) o.programs.slice(0, 8).forEach((p) => addProgram({ name: p.name, serves: p.description })); } catch (e) {}
});

// boot: restore the draft, or seed from the fit finder answers if they are in this browser
(function boot() {
  ['org', 'province', 'website', 'email', 'role', 'second', 'timeline', 'contract', 'source'].forEach((k) => set(k, draft[k]));
  (draft.programs && draft.programs.length ? draft.programs : [{}]).forEach(addProgram);
  buildRoles();
  wireDrop('dropForms', 'fileForms', 'listForms', 'forms'); wireDrop('dropData', 'fileData', 'listData', 'data');
  document.querySelectorAll('.sr-step input,.sr-step select').forEach((e) => e.addEventListener('change', save));
  try { const q = JSON.parse(localStorage.getItem('mareto-fit-finder') || 'null'); if (q && !draft.email && q.email) set('email', q.email); } catch (e) {}
  if (draft.step && draft.step < 7) step = draft.step; show();
})();
</script>
</body>
</html>
"""


def main() -> None:
    canon = (HERE / "canon.css").read_text(encoding="utf-8")
    hero = (HERE / "hero.webp.txt").read_text(encoding="utf-8").strip()
    quiz = QUIZ.read_text(encoding="utf-8")
    m = re.search(r'<img src="(data:image[^"]+)" alt="Mareto by HelpSeeker Technologies"', quiz)
    logo = m.group(1) if m else ""
    page = HEAD.replace("{canon}", canon).replace("{hero}", hero).replace("{logo}", logo).replace("{demo}", DEMO)
    page += STEPS.replace("{demo}", DEMO).replace("{book}", BOOK) + SCRIPT
    PAGE.write_text(page, encoding="utf-8")
    print("sandbox request page:", len(page) // 1024, "KB")


if __name__ == "__main__":
    main()
