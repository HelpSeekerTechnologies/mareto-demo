"""Rebuild the fit finder's landing and script on the 29 Sep 2026 pricing briefing and Alina's rulings (30 Sep).

  python tools/quiz.py
  python tools/canonize.py mareto-fit-finder.html

Keeps: the seven questions and every HubSpot field name and option value Kim mapped; the form id; the tracking
script; the results email flow (scripts/send-results-email.mjs recomputes the same estimate with the same maths).
Changes: an eighth question on year-one budget (steers the result; NOT posted, the HubSpot property does not
exist); results rebuilt as sizing band, build shape, the transformation paragraph, the estimate on the graduated
card (Essentials $5,000 + $400 a month for up to 10 users; Standard S/M and Complex L/XL by a scorecard estimate;
annual prepay 5 percent as the only reduction), highlight cards pruned to what ships, then the email capture and
the CTA. The 10/15 percent multi-year discounts are gone (not on the card).
"""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "mareto-fit-finder.html"
BOOK = "https://meetings.hubspot.com/travis-turner/meet-with-helpseeker-ma"
TOUR = "./mareto-general-product-tour.html"
DEMO = "./mareto-interactive-demo.html"

LANDING = '''  <div class="landing" id="landing">
    <div class="hs-hero"><span class="hs-medallion hs-medallion--lg"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
      <div class="hs-hero__inner"><p class="hs-hero__eyebrow">Fit finder</p><h1>Is Mareto right for you?</h1><p>Eight quick questions. You get the size of build your organization needs, what it would cost in year one, and how Mareto meets the problems you named, in a summary you can send to your team.</p></div></div>
    <img src="{logo}" alt="Mareto by HelpSeeker Technologies" style="height:40px;margin:8px 0 22px">
    <button class="start-btn" onclick="startQuiz()">Find out <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
    <p class="note">About 90 seconds. No account needed.</p>
  </div>
'''

SCRIPT = r'''
// Mareto fit finder. Questions and HubSpot mapping as Kim built them (29 Sep 2026); results and pricing on the
// 29 Sep pricing briefing; copy per Alina's rulings of 30 Sep 2026. Nothing about the visitor is stored until
// they choose to send themselves the results.
const BOOK = 'https://meetings.hubspot.com/travis-turner/meet-with-helpseeker-ma';
const TOUR = './mareto-general-product-tour.html';
const DEMO = './mareto-interactive-demo.html';

const questions = [
  { id: 'org_type', title: 'What kind of organization are you?', type: 'single', layout: 'list', options: [
      { value: 'nonprofit', label: 'Nonprofit or charity', desc: 'Registered nonprofit, society or charitable organization' },
      { value: 'indigenous', label: 'Indigenous government or organization', desc: 'First Nation, Métis or Inuit government, tribal council, or Indigenous-led organization' },
      { value: 'municipal', label: 'Municipal government', desc: 'FCSS, social services department, community services division' },
      { value: 'other_gov', label: 'Other government or public body', desc: 'Provincial, federal, health authority, school district' },
      { value: 'other', label: 'Something else', desc: '' } ] },
  { id: 'services', title: 'What services do you deliver?', subtitle: 'Choose all that apply.', type: 'multi', layout: 'grid', options: [
      { value: 'cfs', label: 'Child and family services' }, { value: 'indigenous_svc', label: 'Indigenous services or child welfare' },
      { value: 'mental_health', label: 'Mental health and addictions' }, { value: 'housing', label: 'Housing and homelessness' },
      { value: 'dv', label: 'Domestic violence or crisis' }, { value: 'employment', label: 'Employment services' },
      { value: 'food', label: 'Food security' }, { value: 'seniors_disability', label: 'Seniors or disability services' },
      { value: 'youth', label: 'Youth services' }, { value: 'other_svc', label: 'Other community services' } ] },
  { id: 'programs', title: 'How many distinct programs do you run?', subtitle: 'A program is a funded service area. "Family preservation" and "Emergency shelter" count as one each.', type: 'single', layout: 'list', options: [
      { value: '1-2', label: '1 or 2 programs' }, { value: '3-5', label: '3 to 5 programs' }, { value: '6-10', label: '6 to 10 programs' }, { value: '10+', label: 'More than 10 programs' } ] },
  { id: 'challenges', title: 'What gets in the way right now?', subtitle: 'Choose all that apply.', type: 'multi', layout: 'list', options: [
      { value: 'reporting', label: 'Funder reporting takes weeks of manual work', desc: 'Pulling numbers from spreadsheets, cross-referencing, copying into templates' },
      { value: 'duplicates', label: 'The same person is counted more than once', desc: 'One client, several records, no way to say who is active' },
      { value: 'too_many_tools', label: 'Too many disconnected tools', desc: 'Spreadsheets, paper files, email, maybe an old database; nothing talks to anything' },
      { value: 'no_visibility', label: 'No client history across programs', desc: 'When a client moves between programs, their history does not follow' },
      { value: 'data_entry', label: 'Staff spend too long on data entry', desc: 'The same information entered in more than one place, or a system that fights them' },
      { value: 'privacy', label: 'Data hosted outside Canada, or unclear where', desc: 'The current tool stores data in the United States, or nobody is sure' },
      { value: 'bad_fit', label: 'Current software does not match how we work', desc: 'A generic process that does not reflect your programs' },
      { value: 'outcomes', label: 'Outcomes are hard to track or report', desc: 'Funders want outcome data and the system cannot produce it' } ] },
  { id: 'users', title: 'How many staff would sign in?', subtitle: 'Anyone who would log in: case workers, supervisors, directors, admin.', type: 'single', layout: 'grid', options: [
      { value: '1-5', label: '1 to 5' }, { value: '6-15', label: '6 to 15' }, { value: '16-30', label: '16 to 30' }, { value: '31-50', label: '31 to 50' }, { value: '50+', label: 'More than 50' } ] },
  { id: 'timeline', title: 'When do you want to make a change?', type: 'single', layout: 'list', options: [
      { value: 'immediate', label: 'Now. We need something in place' }, { value: '3months', label: 'Within 3 months' }, { value: '6months', label: 'Within 6 months' }, { value: 'exploring', label: 'Just exploring for now' } ] },
  { id: 'role', title: 'What is your part in the decision?', type: 'single', layout: 'list', options: [
      { value: 'decision_maker', label: 'I make or approve the final decision', desc: 'Executive Director, CEO, COO, board' },
      { value: 'evaluator', label: 'I am evaluating options to recommend', desc: 'Program director, IT manager, operations lead' },
      { value: 'researcher', label: 'I am researching for my team', desc: 'Gathering information to bring back to leadership' },
      { value: 'curious', label: 'I am curious what is out there', desc: '' } ] },
  { id: 'budget', title: 'What could you put toward this in year one?', subtitle: 'Setup and the first year of licence together. A rough figure is fine; it shapes what we show you next.', type: 'single', layout: 'list', options: [
      { value: 'under5k', label: 'Under $5,000' }, { value: '5-15k', label: '$5,000 to $15,000' }, { value: '15-40k', label: '$15,000 to $40,000' }, { value: '40k+', label: 'More than $40,000' }, { value: 'unknown', label: 'Not set yet' } ] },
];

let answers = {};
let currentQ = 0;

function startQuiz() {
  document.getElementById('landing').style.display = 'none';
  buildQuestions();
  showQuestion(0);
}

function buildQuestions() {
  const container = document.getElementById('questionsContainer');
  questions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'question'; div.id = 'q_' + q.id; div.dataset.index = i;
    const isMulti = q.type === 'multi';
    const indicator = isMulti ? 'checkbox' : 'radio';
    const gridClass = q.layout === 'grid' ? ' grid' : '';
    let optionsHtml = '';
    q.options.forEach(o => {
      const descHtml = o.desc ? '<div class="desc">' + o.desc + '</div>' : '';
      optionsHtml += '<div class="option" role="' + (isMulti ? 'checkbox' : 'radio') + '" aria-checked="false" tabindex="0" data-value="' + o.value + '" onclick="selectOption(this, ' + i + ', ' + isMulti + ')" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();this.click()}">' +
        '<div class="' + indicator + '"></div><div><div>' + o.label + '</div>' + descHtml + '</div></div>';
    });
    const backBtn = i > 0 ? '<button class="back-btn" onclick="showQuestion(' + (i - 1) + ')">&larr; Back</button>' : '<span></span>';
    const nextLabel = i < questions.length - 1 ? 'Next' : 'See my results';
    div.innerHTML = '<div class="q-header"><div class="q-step">Question ' + (i + 1) + ' of ' + questions.length + '</div><div class="q-title">' + q.title + '</div>' +
      (q.subtitle ? '<div class="q-subtitle">' + q.subtitle + '</div>' : '') + '</div>' +
      '<div class="options' + gridClass + '">' + optionsHtml + '</div>' +
      '<div class="q-nav">' + backBtn + '<button class="next-btn" id="next_' + i + '" onclick="nextQuestion(' + i + ')">' + nextLabel +
      ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button></div>';
    container.appendChild(div);
  });
}

function selectOption(el, qIndex, isMulti) {
  const q = questions[qIndex];
  const container = el.parentElement;
  if (isMulti) {
    el.classList.toggle('selected');
    answers[q.id] = Array.from(container.querySelectorAll('.selected')).map(e => e.dataset.value);
  } else {
    container.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    answers[q.id] = el.dataset.value;
  }
  container.querySelectorAll('.option').forEach(o => o.setAttribute('aria-checked', String(o.classList.contains('selected'))));
  const nextBtn = document.getElementById('next_' + qIndex);
  const hasAnswer = isMulti ? (answers[q.id] && answers[q.id].length > 0) : !!answers[q.id];
  nextBtn.classList.toggle('enabled', hasAnswer);
}

function showQuestion(index) {
  currentQ = index;
  document.querySelectorAll('.question').forEach(q => q.classList.remove('active'));
  const target = document.getElementById('q_' + questions[index].id);
  target.classList.add('active');
  const q = questions[index];
  target.querySelectorAll('.option').forEach(o => {
    const val = o.dataset.value;
    const on = q.type === 'multi' ? !!(answers[q.id] && answers[q.id].includes(val)) : answers[q.id] === val;
    o.classList.toggle('selected', on); o.setAttribute('aria-checked', String(on));
  });
  const nextBtn = document.getElementById('next_' + index);
  const hasAnswer = q.type === 'multi' ? (answers[q.id] && answers[q.id].length > 0) : !!answers[q.id];
  nextBtn.classList.toggle('enabled', hasAnswer);
  document.getElementById('progressFill').style.width = ((index + 1) / (questions.length + 1) * 100) + '%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextQuestion(index) {
  if (index < questions.length - 1) showQuestion(index + 1); else showResults();
}

// ---------- sizing and price, the 29 Sep 2026 card ----------
// Licence: graduated brackets like tax brackets, 10 users minimum billed.
function licenceMonthly(users) {
  const n = Math.max(10, users);
  const brackets = [[10, 40], [25, 34], [50, 32], [100, 30], [Infinity, 27]];
  let total = 0, prev = 0;
  for (const [upto, rate] of brackets) { const inBand = Math.max(0, Math.min(n, upto) - prev); total += inBand * rate; prev = upto; if (n <= upto) break; }
  return total;
}
function marginalRate(users) { const n = Math.max(10, users); return n <= 10 ? 40 : n <= 25 ? 34 : n <= 50 ? 32 : n <= 100 ? 30 : 27; }

// Setup: Essentials for one or two programs from the standard template with spreadsheet data; otherwise a
// scorecard estimate from the answers, confirmed with the buyer on the scoping call.
function sizing(a) {
  const programs = a.programs || '1-2', users = a.users || '1-5', ch = a.challenges || [], sv = a.services || [];
  let pts = 0;
  pts += { '1-2': 2, '3-5': 5, '6-10': 8, '10+': 12 }[programs] || 0;
  if (programs === '1-2') pts -= 2;
  pts += { '1-5': 0, '6-15': 2, '16-30': 3, '31-50': 3, '50+': 4 }[users] || 0;
  if (ch.includes('bad_fit') || ch.includes('privacy')) pts += 6;            // records coming out of another vendor's system
  else if (ch.includes('too_many_tools')) pts += 2;                            // spreadsheets, likely more than 2,000 rows
  pts += Math.min(6, Math.max(0, sv.length - 1) * 2);                         // a fixed funder report per service line beyond the first
  if ((a.role || '') !== 'decision_maker') pts += 2;                            // more people approve and test
  if ((a.timeline || '') === 'immediate') pts += 3;                             // a hard go-live date
  const essentials = programs === '1-2' && !(ch.includes('bad_fit') || ch.includes('privacy'));
  let band, setup, name, who;
  if (essentials) { band = 'Essentials'; setup = 5000; name = 'Essentials'; who = 'one or two programs from the standard template, simple forms, your data from spreadsheets'; }
  else if (pts <= 9) { band = 'Standard S'; setup = 9000; name = 'Standard'; who = 'a multi-program build with a few automations and one public form'; }
  else if (pts <= 17) { band = 'Standard M'; setup = 18000; name = 'Standard'; who = 'several programs, more roles, records migrated from your current system'; }
  else if (pts <= 27) { band = 'Complex L'; setup = 31000; name = 'Complex'; who = 'many service streams, heavy automation, a large migration, governance sign-off'; }
  else { band = 'Complex XL'; setup = 47000; name = 'Complex'; who = 'a large multi-pillar organization with a governance body approving the build'; }
  const weeks = essentials ? 'about 2 to 4 weeks' : pts <= 9 ? '4 to 6 weeks' : pts <= 17 ? 'about 8 weeks' : 'about 3 months';
  const modules = essentials ? 'about 25 modules' : pts <= 9 ? '60 to 120 modules' : pts <= 17 ? '120 to 200 modules' : 'around 300 modules';
  const phased = programs === '10+' || programs === '6-10';
  return { pts, band, setup, name, who, weeks, modules, phased, essentials };
}

const HIGHLIGHT = {
  duplicates: ['users', 'One person, one family, across every program', 'Every individual has one record however many programs they touch, and family members are linked. The parent in the food bank and the child in the youth program are one family, so you stop counting one person fifteen times and you can say who is active.'],
  no_visibility: ['search', 'History follows the person', 'When someone moves between programs, their record and history come with them, governed by consent and by role. No re-intake, nothing lost.'],
  reporting: ['list', 'Rollup reporting: anything in, anything out', 'Any field you capture is a filter. The funder number is a filter and a download, one number per person, and every figure traces back to a record.'],
  outcomes: ['check', 'Are you making an impact?', 'Goals and outcomes are recorded on the case and tracked by stage, so you can say what share of people moved from crisis to stable, not just how many came through the door.'],
  too_many_tools: ['layers', 'One platform instead of six', 'Intake, case management, the event log, referrals, surveys, scheduling and reporting in one system. The spreadsheets, paper files and side databases retire.'],
  data_entry: ['clock', 'Fewer clicks than the system you have', 'Log a note or take attendance on one screen. Enter once and it flows to the case, the report and the dashboard.'],
  privacy: ['lock', 'Data stays in Canada, and it is yours', 'Hosted in Canada, two-factor sign-in on every login, field-level access rules, clinical notes lockable from managers, and CSV export of your whole data model at any time at no cost.'],
  bad_fit: ['settings', 'Configured to how you work, and it grows with you', 'Forms, fields, workflows and roles are set up to your programs. A new program is new vocabulary and forms on the same data model, never a rebuild.'],
};
const ICONS = {
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  map: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
};
const icon = n => '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + ICONS[n] + '</svg>';
const fmt = n => '$' + Math.round(n).toLocaleString('en-CA');

function fitPoints() {
  const a = answers; let p = 0;
  if (['nonprofit', 'indigenous', 'municipal'].includes(a.org_type)) p += 2; else p += 1;
  const ch = a.challenges || []; if (ch.length >= 2) p += 2; else if (ch.length >= 1) p += 1;
  if (['3-5', '6-10', '10+'].includes(a.programs)) p += 2; else p += 1;
  if (['immediate', '3months'].includes(a.timeline)) p += 2; else if (a.timeline === '6months') p += 1;
  if (['decision_maker', 'evaluator'].includes(a.role)) p += 2; else if (a.role === 'researcher') p += 1;
  return p;
}

function showResults() {
  document.querySelectorAll('.question').forEach(q => q.classList.remove('active'));
  document.getElementById('progressFill').style.width = '100%';
  const r = document.getElementById('results'); r.classList.add('active');
  const a = answers, ch = a.challenges || [], budget = a.budget || 'unknown', s = sizing(a);
  const userDefaults = { '1-5': 5, '6-15': 10, '16-30': 22, '31-50': 40, '50+': 60 };
  const defaultUsers = userDefaults[a.users] || 10;
  const fp = fitPoints();
  const strong = fp >= 8, good = fp >= 5;
  const lowBudget = budget === 'under5k';

  let fitLabel, fitDesc;
  if (lowBudget) { fitLabel = 'Not this year, on the budget you named'; fitDesc = 'Mareto starts at about ' + fmt(5000 + 12 * 400) + ' in year one for the smallest build, so under $5,000 does not get you a system that will hold up. The estimate below is what it would take. If a funder or a partner could carry part of it, book a call and we will talk it through honestly.'; }
  else if (strong) { fitLabel = 'A strong fit'; fitDesc = 'The problems you named are the ones Mareto was built for. Here is the size of build you would need, what it costs, and how each problem is answered.'; }
  else if (good) { fitLabel = 'A good fit'; fitDesc = 'Mareto answers several of the problems you named. Here is what a build would look like for you.'; }
  else { fitLabel = 'Worth a look'; fitDesc = 'Mareto may fit, depending on what you need. Here is what we would suggest exploring.'; }

  const cards = ch.filter(c => HIGHLIGHT[c]).map(c => { const [ic, t, d] = HIGHLIGHT[c]; return '<div class="match-card"><div class="match-icon">' + icon(ic) + '</div><div><h4>' + t + '</h4><p>' + d + '</p></div></div>'; });
  if (a.org_type === 'indigenous') cards.push('<div class="match-card"><div class="match-icon">' + icon('map') + '</div><div><h4>Your community owns its data</h4><p>OCAP® principles apply: community-controlled access, Canada-only hosting, and full data portability. An Indigenous-governed organization gets a published rate off the licence.</p></div></div>');
  if (['3-5', '6-10', '10+'].includes(a.programs)) cards.push('<div class="match-card"><div class="match-icon">' + icon('layers') + '</div><div><h4>Many programs, one registry</h4><p>Each program gets its own forms, workflows and reporting on one shared person registry. The largest live build runs 19 programs this way.</p></div></div>');

  let ctaMessage, ctaPrimary, ctaHref, ctaSecondary, ctaSecondaryHref;
  if (lowBudget) { ctaMessage = 'A conversation costs nothing, and phasing and funding routes exist.'; ctaPrimary = 'Book a meeting'; ctaHref = BOOK; ctaSecondary = 'Or explore the interactive demo'; ctaSecondaryHref = DEMO; }
  else if (['immediate', '3months'].includes(a.timeline) && ['decision_maker', 'evaluator'].includes(a.role)) { ctaMessage = 'On your timeline, a 20-minute meeting is the fastest way to see Mareto configured for your programs and to firm up the estimate.'; ctaPrimary = 'Book a meeting'; ctaHref = BOOK; ctaSecondary = 'Or explore the interactive demo first'; ctaSecondaryHref = DEMO; }
  else { ctaMessage = 'No rush. Explore the interactive demo, and book a meeting when you want the estimate firmed up.'; ctaPrimary = 'Explore the interactive demo'; ctaHref = DEMO; ctaSecondary = 'Or book a meeting'; ctaSecondaryHref = BOOK; }

  // who they told us they are, in one sentence, and what that tells us
  const orgWords = { nonprofit: 'a nonprofit', indigenous: 'an Indigenous organization', municipal: 'a municipal team', other_gov: 'a public body', other: 'an organization' }[a.org_type] || 'an organization';
  const svcNames = { cfs: 'child and family services', indigenous_svc: 'Indigenous services', mental_health: 'mental health and addictions', housing: 'housing and homelessness', dv: 'domestic violence and crisis', employment: 'employment', food: 'food security', seniors_disability: 'seniors and disability services', youth: 'youth services', other_svc: 'community services' };
  const svcList = (a.services || []).map(v => svcNames[v]).filter(Boolean);
  const svcText = svcList.length ? (svcList.length === 1 ? svcList[0] : svcList.slice(0, -1).join(', ') + ' and ' + svcList[svcList.length - 1]) : 'community services';
  const progWords = { '1-2': 'one or two programs', '3-5': 'three to five programs', '6-10': 'six to ten programs', '10+': 'more than ten programs' }[a.programs] || 'a few programs';
  const userWords = { '1-5': 'up to five', '6-15': 'six to fifteen', '16-30': 'sixteen to thirty', '31-50': 'thirty-one to fifty', '50+': 'more than fifty' }[a.users] || 'a handful of';
  const tlWords = { immediate: 'and you need something now', '3months': 'and you want to move within three months', '6months': 'and you are planning for the next six months', exploring: 'and you are still looking around' }[a.timeline] || '';
  const chNames = { reporting: 'funder reporting', duplicates: 'counting people twice', too_many_tools: 'too many tools', no_visibility: 'history that does not follow the person', data_entry: 'data entry', privacy: 'where the data lives', bad_fit: 'software that does not fit', outcomes: 'outcomes you cannot show' };
  const chList = ch.map(c => chNames[c]).filter(Boolean);
  const chText = chList.length ? (chList.length === 1 ? chList[0] : chList.slice(0, -1).join(', ') + ' and ' + chList[chList.length - 1]) : '';
  const youText = 'You are ' + orgWords + ' delivering ' + svcText + ' across ' + progWords + ', with ' + userWords + ' staff signing in, ' + tlWords + '.' + (chText ? ' What gets in the way: ' + chText + '.' : '');
  const tellsUs = s.essentials ? 'Organizations like yours are the fastest to set up: one template, two review rounds, live in weeks.'
    : s.pts <= 9 ? 'Organizations like yours usually need a few automations and one public form; a build of 60 to 120 modules, live in four to six weeks.'
    : s.pts <= 17 ? 'Organizations like yours usually bring records over from another system and need more roles; a build of 120 to 200 modules in about eight weeks.'
    : 'Organizations like yours are the ones we go live in waves for: many service streams, a large migration and a governance body signing off. The largest build on the platform runs 19 programs on one registry.';
  r.innerHTML = '<div class="results-header"><h2>Your results</h2><p>' + fitDesc + '</p></div>' +
    '<div class="fit-banner"><div class="fit-label">Mareto fit</div><div class="fit-score">' + fitLabel + '</div><p class="fit-you">' + youText + '</p><div class="fit-desc"><span class="hs-band">' + s.band + '</span><span>' + tellsUs + '</span></div></div>' +

    '<div class="hs-build"><h3>What your build looks like</h3><div class="hs-journey">' +
      '<div class="hs-node"><span class="hs-medallion">' + icon('layers') + '</span><div class="hs-node__v">' + s.name + '</div><div class="hs-node__l">Package</div><div class="hs-node__d">' + s.who.charAt(0).toUpperCase() + s.who.slice(1) + '.</div></div>' +
      '<div class="hs-node"><span class="hs-medallion">' + icon('database') + '</span><div class="hs-node__v">' + s.modules.replace('about ', '~').replace('around ', '~').replace(' modules', '') + '</div><div class="hs-node__l">Modules</div><div class="hs-node__d">Configured to your programs, forms and reports.</div></div>' +
      '<div class="hs-node"><span class="hs-medallion">' + icon('clock') + '</span><div class="hs-node__v">' + s.weeks.replace('about ', '~') + '</div><div class="hs-node__l">To go-live</div><div class="hs-node__d">' + (s.phased ? 'In waves: the first programs go live, then the next.' : 'Discovery, data model, build, review, training.') + '</div></div>' +
      '<div class="hs-node"><span class="hs-medallion">' + icon('check') + '</span><div class="hs-node__v">' + (s.essentials ? '2' : '3') + '</div><div class="hs-node__l">Review rounds</div><div class="hs-node__d">With your program leads, before anything goes live.</div></div>' +
    '</div><p class="hs-build__p">Software is the easy part. Every build starts with your impact model: we sit down with your team and sort out the logic model, the referral pathways, the automations, the workflows and the reporting, then configure Mareto to match. Our team comes from social impact, program evaluation and systems planning, and we hold your hand from discovery to go-live and after. Nothing here is a template you squeeze into.</p></div>' +

    (cards.length ? '<div class="match-section"><h3>How Mareto answers what you named</h3>' + cards.join('') + '</div>' : '') +

    '<div class="calc-section" id="calcSection"><h3>Your year-one estimate</h3>' +
    '<p class="calc-subtitle">On our published card. Setup is ' + (s.essentials ? 'the fixed Essentials package' : 'a scorecard band we confirm with you on the scoping call') + '; the licence is per user, billed monthly, with a 10-user minimum.</p>' +
    '<div class="calc-row"><label for="calcUsers">People who sign in</label><div class="slider-wrap"><input type="range" id="calcUsers" min="1" max="150" value="' + defaultUsers + '" oninput="updateCalc()" aria-valuemin="1" aria-valuemax="150"><span class="slider-val" id="calcUsersVal">' + defaultUsers + '</span></div></div>' +
    '<div class="calc-row"><label for="calcTerm">Licence billing</label><select id="calcTerm" onchange="updateCalc()"><option value="1">Monthly</option><option value="2">Annual prepay (5% off the licence)</option></select></div>' +
    '<div class="calc-result" id="calcResult"></div>' +
    '<p class="calc-note">Setup is paid in stages: ' + (s.essentials ? 'half on signing and half at go-live, or spread over the first twelve monthly invoices' : 'a quarter on signing, half when you sign off the specification, a quarter at go-live') + '. Hosting in Canada, backups, updates, the help desk, train-the-trainer and data export are included. Prices in CAD before tax; renewal increases capped at 4 percent a year, in writing.</p>' +
    '</div>' +

    '<div class="results-cta"><p>' + ctaMessage + '</p><a class="book-btn" href="' + ctaHref + '"' + (ctaHref === BOOK ? ' target="_blank" rel="noopener"' : '') + '>' + ctaPrimary + '</a><br><a class="tour-link" href="' + ctaSecondaryHref + '">' + ctaSecondary + ' &rarr;</a>' +
    '<div class="contact-capture"><h4>Want a copy of these results?</h4><p class="cc-subtitle">We will send your fit, your build size, the estimate and the links to the tour and the demo, so you can share them with your team.</p>' +
    '<div class="field-row"><input type="text" id="cc_name" placeholder="Your name" autocomplete="name"><input type="email" id="cc_email" placeholder="Email address" autocomplete="email"></div>' +
    '<div class="field-row"><input type="text" id="cc_org" placeholder="Organization" autocomplete="organization"><input type="text" id="cc_title" placeholder="Job title (optional)" autocomplete="organization-title"></div>' +
    '<button class="submit-btn" onclick="submitContact()">Send me my results</button><br><button class="skip" onclick="this.closest(\'.contact-capture\').style.display=\'none\'">Skip, I do not need a copy</button></div></div>';

  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(updateCalc, 50);
}

function estimate(users, term) {
  const s = sizing(answers);
  const monthly = licenceMonthly(users);
  const annualLicence = monthly * 12 * (term === 2 ? 0.95 : 1);
  return { s, monthly, annualLicence, firstYear: s.setup + annualLicence, rate: marginalRate(users), billed: Math.max(10, users), signing: s.essentials ? 2500 : Math.round(s.setup * 0.25) };
}

function updateCalc() {
  const usersEl = document.getElementById('calcUsers'); if (!usersEl) return;
  const users = parseInt(usersEl.value, 10), term = parseInt(document.getElementById('calcTerm').value, 10);
  document.getElementById('calcUsersVal').textContent = users;
  const e = estimate(users, term);
  document.getElementById('calcResult').innerHTML =
    '<div class="hs-est"><div class="hs-est__group"><div class="hs-est__h">One time</div>' +
      '<div class="result-item"><div class="result-label">Setup, ' + e.s.band + '</div><div class="result-num">' + fmt(e.s.setup) + '</div></div>' +
      '<div class="result-item"><div class="result-label">Due on signing</div><div class="result-num">' + fmt(e.signing) + '</div></div></div>' +
    '<div class="hs-est__group"><div class="hs-est__h">Every month</div>' +
      '<div class="result-item"><div class="result-label">Licence, ' + e.billed + ' users' + (users < 10 ? ' (10 minimum)' : '') + '</div><div class="result-num">' + fmt(e.monthly) + '<small>/month</small></div></div>' +
      '<div class="result-item"><div class="result-label">Per user at your size</div><div class="result-num">$' + e.rate + '<small>/month</small></div></div></div></div>' +
    '<div class="hs-est__total"><div><div class="hs-est__eyebrow">Year one, all in</div><div class="hs-est__big">' + fmt(e.firstYear) + '</div></div><div class="hs-est__note">Setup ' + fmt(e.s.setup) + ' plus licence ' + fmt(e.annualLicence) + (term === 2 ? ' prepaid, 5% off' : ' billed monthly') + '. From year two, the licence only.</div></div>';
}

function submitContact() {
  const name = document.getElementById('cc_name').value, email = document.getElementById('cc_email').value;
  const org = document.getElementById('cc_org').value, title = document.getElementById('cc_title').value;
  if (!email) { document.getElementById('cc_email').style.boxShadow = 'inset 0 0 0 2px #1E3A5F'; document.getElementById('cc_email').focus(); return; }
  const a = answers;
  const calcUsersEl = document.getElementById('calcUsers'), calcTermEl = document.getElementById('calcTerm');
  const calcUsers = calcUsersEl ? parseInt(calcUsersEl.value, 10) : 10, calcTerm = calcTermEl ? parseInt(calcTermEl.value, 10) : 1;
  const e = estimate(calcUsers, calcTerm);
  // HubSpot option values exactly as Kim mapped them
  var orgTypeMap = { nonprofit: 'Non-Profit / Charity', indigenous: 'Indigenous Organization', municipal: 'Government / Municipal', other_gov: 'Health Authority', other: 'Other' };
  var servicesMap = { cfs: 'Child & Family Services', indigenous_svc: 'Indigenous Services', mental_health: 'Mental Health & Addictions', housing: 'Housing & Homelessness', dv: 'Domestic Violence', employment: 'Other', food: 'Other', seniors_disability: 'Senior Services', youth: 'Other', other_svc: 'Other' };
  var challengesMap = { reporting: 'Reporting to funders', duplicates: 'Tracking client outcomes', too_many_tools: 'Data silos / spreadsheets', no_visibility: 'Coordinating across programs', data_entry: 'Data silos / spreadsheets', privacy: 'Compliance & audits', bad_fit: 'Data silos / spreadsheets', outcomes: 'Tracking client outcomes' };
  var usersMap = { '1-5': '1-10', '6-15': '11-25', '16-30': '26-50', '31-50': '51-100', '50+': '101-250' };
  var timelineMap = { immediate: 'Immediately', '3months': '1-3 months', '6months': '3-6 months', exploring: 'Just exploring' };
  var roleMap = { decision_maker: 'Executive / Director', evaluator: 'Program Manager', researcher: 'IT / Data', curious: 'Other' };
  var uniq = arr => arr.filter((v, i, x) => x.indexOf(v) === i);
  var hsServices = uniq((a.services || []).map(s => servicesMap[s] || 'Other'));
  var hsChallenges = uniq((a.challenges || []).map(c => challengesMap[c] || 'Compliance & audits'));
  const hubspotData = { fields: [
      { objectTypeId: '0-1', name: 'email', value: email },
      { objectTypeId: '0-1', name: 'firstname', value: name.split(' ')[0] || '' },
      { objectTypeId: '0-1', name: 'lastname', value: name.split(' ').slice(1).join(' ') || '' },
      { objectTypeId: '0-2', name: 'name', value: org },
      { objectTypeId: '0-1', name: 'jobtitle', value: title },
      { objectTypeId: '0-1', name: 'mareto_org_type', value: orgTypeMap[a.org_type] || 'Other' },
      { objectTypeId: '0-1', name: 'mareto_services', value: hsServices.join(';') },
      { objectTypeId: '0-1', name: 'mareto_programs', value: a.programs || '1-2' },
      { objectTypeId: '0-1', name: 'mareto_challenges', value: hsChallenges.join(';') },
      { objectTypeId: '0-1', name: 'mareto_users', value: usersMap[a.users] || '1-10' },
      { objectTypeId: '0-1', name: 'mareto_timeline', value: timelineMap[a.timeline] || 'Just exploring' },
      { objectTypeId: '0-1', name: 'mareto_role', value: roleMap[a.role] || 'Other' },
      { objectTypeId: '0-1', name: 'mareto_fit_score', value: String(fitPoints()) },
      { objectTypeId: '0-1', name: 'mareto_price_estimate', value: String(Math.round(e.firstYear)) },
      { objectTypeId: '0-1', name: 'mareto_calc_users', value: String(calcUsers) },
      { objectTypeId: '0-1', name: 'mareto_calc_term', value: String(calcTerm) }
    ],
    context: { hutk: (document.cookie.match(/hubspotutk=([^;]+)/) || [])[1] || undefined, pageUri: window.location.href, pageName: 'Mareto Fit Finder' } };
  fetch('https://api.hsforms.com/submissions/v3/integration/submit/5183115/471b1a5f-14ef-4fe1-8378-0c3ce499aef6', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(hubspotData) }).catch(function () {});
  const capture = document.querySelector('.contact-capture');
  capture.innerHTML = '<p style="font-weight:700;color:#0B7770">Thanks' + (name ? ', ' + name : '') + '. Your results and the links are on their way to ' + email + '. Forward them to anyone on your team.</p>';
  setTimeout(function () {
    var overlay = document.createElement('div'); overlay.id = 'demoOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(11,31,51,.45);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="ovh" style="background:#fff;border-radius:24px;padding:40px 36px;max-width:480px;width:90%;text-align:center;box-shadow:0 24px 56px rgba(11,31,51,.30),0 4px 14px rgba(11,31,51,.14);position:relative">' +
      '<button aria-label="Close" onclick="document.getElementById(\'demoOverlay\').remove()" style="position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:999px;background:#EDF5F4;border:none;font-size:22px;color:#1E3A5F;cursor:pointer">&times;</button>' +
      '<div style="width:56px;height:56px;background:linear-gradient(135deg,#336FB5,#3D9B96);border-radius:999px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>' +
      '<h3 id="ovh" style="font-size:22px;font-weight:700;color:#0B1F33;margin:0 0 8px">See Mareto in action</h3>' +
      '<p style="font-size:15px;color:#4A5568;margin:0 0 24px;line-height:1.5">Click through the interactive demo: real screens for intake, cases, the event log and reporting.</p>' +
      '<a href="' + DEMO + '" style="display:inline-flex;align-items:center;min-height:44px;background:linear-gradient(135deg,#0B1F33 22%,#336FB5 100%);color:#fff;font-size:15px;font-weight:700;padding:0 28px;border-radius:999px;text-decoration:none">Explore the demo</a>' +
      '<br><button onclick="document.getElementById(\'demoOverlay\').remove()" style="font-size:13px;color:#4A5568;margin-top:16px;background:none;border:none;cursor:pointer;min-height:44px">Maybe later</button></div>';
    overlay.addEventListener('click', ev => { if (ev.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }, 1500);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { const o = document.getElementById('demoOverlay'); if (o) o.remove(); }
  if (e.key === 'Enter' && !e.target.closest('input,button,.option')) { const nextBtn = document.getElementById('next_' + currentQ); if (nextBtn && nextBtn.classList.contains('enabled')) nextBtn.click(); }
});
'''


def main() -> None:
    t = PAGE.read_text(encoding="utf-8")
    logos = re.findall(r'<div class="landing" id="landing">[\s\S]*?<img src="([^"]+)" alt="Mareto">', t)
    logo = logos[0] if logos else re.search(r'<img src="(data:image[^"]+)"', t).group(1)
    t = re.sub(r'<div class="landing" id="landing">[\s\S]*?<!-- QUESTIONS -->', LANDING.format(logo=logo) + '\n  <!-- QUESTIONS -->', t, count=1)
    # the page's own script is the last <script> without src
    scripts = list(re.finditer(r'<script>([\s\S]*?)</script>', t))
    main_script = scripts[-1]
    t = t[:main_script.start()] + "<script>" + SCRIPT + "</script>" + t[main_script.end():]
    PAGE.write_text(t, encoding="utf-8")
    print("quiz rebuilt:", len(t) // 1024, "KB")


if __name__ == "__main__":
    main()
