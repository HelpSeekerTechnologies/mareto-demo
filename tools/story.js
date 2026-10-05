/* Mareto demo board: the story layer (design lane, 30 Sep 2026, Alina's ruling: one fictional agency, one
   year, read as a story). Runs after Kim's script. Fills her arrays in place with deterministic data for
   "Riverbend Family Services", a fictional five-program agency; redraws the static tables and tiles; redefines
   the calendars and the report studio; adds the persona screener (a counsellor sees five things, a director
   sees the whole picture, super admin sees it all); rebuilds the person record with tabs and pickers.
   Nothing here is a real person or a real client; every name is generated. */
(function () {
  'use strict';
  // ---------- deterministic randomness ----------
  let seed = 20260930;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;

  // ---------- the agency ----------
  const AGENCY = 'Riverbend Family Services';
  const PROGRAMS = [
    { id: 'familysupport', key: 'family', name: 'Family Support', short: 'Family', workers: ['Priya Raman', 'Daniel Okoro', 'Hannah Lindqvist'], events: ['Home visit', 'Family session', 'Collateral contact', 'Case conference', 'Phone call'], open: 22 },
    { id: 'youthservices', key: 'youth', name: 'Youth Services', short: 'Youth', workers: ['Marcus Webb', 'Aisha Bakr'], events: ['Individual session', 'Group session', 'Crisis intervention', 'Phone call', 'School meeting'], open: 15 },
    { id: 'counselling', key: 'counselling', name: 'Counselling', short: 'Counselling', workers: ['Sofia Delgado', 'Thomas Nguyen'], events: ['Counselling session', 'Intake assessment', 'Phone call', 'Check-in'], open: 12 },
    { id: 'employment', key: 'employment', name: 'Employment', short: 'Employment', workers: ['Jordan Ellis'], events: ['Coaching session', 'Workshop', 'Employer contact', 'Phone call'], open: 8 },
    { id: 'earlylearning', key: 'earlylearning', name: 'Early Learning', short: 'Early learning', workers: ['Mei Lin Chow'], events: ['Playgroup', 'Home visit', 'Parent session', 'Developmental screen'], open: 10 },
  ];
  const WORKERS = PROGRAMS.flatMap((p) => p.workers.map((w) => ({ name: w, program: p })));
  const FIRST = ['Amara', 'Liam', 'Noor', 'Ethan', 'Grace', 'Kai', 'Sienna', 'Mateo', 'Ivy', 'Rowan', 'Layla', 'Owen', 'Zara', 'Felix', 'Nadia', 'Theo', 'Maya', 'Idris', 'Elena', 'Caleb', 'Anika', 'Jonah', 'Freya', 'Luca', 'Amina', 'Silas', 'Tessa', 'Ravi', 'Chloe', 'Emeka', 'Hazel', 'Arjun', 'Juniper', 'Bodhi', 'Leila', 'Ezra', 'Wren', 'Kwame', 'Isla', 'Omar', 'Nora', 'Dante', 'Sage', 'Yusuf', 'Ada', 'Miles', 'Rhea', 'Tobias', 'Esme', 'Hugo', 'Lena'];
  const LAST = ['Fontaine', 'Okafor', 'Whitehorse', 'Bergeron', 'Sato', 'Macdonald', 'Ibrahim', 'Kowalski', 'Desrosiers', 'Chen', 'Singh', 'Reyes', 'Oduya', 'Larsen', 'Petrov', 'Nakamura', 'Cardinal', 'Hussain', 'Tremblay', 'Adeyemi', 'Gallagher', 'Moreau', 'Bouchard', 'Dube', 'Kimura', 'Osei', 'Villeneuve', 'Ahmed', 'Beaulieu', 'Crowchild', 'Lapointe', 'Mensah', 'Rousseau', 'Tanaka', 'Wolfe', 'Zhang', 'Girard', 'Haddad', 'Nielsen', 'Paquette'];
  const SOURCES = ['Self-referral', 'MCFD', 'School counsellor', 'Family doctor', 'Community agency', 'Crisis line', 'Police', 'Hospital social work'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const TODAY = new Date(2026, 8, 30);
  const fmt = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const fmtUS = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  const daysAgo = (n) => new Date(TODAY.getTime() - n * 86400000);
  const daysAhead = (n) => new Date(TODAY.getTime() + n * 86400000);

  // ---------- people, families, cases ----------
  const people = [], families = [], cases = [];
  let caseNo = 1000, famNo = 0;
  const ROLES = ['Client', 'Client', 'Client', 'Client', 'Dependent', 'Guardian'];
  const AGE = (dob) => { const a = TODAY.getFullYear() - dob.getFullYear(); return a < 6 ? '0-5 years' : a < 13 ? '6-12 years' : a < 19 ? '13-18 years' : a < 30 ? '19-29 years' : a < 65 ? '30-64 years' : '65+ years'; };
  for (let i = 0; i < 140; i++) {
    const role = pick(ROLES);
    const yob = role === 'Dependent' ? between(2012, 2024) : role === 'Guardian' ? between(1958, 1985) : between(1966, 2010);
    const dob = new Date(yob, between(0, 11), between(1, 28));
    const prog = pick(PROGRAMS);
    const indigenous = chance(0.22);
    const p = {
      last: pick(LAST), first: pick(FIRST), dob: fmtUS(dob), phone: `(${pick(['604', '778', '250'])}) 555-${String(between(1000, 9999))}`,
      address: `${between(100, 9800)} ${pick(['Alder', 'Birch', 'Cedar', 'Elm', 'Fir', 'Maple', 'Oak', 'Spruce', 'Willow', 'River'])} ${pick(['St', 'Ave', 'Rd', 'Cres', 'Way'])}`,
      role, status: chance(0.86) ? 'Active' : 'Inactive', indigenous: indigenous ? pick(['First Nations', 'Metis', 'Inuit']) : 'Not identified', age: AGE(dob),
      gender: pick(['Female', 'Female', 'Male', 'Male', 'Non-binary']), pronouns: '', legalGender: '', careCard: `9${between(100, 999)} ${between(100, 999)} ${between(100, 999)}`, bandId: indigenous ? String(between(10000, 99999)) : '', mcfd: chance(0.3) ? `MC-${between(100000, 999999)}` : '',
      immigration: pick(['Citizen', 'Citizen', 'Citizen', 'Permanent resident', 'Refugee claimant', 'Temporary resident']), email: '', altPhone: '', voicemail: 'Yes', bestContact: pick(['Phone', 'Text', 'Email']), bestTime: pick(['Mornings', 'Afternoons', 'Evenings']),
      prefLang: pick(['English', 'English', 'English', 'Punjabi', 'Tagalog', 'Spanish', 'Arabic', 'Mandarin']), otherLang: '', interpreter: 'No', emergencyContact: '', addressType: 'Home', postalCode: `V${between(1, 9)}${pick('ABCEGHJKLMNPRSTVXY')} ${between(1, 9)}${pick('ABCEGHJKLMNPRSTVXY')}${between(1, 9)}`,
      city: pick(['Riverbend', 'Riverbend', 'Riverbend', 'Millbrook', 'Cedar Falls']), province: 'BC', isIndigenous: indigenous ? 'Yes' : 'No', fatherNation: '', motherNation: '', bandMembership: '', education: pick(['Some high school', 'High school', 'College', 'University', '']),
      riskIdentified: chance(0.12) ? 'Yes' : 'No', alertSummary: '', specialMedical: chance(0.15) ? pick(['Asthma', 'Diabetes', 'Anxiety', 'ADHD']) : '', disability: chance(0.1) ? 'Yes' : 'No', lifeStatus: 'Living', legalAgeStatus: yob > 2007 ? 'Minor' : 'Adult', notes: '', additionalInfo: '', middleName: '', preferredName: chance(0.2) ? pick(FIRST) : '', consentFile: '', intakeComplete: chance(0.8) ? 'Yes' : 'No',
      _program: prog, _worker: pick(prog.workers),
    };
    p.pronouns = p.gender === 'Female' ? 'She/Her' : p.gender === 'Male' ? 'He/Him' : 'They/Them'; p.legalGender = p.gender === 'Non-binary' ? 'X' : p.gender;
    if (p.riskIdentified === 'Yes') p.alertSummary = pick(['Risk to self', 'Domestic violence in the home', 'Housing loss within 30 days', 'Substance use, active']);
    p.prefLang !== 'English' && (p.interpreter = chance(0.5) ? 'Yes' : 'No');
    people.push(p);
  }
  // families: pairs of clients and dependents that share a last name
  const byLast = {}; people.forEach((p) => (byLast[p.last] = byLast[p.last] || []).push(p));
  Object.values(byLast).filter((g) => g.length >= 2).slice(0, 30).forEach((g) => {
    const head = g.find((p) => p.role !== 'Dependent') || g[0]; const kids = g.filter((p) => p.role === 'Dependent');
    families.push({ name: `${head.last} family`, members: g.length, children: kids.length, active: 'Yes', numChildren: kids.length, caregiver: `${head.first} ${head.last}`, staff: head._worker, volunteer: '', address: head.address, postalCode: head.postalCode, city: head.city, email: '', phone: head.phone, indigenousCommunity: head.isIndigenous === 'Yes' ? pick(['Musqueam', 'Squamish', 'Sto:lo', 'Metis Nation BC']) : '', indigenousIdentity: head.indigenous, cultural: '', housing: pick(['Renting', 'Renting', 'Owned', 'Supportive housing', 'Staying with family']), addlLanguages: '', primaryLang: head.prefLang, interpreter: head.interpreter, strengths: pick(['Strong extended family', 'Engaged with school', 'Stable employment', 'Connected to community']), goals: pick(['Stable housing by spring', 'Reunification plan', 'School attendance', 'Parenting support']), assessment: '', concerns: '', consentDate: fmt(daysAgo(between(30, 300))), consentSigned: 'Yes', infoSharing: 'Program only', relatedCases: '', notes: '' });
  });
  // cases: one per programme enrolment; statuses weighted; opened across the year
  const STATUS_W = ['Open', 'Open', 'Open', 'Open', 'Open', 'Pending', 'On Hold', 'Transferred', 'Closed', 'Closed', 'Closed'];
  PROGRAMS.forEach((prog) => {
    const n = Math.round(prog.open * 1.7);
    for (let i = 0; i < n; i++) {
      const person = pick(people.filter((p) => p.role !== 'Dependent')); const status = i < prog.open ? 'Open' : pick(STATUS_W.slice(5));
      const opened = daysAgo(between(5, 330)); const last = new Date(Math.max(opened.getTime(), daysAgo(between(0, 40)).getTime()));
      cases.push({ no: String(++caseNo).padStart(5, '0'), person, program: prog, status, worker: pick(prog.workers), opened, last, source: pick(SOURCES), goal: pick(['Stable housing', 'Family reunification', 'School re-engagement', 'Employment', 'Mental health support', 'Parenting skills']), stage: pick(['Crisis', 'Stabilizing', 'Stable', 'Thriving']) });
    }
  });
  // events: ~900 across the year, Oct 2025 to Sep 2026, busier in spring, quiet in August
  const monthWeight = [0.9, 0.95, 1.1, 1.15, 1.0, 0.95, 1.1, 0.75, 0.9, 1.0, 1.0, 0.85]; // Jan..Dec
  const events = [];
  for (let d = 364; d >= 0; d--) {
    const day = daysAgo(d); if (day.getDay() === 0 || day.getDay() === 6) continue;
    const k = Math.round(3.4 * monthWeight[day.getMonth()] + (rnd() - 0.5));
    for (let i = 0; i < k; i++) { const c = pick(cases); events.push({ person: `${c.person.first} ${c.person.last}`, type: pick(c.program.events), date: fmt(day), duration: pick(['30 min', '45 min', '60 min', '90 min', '2 hrs']), worker: c.worker, _d: day, _case: c }); }
  }
  events.sort((a, b) => b._d - a._d);
  // appointments: past three weeks and next six, with statuses that make sense in time
  const appts = [];
  for (let d = -21; d <= 42; d++) { const day = daysAhead(d); if (day.getDay() === 0 || day.getDay() === 6) continue; const k = between(1, 3); for (let i = 0; i < k; i++) { const c = pick(cases.filter((x) => x.status === 'Open')); appts.push({ person: c.person, worker: c.worker, program: c.program, date: day, time: `${between(9, 16)}:${pick(['00', '30'])}`, status: d < 0 ? pick(['Completed', 'Completed', 'Completed', 'No show', 'Rescheduled']) : d === 0 ? 'Today' : pick(['Confirmed', 'Confirmed', 'Scheduled']), kind: pick(['Session', 'Home visit', 'Intake', 'Check-in', 'Family meeting']) }); } }
  // checkpoints and consent expiries for the calendars
  const checkpoints = cases.filter((c) => c.status === 'Open').map((c) => ({ date: daysAhead(between(-10, 45)), kind: pick(['Review', 'Review', 'Consent', 'Plan']), case: c }));
  // referrals and intakes
  const referrals = [];
  for (let i = 0; i < 20; i++) { const c = pick(cases); referrals.push({ person: `${c.person.first} ${c.person.last}`, type: pick(['Internal', 'External', 'Incoming']), status: i < 8 ? 'Pending' : 'Accepted', referringWorker: c.worker, currentProgram: c.program.name, receivingProgram: pick(PROGRAMS).name, receivingWorker: pick(WORKERS).name, date: fmt(daysAgo(between(0, 60))), priority: pick(['Standard', 'Standard', 'Urgent']), reason: pick(['Needs counselling alongside family support', 'Youth aging into employment program', 'Housing instability', 'Early learning screen for the youngest child']), followUp: fmt(daysAhead(between(3, 21))), case: c.no, notes: '' }); }
  const intakes = [];
  for (let i = 0; i < 14; i++) { const p = pick(people.filter((x) => x.role === 'Client')); intakes.push({ person: `${p.last}, ${p.first}`, status: i < 9 ? pick(['New', 'In process', 'In process', 'Screening']) : 'Closed', worker: pick(WORKERS).name, source: pick(SOURCES), date: daysAgo(between(0, 45)), program: pick(PROGRAMS).name }); }

  // monthly series (calendar year 2026, Jan..Sep real, Oct..Dec zero): files opened, closed, events per month
  const opened = new Array(12).fill(0), closed = new Array(12).fill(0), evMonthly = new Array(12).fill(0);
  cases.forEach((c) => { if (c.opened.getFullYear() === 2026) opened[c.opened.getMonth()]++; if (c.status === 'Closed' && c.last.getFullYear() === 2026) closed[c.last.getMonth()]++; });
  events.forEach((e) => { if (e._d.getFullYear() === 2026) evMonthly[e._d.getMonth()]++; });
  const byProgramOpen = {}; PROGRAMS.forEach((p) => (byProgramOpen[p.key] = cases.filter((c) => c.program === p && c.status === 'Open').length));
  const statusCounts = {}; cases.forEach((c) => (statusCounts[c.status] = (statusCounts[c.status] || 0) + 1));
  const eventTypes = {}; events.forEach((e) => (eventTypes[e.type] = (eventTypes[e.type] || 0) + 1));
  const sourceCounts = {}; cases.forEach((c) => (sourceCounts[c.source] = (sourceCounts[c.source] || 0) + 1));
  const stages = {}; cases.filter((c) => c.status === 'Open').forEach((c) => (stages[c.stage] = (stages[c.stage] || 0) + 1));

  window.STORY = { AGENCY, PROGRAMS, WORKERS, people, families, cases, events, appts, checkpoints, referrals, intakes, opened, closed, evMonthly, byProgramOpen, statusCounts, eventTypes, sourceCounts, stages, TODAY };

  // ---------- helpers ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const pill = (text, tone) => `<span class="hs-role${tone === 'good' ? ' hs-role--client' : ''}">${text}</span>`;
  const tone = (s) => /open|active|confirmed|completed|accepted|accepting|thriving|stable/i.test(s) ? 'good' : '';
  const bars = (rows, total) => { const top = Math.max(...rows.map((r) => r[1]), 1); return `<div class="hs-bars">${rows.map(([l, v]) => `<div class="hs-bar"><span class="hs-bar__l">${l}</span><span class="hs-bar__t"><span class="hs-bar__f" style="width:${Math.round(100 * v / top)}%"></span></span><span class="hs-bar__v">${v}</span></div>`).join('')}</div>${total != null ? `<div class="hs-bars--total">Total ${total}</div>` : ''}`; };
  const insight = (text) => `<p class="hs-insight">${text}</p>`;

  // ---------- 1. fill Kim's arrays in place and redraw her tables ----------
  const fill = (arr, rows) => { if (!Array.isArray(arr)) return; arr.length = 0; rows.forEach((r) => arr.push(r)); };
  try { fill(personData, people); fill(eventData, events); fill(familyData, families); fill(referralData, referrals); } catch (e) { console.warn('story: arrays', e); }
  /* story: person flags */
  const flagsFor = (p) => { const f = []; if (p.riskIdentified === 'Yes') f.push(['hs-dot--review', 'Risk identified' + (p.alertSummary ? ': ' + p.alertSummary : '')]); if (cases.some((c) => c.person === p && c.status === 'Open')) f.push(['hs-dot--appt', 'Open case file']); if (checkpoints.some((c) => c.kind === 'Consent' && c.case.person === p && c.date <= daysAhead(30))) f.push(['hs-dot--consent', 'Consent expires within 30 days']); if (appts.some((a) => a.person === p && a.date >= daysAgo(0) && a.date <= daysAhead(7))) f.push(['hs-dot--plan', 'Appointment this week']); return f; };
  window.renderPersonSubTable = function (data, bodyId, pagId, paginate) {
    const body = document.getElementById(bodyId); if (!body) return;
    const searchInput = document.querySelector(`[data-table="${bodyId.replace('Body', 'Table')}"]`); const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    let filtered = data; if (q) filtered = data.filter((p) => Object.values(p).some((v) => String(v).toLowerCase().includes(q)));
    const total = filtered.length, start = (personPage - 1) * personPerPage, pageData = paginate ? filtered.slice(start, start + personPerPage) : filtered;
    body.innerHTML = pageData.map((p) => { const f = flagsFor(p); return `<tr onclick="openPersonModal(${personData.indexOf(p)})"><td><span class="hs-flags">${f.map((x) => `<i class="hs-dot ${x[0]}" title="${x[1]}"></i>`).join('')}</span>${p.last}</td><td>${p.first}</td><td>${p.dob}</td><td>${p.phone}</td><td>${p.address}</td><td>${p.role}</td><td>${p.indigenous}</td><td>${p.age}</td></tr>`; }).join('');
    if (pagId) { const pagEl = document.getElementById(pagId); const end = Math.min(start + personPerPage, total); if (pagEl) pagEl.innerHTML = `<div class="pag-info"><span>${total > 0 ? start + 1 : 0} - ${end} of ${total} records</span></div><div class="pag-btns"><button class="pag-btn" onclick="personPage=Math.max(1,personPage-1);renderPersonTable()">&lsaquo;</button><button class="pag-btn" onclick="if(personPage*personPerPage<${total}){personPage++;renderPersonTable()}">&rsaquo;</button></div>`; }
  };
  $$('#person-active .table-header, #person-inactive .table-header').forEach((h) => { if (!h.nextElementSibling || !h.nextElementSibling.classList.contains('hs-legend')) h.insertAdjacentHTML('afterend', '<div class="hs-legend hs-legend--table"><span><i class="hs-dot hs-dot--review"></i>Risk identified</span><span><i class="hs-dot hs-dot--appt"></i>Open case file</span><span><i class="hs-dot hs-dot--consent"></i>Consent expiring</span><span><i class="hs-dot hs-dot--plan"></i>Appointment this week</span></div>'); });
  try { renderPersonTable(); renderEventTable(); } catch (e) { console.warn('story: tables', e); }

  // ---------- 2. the static pages (re-run per persona scope) ----------
  const ALL = { cases, events, appts, checkpoints, WORKERS, closed, opened };
  const renderStatic = (prog) => {
    const inScope = (c) => !prog || c.program === prog;
    const cases = ALL.cases.filter(inScope), events = ALL.events.filter((e) => inScope(e._case)), appts = ALL.appts.filter((a) => !prog || a.person._program === prog), checkpoints = ALL.checkpoints.filter((c) => inScope(c.case)), WORKERS = ALL.WORKERS.filter((w) => !prog || w.program === prog);
    const opened = new Array(12).fill(0), closed = new Array(12).fill(0);
    cases.forEach((c) => { if (c.opened.getFullYear() === 2026) opened[c.opened.getMonth()]++; if (c.status === 'Closed' && c.last.getFullYear() === 2026) closed[c.last.getMonth()]++; });
  const openCases = cases.filter((c) => c.status === 'Open');
  const eventsThisWeek = events.filter((e) => e._d >= daysAgo(7)).length;
  const dueSoon = checkpoints.filter((c) => c.date >= TODAY && c.date <= daysAhead(7)).length;
  const setKpis = (pageId, values) => { $$(`#${pageId} .kpi`).forEach((k, i) => { if (values[i] == null) return; const [label, value, sub] = values[i]; $('.kpi-label', k).textContent = label; $('.kpi-value', k).textContent = value; const s = $('.kpi-sub', k); if (s && sub) s.textContent = sub; }); };
  setKpis('page-home', [['Open caseload', openCases.length, `across ${WORKERS.length} workers, ${(openCases.length / WORKERS.length).toFixed(1)} each`], ['Events this week', eventsThisWeek, 'sessions, visits and calls logged by staff'], ['Checkpoints due', dueSoon, 'reviews and consents falling due in 7 days'], ['Staff active today', WORKERS.length, 'signed in and recording'], ['People', prog ? people.filter((x) => x._program === prog).length : people.length], ['Active cases', openCases.length], ['Events', events.length], ['Intakes', intakes.filter((i) => i.status !== 'Closed').length], ['Referrals', referrals.filter((r) => r.status === 'Pending').length], ['Surveys', 36]]);
  // home charts: people by program, caseload by worker, open cases by program
  const homeCards = $$('#page-home .card').filter((c) => $('h4', c));
  homeCards.forEach((card) => {
    const h0 = $('h4', card).textContent.trim(); const key = card.dataset.hsChart || (/Service Area/i.test(h0) ? 'people' : /Caseworker|Case Worker/i.test(h0) ? 'worker' : /by Program/i.test(h0) ? 'program' : ''); card.dataset.hsChart = key; const h = key === 'people' ? 'Service Area' : key === 'worker' ? 'Caseworker' : key === 'program' ? 'by Program' : '';
    if (/Service Area/i.test(h)) { $('h4', card).textContent = 'People by program'; const rows = PROGRAMS.filter((p) => !prog || p === prog).map((p) => [p.short, people.filter((x) => x._program === p && x.status === 'Active').length]); card.innerHTML = `<h4>People by program</h4>${bars(rows)}${insight(`${rows.sort((a, b) => b[1] - a[1])[0][0]} carries the largest share of active people; every one of them has one record across every program they touch.`)}`; }
    else if (/Caseworker|Case Worker/i.test(h)) { const rows = WORKERS.map((w) => [w.name, openCases.filter((c) => c.worker === w.name).length]).sort((a, b) => b[1] - a[1]); card.innerHTML = `<h4>Open caseload by worker</h4>${bars(rows, openCases.length)}${insight(`${rows[0][0]} carries ${rows[0][1]} open files; ${rows[rows.length - 1][0]} has capacity at ${rows[rows.length - 1][1]}.`)}`; }
    else if (/by Program/i.test(h)) { const rows = PROGRAMS.filter((p) => !prog || p === prog).map((p) => [p.name, cases.filter((c) => c.program === p && c.status === 'Open').length]); card.innerHTML = `<h4>Open cases by program</h4>${bars(rows, openCases.length)}${insight(`Family Support is ${Math.round(100 * byProgramOpen.family / openCases.length)}% of open files; ${referrals.filter((r) => r.status === 'Pending').length} referrals are waiting to be placed.`)}`; }
  });
  // case page
  const caseCols = { Open: 'open', Pending: 'pending', 'On Hold': 'onhold', Transferred: 'transferred', Closed: 'closed' };
  $$('#caseKanban .kanban-col').forEach((col) => { const status = Object.keys(caseCols).find((k) => caseCols[k] === col.dataset.col); $$('.kanban-card', col).forEach((c) => c.remove()); cases.filter((c) => c.status === status).slice(0, status === 'Open' ? 12 : 6).forEach((c) => { const el = document.createElement('div'); el.className = 'kanban-card'; el.draggable = true; el.setAttribute('onclick', `openCaseModal('${c.person.last}, ${c.person.first[0]} - ${c.no}','${c.program.name}','${c.status}')`); el.innerHTML = `<div class="kc-name">${c.person.last}, ${c.person.first[0]} - ${c.no}</div><div class="kc-prog">${c.program.name} · ${c.worker.split(' ')[0]}</div>`; col.appendChild(el); }); });
  const caseBody = $('#caseRecordList tbody'); if (caseBody) caseBody.innerHTML = cases.slice().sort((a, b) => b.last - a.last).slice(0, 40).map((c) => `<tr onclick="openCaseModal('${c.person.last}, ${c.person.first[0]} - ${c.no}','${c.program.name}','${c.status}')"><td>${c.no}</td><td>${c.person.last}, ${c.person.first}</td><td>${c.program.name}</td><td>${pill(c.status, tone(c.status))}</td><td>${c.worker}</td><td>${fmtUS(c.opened)}</td><td>${fmtUS(c.last)}</td></tr>`).join('');
  const caseCard = $$('#page-case .card').find((c) => $('h4', c)); if (caseCard) { const rows = WORKERS.map((w) => [w.name, openCases.filter((c) => c.worker === w.name).length]).sort((a, b) => b[1] - a[1]); caseCard.innerHTML = `<h4>Open caseload by worker</h4>${bars(rows, openCases.length)}`; }
  const pendingAll = cases.filter((c) => c.status === 'Pending' || c.status === 'On Hold').sort((a, b) => a.last - b.last); let staleDays = 7; let stale = pendingAll.filter((c) => c.last < daysAgo(7)); if (stale.length < 3) { staleDays = 3; stale = pendingAll.filter((c) => c.last < daysAgo(3)); } if (stale.length < 3) { staleDays = 0; stale = pendingAll; }
  const kpCard = $('[data-hs-tile="pending"]') || ($('#kpiPending') && $('#kpiPending').closest('.card')); if (kpCard) { kpCard.dataset.hsTile = 'pending'; kpCard.classList.remove('kpi'); kpCard.style.flex = '.7'; kpCard.innerHTML = `<h4>Needs attention</h4><div class="hs-kpi-line"><span class="hs-kpi-n">${stale.length}</span><span class="hs-kpi-t">${staleDays ? 'pending files with no touch in ' + staleDays + ' days' : 'pending or on-hold files, oldest first'}</span></div><ul class="hs-mini">${stale.slice(0, 4).map((c) => `<li onclick="openCaseModal('${c.person.last}, ${c.person.first[0]} - ${c.no}','${c.program.name}','${c.status}')"><i class="hs-dot hs-dot--review"></i><b>${c.person.last}, ${c.person.first[0]}</b><span>${c.program.name.split(' ')[0]} · ${c.worker.split(' ')[0]}</span><em>${Math.round((TODAY - c.last) / 86400000)} d</em></li>`).join('')}</ul>${insight('Oldest first. A pending file that goes quiet is usually a missed callback, not a closed need.')}`; }
  const thisM = closed[TODAY.getMonth()], lastM = closed[(TODAY.getMonth() + 11) % 12], recent = cases.filter((c) => c.status === 'Closed').sort((a, b) => b.last - a.last).slice(0, 4);
  const kcCard = $('[data-hs-tile="closed"]') || ($('#kpiClosed') && $('#kpiClosed').closest('.card')); if (kcCard) { kcCard.dataset.hsTile = 'closed'; kcCard.classList.remove('kpi'); kcCard.style.flex = '.7'; const d = thisM - lastM; kcCard.innerHTML = `<h4>Closed this month</h4><div class="hs-kpi-line"><span class="hs-kpi-n">${thisM}</span><span class="hs-kpi-t">${d >= 0 ? '▲ +' + d : '▼ ' + d} vs ${MONTHS[(TODAY.getMonth() + 11) % 12]} (${lastM})</span></div><ul class="hs-mini">${recent.map((c) => `<li onclick="openCaseModal('${c.person.last}, ${c.person.first[0]} - ${c.no}','${c.program.name}','${c.status}')"><i class="hs-dot hs-dot--plan"></i><b>${c.person.last}, ${c.person.first[0]}</b><span>${c.program.name.split(' ')[0]} · ${Math.round((c.last - c.opened) / 86400000)} days open</span><em>${fmt(c.last).replace(/, \d{4}$/, '')}</em></li>`).join('')}</ul>${insight(`${closed.reduce((a, b) => a + b, 0)} files closed in 2026 so far; goal stage at close is what the funder report reads.`)}`; }
  window.toggleCaseView = function () { /* story: toggleCaseView */ const k = $('#caseKanban'), l = $('#caseRecordList'), b = $('#caseViewToggle'); const showList = k.style.display !== 'none'; k.style.display = showList ? 'none' : ''; l.style.display = showList ? '' : 'none'; if (b) b.textContent = showList ? 'Switch to board view' : 'Switch to list view'; };
  $$('#page-case .section-bar').forEach((b) => { const txt = b.textContent.trim(); if (/Create a New Case/i.test(txt)) { b.outerHTML = '<div class="hs-case-actions"><button class="btn-primary" onclick="openCreateModal(&quot;case&quot;)">+ New case</button><button class="btn-mist" id="caseViewToggle" onclick="toggleCaseView()">Switch to list view</button></div>'; } else if (/RecordList View/i.test(txt)) b.remove(); });
  // appointments
  const apptBody = $('#apptTable tbody'); if (apptBody) { const upcoming = appts.filter((a) => a.date >= TODAY).sort((a, b) => a.date - b.date); apptBody.innerHTML = upcoming.slice(0, 14).map((a) => `<tr onclick="openAppointmentViewModal(this)" style="cursor:pointer"><td><a>${a.person.last}, ${a.person.first}</a></td><td>${fmt(a.date)} · ${a.time}</td><td>${pill(a.status, tone(a.status))}</td></tr>`).join(''); setKpis('page-appointment', [['Appointments, 30 days', appts.filter((a) => a.date >= daysAgo(0) && a.date <= daysAhead(30)).length], ['Upcoming this week', appts.filter((a) => a.date >= TODAY && a.date <= daysAhead(7)).length], ['Completed, last 3 weeks', appts.filter((a) => a.status === 'Completed').length]]); const h = $$('#page-appointment h3').find((x) => /Upcoming/i.test(x.textContent)); if (h) h.textContent = 'Upcoming appointments'; }
  // intake
  const inNew = $('#intakeNewTable tbody'); if (inNew) inNew.innerHTML = intakes.filter((i) => i.status !== 'Closed').map((i) => `<tr onclick="openIntakeModal('${i.person}')"><td>${i.person}</td><td>${pill(i.status, i.status === 'New' ? 'good' : '')}</td><td>${i.worker}</td><td>${i.source}</td><td>${fmt(i.date)}</td></tr>`).join('');
  const inClosed = $('#intake-closed tbody'); if (inClosed) inClosed.innerHTML = intakes.filter((i) => i.status === 'Closed').map((i) => `<tr><td>${i.person}</td><td>${pill('Closed')}</td><td>${i.worker}</td><td>${i.source}</td><td>${fmt(i.date)}</td></tr>`).join('');
  setKpis('page-intake', [['Closed, no further action', intakes.filter((i) => i.status === 'Closed').length], null, ['In process', intakes.filter((i) => i.status !== 'Closed').length]]);
  const intakeChart = $$('#page-intake .card').find((c) => $('h4', c)); if (intakeChart) { const rows = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]); intakeChart.innerHTML = `<h4>Referral sources, this year</h4>${bars(rows)}`; }
  // referrals
  const refNew = $('#refNewTable tbody'); if (refNew) refNew.innerHTML = referrals.filter((r) => r.status === 'Pending').map((r, i) => `<tr onclick="openReferralModal(${i})"><td>${r.person}</td><td>${r.type}</td><td>${pill(r.status)}</td><td>${r.receivingWorker}</td><td>${r.receivingProgram}</td><td>${r.referringWorker}</td><td>${r.date}</td></tr>`).join('');
  const refAcc = $('#refAcceptedTable tbody'); if (refAcc) refAcc.innerHTML = referrals.filter((r) => r.status === 'Accepted').map((r, i) => `<tr onclick="openReferralModal(${i + 8})"><td>${r.person}</td><td>${r.type}</td><td>${pill(r.status, 'good')}</td><td>${r.receivingWorker}</td><td>${r.receivingProgram}</td><td>${r.referringWorker}</td><td>${r.date}</td></tr>`).join('');
  // programs
  const progTable = $('[data-hs-programs] tbody'); if (progTable) progTable.innerHTML = PROGRAMS.map((p) => `<tr onclick="navigateTo('${p.id}')" style="cursor:pointer"><td><a>${p.name}</a></td><td>${byProgramOpen[p.key]}</td><td>${p.workers.length}</td><td>${events.filter((e) => e._case.program === p && e._d >= daysAgo(30)).length}</td><td>${referrals.filter((r) => r.receivingProgram === p.name && r.date && true).length}</td><td>${pill(p.key === 'counselling' ? 'Waitlist' : 'Accepting', p.key === 'counselling' ? '' : 'good')}</td></tr>`).join('');
  $$('#page-programs .card').filter((c) => $('h4', c)).forEach((card, i) => { const h = $('h4', card).textContent; if (/Caseload/i.test(h)) card.innerHTML = `<h4>Open cases by program</h4>${bars(PROGRAMS.map((p) => [p.name, byProgramOpen[p.key]]), openCases.length)}`; else card.innerHTML = `<h4>Events this month by program</h4>${bars(PROGRAMS.map((p) => [p.name, events.filter((e) => e._case.program === p && e._d >= daysAgo(30)).length]))}`; });

  };
  renderStatic(null);
  const openCases = cases.filter((c) => c.status === 'Open');

  // ---------- 3. calendars with a legend and real dots ----------
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const calIndex = {}; appts.forEach((a) => (calIndex[dayKey(a.date)] = calIndex[dayKey(a.date)] || []).push({ kind: 'Appointment', text: `${a.time} ${a.person.last}`, cls: 'hs-dot--appt' })); checkpoints.forEach((c) => (calIndex[dayKey(c.date)] = calIndex[dayKey(c.date)] || []).push({ kind: c.kind, text: c.kind === 'Consent' ? 'Consent expiry' : c.kind === 'Plan' ? 'Plan due' : 'Review', cls: c.kind === 'Consent' ? 'hs-dot--consent' : c.kind === 'Plan' ? 'hs-dot--plan' : 'hs-dot--review' }));
  const LEGEND = '<div class="hs-legend"><span><i class="hs-dot hs-dot--appt"></i>Appointment</span><span><i class="hs-dot hs-dot--review"></i>Review</span><span><i class="hs-dot hs-dot--consent"></i>Consent expiry</span><span><i class="hs-dot hs-dot--plan"></i>Plan due</span></div>';
  const grid = (y, m, opts) => { const first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate(); let h = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<div class="cal-header">${d}</div>`).join(''); for (let i = 0; i < first; i++) h += '<div class="cal-day empty"></div>'; for (let d = 1; d <= n; d++) { const items = calIndex[`${y}-${m}-${d}`] || []; const today = y === TODAY.getFullYear() && m === TODAY.getMonth() && d === TODAY.getDate(); h += `<div class="cal-day${today ? ' today' : ''}${items.length ? ' has' : ''}"><div class="day-num">${d}</div>${items.slice(0, opts.max).map((it) => `<div class="hs-cal-item"><i class="hs-dot ${it.cls}"></i>${opts.short ? '' : it.text}</div>`).join('')}${items.length > opts.max ? `<div class="hs-cal-more">+${items.length - opts.max}</div>` : ''}</div>`; } return h; };
  window.renderCalendar = function () { const t = $('#calTitle'); if (t) t.textContent = `${LONG[calMonth]} ${calYear}`; const g = $('#calGrid'); if (!g) return; g.innerHTML = grid(calYear, calMonth, { max: 3, short: false }); if (!$('.hs-legend', g.parentElement)) g.insertAdjacentHTML('beforebegin', LEGEND); };
  window.renderMiniCal = function () { const c = $('#homeMiniCal'); if (!c) return; c.innerHTML = `<div class="hs-minical-head"><button class="hs-cal-nav" id="hsMcPrev">&lsaquo;</button><b>${LONG[homeCalMonth]} ${homeCalYear}</b><button class="hs-cal-nav" id="hsMcNext">&rsaquo;</button></div>${LEGEND}<div class="cal-grid hs-minical">${grid(homeCalYear, homeCalMonth, { max: 2, short: true })}</div>`; $('#hsMcPrev').onclick = () => { homeCalMonth--; if (homeCalMonth < 0) { homeCalMonth = 11; homeCalYear--; } renderMiniCal(); }; $('#hsMcNext').onclick = () => { homeCalMonth++; if (homeCalMonth > 11) { homeCalMonth = 0; homeCalYear++; } renderMiniCal(); }; };
  window.renderApptPageCalendar = function () { let y = TODAY.getFullYear(), m = TODAY.getMonth(); const c = $('#apptPageCalendar'); if (!c) return; const draw = () => { c.innerHTML = `<div class="hs-minical-head"><button class="hs-cal-nav" id="hsApPrev">&lsaquo;</button><b>${LONG[m]} ${y}</b><button class="hs-cal-nav" id="hsApNext">&rsaquo;</button></div>${LEGEND}<div class="cal-grid">${grid(y, m, { max: 4, short: true })}</div>`; $('#hsApPrev').onclick = () => { m--; if (m < 0) { m = 11; y--; } draw(); }; $('#hsApNext').onclick = () => { m++; if (m > 11) { m = 0; y++; } draw(); }; }; draw(); };
  try { renderCalendar(); renderMiniCal(); renderApptPageCalendar(); } catch (e) { console.warn('story: calendars', e); }

  // ---------- 4. the report studio as a story ----------
  const RS = { open: openCases.length, opened: opened.reduce((a, b) => a + b, 0), closed: closed.reduce((a, b) => a + b, 0), people: people.length, added: people.length - 60 };
  window.updateReportStudio = function () {
    const year = ($('#rs-year') || {}).value || '2026'; const period = ($('.rs-period.active') || {}).dataset ? $('.rs-period.active').dataset.period : 'year'; const qtr = ($('#rs-quarter') || {}).value || 'Q3'; const mon = $('#rs-month') ? $('#rs-month').selectedIndex : TODAY.getMonth();
    const pills = $('#rs-program-pills'); if (pills && !pills.children.length) { pills.innerHTML = `<button class="rs-pill active" data-program="orgwide">Organization-wide</button>` + PROGRAMS.map((p) => `<button class="rs-pill" data-program="${p.key}">${p.name}</button>`).join(''); $$('.rs-pill', pills).forEach((b) => (b.onclick = () => { $$('.rs-pill', pills).forEach((x) => x.classList.remove('active')); b.classList.add('active'); updateReportStudio(); })); }
    const prog = ($('.rs-pill.active') || {}).dataset ? $('.rs-pill.active').dataset.program : 'orgwide'; const P = PROGRAMS.find((p) => p.key === prog);
    const cs = P ? cases.filter((c) => c.program === P) : cases; const ev = P ? events.filter((e) => e._case.program === P) : events;
    let months = [...Array(12).keys()]; let label = year; if (period === 'quarter') { const q = { Q1: [0, 1, 2], Q2: [3, 4, 5], Q3: [6, 7, 8], Q4: [9, 10, 11] }[qtr]; months = q; label = `${qtr} ${year}`; } if (period === 'month') { months = [mon]; label = `${LONG[mon]} ${year}`; }
    const inP = (d) => d.getFullYear() === 2026 && months.includes(d.getMonth());
    const o = cs.filter((c) => inP(c.opened)).length, cl = cs.filter((c) => c.status === 'Closed' && inP(c.last)).length, op = cs.filter((c) => c.status === 'Open').length;
    const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    set('rs-report-title', `${AGENCY}: ${P ? P.name + ' program report' : 'organization-wide report'}`); set('rs-report-subtitle', `${label} · generated ${fmt(TODAY)} · live data under your own sign-in`);
    set('rs-kpi-open', op); set('rs-kpi-opened', o); set('rs-kpi-closed', cl); set('rs-kpi-people', P ? people.filter((p) => p._program === P).length : people.length); set('rs-kpi-people-sub', `${ev.filter((e) => inP(e._d)).length} events in the period`);
    const series = months.map((m) => [MONTHS[m], cs.filter((c) => c.opened.getFullYear() === 2026 && c.opened.getMonth() === m).length]);
    const evSeries = months.map((m) => [MONTHS[m], ev.filter((e) => e._d.getFullYear() === 2026 && e._d.getMonth() === m).length]);
    set('rs-chart-title', `Files opened and events logged, ${label}`);
    const max = Math.max(...series.map((s) => s[1]), 1), emax = Math.max(...evSeries.map((s) => s[1]), 1);
    const bc = $('#rs-bar-chart'); if (bc) { bc.innerHTML = series.map(([l, v], i) => `<div class="hs-col"><span class="hs-col__v">${v}</span><div class="hs-col__bars"><div class="hs-col__bar" style="height:${Math.max(4, 150 * v / max)}px"></div><div class="hs-col__bar hs-col__bar--ev" style="height:${Math.max(4, 150 * evSeries[i][1] / emax)}px" title="${evSeries[i][1]} events"></div></div></div>`).join(''); bc.style.cssText = 'display:flex;gap:10px;align-items:flex-end;height:190px'; }
    const bl = $('#rs-bar-labels'); if (bl) bl.innerHTML = series.map(([l]) => `<div class="hs-col__l">${l}</div>`).join('') + `<div class="hs-legend hs-legend--chart"><span><i class="hs-dot hs-dot--files"></i>Files opened</span><span><i class="hs-dot hs-dot--events"></i>Events logged</span></div>`;
    const peak = series.slice().sort((a, b) => b[1] - a[1])[0], low = series.slice().sort((a, b) => a[1] - b[1])[0];
    const story1 = `${peak[0]} was the busiest month for new files (${peak[1]}), ${low[0]} the quietest (${low[1]}). Events run ahead of files: ${ev.filter((e) => inP(e._d)).length} logged against ${o} opened, about ${Math.round(ev.filter((e) => inP(e._d)).length / Math.max(op, 1))} per open file.`;
    const pb = $('#rs-prog-bars'); if (pb) { const rows = P ? Object.entries(cs.reduce((a, c) => ((a[c.worker] = (a[c.worker] || 0) + (c.status === 'Open' ? 1 : 0)), a), {})) : PROGRAMS.map((p) => [p.name, byProgramOpen[p.key]]); pb.innerHTML = bars(rows.sort((a, b) => b[1] - a[1]), op) + insight(P ? `${rows[0][0]} carries the most open files in ${P.name}.` : `Family Support carries ${Math.round(100 * byProgramOpen.family / openCases.length)}% of open files; Employment closes fastest.`); }
    const st = $('#rs-donut-status'); if (st) { const rows = Object.entries(cs.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]); st.outerHTML = `<div id="rs-donut-status">${bars(rows, cs.length)}${insight(`${Math.round(100 * (rows.find((r) => r[0] === 'Open') || [0, 0])[1] / cs.length)}% of files are open. Pending files older than seven days show on the home page as checkpoints.`)}</div>`; } const sl = $('#rs-donut-legend'); if (sl) sl.innerHTML = '';
    const et = $('#rs-donut-events'); if (et) { const rows = Object.entries(ev.filter((e) => inP(e._d)).reduce((a, e) => ((a[e.type] = (a[e.type] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).slice(0, 7); et.outerHTML = `<div id="rs-donut-events">${bars(rows)}${insight(rows.length ? `${rows[0][0]} is the most common contact (${rows[0][1]}). Direct contact makes up ${Math.round(100 * rows.filter((r) => !/phone|collateral/i.test(r[0])).reduce((a, r) => a + r[1], 0) / Math.max(1, rows.reduce((a, r) => a + r[1], 0)))}% of logged time.` : 'No events in this period.')}</div>`; } const el2 = $('#rs-donut-events-legend'); if (el2) el2.innerHTML = '';
    const stays = cs.filter((c) => c.status === 'Closed').map((c) => Math.round((c.last - c.opened) / 86400000)).sort((a, b) => a - b); set('rs-avg-stay', stays.length ? Math.round(stays.reduce((a, b) => a + b, 0) / stays.length) : 0); set('rs-min-stay', stays[0] || 0); set('rs-max-stay', stays[stays.length - 1] || 0); set('rs-med-stay', stays[Math.floor(stays.length / 2)] || 0);
    let story = $('#hs-rs-story'); if (!story) { story = document.createElement('div'); story.id = 'hs-rs-story'; story.className = 'hs-story'; const anchor = $('#rs-chart-title'); if (anchor) anchor.parentElement.insertBefore(story, anchor); } story.innerHTML = `<span class="hs-medallion">${$('.hs-medallion svg') ? $('.hs-medallion').innerHTML : ''}</span><div><b>The story in ${label}</b>${story1} ${Object.entries(stages).sort((a, b) => b[1] - a[1])[0] ? `Of open files, ${Math.round(100 * (stages['Stable'] || 0) / Math.max(1, op))}% are rated stable or thriving on their goal stage.` : ''}</div>`;
  };
  try { const y = $('#rs-year'); if (y && !y.value) y.value = '2026'; updateReportStudio(); } catch (e) { console.warn('story: report studio', e); }

  // ---------- 5. personas ----------
  const PERSONAS = [
    { id: 'counsellor', name: 'Counsellor', pick: true, blurb: 'My program, my files, my notes.', nav: ['home', 'person', 'case', 'event', 'appointment', 'referrals', 'calendar', 'helpcenter'], hero: (p) => [`${p.name}`, `Your program: its families, files, notes and appointments.`] },
    { id: 'manager', name: 'Program manager', blurb: 'One program: caseload, capacity, staff.', nav: ['home', 'person', 'intake', 'case', 'event', 'appointment', 'referrals', 'reporting', 'calendar', 'helpcenter'], hero: (p) => [`${p ? p.name : 'Program'} dashboard`, 'Caseload, capacity and what is due across your program.'] },
    { id: 'director', name: 'Director or CEO', blurb: 'Every program, one picture.', nav: ['home', 'person', 'intake', 'case', 'event', 'appointment', 'referrals', 'reporting', 'programs', 'calendar', 'finance', 'helpcenter'], hero: () => ['Director dashboard', 'Cases, people and activity across every program.'] },
    { id: 'board', name: 'Board member', blurb: 'Outcomes and reach, no client detail.', nav: ['home', 'reporting', 'programs'], hero: () => ['Board view', 'Reach, outcomes and capacity, with no record-level detail.'] },
    { id: 'researcher', name: 'Researcher or evaluator', blurb: 'De-identified data, any cut.', nav: ['home', 'reporting', 'survey', 'programs'], hero: () => ['Evaluation view', 'De-identified data by program, period and outcome stage.'] },
    { id: 'admin', name: 'Super admin', blurb: 'See it all. Warning: it is a lot.', nav: null, hero: () => ['Home', 'Every module, every setting. Most staff never see this view.'] },
  ];
  let persona = null, personaProgram = null;
  const applyPersona = () => {
    const P = PERSONAS.find((x) => x.id === persona) || PERSONAS[5];
    $$('#navList .nav-item').forEach((el) => { const show = !P.nav || P.nav.includes(el.dataset.page); el.classList.toggle('hidden', !show); const ch = $(`.nav-children[data-parent="${el.dataset.page}"]`); if (ch) ch.classList.toggle('hidden', !show); });
    if (persona === 'counsellor' && personaProgram) { $$('#navList .nav-child').forEach((el) => { if (PROGRAMS.some((p) => p.id === el.dataset.page)) el.classList.toggle('hidden', el.dataset.page !== personaProgram.id); }); }
    const [t, s] = P.hero(personaProgram); const hero = $('#page-home .hero'); if (hero) { let h2 = $('h2', hero); h2.textContent = t; let sub = $('.hs-hero__sub', hero); if (!sub) { sub = document.createElement('p'); sub.className = 'hs-hero__sub'; h2.after(sub); } sub.textContent = s; }
    const badge = $('#hsPersonaBadge'); if (badge) badge.innerHTML = `${P.name}${personaProgram ? ' · ' + personaProgram.name : ''} <u>Switch</u>`;
    if (persona === 'counsellor' || persona === 'manager') { const prog = personaProgram || PROGRAMS[0]; fill(personData, people.filter((p) => p._program === prog)); fill(eventData, events.filter((e) => e._case.program === prog)); } else { fill(personData, people); fill(eventData, events); }
    try { renderPersonTable(); renderEventTable(); } catch (e) {}
    try { renderStatic((persona === 'counsellor' || persona === 'manager') ? (personaProgram || PROGRAMS[0]) : null); } catch (e) { console.warn('story: scope', e); }
    if (persona === 'board' || persona === 'researcher') { navigateTo($('#page-reportstudio') ? 'reportstudio' : 'reporting'); } else navigateTo('home');
  };
  const screener = () => {
    let o = $('#hsPersona'); if (o) o.remove(); o = document.createElement('div'); o.id = 'hsPersona'; o.className = 'hs-persona'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = `<div class="hs-persona__card"><button class="hs-persona__x" aria-label="Close">&times;</button><p class="hs-hero__eyebrow" style="color:var(--hs-pine)">Interactive demo</p><h2>Who are you today?</h2><p class="hs-persona__lede">Mareto shows each person their own work. Pick a seat and the demo shows what that seat sees at ${AGENCY}, a fictional five-program agency.</p><div class="hs-persona__grid">${PERSONAS.map((p) => `<button class="hs-persona__opt" data-id="${p.id}"><b>${p.name}</b><span>${p.blurb}</span></button>`).join('')}</div><div class="hs-persona__prog" hidden><p>Which program?</p><div class="hs-persona__grid hs-persona__grid--sm">${PROGRAMS.map((p) => `<button class="hs-persona__opt" data-prog="${p.id}"><b>${p.name}</b><span>${p.workers.length} staff · ${byProgramOpen[p.key]} open files</span></button>`).join('')}</div></div></div>`;
    document.body.appendChild(o); document.body.classList.add('hs-persona-open');
    const close = () => { o.remove(); document.body.classList.remove('hs-persona-open'); };
    $('.hs-persona__x', o).onclick = () => { if (!persona) persona = 'admin'; close(); applyPersona(); };
    o.addEventListener('click', (e) => { if (e.target === o) { if (!persona) persona = 'admin'; close(); applyPersona(); } });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && document.body.contains(o)) { if (!persona) persona = 'admin'; close(); applyPersona(); document.removeEventListener('keydown', esc); } });
    $$('[data-id]', o).forEach((b) => (b.onclick = () => { persona = b.dataset.id; personaProgram = null; if (persona === 'counsellor' || persona === 'manager') { $('.hs-persona__prog', o).hidden = false; $$('[data-id]', o).forEach((x) => x.classList.toggle('on', x === b)); } else { close(); applyPersona(); } }));
    $$('[data-prog]', o).forEach((b) => (b.onclick = () => { personaProgram = PROGRAMS.find((p) => p.id === b.dataset.prog); close(); applyPersona(); }));
  };
  const tb = $('.top-bar'); if (tb) { const badge = document.createElement('button'); badge.id = 'hsPersonaBadge'; badge.className = 'hs-persona-badge'; badge.type = 'button'; badge.onclick = screener; const title = $('.top-bar-title'); title.after(badge); }
  window.hsPersona = { screener, applyPersona, PERSONAS };

  // the unlock gate (2 Oct standup): the demo opens only after work details are left, on the fit finder or here.
  const unlocked = () => { try { return !!localStorage.getItem('mareto-demo-unlocked'); } catch (e) { return false; } };
  const gate = () => {
    const PUBLIC_MAIL = /@(gmail|yahoo|hotmail|outlook|live|icloud|me|aol|proton|protonmail)\./i;
    const g = document.createElement('div'); g.id = 'hsGate'; g.className = 'hs-persona'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true');
    g.innerHTML = `<div class="hs-persona__card hs-gate__card"><span class="hs-medallion hs-medallion--lg"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span><p class="hs-hero__eyebrow" style="color:var(--hs-pine)">Interactive demo</p><h2>Get your interactive demo</h2><p class="hs-persona__lede">Leave your work details and the demo opens right here: real screens for intake, cases, the event log and reporting, seen from the seat you choose.</p>
      <div class="hs-gate__row"><input type="text" id="hsg_name" placeholder="Your name" autocomplete="name"><input type="email" id="hsg_email" placeholder="Work email" autocomplete="email"></div>
      <div class="hs-gate__row"><input type="text" id="hsg_org" placeholder="Organization" autocomplete="organization"><input type="text" id="hsg_title" placeholder="Job title (optional)" autocomplete="organization-title"></div>
      <p class="hs-gate__err" id="hsg_err" hidden>Enter your work email address. Personal mailboxes do not open the demo.</p>
      <button type="button" class="hs-gate__go" id="hsg_go">Open my demo</button>
      <p class="hs-gate__optin">By sending this you agree to hear from HelpSeeker about Mareto. Unsubscribe any time.</p>
      <p class="hs-gate__alt">Not sure Mareto fits yet? <a href="./mareto-fit-finder.html">Take the three-minute fit finder</a> and the demo opens at the end.</p></div>`;
    document.body.appendChild(g); document.body.classList.add('hs-persona-open');
    $('#hsg_go', g).onclick = () => {
      const v = (id) => ($('#' + id, g).value || '').trim();
      const name = v('hsg_name'), email = v('hsg_email'), org = v('hsg_org'), title = v('hsg_title'); const err = $('#hsg_err', g), em = $('#hsg_email', g);
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || PUBLIC_MAIL.test(email)) { err.hidden = false; em.style.boxShadow = 'inset 0 0 0 2px var(--hs-navy)'; em.focus(); return; }
      const hubspotData = { fields: [
          { objectTypeId: '0-1', name: 'email', value: email }, { objectTypeId: '0-1', name: 'firstname', value: name.split(' ')[0] || '' },
          { objectTypeId: '0-1', name: 'lastname', value: name.split(' ').slice(1).join(' ') || '' }, { objectTypeId: '0-2', name: 'name', value: org }, { objectTypeId: '0-1', name: 'jobtitle', value: title }],
        context: { hutk: (document.cookie.match(/hubspotutk=([^;]+)/) || [])[1] || undefined, pageUri: window.location.href, pageName: 'Mareto interactive demo' } };
      try { fetch('https://api.hsforms.com/submissions/v3/integration/submit/5183115/471b1a5f-14ef-4fe1-8378-0c3ce499aef6', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(hubspotData) }).catch(() => {}); } catch (e) {}
      try { fetch('https://demo.mareto.helpseeker.org/api/gateway/quiz-capture', { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ source: 'demo-board', name, email, org, title, answers: {}, page: window.location.href }) }).catch(() => {}); } catch (e) {}
      try { localStorage.setItem('mareto-demo-unlocked', new Date().toISOString()); localStorage.setItem('mareto-demo-contact', JSON.stringify({ name, email, org, title })); } catch (e) {}
      g.remove(); document.body.classList.remove('hs-persona-open'); screener();
    };
    $('#hsg_email', g).addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#hsg_go', g).click(); });
  };
  if (unlocked()) screener(); else gate();

  // ---------- 6. the person record: tabs, pickers, conditional fields ----------
  const OPTS = { role: ['Client', 'Dependent', 'Guardian', 'Collateral contact'], status: ['Active', 'Inactive', 'Archived'], indigenous: ['Not identified', 'First Nations', 'Metis', 'Inuit', 'Prefer not to say'], pronouns: ['She/Her', 'He/Him', 'They/Them', 'Fill in your own'], gender: ['Female', 'Male', 'Non-binary', 'Two-Spirit', 'Prefer not to say'], immigration: ['Citizen', 'Permanent resident', 'Refugee claimant', 'Temporary resident', 'Undocumented'], prefLang: ['English', 'French', 'Punjabi', 'Tagalog', 'Spanish', 'Arabic', 'Mandarin', 'Fill in your own'], bestContact: ['Phone', 'Text', 'Email', 'Through worker'], housing: ['Renting', 'Owned', 'Supportive housing', 'Staying with family', 'Shelter', 'No fixed address'] };
  const sel = (label, key, val, opts) => `<div class="modal-field-card"><div class="field-label">${label}</div><select class="hs-select" data-key="${key}" onchange="window.hsRecordChange(this)">${(opts || OPTS[key]).map((o) => `<option${o === val ? ' selected' : ''}>${o}</option>`).join('')}</select></div>`;
  const fld = (label, val, hidden) => hidden ? '' : `<div class="modal-field-card"><div class="field-label">${label}</div><div class="field-value">${val || '—'}</div></div>`;
  window.hsRecordChange = (el) => { const p = personData[currentRecordIndex]; if (!p) return; p[el.dataset.key] = el.value; if (el.dataset.key === 'indigenous') { p.isIndigenous = el.value === 'Not identified' ? 'No' : 'Yes'; openPersonModal(currentRecordIndex); } if (el.dataset.key === 'prefLang') { openPersonModal(currentRecordIndex); } showToast('Saved. Conditional fields updated.'); };
  window.openPersonModal = function (idx) {
    currentModalType = 'person'; currentRecordIndex = idx; currentModalMode = 'view'; const p = personData[idx]; if (!p) return;
    $('#modalTitle').textContent = 'Person record';
    const risk = p.riskIdentified === 'Yes';
    const cs = cases.filter((c) => c.person === p); const ev = events.filter((e) => e._case.person === p).slice(0, 8); const ap = appts.filter((a) => a.person === p);
    $('#modalBody').innerHTML = `
      <div class="modal-hero"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><div><p class="hs-hero__eyebrow">Person record</p><h2>${p.last}, ${p.first}${p.preferredName ? ' (' + p.preferredName + ')' : ''}</h2><p class="hs-hero__sub">${p.role} · ${p.age} · ${p._program ? p._program.name : ''} · ${p._worker || ''}</p></div></div>
      <div class="risk-bar"><span class="risk-label">Risk</span><span class="risk-detail${risk ? '' : ' no-risk'}">${risk ? 'Risk identified: ' + (p.alertSummary || 'see notes') : 'No risk identified'}</span></div>
      <div class="action-pills"><button class="action-pill" onclick="showToast('Note started for ${p.first} ${p.last}')">Write a note</button><button class="action-pill" onclick="openIntakeModal('${p.first} ${p.last}')">Start an intake</button><button class="action-pill" onclick="openCreateModal('case')">Open a case file</button><button class="action-pill" onclick="openCreateModal('appointment')">Book an appointment</button></div>
      <div class="pill-tabs hs-rec-tabs">${['Overview', 'Identity', 'Contact', 'Consent', 'Files and notes'].map((t, i) => `<button class="pill-tab${i === 0 ? ' active' : ''}" data-tab="hsrec-${i}">${t}</button>`).join('')}</div>
      <div class="hs-rec-pane" id="hsrec-0"><div class="modal-grid">${sel('Person role type', 'role', p.role)}${sel('Record status', 'status', p.status)}${fld('Intake complete', p.intakeComplete)}${fld('Program', p._program ? p._program.name : '')}${fld('Assigned worker', p._worker)}${fld('Consent on file', p.intakeComplete === 'Yes' ? 'Yes, signed' : 'Not yet')}</div>
        <div class="modal-section">Goal stage</div><div class="hs-stages">${['Crisis', 'Stabilizing', 'Stable', 'Thriving'].map((s, i) => `<span class="hs-stage${(cs[0] ? cs[0].stage : 'Stable') === s ? ' on' : ''}">${s}</span>`).join('')}</div></div>
      <div class="hs-rec-pane" id="hsrec-1" hidden><div class="modal-grid four-col">${fld('Legal first name', p.first)}${fld('Legal last name', p.last)}${fld('Middle names', p.middleName)}${fld('Preferred name', p.preferredName)}</div><div class="modal-grid four-col">${fld('Date of birth', p.dob)}${sel('Pronouns', 'pronouns', p.pronouns)}${sel('Gender identity', 'gender', p.gender)}${sel('Immigration status', 'immigration', p.immigration)}</div><div class="modal-grid four-col">${sel('Indigenous identity', 'indigenous', p.indigenous)}${fld('Band ID', p.bandId, p.isIndigenous !== 'Yes')}${fld('Nation or community', p.fatherNation || 'Fill in your own', p.isIndigenous !== 'Yes')}${fld('MCFD file number', p.mcfd, !p.mcfd)}</div><p class="hs-hint">Band ID and Nation appear only when an Indigenous identity is recorded; MCFD file number only when one exists.</p></div>
      <div class="hs-rec-pane" id="hsrec-2" hidden><div class="modal-grid four-col">${fld('Phone', p.phone)}${sel('Best way to reach', 'bestContact', p.bestContact)}${fld('Best time', p.bestTime)}${fld('Voicemail OK', p.voicemail)}</div><div class="modal-grid four-col">${fld('Address', p.address)}${fld('City', p.city)}${fld('Postal code', p.postalCode)}${sel('Preferred language', 'prefLang', p.prefLang)}${fld('Interpreter needed', p.interpreter, p.prefLang === 'English')}</div></div>
      <div class="hs-rec-pane" id="hsrec-3" hidden><div class="modal-grid"><div class="modal-field-card"><div class="field-label">Consent to service</div><div class="field-value">${pill('Signed ' + fmt(daysAgo(between(20, 200))), 'good')}</div></div><div class="modal-field-card"><div class="field-label">Consent to share, program only</div><div class="field-value">${pill('Expires ' + fmt(daysAhead(between(10, 120))))}</div></div><div class="modal-field-card"><div class="field-label">OK to leave a message</div><div class="field-value">Yes</div></div><div class="modal-field-card"><div class="field-label">OK to name the agency</div><div class="field-value">${p.riskIdentified === 'Yes' ? 'No' : 'Yes'}</div></div></div><p class="hs-hint">Two separate permissions per channel; naming the agency can put a person at risk, so it is never folded into the message permission.</p></div>
      <div class="hs-rec-pane" id="hsrec-4" hidden><div class="modal-section">Case files</div><table class="hs-table"><thead><tr><th>Case</th><th>Program</th><th>Status</th><th>Worker</th><th>Opened</th></tr></thead><tbody>${cs.length ? cs.map((c) => `<tr><td>${c.no}</td><td>${c.program.name}</td><td>${pill(c.status, tone(c.status))}</td><td>${c.worker}</td><td>${fmt(c.opened)}</td></tr>`).join('') : '<tr><td colspan="5">No case file yet.</td></tr>'}</tbody></table><div class="modal-section">Recent notes</div><table class="hs-table"><thead><tr><th>Date</th><th>Type</th><th>Duration</th><th>Worker</th></tr></thead><tbody>${ev.length ? ev.map((e) => `<tr><td>${e.date}</td><td>${e.type}</td><td>${e.duration}</td><td>${e.worker}</td></tr>`).join('') : '<tr><td colspan="4">No notes yet.</td></tr>'}</tbody></table>${ap.length ? `<div class="modal-section">Appointments</div>${ap.slice(0, 5).map((a) => `<div class="hs-cal-item"><i class="hs-dot hs-dot--appt"></i>${fmt(a.date)} ${a.time}, ${a.kind}, ${pill(a.status, tone(a.status))}</div>`).join('')}` : ''}</div>`;
    $$('.hs-rec-tabs .pill-tab').forEach((b) => (b.onclick = () => { $$('.hs-rec-tabs .pill-tab').forEach((x) => x.classList.remove('active')); b.classList.add('active'); $$('.hs-rec-pane').forEach((pn) => (pn.hidden = pn.id !== b.dataset.tab)); }));
    $('#modalOverlay').classList.add('open'); if (typeof setModalBottomView === 'function') try { setModalBottomView(); } catch (e) {}
  };
})();
