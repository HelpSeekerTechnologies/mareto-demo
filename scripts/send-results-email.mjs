// Mareto Fit Finder — Automated Results Email
// Runs via GitHub Actions on a cron schedule.
// Queries HubSpot for new quiz submissions, sends personalized results via Resend,
// then marks the contact as emailed.

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'travis@helpseeker.org';
const FROM_NAME = process.env.FROM_NAME || 'Travis Turner';
const DEMO_URL = 'https://demo.helpseeker.org/mareto-interactive-demo.html?unlocked=1';
const MEETING_URL = 'https://meetings.hubspot.com/travis-turner/meet-with-helpseeker-ma';

async function searchUnsent() {
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            { propertyName: 'mareto_fit_score', operator: 'HAS_PROPERTY' },
            { propertyName: 'mareto_results_email_sent', operator: 'NOT_HAS_PROPERTY' }
          ]
        },
        {
          filters: [
            { propertyName: 'mareto_fit_score', operator: 'HAS_PROPERTY' },
            { propertyName: 'mareto_results_email_sent', operator: 'NEQ', value: 'true' }
          ]
        }
      ],
      properties: [
        'email', 'firstname', 'lastname', 'company',
        'mareto_org_type', 'mareto_services', 'mareto_programs',
        'mareto_challenges', 'mareto_users', 'mareto_timeline',
        'mareto_role', 'mareto_fit_score', 'mareto_price_estimate',
        'mareto_calc_users', 'mareto_calc_term'
      ],
      limit: 20
    })
  });
  const data = await res.json();
  return data.results || [];
}

function getFitLabel(score) {
  const s = parseInt(score, 10);
  if (s >= 8) return { label: 'A strong fit', color: '#0B7770', desc: "Based on your answers, Mareto is well-suited to your organization's needs." };
  if (s >= 5) return { label: 'A good fit', color: '#275C99', desc: 'Mareto addresses several of your key challenges and could be a strong match.' };
  return { label: 'Worth a look', color: '#1E3A5F', desc: 'Mareto may be able to help depending on your specific requirements.' };
}

// Travis v2 pricing engine (Oct 2026)
const BRACKETS = [[10, 40], [25, 34], [50, 32], [100, 30], [Infinity, 27]];
const MIN_USERS = 5;
const BASE_SETUP = 5000;

function licenceMonthly(users) {
  let left = Math.max(users, MIN_USERS), prev = 0, total = 0;
  for (const [cap, rate] of BRACKETS) {
    const n = Math.min(left, cap - prev); if (n <= 0) break;
    total += n * rate; left -= n; prev = cap;
  }
  return total;
}

function getPricing(calcUsers, priceEstimate) {
  let userCount;
  if (calcUsers && parseInt(calcUsers, 10) > 0) userCount = parseInt(calcUsers, 10);
  else userCount = 5;
  const billed = Math.max(MIN_USERS, userCount);
  const monthly = licenceMonthly(billed);
  const annual = monthly * 12;
  const posted = parseInt(priceEstimate, 10);
  // price_estimate from the quiz is the full first-year total (setup + 12 months licence)
  let setup = Number.isFinite(posted) && posted > annual ? posted - annual : BASE_SETUP;
  const firstYear = setup + annual;
  return { userCount: billed, monthly, annual, setup, firstYear };
}

function fmtCAD(n) {
  return '$' + Math.round(n).toLocaleString('en-CA');
}

function buildPricingSection(p) {
  const calcUsers = p.mareto_calc_users || '';
  const priceEstimate = p.mareto_price_estimate || '';

  // Only show pricing if we have a price estimate
  if (!priceEstimate || parseInt(priceEstimate, 10) <= 0) return '';

  const pr = getPricing(calcUsers, priceEstimate);

  // Build the "how we worked this out" lines
  let howLines = '';
  // Setup base
  howLines += `<tr><td style="padding:8px 0;border-bottom:1px dashed #E2E8F0;font-size:13px;color:#4A5568;">Setup and training, 1 program, up to 3 staff types</td><td style="padding:8px 0;border-bottom:1px dashed #E2E8F0;font-size:13px;color:#0B1F33;font-weight:700;text-align:right;white-space:nowrap;">${fmtCAD(BASE_SETUP)}</td></tr>`;
  // If setup > base, show the difference as additional config
  if (pr.setup > BASE_SETUP) {
    howLines += `<tr><td style="padding:8px 0;border-bottom:1px dashed #E2E8F0;font-size:13px;color:#4A5568;">Additional programs, roles, and add-ons</td><td style="padding:8px 0;border-bottom:1px dashed #E2E8F0;font-size:13px;color:#0B1F33;font-weight:700;text-align:right;white-space:nowrap;">${fmtCAD(pr.setup - BASE_SETUP)}</td></tr>`;
  }
  // Licence line
  howLines += `<tr><td style="padding:8px 0;font-size:13px;color:#4A5568;">Licence for ${pr.userCount} people, per month</td><td style="padding:8px 0;font-size:13px;color:#0B1F33;font-weight:700;text-align:right;white-space:nowrap;">${fmtCAD(pr.monthly)}</td></tr>`;

  return `
<!-- Pricing Card -->
<tr><td style="padding:0 40px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;">
  <tr><td style="background:#EDF5F4;padding:22px 26px 18px;">
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1px;color:#0E8C86;">YOUR FIRST-YEAR PRICE</p>
    <p style="margin:6px 0 0;font-size:38px;font-weight:900;color:#0B1F33;line-height:1.15;">${fmtCAD(pr.firstYear)}</p>
    <p style="margin:4px 0 0;font-size:14px;color:#4A5568;">Then ${fmtCAD(pr.monthly)} a month after the first year.</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:6px 26px;border:1px solid #E2E8F0;border-top:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #E2E8F0;font-size:14px;color:#4A5568;">One-time setup</td>
      <td style="padding:12px 0;border-bottom:1px solid #E2E8F0;font-size:14px;font-weight:700;color:#0B1F33;text-align:right;">${fmtCAD(pr.setup)}</td>
    </tr>
    <tr>
      <td style="padding:12px 0;font-size:14px;color:#4A5568;">Monthly licence</td>
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

function buildEmail(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const score = p.mareto_fit_score || '0';
  const orgType = p.mareto_org_type || '—';
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
  <p style="margin:0 0 20px;font-size:16px;color:#2D3748;line-height:1.6;">The best next step is to explore Mareto through our interactive demo — click through real screens and see how case management, intake, and reporting actually work.</p>
  <a href="${DEMO_URL}" style="display:inline-block;background:#0B1F33;color:#ffffff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:10px;text-decoration:none;">Explore the Interactive Demo</a>
</td></tr>

<!-- Soft close -->
<tr><td style="padding:0 40px 32px;">
  <p style="margin:0;font-size:14px;color:#4A5568;line-height:1.6;">After exploring the demo, you're welcome to <a href="${MEETING_URL}" style="color:#275C99;text-decoration:none;">book a time</a> to discuss next steps with our team.</p>
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

async function sendEmail(contact) {
  const p = contact.properties;
  if (!p.email) return false;

  const html = buildEmail(contact);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [p.email],
      subject: 'Your Mareto Fit Assessment Results',
      html: html
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to send to ${p.email}: ${err}`);
    return false;
  }

  console.log(`Sent results email to ${p.email}`);
  return true;
}

async function markAsSent(contactId) {
  await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { mareto_results_email_sent: 'true' }
    })
  });
}

async function main() {
  if (!HUBSPOT_TOKEN || !RESEND_API_KEY) {
    console.error('Missing HUBSPOT_TOKEN or RESEND_API_KEY');
    process.exit(1);
  }

  const contacts = await searchUnsent();
  console.log(`Found ${contacts.length} unsent contact(s)`);

  for (const contact of contacts) {
    const sent = await sendEmail(contact);
    if (sent) {
      await markAsSent(contact.id);
    }
  }

  console.log('Done');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
