// Mareto — Automated Results Emails (Fit Finder, Demo, Quote)
// Runs via GitHub Actions on a cron schedule.
// Queries HubSpot for new submissions across three flows, sends personalized
// emails via Resend, then marks the contact as emailed.

import { jsPDF } from 'jspdf';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'travis@helpseeker.org';
const FROM_NAME = process.env.FROM_NAME || 'Travis Turner';
const DEMO_URL = 'https://demo.helpseeker.org/mareto-interactive-demo.html?unlocked=1';
const QUOTE_URL = 'https://demo.helpseeker.org/mareto-receive-a-quote.html';
const MEETING_URL = 'mailto:travis@helpseeker.org';
const TRAVIS_EMAIL = 'travis@helpseeker.org';

// ========================================================================
//  PRICING CONSTANTS (approved — must match mareto-receive-a-quote.html)
// ========================================================================
const BASE_SETUP = 7500, PROGRAMS_INCLUDED = 2, PROGRAM_PRICE = 1500;
const ADDON_PRICE = 500, ADDON_CAP = Infinity, MIN_PEOPLE = 15, MAX_PEOPLE = 200;
const ROLES_INCLUDED = 3, ROLE_PRICE = 250, PIA_PRICE = 5000, FRENCH_PRICE = 5000;
const LICENCE_TIERS = [
  { from: 15, to: 29, rate: 40, support: 250 },
  { from: 30, to: 49, rate: 35, support: 500 },
  { from: 50, to: 99, rate: 30, support: 750 },
  { from: 100, to: 200, rate: 25, support: 1000 }
];
const TIERS = [
  { from: 15, to: 29, label: '15 to 29 people', rateLabel: '$40', supportLabel: '$250' },
  { from: 30, to: 49, label: '30 to 49', rateLabel: '$35', supportLabel: '$500' },
  { from: 50, to: 99, label: '50 to 99', rateLabel: '$30', supportLabel: '$750' },
  { from: 100, to: 200, label: '100 to 200', rateLabel: '$25', supportLabel: '$1,000' }
];
const PREPAY_PCT = 5;
const QUOTE_VALID_DAYS = 30;

const ADDONS = [
  { id: 'surveys', name: 'Online surveys', desc: 'Send satisfaction or outcome surveys by link, for example after a program ends. Answers land on the person\'s record and in your dashboards.' },
  { id: 'signature', name: 'Online signatures', desc: 'Clients sign consent and intake forms on screen or from a link, and the signed copy is saved to their record.' },
  { id: 'finance', name: 'Financial assistance', desc: 'Record requests, approvals and payments made for clients, with totals by program and funder.' },
  { id: 'inventory', name: 'Inventory and distribution', desc: 'Track stock, hampers or orders, and record what went to whom and when.' },
  { id: 'housing', name: 'Housing units and beds', desc: 'Track units and beds, occupancy, move-ins and move-outs, linked to the people living there.' },
  { id: 'volunteer', name: 'Volunteer management', desc: 'Keep volunteer records, track shifts and hours, and report on them alongside your programs.' }
];

const CALL_OPTIONS = [
  { id: 'q_records', name: 'Data migration', desc: '' },
  { id: 'q_connect', name: 'Connections to other software', desc: '' },
  { id: 'q_onsite', name: 'On-site training', desc: '' }
];

const INCLUDED_GROUPS = [
  { name: 'Client records', items: [
    { label: 'Client records' }, { label: 'Profiles and demographics' },
    { label: 'Duplicate checking' }, { label: 'Family and household links' }
  ]},
  { name: 'Intake and referrals', items: [
    { label: 'Online forms and registration' }, { label: 'Referral and intake queue' },
    { label: 'Consent' }
  ]},
  { name: 'Case work', items: [
    { label: 'Case files and plans' }, { label: 'Case notes' },
    { label: 'Document upload' }, { label: 'Assessments and outcomes' }
  ]},
  { name: 'Scheduling and programs', items: [
    { label: 'Appointments and calendars' }, { label: 'Classes, groups and attendance' },
    { label: 'Waitlists' }, { label: 'Reminders and automations' }
  ]},
  { name: 'Reporting', items: [
    { label: 'Funder reports' }, { label: 'Live dashboards' },
    { label: 'Exports to Excel and PDF' }
  ]},
  { name: 'Privacy and security', items: [
    { label: 'Hosted in Canada' }, { label: 'Privacy by role' },
    { label: 'Two-step login' }, { label: 'Audit logs' }
  ]},
  { name: 'Setup and support', items: [
    { label: 'Built around what you need' }, { label: 'Three rounds of changes' },
    { label: 'Training for your team' }, { label: 'Support plan' }
  ]}
];

const SHORT = {
  'Client records': 'One record per person, across every program.',
  'Profiles and demographics': 'The details your funders ask for, captured once.',
  'Duplicate checking': 'A warning before anyone is entered twice.',
  'Family and household links': 'See who is connected and serve families together.',
  'Online forms and registration': 'Intake, referral and registration forms, online or in the office.',
  'Referral and intake queue': 'Every new referral in one list, with who has it.',
  'Consent': "Recorded on the person's record, with the date.",
  'Case files and plans': 'A file, plan and goals for each program a person is in.',
  'Case notes': 'Notes on the person, so anyone can pick up the file.',
  'Document upload': 'Signed forms, ID and letters kept on the record.',
  'Assessments and outcomes': 'Measures over time, for each person and program.',
  'Appointments and calendars': "Booked against a person, on each worker's calendar.",
  'Classes, groups and attendance': 'Enrol people and take attendance in a few clicks.',
  'Waitlists': 'Place and priority held until a spot opens.',
  'Reminders and automations': 'Follow-ups and handoffs flagged automatically.',
  'Funder reports': 'A report for each funder, laid out the way they ask.',
  'Live dashboards': 'Your numbers by program and period, always current.',
  'Exports to Excel and PDF': 'Download any list or report whenever you need it.',
  'Hosted in Canada': 'Your data is stored in Canada.',
  'Privacy by role': 'Each type of staff sees only what they should.',
  'Two-step login': 'A second step at sign-in, such as a code on a phone.',
  'Audit logs': 'Who changed what, and when.',
  'Built around what you need': 'Set up around your programs, forms and way of working.',
  'Three rounds of changes': 'Once you see it working, three rounds of changes before go-live.',
  'Training for your team': 'Recorded lessons for each role and a live session.',
  'Support plan': 'A help desk inside Mareto, how-to help, new staff accounts and access changes, and ongoing small changes.'
};

// ========================================================================
//  PRICING ENGINE (must match mareto-receive-a-quote.html)
// ========================================================================
function pricing(users, programs) {
  const n = Math.max(users, MIN_PEOPLE);
  if (n > MAX_PEOPLE) return { total: 0, licence: 0, support: 0, rate: 0, n, tierIdx: -1, capped: false, custom: true };
  const tierIdx = LICENCE_TIERS.findIndex(t => n >= t.from && n <= t.to);
  const tier = LICENCE_TIERS[tierIdx];
  const licenceCost = n * tier.rate;
  let supportIdx = tierIdx;
  if (programs >= 5 && supportIdx < LICENCE_TIERS.length - 1) supportIdx++;
  const supportCost = LICENCE_TIERS[supportIdx].support;
  let total = licenceCost + supportCost, capped = false;
  if (tierIdx < LICENCE_TIERS.length - 1) {
    const next = LICENCE_TIERS[tierIdx + 1];
    let nextSupportIdx = tierIdx + 1;
    if (programs >= 5 && nextSupportIdx < LICENCE_TIERS.length - 1) nextSupportIdx++;
    const nextTotal = next.from * next.rate + LICENCE_TIERS[nextSupportIdx].support;
    if (total > nextTotal) { total = nextTotal; capped = true; }
  }
  return { total, licence: licenceCost, support: supportCost, rate: tier.rate, n, tierIdx, capped, custom: false };
}

function money(n) { return '$' + Math.round(n).toLocaleString('en-CA'); }
function fmtCAD(n) { return money(n); }

function longDate(d) {
  return d.getDate() + ' ' + d.toLocaleString('en-CA', { month: 'long' }) + ' ' + d.getFullYear();
}

// ========================================================================
//  FIT FINDER PRICING (must match mareto-fit-finder.html)
// ========================================================================
function getPricing(calcUsers, priceEstimate) {
  let userCount;
  if (calcUsers && parseInt(calcUsers, 10) > 0) userCount = parseInt(calcUsers, 10);
  else userCount = 15;
  const billed = Math.max(MIN_PEOPLE, userCount);
  const pr = pricing(billed, 2);
  const monthly = pr.total;
  const annual = monthly * 12;
  const posted = parseInt(priceEstimate, 10);
  let setup = Number.isFinite(posted) && posted > annual ? posted - annual : BASE_SETUP;
  const firstYear = setup + annual;
  return { userCount: billed, monthly, annual, setup, firstYear, licence: pr.licence, support: pr.support };
}

// ========================================================================
//  HUBSPOT HELPERS
// ========================================================================
async function hsSearch(filterGroups, properties) {
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filterGroups, properties, limit: 20 })
  });
  const data = await res.json();
  return data.results || [];
}

async function hsUpdate(contactId, properties) {
  await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ properties })
  });
}

async function sendViaResend({ to, subject, html, attachments }) {
  const payload = {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html
  };
  if (attachments && attachments.length) payload.attachments = attachments;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return true;
}

// ========================================================================
//  READ ASSESSMENT (shared by demo + quote Travis emails)
// ========================================================================
function readAssessment(p) {
  const role = (p.mareto_role || '').toLowerCase();
  const timeline = (p.mareto_timeline || '').toLowerCase();
  const isDecision = role.includes('decision');
  const isHot = timeline.includes('immediately') || timeline.includes('1-3');
  if (isDecision && isHot) return { label: 'Ready to talk', color: '#0B7770' };
  return { label: 'Warm', color: '#275C99' };
}

// ========================================================================
//  1. FIT FINDER FLOW (existing — unchanged)
// ========================================================================
async function searchUnsentFitFinder() {
  return hsSearch(
    [
      { filters: [
        { propertyName: 'mareto_fit_score', operator: 'HAS_PROPERTY' },
        { propertyName: 'mareto_results_email_sent', operator: 'NOT_HAS_PROPERTY' }
      ]},
      { filters: [
        { propertyName: 'mareto_fit_score', operator: 'HAS_PROPERTY' },
        { propertyName: 'mareto_results_email_sent', operator: 'NEQ', value: 'true' }
      ]}
    ],
    [
      'email', 'firstname', 'lastname', 'company',
      'mareto_org_type', 'mareto_services', 'mareto_programs',
      'mareto_challenges', 'mareto_users', 'mareto_timeline',
      'mareto_role', 'mareto_fit_score', 'mareto_price_estimate',
      'mareto_calc_users', 'mareto_calc_term'
    ]
  );
}

function getFitLabel(score) {
  const s = parseInt(score, 10);
  if (s >= 8) return { label: 'A strong fit', color: '#0B7770', desc: "Based on your answers, Mareto is well-suited to your organization's needs." };
  if (s >= 5) return { label: 'A good fit', color: '#275C99', desc: 'Mareto addresses several of your key challenges and could be a strong match.' };
  return { label: 'Worth a look', color: '#1E3A5F', desc: 'Mareto may be able to help depending on your specific requirements.' };
}

function buildPricingSection(p) {
  const calcUsers = p.mareto_calc_users || '';
  const priceEstimate = p.mareto_price_estimate || '';
  if (!priceEstimate || parseInt(priceEstimate, 10) <= 0) return '';

  const pr = getPricing(calcUsers, priceEstimate);

  let howLines = '';
  howLines += `<tr><td style="padding:8px 0;border-bottom:1px dashed #E2E8F0;font-size:13px;color:#4A5568;">Setup and training for up to 2 programs and all staff types</td><td style="padding:8px 0;border-bottom:1px dashed #E2E8F0;font-size:13px;color:#0B1F33;font-weight:700;text-align:right;white-space:nowrap;">${fmtCAD(BASE_SETUP)}</td></tr>`;
  if (pr.setup > BASE_SETUP) {
    howLines += `<tr><td style="padding:8px 0;border-bottom:1px dashed #E2E8F0;font-size:13px;color:#4A5568;">Additional programs and add-ons</td><td style="padding:8px 0;border-bottom:1px dashed #E2E8F0;font-size:13px;color:#0B1F33;font-weight:700;text-align:right;white-space:nowrap;">${fmtCAD(pr.setup - BASE_SETUP)}</td></tr>`;
  }
  howLines += `<tr><td style="padding:8px 0;border-bottom:1px dashed #E2E8F0;font-size:13px;color:#4A5568;">Licences for ${pr.userCount} people</td><td style="padding:8px 0;border-bottom:1px dashed #E2E8F0;font-size:13px;color:#0B1F33;font-weight:700;text-align:right;white-space:nowrap;">${fmtCAD(pr.licence)} a month</td></tr>`;
  howLines += `<tr><td style="padding:8px 0;font-size:13px;color:#4A5568;">Support plan</td><td style="padding:8px 0;font-size:13px;color:#0B1F33;font-weight:700;text-align:right;white-space:nowrap;">${fmtCAD(pr.support)} a month</td></tr>`;

  return `
<!-- Pricing Card -->
<tr><td style="padding:0 40px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;">
  <tr><td style="background:#EDF5F4;padding:22px 26px 18px;">
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1px;color:#0E8C86;">YOUR FIRST-YEAR PRICE</p>
    <p style="margin:6px 0 0;font-size:38px;font-weight:900;color:#0B1F33;line-height:1.15;">${fmtCAD(pr.firstYear)}</p>
    <p style="margin:4px 0 0;font-size:14px;color:#4A5568;">From year two, ${fmtCAD(pr.monthly)} a month.</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:6px 26px;border:1px solid #E2E8F0;border-top:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #E2E8F0;font-size:14px;color:#4A5568;">One-time setup</td>
      <td style="padding:12px 0;border-bottom:1px solid #E2E8F0;font-size:14px;font-weight:700;color:#0B1F33;text-align:right;">${fmtCAD(pr.setup)}</td>
    </tr>
    <tr>
      <td style="padding:12px 0;font-size:14px;color:#4A5568;">Monthly plan</td>
      <td style="padding:12px 0;font-size:14px;font-weight:700;color:#0B1F33;text-align:right;">${fmtCAD(pr.monthly)} for ${pr.userCount} people</td>
    </tr>
    </table>
  </td></tr>
  <tr><td style="background:#ffffff;padding:0 26px 18px;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 10px 10px;">
    <p style="margin:0 0 12px;font-size:14px;color:#4A5568;line-height:1.5;">This is your price. Book a short call and we will confirm what you need, then send it to sign.</p>
    <details style="border-top:1px solid #E2E8F0;">
      <summary style="padding:12px 0;cursor:pointer;font-weight:700;font-size:14px;color:#0E8C86;list-style:none;">How we worked this out</summary>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${howLines}
      </table>
      <p style="margin:10px 0 0;font-size:13px;color:#4A5568;line-height:1.5;">The licence is $40 a person a month for the first 10 people, then less for each person after that: $34 up to 25, $32 up to 50, $30 up to 100, and $27 beyond.</p>
    </details>
  </td></tr>
  </table>
  <p style="margin:8px 0 0;font-size:12px;color:#718096;font-style:italic;">This is an estimate based on published pricing. Your final quote will reflect your specific configuration and needs.</p>
</td></tr>`;
}

function buildFitFinderEmail(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const score = p.mareto_fit_score || '0';
  const orgType = p.mareto_org_type || '\u2014';
  const fit = getFitLabel(score);
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const pricingHtml = buildPricingSection(p);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Mareto Fit Assessment Results</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0B1F33,#1E3A5F);padding:32px 40px;text-align:center;">
  <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Mareto Fit Assessment</h1>
  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:1px;">Your Results</p>
</td></tr>

<!-- Greeting -->
<tr><td style="padding:32px 40px 16px;">
  <p style="margin:0;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:12px 0 0;font-size:16px;color:#2D3748;line-height:1.6;">Thanks for taking the Mareto Fit Finder! Here's a summary of how Mareto matches your organization's needs.</p>
</td></tr>

<!-- Fit Score Banner -->
<tr><td style="padding:8px 40px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDF5F4;border-radius:10px;border-left:4px solid ${fit.color};">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#4A5568;letter-spacing:1.5px;">Fit Assessment</p>
    <p style="margin:0 0 8px;font-size:28px;font-weight:700;color:${fit.color};">${fit.label}</p>
    <p style="margin:0;font-size:14px;color:#4A5568;line-height:1.5;">${fit.desc}</p>
  </td></tr>
  </table>
</td></tr>

<!-- Results Grid -->
<tr><td style="padding:0 40px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td width="50%" style="padding:12px 16px;background:#EDF5F4;border-radius:8px 0 0 8px;">
      <p style="margin:0;font-size:11px;font-weight:700;color:#4A5568;letter-spacing:1px;">Fit Score</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#0B1F33;">${score}<span style="font-size:14px;color:#4A5568;font-weight:400"> / 10</span></p>
    </td>
    <td width="50%" style="padding:12px 16px;background:#EDF5F4;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-size:11px;font-weight:700;color:#4A5568;letter-spacing:1px;">Organization Type</p>
      <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#0B1F33;">${orgType}</p>
    </td>
  </tr>
  </table>
</td></tr>

${pricingHtml}

<!-- CTA -->
<tr><td style="padding:8px 40px 32px;text-align:center;">
  <p style="margin:0 0 20px;font-size:16px;color:#2D3748;line-height:1.6;">The best next step is to explore Mareto through our interactive demo \u2014 click through real screens and see how case management, intake, and reporting actually work.</p>
  <a href="${DEMO_URL}" style="display:inline-block;background:#0B1F33;color:#ffffff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:10px;text-decoration:none;">Explore the Interactive Demo</a>
</td></tr>

<!-- Soft close -->
<tr><td style="padding:0 40px 32px;">
  <p style="margin:0;font-size:14px;color:#4A5568;line-height:1.6;">After exploring the demo, you're welcome to <a href="${MEETING_URL}" style="color:#275C99;text-decoration:none;">email us</a> to talk through next steps.</p>
</td></tr>

<!-- Signature -->
<tr><td style="padding:0 40px 32px;border-top:1px solid #eee;">
  <p style="margin:20px 0 0;font-size:14px;color:#2D3748;">Best,</p>
  <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0B1F33;">Travis Turner</p>
  <p style="margin:2px 0 0;font-size:13px;color:#4A5568;">HelpSeeker Technologies</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function processFitFinder() {
  const contacts = await searchUnsentFitFinder();
  console.log(`[Fit Finder] Found ${contacts.length} unsent contact(s)`);

  for (const contact of contacts) {
    const p = contact.properties;
    if (!p.email) continue;
    try {
      await sendViaResend({
        to: p.email,
        subject: 'Your Mareto Fit Assessment Results',
        html: buildFitFinderEmail(contact)
      });
      await hsUpdate(contact.id, { mareto_results_email_sent: 'true' });
      console.log(`[Fit Finder] Sent to ${p.email}`);
    } catch (err) {
      console.error(`[Fit Finder] Failed for ${p.email}: ${err.message}`);
    }
  }
}

// ========================================================================
//  2. DEMO FLOW
// ========================================================================
const DEMO_PROPERTIES = [
  'email', 'firstname', 'lastname', 'company', 'jobtitle', 'website',
  'mareto_flow', 'mareto_from', 'mareto_org_type', 'mareto_org_other',
  'mareto_services', 'mareto_svc_other', 'mareto_challenges',
  'mareto_users', 'mareto_programs', 'mareto_timeline', 'mareto_role',
  'mareto_province', 'mareto_demo_email_sent'
];

async function searchUnsentDemo() {
  // Search by mareto_org_type (set by the demo form) instead of mareto_flow,
  // because mareto_flow gets overwritten to "quote" when the same contact
  // completes the quote form after the demo.
  return hsSearch(
    [
      { filters: [
        { propertyName: 'mareto_org_type', operator: 'HAS_PROPERTY' },
        { propertyName: 'mareto_demo_email_sent', operator: 'NOT_HAS_PROPERTY' }
      ]},
      { filters: [
        { propertyName: 'mareto_org_type', operator: 'HAS_PROPERTY' },
        { propertyName: 'mareto_demo_email_sent', operator: 'NEQ', value: 'true' }
      ]}
    ],
    DEMO_PROPERTIES
  );
}

function buildDemoEmail(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const greeting = name ? `Hi ${name},` : 'Hi there,';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Mareto demo</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0B1F33,#1E3A5F);padding:32px 40px;text-align:center;">
  <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Your Mareto Demo</h1>
  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:1px;">Ready to explore</p>
</td></tr>

<!-- Greeting -->
<tr><td style="padding:32px 40px 16px;">
  <p style="margin:0;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:12px 0 0;font-size:16px;color:#2D3748;line-height:1.6;">Your Mareto demo is ready. Click through real screens and see how case management, intake, and reporting work day to day.</p>
</td></tr>

<!-- Open Demo CTA -->
<tr><td style="padding:8px 40px 24px;text-align:center;">
  <a href="${DEMO_URL}" style="display:inline-block;background:#0B1F33;color:#ffffff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:10px;text-decoration:none;">Open the Demo</a>
</td></tr>

<!-- Next Steps -->
<tr><td style="padding:0 40px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDF5F4;border-radius:10px;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#0E8C86;letter-spacing:1.5px;">NEXT STEPS</p>
    <p style="margin:12px 0 0;font-size:14px;color:#2D3748;line-height:1.7;">
      <a href="${QUOTE_URL}?from=demo-email" style="color:#275C99;text-decoration:none;font-weight:700;">Receive a quote</a> \u2014 answer a few questions and get your price instantly.<br>
      <a href="${MEETING_URL}" style="color:#275C99;text-decoration:none;font-weight:700;">Email us</a> to set up a short call and walk through your needs.
    </p>
  </td></tr>
  </table>
</td></tr>

<!-- Signature -->
<tr><td style="padding:0 40px 32px;border-top:1px solid #eee;">
  <p style="margin:20px 0 0;font-size:14px;color:#2D3748;">Best,</p>
  <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0B1F33;">Travis Turner</p>
  <p style="margin:2px 0 0;font-size:13px;color:#4A5568;">HelpSeeker Technologies</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildDemoBriefRow(label, value) {
  if (!value) return '';
  return `<tr>
    <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#4A5568;font-weight:700;white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0B1F33;">${value}</td>
  </tr>`;
}

function buildTravisDemoEmail(contact) {
  const p = contact.properties;
  const orgName = p.company || 'Unknown';
  const contactName = [p.firstname, p.lastname].filter(Boolean).join(' ') || p.email;
  const assess = readAssessment(p);

  const rows = [
    buildDemoBriefRow('Contact', contactName + (p.jobtitle ? ` (${p.jobtitle})` : '')),
    buildDemoBriefRow('Email', p.email ? `<a href="mailto:${p.email}" style="color:#275C99;">${p.email}</a>` : ''),
    buildDemoBriefRow('Organization', orgName),
    buildDemoBriefRow('Website', p.website ? `<a href="${p.website}" style="color:#275C99;">${p.website}</a>` : ''),
    buildDemoBriefRow('Came through', p.mareto_from || 'direct'),
    buildDemoBriefRow('Org type', p.mareto_org_type),
    buildDemoBriefRow('Services', (p.mareto_services || '').replace(/;/g, ', ')),
    buildDemoBriefRow('Challenges', (p.mareto_challenges || '').replace(/;/g, ', ')),
    buildDemoBriefRow('Size', p.mareto_users),
    buildDemoBriefRow('Programs', p.mareto_programs),
    buildDemoBriefRow('Timeline', p.mareto_timeline),
    buildDemoBriefRow('Role', p.mareto_role),
    buildDemoBriefRow('Province', p.mareto_province)
  ].join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

<tr><td style="background:linear-gradient(135deg,#0B1F33,#1E3A5F);padding:24px 40px;">
  <h1 style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">New Mareto demo: ${orgName}</h1>
</td></tr>

<!-- Read assessment -->
<tr><td style="padding:24px 40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDF5F4;border-radius:10px;border-left:4px solid ${assess.color};">
  <tr><td style="padding:16px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;color:#4A5568;letter-spacing:1.5px;">READ</p>
    <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${assess.color};">${assess.label}</p>
  </td></tr>
  </table>
</td></tr>

<!-- Brief -->
<tr><td style="padding:0 40px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
  ${rows}
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function processDemo() {
  const contacts = await searchUnsentDemo();
  console.log(`[Demo] Found ${contacts.length} unsent contact(s)`);

  for (const contact of contacts) {
    const p = contact.properties;
    if (!p.email) continue;
    try {
      // Email to buyer
      await sendViaResend({
        to: p.email,
        subject: 'Your Mareto demo',
        html: buildDemoEmail(contact)
      });
      // Email to Travis
      await sendViaResend({
        to: TRAVIS_EMAIL,
        subject: `New Mareto demo: ${p.company || 'Unknown'}`,
        html: buildTravisDemoEmail(contact)
      });
      await hsUpdate(contact.id, { mareto_demo_email_sent: 'true', mareto_demo_email_sent_at: new Date().toISOString() });
      console.log(`[Demo] Sent to ${p.email}`);
    } catch (err) {
      console.error(`[Demo] Failed for ${p.email}: ${err.message}`);
    }
  }
}

// ========================================================================
//  3. QUOTE FLOW
// ========================================================================
const QUOTE_PROPERTIES = [
  'email', 'firstname', 'lastname', 'company', 'jobtitle', 'website',
  'mareto_flow', 'mareto_from', 'mareto_org_type', 'mareto_org_other',
  'mareto_services', 'mareto_svc_other', 'mareto_challenges',
  'mareto_users', 'mareto_programs', 'mareto_timeline', 'mareto_role',
  'mareto_province', 'mareto_exact_users', 'mareto_exact_programs',
  'mareto_staff_types', 'mareto_addons', 'mareto_extras',
  'mareto_quoted_items', 'mareto_quote_email_sent'
];

async function searchUnsentQuote() {
  // Search by mareto_exact_users (set by the quote form) instead of mareto_flow,
  // so it works even when the same contact did both demo and quote.
  return hsSearch(
    [
      { filters: [
        { propertyName: 'mareto_exact_users', operator: 'HAS_PROPERTY' },
        { propertyName: 'mareto_quote_email_sent', operator: 'NOT_HAS_PROPERTY' }
      ]},
      { filters: [
        { propertyName: 'mareto_exact_users', operator: 'HAS_PROPERTY' },
        { propertyName: 'mareto_quote_email_sent', operator: 'NEQ', value: 'true' }
      ]}
    ],
    QUOTE_PROPERTIES
  );
}

/** Parse HubSpot contact properties into the answers object the PDF builder expects */
function parseQuoteAnswers(p) {
  const users = parseInt(p.mareto_exact_users, 10) || 5;
  const programs = parseInt(p.mareto_exact_programs, 10) || 1;
  const roles = parseInt(p.mareto_staff_types, 10) || 1;
  const addonIds = (p.mareto_addons || '').split(';').filter(Boolean);
  const extras = (p.mareto_extras || '').split(';').filter(Boolean);
  const callItems = (p.mareto_quoted_items || '').split(';').filter(Boolean);
  return {
    users,
    programs,
    roles,
    addons: addonIds,
    french: extras.includes('french'),
    pia: extras.includes('PIA'),
    callItems
  };
}

function computeQuotePricing(answers) {
  const pr = pricing(answers.users, answers.programs);
  const extraPrograms = Math.max(0, answers.programs - PROGRAMS_INCLUDED);
  const programCost = extraPrograms * PROGRAM_PRICE;
  const addonTotal = Math.min(answers.addons.length * ADDON_PRICE, ADDON_CAP);
  const frenchCost = answers.french ? 5000 : 0;
  const piaCost = answers.pia ? PIA_PRICE : 0;
  const extraRoles = Math.max(0, (answers.roles || 0) - ROLES_INCLUDED);
  const roleCost = extraRoles * ROLE_PRICE;
  const setupTotal = BASE_SETUP + programCost + roleCost + addonTotal + frenchCost + piaCost;
  const mo = pr.total;
  const y1 = setupTotal + (mo * 12);
  const now = new Date();
  const validDate = new Date(now);
  validDate.setDate(validDate.getDate() + QUOTE_VALID_DAYS);
  const prepayAnnual = mo * 12 * (1 - PREPAY_PCT / 100);
  const prepayY1 = Math.round((setupTotal + mo * 12) * (1 - PREPAY_PCT / 100));
  const savingY1 = (setupTotal + mo * 12) - prepayY1;

  const licNote = pr.capped
    ? pr.n + ' people, charged at the ' + LICENCE_TIERS[pr.tierIdx + 1].from + '-person price'
    : pr.n + ' people at ' + money(pr.rate) + ' each';

  const tierIdx = pr.tierIdx;

  // Build line items for setup
  const parts = [];
  parts.push({ txt: 'Base setup', lo: BASE_SETUP });
  if (extraPrograms > 0) parts.push({ txt: extraPrograms + ' extra program' + (extraPrograms > 1 ? 's' : '') + ' (' + money(PROGRAM_PRICE) + ' each)', lo: programCost });
  if (extraRoles > 0) parts.push({ txt: extraRoles + ' extra staff role' + (extraRoles > 1 ? 's' : '') + ' (' + money(ROLE_PRICE) + ' each)', lo: roleCost });
  const picksAddons = answers.addons.map(id => ADDONS.find(a => a.id === id)).filter(Boolean);
  picksAddons.forEach(a => parts.push({ txt: a.name, note: a.desc, lo: ADDON_PRICE }));
  if (answers.french) parts.push({ txt: 'Mareto in French', note: 'Every screen, button, form and report in French.', lo: 5000 });
  if (answers.pia) parts.push({ txt: 'Privacy impact assessment', note: 'We prepare a privacy impact assessment for your system, for your board, a funder or your privacy office.', lo: PIA_PRICE });

  const picksQuoted = answers.callItems.map(id => CALL_OPTIONS.find(o => o.id === id)).filter(Boolean);

  return { pr, extraRoles, roleCost, setupTotal, mo, y1, now, validDate, prepayY1, savingY1, licNote, tierIdx, parts, picksAddons, picksQuoted };
}

// ========================================================================
//  PDF GENERATION (server-side, matching the browser version)
// ========================================================================
function buildQuotePdfServer(answers, contactInfo) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const W = 612, H = 792, M = 50, CW = W - 2 * M;
  const NAVY = [11, 31, 51], SLATE = [30, 58, 95], TEAL = [15, 185, 177], AQUA = [79, 209, 197],
    PALE = [224, 240, 238], MIST = [237, 245, 244],
    INK = [10, 10, 10], MUTED = [74, 85, 104], BORDER = [229, 231, 235], SUBTLE = [249, 250, 251],
    WHITE = [255, 255, 255], ONDARK = [190, 205, 218];

  // Load fonts
  let FAM = 'helvetica';
  try {
    const b64 = f => readFileSync(join(REPO_ROOT, f)).toString('base64');
    const fonts = {
      reg: b64('assets/fonts/Lato-Regular.ttf'),
      bold: b64('assets/fonts/Lato-Bold.ttf'),
      light: b64('assets/fonts/Lato-Light.ttf')
    };
    [['reg', 'normal'], ['bold', 'bold'], ['light', 'light']].forEach(([k, s]) => {
      doc.addFileToVFS('Lato-' + k + '.ttf', fonts[k]);
      doc.addFont('Lato-' + k + '.ttf', 'Lato', s);
    });
    FAM = 'Lato';
  } catch (e) {
    console.warn('Could not load Lato fonts, falling back to Helvetica:', e.message);
  }

  let logoData = null;
  try {
    logoData = 'data:image/png;base64,' + readFileSync(join(REPO_ROOT, 'assets/images/mareto-logo-pdf.png')).toString('base64');
  } catch (e) {
    console.warn('Could not load logo:', e.message);
  }

  const hasFonts = FAM === 'Lato';

  // Helper functions (same as browser version)
  const set = (size, color, style) => {
    doc.setFont(FAM, hasFonts ? (style || 'normal') : (style === 'bold' ? 'bold' : 'normal'));
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const t = (s, x, y, size, color, style, o) => { set(size, color, style); doc.text(s, x, y, o || {}); };
  const wrap = (s, w, size, style) => { set(size, INK, style); return doc.splitTextToSize(s, w); };
  const para = (s, x, y, w, size, color, lh, style) => {
    const ln = wrap(s, w, size, style);
    set(size, color, style);
    ln.forEach((l, i) => doc.text(l, x, y + i * lh));
    return y + ln.length * lh;
  };
  const box = (c, x, y, w, h, rad) => { doc.setFillColor(...c); rad ? doc.roundedRect(x, y, w, h, rad, rad, 'F') : doc.rect(x, y, w, h, 'F'); };
  const outline = (c, x, y, w, h, rad) => { doc.setDrawColor(...c); doc.setLineWidth(.7); doc.roundedRect(x, y, w, h, rad, rad, 'S'); };
  const glow = (clip, x, y, rad, op) => {
    doc.saveGraphicsState();
    doc.roundedRect(clip[0], clip[1], clip[2], clip[3], clip[4] || 0.01, clip[4] || 0.01, null);
    doc.clip(); doc.discardPath();
    doc.setGState(new doc.GState({ opacity: op || .1 }));
    doc.setFillColor(...TEAL); doc.circle(x, y, rad, 'F');
    doc.restoreGraphicsState();
  };
  const eyebrow = (s, x, y, c, o) => t(s.toUpperCase(), x, y, 7.8, c || TEAL, 'bold', Object.assign({ charSpace: 1.1 }, o || {}));
  const tick = (x, y, c) => { doc.setDrawColor(...(c || TEAL)); doc.setLineWidth(1.3); doc.line(x, y - 2.6, x + 2.4, y); doc.line(x + 2.4, y, x + 6.6, y - 5.4); };
  const pageHead = (eb, title, sub) => {
    eyebrow(eb, M, 64);
    t(title, M, 92, 23, NAVY);
    let y = 104;
    if (sub) y = para(sub, M, y + 8, CW, 10, MUTED, 14, 'light');
    return y + 18;
  };
  const section = (s, y) => { t(s, M, y, 12.5, NAVY, 'bold'); return y + 14; };

  // Pricing
  const pricing = computeQuotePricing(answers);
  const { pr, setupTotal, mo, y1, now, validDate, prepayY1, savingY1, licNote, tierIdx, parts, picksAddons, picksQuoted } = pricing;
  const PWY = 'Priced with you';

  const SETUP_QS = [
    { q: 'How many people will log in?', help: 'Count the staff and volunteers who will use Mareto. Licences are $40 per person per month, with a minimum of 15 people ($600 a month). Every plan also includes a support plan, starting at $250 a month.', val: answers.users },
    { q: 'How many programs will you run in it?', help: 'Your first two programs are included.', val: answers.programs },
    { q: 'How many kinds of staff see different things?', help: 'For example front desk, case worker and manager. Your first 3 staff roles are included.', val: answers.roles }
  ];

  /* ===== Page 1: Cover ===== */
  if (logoData) {
    try { doc.addImage(logoData, 'PNG', M, 62, 180, 57, 'logo', 'SLOW'); } catch (e) {}
  } else {
    t('Mareto', M, 100, 34, NAVY, 'bold');
  }
  t('mareto.ca', W - M, 92, 10, MUTED, 'normal', { align: 'right' });

  box(NAVY, 0, 236, W, H - 236);
  glow([0, 236, W, H - 236], W - 40, 270, 150, .09);
  glow([0, 236, W, H - 236], W - 120, 560, 60, .07);
  box(TEAL, 0, 236, W, 4);

  eyebrow('Your Mareto quote', M, 300, AQUA);
  let y = 346;
  wrap(contactInfo.org, CW - 60, 30, 'normal').forEach(l => { t(l, M, y, 30, WHITE); y += 36; });
  t('Prepared for ' + contactInfo.name + (contactInfo.title ? ', ' + contactInfo.title : ''), M, y + 2, 12, AQUA, 'light');

  const cy = Math.max(y + 46, 470), cw3 = (CW - 24) / 3;
  [['Your first year', money(y1)], ['One-time setup', money(setupTotal)], ['Monthly plan', money(mo)]].forEach(([k, v], i) => {
    const x = M + i * (cw3 + 12);
    doc.setGState(new doc.GState({ opacity: .1 })); box(WHITE, x, cy, cw3, 78, 8); doc.setGState(new doc.GState({ opacity: 1 }));
    doc.setDrawColor(70, 96, 122); doc.setLineWidth(.8); doc.roundedRect(x, cy, cw3, 78, 8, 8, 'S');
    eyebrow(k, x + 16, cy + 24, ONDARK, { charSpace: .8 });
    t(v, x + 16, cy + 56, i ? 20 : 24, WHITE, i ? 'normal' : 'bold');
  });

  doc.setDrawColor(52, 80, 106); doc.setLineWidth(.6); doc.line(M, 650, W - M, 650);
  eyebrow('Issued', M, 680, AQUA); t(longDate(now), M, 698, 12, WHITE);
  eyebrow('Valid until', M + 190, 680, AQUA); t(longDate(validDate), M + 190, 698, 12, WHITE, 'bold');
  eyebrow('Prices', M + 380, 680, AQUA); t('CAD, before tax', M + 380, 698, 12, WHITE);

  /* ===== Page 2: What every plan includes ===== */
  doc.addPage();
  y = pageHead('Step 1 \u00B7 What every plan includes', 'What every Mareto plan includes',
    'This quote follows the same steps you took on our website. It starts with what comes standard with every plan.') - 4;

  const g3 = 12, cw = (CW - 2 * g3) / 3, pad = 13, tw = cw - 2 * pad - 13;
  const cardH = g => 46 + g.items.reduce((h, item) => h + 11 + wrap(SHORT[item.label] || '', tw, 7.6).length * 9.2 + 6, 0) + 4;
  const drawGroup = (g, x, yy, h) => {
    box(MIST, x, yy, cw, h, 8);
    t(g.name, x + pad, yy + 24, 10.5, NAVY, 'bold');
    let gy = yy + 42;
    g.items.forEach(item => {
      tick(x + pad, gy, TEAL);
      t(item.label, x + pad + 13, gy, 8.4, INK, 'bold');
      gy = para(SHORT[item.label] || '', x + pad + 13, gy + 11, tw, 7.6, MUTED, 9.2) + 6;
    });
  };

  [[INCLUDED_GROUPS[0], INCLUDED_GROUPS[1], INCLUDED_GROUPS[2]], [INCLUDED_GROUPS[3], INCLUDED_GROUPS[4], INCLUDED_GROUPS[5]]].forEach(row => {
    const h = Math.max(...row.map(cardH));
    row.forEach((g, j) => drawGroup(g, M + j * (cw + g3), y, h));
    y += h + g3;
  });

  {
    const h = cardH(INCLUDED_GROUPS[6]);
    drawGroup(INCLUDED_GROUPS[6], M, y, h);
    const x = M + cw + g3, w = 2 * cw + g3;
    box(NAVY, x, y, w, h, 8);
    glow([x, y, w, h, 8], x + w - 20, y + 10, 60, .13);
    eyebrow('Never charged', x + 18, y + 26, AQUA);
    ['Adding more clients or records', 'Updates and security patches', 'Exporting your data, any time', 'Leaving: there are no exit fees'].forEach((s2, i) => {
      const nx = x + 18 + (i % 2) * (w / 2 - 6), ny = y + 52 + Math.floor(i / 2) * 22;
      tick(nx, ny, AQUA);
      t(s2, nx + 14, ny, 9.5, WHITE);
    });
    doc.setDrawColor(52, 80, 106); doc.setLineWidth(.6); doc.line(x + 18, y + 100, x + w - 18, y + 100);
    [['Your licence covers', 'Hosting in Canada, backups, updates and security patches.'], ['Renewals', 'Increases are capped at 4 percent a year, in writing.']].forEach(([k, v], i) => {
      const ly = y + 114 + i * 30;
      eyebrow(k, x + 18, ly, AQUA, { charSpace: .8 });
      t(v, x + 18, ly + 15, 9.5, WHITE);
    });
  }

  /* ===== Page 3: Your setup and anything extra ===== */
  doc.addPage();
  y = pageHead('Steps 2 and 3 \u00B7 Your setup and anything extra', 'What you told us');

  y = section('Your setup', y);
  SETUP_QS.forEach(sq => {
    const help = sq.help, hl = wrap(help, CW - 130, 8.6).length, h = 26 + hl * 11 + 8;
    box(MIST, M, y, CW, h, 8);
    t(sq.q, M + 16, y + 20, 10.5, NAVY, 'bold');
    para(help, M + 16, y + 34, CW - 130, 8.6, MUTED, 11);
    box(WHITE, W - M - 84, y + h / 2 - 17, 68, 34, 6);
    t(String(sq.val), W - M - 50, y + h / 2 + 6, 16, NAVY, 'bold', { align: 'center' });
    y += h + 8;
  });

  // Pricing tiers
  y += 2; eyebrow('How your plan is priced', M, y + 6, MUTED, { charSpace: .8 }); y += 14;
  const lw = (CW - 3 * 6) / TIERS.length;
  TIERS.forEach((tr, i) => {
    const me = i === tierIdx, lx = M + i * (lw + 6);
    box(me ? NAVY : WHITE, lx, y, lw, 52, 6);
    if (!me) outline(BORDER, lx, y, lw, 52, 6);
    t(tr.label, lx + lw / 2, y + 13, 7.5, me ? AQUA : MUTED, me ? 'bold' : 'normal', { align: 'center' });
    t(tr.rateLabel + '/person', lx + lw / 2, y + 28, 10, me ? WHITE : NAVY, 'bold', { align: 'center' });
    t(tr.supportLabel + ' support', lx + lw / 2, y + 42, 7.8, me ? ONDARK : MUTED, 'normal', { align: 'center' });
  });
  y += 52;
  if (pr.capped) { y += 14; t('The ' + LICENCE_TIERS[pr.tierIdx + 1].from + '-person price is lower, so that is what you pay.', M, y, 8.3, MUTED, 'light'); }

  // Anything extra
  y += 28;
  y = section('Anything extra', y);
  const brief = picksAddons.length + (answers.french ? 1 : 0) + (answers.pia ? 1 : 0) + picksQuoted.length > 6;
  const itemRow = (name, desc, amt) => {
    const dl = brief || !desc ? [] : wrap(desc, CW - 150, 8.3);
    tick(M + 4, y + 2, TEAL);
    t(name, M + 18, y + 2, 9.8, INK, 'bold');
    t(amt, W - M, y + 2, 9.8, NAVY, 'bold', { align: 'right' });
    if (dl.length) para(desc, M + 18, y + 16, CW - 150, 8.3, MUTED, 10.5);
    y += 20 + dl.length * 10.5 + 14;
    doc.setDrawColor(...BORDER); doc.setLineWidth(.5); doc.line(M, y - 6, W - M, y - 6);
    y += 6;
  };
  y += 8;

  if (picksAddons.length) {
    eyebrow('Add-ons', M, y, TEAL, { charSpace: .8 });
    t(money(ADDON_PRICE) + ' each.', M + 112, y, 8.3, MUTED, 'light');
    y += 22;
    picksAddons.forEach(a => itemRow(a.name, a.desc, money(ADDON_PRICE)));
    y += 10;
  }

  const otherPicks = [];
  if (answers.french) otherPicks.push({ name: 'Mareto in French', desc: 'Every screen, button, form and report in French.', price: 5000 });
  if (answers.pia) otherPicks.push({ name: 'Privacy impact assessment', desc: 'We prepare a privacy impact assessment for your system, for your board, a funder or your privacy office.', price: PIA_PRICE });
  if (otherPicks.length) {
    eyebrow('Other options', M, y, TEAL, { charSpace: .8 });
    y += 18;
    otherPicks.forEach(e => itemRow(e.name, e.desc, money(e.price)));
    y += 6;
  }

  if (!picksAddons.length && !otherPicks.length && !picksQuoted.length) {
    t('Nothing extra. You can add any of these later.', M, y + 4, 9.5, MUTED);
    y += 22;
  }

  if (picksQuoted.length) {
    eyebrow(PWY, M, y, TEAL, { charSpace: .8 });
    t('These depend on your setup, so we price them on a short call.', M + 112, y, 8.3, MUTED, 'light');
    y += 22;
    picksQuoted.forEach(q => itemRow(q.name, q.desc, PWY));
  }

  /* ===== Page 4: Quote summary ===== */
  doc.addPage();
  y = pageHead('Your quote', 'Mareto for ' + contactInfo.org);

  const kh = 92, kw1 = 186, kw2 = (CW - kw1 - 2 * 10) / 2;
  box(NAVY, M, y, kw1, kh, 8);
  glow([M, y, kw1, kh, 8], M + kw1 - 10, y + 8, 34, .14);
  eyebrow('Your first year', M + 18, y + 24, AQUA);
  t(money(y1), M + 18, y + 58, 30, WHITE, 'bold');
  t('Setup plus 12 months of licences and support', M + 18, y + 76, 8.5, ONDARK);

  [['One-time setup', money(setupTotal), 'Paid once'], ['Monthly plan', money(mo), licNote + ', plus a ' + money(pr.support) + ' support plan']].forEach(([k, v, n], i) => {
    const x = M + kw1 + 10 + i * (kw2 + 10);
    box(WHITE, x, y, kw2, kh, 8);
    outline(BORDER, x, y, kw2, kh, 8);
    box(TEAL, x, y + 14, 3, 26);
    eyebrow(k, x + 14, y + 24, MUTED, { charSpace: .5 });
    t(v, x + 14, y + 54, 18, NAVY, 'bold');
    para(n, x + 14, y + 70, kw2 - 22, 7.8, MUTED, 9.5);
  });
  y += kh;

  // Priced with you strip
  if (picksQuoted.length) {
    const pwyNames = picksQuoted.map(q => q.name);
    const pl = wrap(pwyNames.join('   \u00B7   '), CW - 140, 9), ph = 14 + pl.length * 12;
    y += 10;
    box(MIST, M, y, CW, ph, 6);
    eyebrow(PWY, M + 14, y + 17, TEAL, { charSpace: .8 });
    para(pwyNames.join('   \u00B7   '), M + 128, y + 17, CW - 140, 9, INK, 12);
    y += ph;
  }

  // Prepay strip
  const ppTxt = 'Year one ' + money(prepayY1) + ' instead of ' + money(y1) + ', a saving of ' + money(savingY1) + '.';
  const ppH = 32 + wrap(ppTxt, CW - 190, 9).length * 11.5 + 4;
  y += 10;
  box(MIST, M, y, CW, ppH, 6);
  box(TEAL, M, y, 4, ppH);
  t('Pay the year in full up front and save ' + PREPAY_PCT + ' percent', M + 18, y + 19, 10, NAVY, 'bold');
  para(ppTxt, M + 18, y + 34, CW - 190, 9, MUTED, 11.5);
  eyebrow('Year one, paid in full', W - M - 16, y + ppH / 2 - 8, MUTED, { align: 'right', charSpace: .5 });
  t(money(prepayY1), W - M - 16, y + ppH / 2 + 12, 17, NAVY, 'bold', { align: 'right' });
  y += ppH + 22;

  // Price breakdown table
  y = section('How your price is worked out', y);
  box(SLATE, M, y, CW, 20, 5);
  t('ITEM', M + 12, y + 13.5, 7.3, WHITE, 'bold', { charSpace: .6 });
  t('AMOUNT', W - M - 12, y + 13.5, 7.3, WHITE, 'bold', { align: 'right', charSpace: .6 });
  y += 34;

  let zebra = false;
  const line = (a, note, amt) => {
    const nl = note ? wrap(note, CW - 170, 8) : [], h = 22 + nl.length * 9.6;
    if (zebra) box(SUBTLE, M, y - 14, CW, h);
    zebra = !zebra;
    t(a, M + 12, y, 9.6, INK, 'bold');
    t(amt, W - M - 12, y, 9.6, INK, 'normal', { align: 'right' });
    if (nl.length) para(note, M + 12, y + 11, CW - 170, 8, MUTED, 9.6);
    y += h;
  };
  const band = (a, amt, bg, fg) => {
    box(bg, M, y - 14, CW, 24, 6);
    t(a, M + 12, y + 2, 10, fg, 'bold');
    t(amt, W - M - 12, y + 2, 10.5, fg, 'bold', { align: 'right' });
    y += 28;
    zebra = false;
  };

  parts.forEach(p => line(p.txt, p.note, money(p.lo)));
  y += 2;
  band('One-time setup', money(setupTotal), PALE, NAVY);
  line('Licences', licNote, money(pr.capped ? mo - pr.support : pr.licence) + ' a month');
  line('Support plan', null, money(pr.support) + ' a month');
  if (pr.capped) line('Monthly total', null, money(mo) + ' a month');
  else { y += 2; band('Monthly total', money(mo) + ' a month', PALE, NAVY); }
  y += 2;
  band('Year one', money(y1), NAVY, WHITE);

  // Next steps
  y += 10;
  y = section('Next steps', y) + 4;
  const steps = [
    ['Meet with us', 'A 30-minute call to walk through this quote.'],
    ['Confirm the details', 'We confirm your setup and anything priced with you.'],
    ['Sign and get started', 'You sign the agreement and we schedule your kickoff.']
  ];
  const sw = (CW - 2 * 10) / 3;
  steps.forEach(([h, p], i) => {
    const x = M + i * (sw + 10);
    box(WHITE, x, y, sw, 58, 8);
    outline(BORDER, x, y, sw, 58, 8);
    doc.setFillColor(...TEAL);
    doc.circle(x + 20, y + 20, 8, 'F');
    t(String(i + 1), x + 20, y + 23.5, 8.5, WHITE, 'bold', { align: 'center' });
    t(h, x + 34, y + 23.5, 9.5, NAVY, 'bold');
    para(p, x + 14, y + 40, sw - 26, 8, MUTED, 10);
  });
  y += 76;
  t('Questions about this quote?', M, y, 9, MUTED);
  t('Travis Turner, Chief Operating Officer  \u00B7  travis@helpseeker.org', M + 128, y, 9, NAVY, 'bold');
  y += 14;
  set(8.5, TEAL, 'normal');

  // Navy footer on every page but the cover
  const n = doc.getNumberOfPages();
  for (let pg = 2; pg <= n; pg++) {
    doc.setPage(pg);
    box(NAVY, 0, H - 34, W, 34);
    box(TEAL, 0, H - 34, W, 2);
    set(7.8, WHITE, 'bold');
    const lead = 'Mareto quote for ' + contactInfo.org;
    t(lead, M, H - 14, 7.8, WHITE, 'bold');
    t(longDate(now), W - M, H - 14, 7.8, ONDARK, 'normal', { align: 'right' });
  }

  return doc;
}

function buildQuoteEmail(contact, pricing) {
  const p = contact.properties;
  const name = p.firstname || '';
  const orgName = p.company || 'your organization';
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const { setupTotal, mo, y1, validDate, prepayY1, savingY1 } = pricing;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Mareto quote</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0B1F33,#1E3A5F);padding:32px 40px;text-align:center;">
  <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Your Mareto Quote</h1>
  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:1px;">${orgName}</p>
</td></tr>

<!-- Greeting -->
<tr><td style="padding:32px 40px 16px;">
  <p style="margin:0;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:12px 0 0;font-size:16px;color:#2D3748;line-height:1.6;">Here is your Mareto quote. The full breakdown is in the attached PDF.</p>
</td></tr>

<!-- Pricing Card -->
<tr><td style="padding:8px 40px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;">
  <tr><td style="background:#EDF5F4;padding:22px 26px 18px;">
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1px;color:#0E8C86;">YOUR FIRST-YEAR PRICE</p>
    <p style="margin:6px 0 0;font-size:38px;font-weight:900;color:#0B1F33;line-height:1.15;">${money(y1)}</p>
    <p style="margin:4px 0 0;font-size:14px;color:#4A5568;">From year two, ${money(mo)} a month.</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:6px 26px;border:1px solid #E2E8F0;border-top:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #E2E8F0;font-size:14px;color:#4A5568;">One-time setup</td>
      <td style="padding:12px 0;border-bottom:1px solid #E2E8F0;font-size:14px;font-weight:700;color:#0B1F33;text-align:right;">${money(setupTotal)}</td>
    </tr>
    <tr>
      <td style="padding:12px 0;font-size:14px;color:#4A5568;">Monthly plan</td>
      <td style="padding:12px 0;font-size:14px;font-weight:700;color:#0B1F33;text-align:right;">${money(mo)}</td>
    </tr>
    </table>
  </td></tr>
  <tr><td style="background:#ffffff;padding:12px 26px 18px;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 10px 10px;">
    <p style="margin:0;font-size:13px;color:#4A5568;line-height:1.5;">Valid until ${longDate(validDate)}. Pay the year up front and save ${PREPAY_PCT}% (${money(savingY1)}).</p>
  </td></tr>
  </table>
</td></tr>

<!-- CTA -->
<tr><td style="padding:8px 40px 32px;text-align:center;">
  <p style="margin:0 0 20px;font-size:16px;color:#2D3748;line-height:1.6;">The best next step is a short call to walk through the quote and confirm the details. Reply to this email and we will set it up.</p>
  <a href="${MEETING_URL}" style="display:inline-block;background:#0B1F33;color:#ffffff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:10px;text-decoration:none;">Email Travis</a>
</td></tr>

<!-- Signature -->
<tr><td style="padding:0 40px 32px;border-top:1px solid #eee;">
  <p style="margin:20px 0 0;font-size:14px;color:#2D3748;">Best,</p>
  <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0B1F33;">Travis Turner</p>
  <p style="margin:2px 0 0;font-size:13px;color:#4A5568;">HelpSeeker Technologies</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildTravisQuoteEmail(contact, answers, pricing) {
  const p = contact.properties;
  const orgName = p.company || 'Unknown';
  const contactName = [p.firstname, p.lastname].filter(Boolean).join(' ') || p.email;
  const assess = readAssessment(p);
  const { setupTotal, mo, y1, picksAddons, picksQuoted } = pricing;

  const row = (label, value) => {
    if (!value) return '';
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#4A5568;font-weight:700;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0B1F33;">${value}</td>
    </tr>`;
  };

  const briefRows = [
    row('Contact', contactName + (p.jobtitle ? ` (${p.jobtitle})` : '')),
    row('Email', p.email ? `<a href="mailto:${p.email}" style="color:#275C99;">${p.email}</a>` : ''),
    row('Organization', orgName),
    row('Website', p.website ? `<a href="${p.website}" style="color:#275C99;">${p.website}</a>` : ''),
    row('Came through', p.mareto_from || 'direct'),
    row('Org type', p.mareto_org_type),
    row('Services', (p.mareto_services || '').replace(/;/g, ', ')),
    row('Challenges', (p.mareto_challenges || '').replace(/;/g, ', ')),
    row('Size', p.mareto_users),
    row('Programs', p.mareto_programs),
    row('Timeline', p.mareto_timeline),
    row('Role', p.mareto_role),
    row('Province', p.mareto_province)
  ].join('');

  const quoteRows = [
    row('Users', String(answers.users)),
    row('Programs', String(answers.programs)),
    row('Staff types', String(answers.roles)),
    row('Add-ons', picksAddons.length ? picksAddons.map(a => a.name).join(', ') : 'None'),
    row('Extras', [answers.french ? 'French' : '', answers.pia ? 'PIA' : ''].filter(Boolean).join(', ') || 'None'),
    row('Priced with you', picksQuoted.length ? picksQuoted.map(q => q.name).join(', ') : 'None'),
    row('Year one', money(y1)),
    row('One-time setup', money(setupTotal)),
    row('Monthly plan', money(mo))
  ].join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

<tr><td style="background:linear-gradient(135deg,#0B1F33,#1E3A5F);padding:24px 40px;">
  <h1 style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">New Mareto quote: ${orgName}</h1>
</td></tr>

<!-- Read assessment -->
<tr><td style="padding:24px 40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDF5F4;border-radius:10px;border-left:4px solid ${assess.color};">
  <tr><td style="padding:16px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;color:#4A5568;letter-spacing:1.5px;">READ</p>
    <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${assess.color};">${assess.label}</p>
  </td></tr>
  </table>
</td></tr>

<!-- Contact Brief -->
<tr><td style="padding:0 40px 16px;">
  <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#4A5568;letter-spacing:1px;">CONTACT BRIEF</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
  ${briefRows}
  </table>
</td></tr>

<!-- Quote Details -->
<tr><td style="padding:0 40px 24px;">
  <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#0E8C86;letter-spacing:1px;">QUOTE DETAILS</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
  ${quoteRows}
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function processQuote() {
  const contacts = await searchUnsentQuote();
  console.log(`[Quote] Found ${contacts.length} unsent contact(s)`);

  for (const contact of contacts) {
    const p = contact.properties;
    if (!p.email) continue;
    try {
      const answers = parseQuoteAnswers(p);
      const pricing = computeQuotePricing(answers);
      const orgName = p.company || 'Quote';
      const contactInfo = {
        org: orgName,
        name: [p.firstname, p.lastname].filter(Boolean).join(' ') || p.email,
        title: p.jobtitle || ''
      };

      // Over 200 people: custom quote. No calculated price or PDF goes out.
      if ((answers.users || 0) > MAX_PEOPLE) {
        const greeting = p.firstname ? `Hi ${p.firstname},` : 'Hi there,';
        await sendViaResend({
          to: p.email,
          subject: 'Your Mareto quote',
          html: followupEmail('Your Mareto quote', `
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">Thank you for asking for a Mareto quote for ${orgName}. For organizations with more than 200 people, we put the price together with you, so it reflects your programs, sites and setup.</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">Reply to this email and we will set up a short call to work it out.</p>
  ${ctaButton(MEETING_URL, 'Email me to set up a call')}
  `)
        });
        await sendViaResend({
          to: TRAVIS_EMAIL,
          subject: `New Mareto quote (custom, over 200 people): ${orgName}`,
          html: `<p>${contactInfo.name}${contactInfo.title ? ', ' + contactInfo.title : ''} at ${orgName} (${p.email}) asked for a quote for ${answers.users} people and ${answers.programs} programs.</p><p>Over 200 people, so no price or PDF was sent. They were asked to reply to set up a call.</p>`
        });
        await hsUpdate(contact.id, { mareto_quote_email_sent: 'true', mareto_quote_email_sent_at: new Date().toISOString() });
        console.log(`[Quote] Sent custom-quote reply to ${p.email}`);
        continue;
      }

      // Build PDF
      const doc = buildQuotePdfServer(answers, contactInfo);
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      const pdfAttachment = {
        filename: 'Mareto quote - ' + orgName + '.pdf',
        content: pdfBuffer.toString('base64')
      };

      // Email to buyer (with PDF)
      await sendViaResend({
        to: p.email,
        subject: 'Your Mareto quote',
        html: buildQuoteEmail(contact, pricing),
        attachments: [pdfAttachment]
      });

      // Email to Travis (with PDF)
      await sendViaResend({
        to: TRAVIS_EMAIL,
        subject: `New Mareto quote: ${orgName}`,
        html: buildTravisQuoteEmail(contact, answers, pricing),
        attachments: [pdfAttachment]
      });

      await hsUpdate(contact.id, { mareto_quote_email_sent: 'true', mareto_quote_email_sent_at: new Date().toISOString() });
      console.log(`[Quote] Sent to ${p.email}`);
    } catch (err) {
      console.error(`[Quote] Failed for ${p.email}: ${err.message}`);
    }
  }
}

// ========================================================================
//  4. FOLLOW-UP SEQUENCE (Day 3, Day 5, Day 7)
// ========================================================================
const FOLLOWUP_PROPERTIES = [
  'email', 'firstname', 'lastname', 'company', 'jobtitle', 'website',
  'mareto_demo_email_sent', 'mareto_quote_email_sent',
  'mareto_demo_email_sent_at', 'mareto_quote_email_sent_at',
  'mareto_followup_day3_sent', 'mareto_followup_day5_sent', 'mareto_followup_day7_sent'
];

async function searchFollowupEligible() {
  return hsSearch(
    [
      { filters: [
        { propertyName: 'mareto_demo_email_sent_at', operator: 'HAS_PROPERTY' },
        { propertyName: 'mareto_followup_day7_sent', operator: 'NOT_HAS_PROPERTY' }
      ]},
      { filters: [
        { propertyName: 'mareto_quote_email_sent_at', operator: 'HAS_PROPERTY' },
        { propertyName: 'mareto_followup_day7_sent', operator: 'NOT_HAS_PROPERTY' }
      ]}
    ],
    FOLLOWUP_PROPERTIES
  );
}

function daysSince(isoString) {
  if (!isoString) return 0;
  return (Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24);
}

function followupEmail(subject, bodyHtml) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

<tr><td style="padding:32px 40px 0;">
  ${bodyHtml}
</td></tr>

<tr><td style="padding:24px 40px 32px;border-top:1px solid #eee;">
  <p style="margin:0;font-size:14px;color:#2D3748;">Best,</p>
  <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0B1F33;">Travis Turner</p>
  <p style="margin:2px 0 0;font-size:13px;color:#4A5568;">HelpSeeker Technologies</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function ctaButton(url, label) {
  return `<p style="margin:16px 0;"><a href="${url}" style="display:inline-block;background:#0B1F33;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">${label}</a></p>`;
}

// ---- Day 3 templates ----

function buildDay3DemoOnly(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return followupEmail('See what Mareto would cost for your team', `
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">You had a look at Mareto a few days ago and I wanted to follow up.</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">One thing people usually want to know after the demo is what it would actually cost. Our quote builder puts together a full breakdown based on your team size, programs, and the features you need. Takes about two minutes and you get a PDF you can share internally.</p>
  ${ctaButton(QUOTE_URL + '?from=followup-day3', 'Get your quote')}
  `);
}

function buildDay3QuoteOnly(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return followupEmail('See how Mareto works day to day', `
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">You put together a Mareto quote a few days ago and I wanted to make sure you've seen the other side of it too.</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">Our interactive demo walks through what Mareto actually looks like when your team is using it: client intake, case notes, program dashboards, funder reports. It's set up for an organization like yours based on the answers you gave us.</p>
  ${ctaButton(DEMO_URL + '&from=followup-day3', 'Try the interactive demo')}
  `);
}

function buildDay3Both(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const orgName = p.company || 'your organization';
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return followupEmail('A few things worth knowing about Mareto', `
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">Thanks for taking the time to explore Mareto and put together a quote for ${orgName}. I wanted to share a few things that don't always come through in a demo or a pricing page:</p>
  <ul style="margin:0 0 12px 18px;font-size:16px;color:#2D3748;line-height:1.8;">
    <li><strong style="color:#0B1F33;">Your data stays in Canada.</strong> Your client data is stored in data centres in Canada.</li>
    <li><strong style="color:#0B1F33;">Setup includes hands-on support.</strong> We configure your programs, staff types, and forms with you. You're not left to figure it out alone.</li>
    <li><strong style="color:#0B1F33;">Training is built in.</strong> Your team gets live walkthroughs before go-live, not a link to a help centre.</li>
  </ul>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">If you'd like to talk through what setup would look like for ${orgName}, I'm happy to walk you through it.</p>
  ${ctaButton(MEETING_URL, 'Email me to set up a call')}
  `);
}

// ---- Day 5 templates ----

function buildDay5DemoOnly(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const orgName = p.company || 'your organization';
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return followupEmail('Your Mareto pricing breakdown', `
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">I know things get busy, so I wanted to send one more reminder. Our quote builder gives you a full pricing breakdown for ${orgName} based on your team size and the programs you run. You get a PDF you can share with your team or bring to a budget conversation.</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">Takes about two minutes.</p>
  ${ctaButton(QUOTE_URL + '?from=followup-day5', 'Get your quote')}
  `);
}

function buildDay5QuoteOnly(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const orgName = p.company || 'your organization';
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return followupEmail('See Mareto working for an org like yours', `
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">I know things get busy, so I wanted to send one more reminder. Our interactive demo is set up for an organization like ${orgName} so you can see what the day-to-day actually looks like: how your team would log client visits, track outcomes, and pull funder reports.</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">Takes a few minutes to walk through.</p>
  ${ctaButton(DEMO_URL + '&from=followup-day5', 'Try the interactive demo')}
  `);
}

function buildDay5Both(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const orgName = p.company || 'your organization';
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return followupEmail('Next steps for ' + orgName, `
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">You've had a chance to try the Mareto demo and see what it would cost for ${orgName}. If you're thinking about moving forward, the next step is usually a short call where we walk through your specific setup: which programs to start with, how to handle your existing data, and what the timeline looks like.</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">15 minutes is usually enough to cover it.</p>
  ${ctaButton(MEETING_URL, 'Email me to set up a call')}
  `);
}

// ---- Day 7 template (same for everyone) ----

function buildDay7(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const orgName = p.company || 'your organization';
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return followupEmail('Here if you need us', `
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">${greeting}</p>
  <p style="margin:0 0 12px;font-size:16px;color:#2D3748;line-height:1.6;">Just wanted to let you know that if you have any questions about Mareto or decide you want to move forward, don't hesitate to reach out. We're here whenever the timing is right for ${orgName}.</p>
  ${ctaButton(MEETING_URL, 'Get in touch')}
  `);
}

// ---- Follow-up processor ----

async function processFollowups() {
  const contacts = await searchFollowupEligible();
  console.log(`[Followup] Found ${contacts.length} eligible contact(s)`);

  for (const contact of contacts) {
    const p = contact.properties;
    if (!p.email) continue;

    const demoAt = p.mareto_demo_email_sent_at;
    const quoteAt = p.mareto_quote_email_sent_at;

    // Use the earliest timestamp as the sequence start
    const earliest = [demoAt, quoteAt].filter(Boolean).sort()[0];
    if (!earliest) continue;

    const days = daysSince(earliest);
    const didDemo = !!demoAt;
    const didQuote = !!quoteAt;
    const didBoth = didDemo && didQuote;

    let scenario;
    if (didBoth) scenario = 'both';
    else if (didDemo) scenario = 'demo_only';
    else scenario = 'quote_only';

    // Send one email per contact per cron run (earliest unsent step first).
    // This prevents blasting 3 emails at once if the system goes live mid-sequence.
    try {
      if (!p.mareto_followup_day3_sent && days >= 3) {
        const html = scenario === 'both' ? buildDay3Both(contact)
          : scenario === 'demo_only' ? buildDay3DemoOnly(contact)
          : buildDay3QuoteOnly(contact);
        const subject = scenario === 'both' ? 'A few things worth knowing about Mareto'
          : scenario === 'demo_only' ? 'See what Mareto would cost for your team'
          : 'See how Mareto works day to day';
        await sendViaResend({ to: p.email, subject, html });
        await hsUpdate(contact.id, { mareto_followup_day3_sent: new Date().toISOString() });
        console.log(`[Followup] Day 3 sent to ${p.email} (${scenario})`);
      }
      else if (!p.mareto_followup_day5_sent && days >= 5) {
        const html = scenario === 'both' ? buildDay5Both(contact)
          : scenario === 'demo_only' ? buildDay5DemoOnly(contact)
          : buildDay5QuoteOnly(contact);
        const subject = scenario === 'both' ? `Next steps for ${p.company || 'your organization'}`
          : scenario === 'demo_only' ? 'Your Mareto pricing breakdown'
          : 'See Mareto working for an org like yours';
        await sendViaResend({ to: p.email, subject, html });
        await hsUpdate(contact.id, { mareto_followup_day5_sent: new Date().toISOString() });
        console.log(`[Followup] Day 5 sent to ${p.email} (${scenario})`);
      }
      else if (!p.mareto_followup_day7_sent && days >= 7) {
        await sendViaResend({ to: p.email, subject: 'Here if you need us', html: buildDay7(contact) });
        await hsUpdate(contact.id, { mareto_followup_day7_sent: new Date().toISOString() });
        console.log(`[Followup] Day 7 sent to ${p.email}`);
      }
    } catch (err) {
      console.error(`[Followup] Failed for ${p.email}: ${err.message}`);
    }
  }
}

// ========================================================================
//  MAIN
// ========================================================================
async function main() {
  if (!HUBSPOT_TOKEN || !RESEND_API_KEY) {
    console.error('Missing HUBSPOT_TOKEN or RESEND_API_KEY');
    process.exit(1);
  }

  // Run all flows
  await processFitFinder();
  await processDemo();
  await processQuote();
  await processFollowups();

  console.log('Done');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
