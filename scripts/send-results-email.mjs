// Mareto Fit Finder — Automated Results Email
// Runs via GitHub Actions on a cron schedule.
// Queries HubSpot for new quiz submissions, sends personalized results via Resend,
// then marks the contact as emailed.

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'travis@helpseeker.org';
const FROM_NAME = process.env.FROM_NAME || 'Travis Turner';
const DEMO_URL = 'https://helpseekertechnologies.github.io/mareto-demo/mareto-interactive-demo.html';
const MEETING_URL = 'https://meetings.hubspot.com/travis-turner/meet-with-helpseeker-ma';

async function searchUnsent() {
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filterGroups: [{
        filters: [
          { propertyName: 'mareto_fit_score', operator: 'HAS_PROPERTY' },
          { propertyName: 'mareto_results_email_sent', operator: 'NOT_HAS_PROPERTY' }
        ]
      }],
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
  if (s >= 8) return { label: 'Strong Fit', color: '#22a55d', desc: 'Based on your answers, Mareto is well-suited to your organization\'s needs.' };
  if (s >= 5) return { label: 'Good Fit', color: '#3b6cf5', desc: 'Mareto addresses several of your key challenges and could be a strong match.' };
  return { label: 'Potential Fit', color: '#e6a817', desc: 'Mareto may be able to help depending on your specific requirements.' };
}

function getPricing(calcUsers, calcTerm, usersLabel) {
  // Use exact calculator values if available, fall back to range-based estimate
  let userCount;
  if (calcUsers && parseInt(calcUsers, 10) > 0) {
    userCount = parseInt(calcUsers, 10);
  } else {
    const userDefaults = {'1-10': 5, '11-25': 15, '26-50': 30, '51-100': 50, '101-250': 75};
    userCount = userDefaults[usersLabel] || 10;
  }
  const term = calcTerm ? parseInt(calcTerm, 10) : 1;

  let perUser, tierName;
  if (userCount <= 10) { perUser = 40; tierName = 'Standard'; }
  else if (userCount <= 25) { perUser = 35; tierName = 'Growth'; }
  else if (userCount <= 50) { perUser = 30; tierName = 'Scale'; }
  else { perUser = 25; tierName = 'Enterprise'; }

  // Multi-year discounts
  let discount = 0, discountLabel = '';
  if (term === 2) { discount = 0.10; discountLabel = '10% multi-year discount'; }
  else if (term === 3) { discount = 0.15; discountLabel = '15% multi-year discount'; }

  const effectiveRate = perUser * (1 - discount);
  const monthly = effectiveRate * userCount;
  const annual = monthly * 12;
  const setup = 5000;
  const firstYear = annual + setup;
  const termLabel = term === 1 ? '1 year' : term === 2 ? '2 years' : '3 years';

  return { perUser: effectiveRate, tierName, userCount, monthly, annual, setup, firstYear, term, termLabel, discount, discountLabel };
}

function fmtCAD(n) {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function buildEmail(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const score = p.mareto_fit_score || '0';
  const orgType = p.mareto_org_type || '—';
  const users = p.mareto_users || '—';
  const calcUsers = p.mareto_calc_users || '';
  const calcTerm = p.mareto_calc_term || '';
  const fit = getFitLabel(score);
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const pricing = getPricing(calcUsers, calcTerm, users);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Mareto Fit Assessment Results</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0f1c3f,#1a2d5c);padding:32px 40px;text-align:center;">
  <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Mareto Fit Assessment</h1>
  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:1px;text-transform:uppercase;">Your Results</p>
</td></tr>

<!-- Greeting -->
<tr><td style="padding:32px 40px 16px;">
  <p style="margin:0;font-size:16px;color:#333;line-height:1.6;">${greeting}</p>
  <p style="margin:12px 0 0;font-size:16px;color:#333;line-height:1.6;">Thanks for taking the Mareto Fit Finder! Here's a summary of how Mareto matches your organization's needs.</p>
</td></tr>

<!-- Fit Score Banner -->
<tr><td style="padding:8px 40px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border-radius:10px;border-left:4px solid ${fit.color};">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Fit Assessment</p>
    <p style="margin:0 0 8px;font-size:28px;font-weight:800;color:${fit.color};">${fit.label}</p>
    <p style="margin:0;font-size:14px;color:#666;line-height:1.5;">${fit.desc}</p>
  </td></tr>
  </table>
</td></tr>

<!-- Results Grid -->
<tr><td style="padding:0 40px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td width="50%" style="padding:12px 16px;background:#f8f9fb;border-radius:8px 0 0 8px;">
      <p style="margin:0;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;">Fit Score</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#0f1c3f;">${score}<span style="font-size:14px;color:#999;font-weight:400"> / 10</span></p>
    </td>
    <td width="50%" style="padding:12px 16px;background:#f8f9fb;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;">Organization Type</p>
      <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#0f1c3f;">${orgType}</p>
    </td>
  </tr>
  </table>
</td></tr>

<!-- Pricing Breakdown -->
<tr><td style="padding:0 40px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1c3f;border-radius:10px;">
  <tr>
    <td width="33%" style="padding:20px 16px;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:800;color:#2ab5b2;">$${pricing.perUser.toFixed(2)}</p>
      <p style="margin:6px 0 0;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">Per User / Month</p>
      <p style="margin:2px 0 0;font-size:10px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px;">${pricing.tierName} Tier</p>
    </td>
    <td width="34%" style="padding:20px 16px;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:800;color:#2ab5b2;">${fmtCAD(pricing.monthly)}</p>
      <p style="margin:6px 0 0;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">Monthly Total</p>
      <p style="margin:2px 0 0;font-size:10px;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px;">${pricing.userCount} Users</p>
    </td>
    <td width="33%" style="padding:20px 16px;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:800;color:#2ab5b2;">${fmtCAD(pricing.annual)}</p>
      <p style="margin:6px 0 0;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">Annual Licensing</p>
    </td>
  </tr>
  <tr>
    <td width="33%" style="padding:4px 16px 20px;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:800;color:#2ab5b2;">${fmtCAD(pricing.setup)}</p>
      <p style="margin:6px 0 0;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">One-Time Setup</p>
    </td>
    <td colspan="2" style="padding:4px 16px 20px;text-align:center;">
      <p style="margin:0;font-size:28px;font-weight:800;color:#2ab5b2;">${fmtCAD(pricing.firstYear)}</p>
      <p style="margin:6px 0 0;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">First-Year Total</p>
    </td>
  </tr>
  </table>${pricing.discountLabel ? `
  <p style="margin:8px 0 0;font-size:12px;color:#22a55d;font-weight:700;">Based on ${pricing.termLabel} contract with ${pricing.discountLabel} applied.</p>` : ''}
  <p style="margin:${pricing.discountLabel ? '4' : '8'}px 0 0;font-size:12px;color:#999;font-style:italic;">This is an estimate based on published pricing. Your final quote will reflect your specific configuration and needs.</p>
</td></tr>

<!-- CTA -->
<tr><td style="padding:8px 40px 32px;text-align:center;">
  <p style="margin:0 0 20px;font-size:16px;color:#333;line-height:1.6;">The best next step is to explore Mareto through our interactive demo — click through real screens and see how case management, intake, and reporting actually work.</p>
  <a href="${DEMO_URL}" style="display:inline-block;background:#0f1c3f;color:#ffffff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:10px;text-decoration:none;">Explore the Interactive Demo</a>
</td></tr>

<!-- Soft close -->
<tr><td style="padding:0 40px 32px;">
  <p style="margin:0;font-size:14px;color:#999;line-height:1.6;">After exploring the demo, you're welcome to <a href="${MEETING_URL}" style="color:#3b6cf5;text-decoration:none;">book a time</a> to discuss next steps with our team.</p>
</td></tr>

<!-- Signature -->
<tr><td style="padding:0 40px 32px;border-top:1px solid #eee;">
  <p style="margin:20px 0 0;font-size:14px;color:#333;">Best,</p>
  <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0f1c3f;">Travis Turner</p>
  <p style="margin:2px 0 0;font-size:13px;color:#999;">HelpSeeker Technologies</p>
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
