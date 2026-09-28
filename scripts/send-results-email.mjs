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
        'mareto_role', 'mareto_fit_score', 'mareto_price_estimate'
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

function buildEmail(contact) {
  const p = contact.properties;
  const name = p.firstname || '';
  const score = p.mareto_fit_score || '0';
  const price = p.mareto_price_estimate || '—';
  const orgType = p.mareto_org_type || '—';
  const users = p.mareto_users || '—';
  const fit = getFitLabel(score);
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const priceDisplay = price !== '—' ? `$${parseInt(price, 10).toLocaleString('en-CA')}` : '—';

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
<tr><td style="padding:0 40px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td width="50%" style="padding:12px 16px;background:#f8f9fb;border-radius:8px 0 0 0;">
      <p style="margin:0;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;">Fit Score</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#0f1c3f;">${score}<span style="font-size:14px;color:#999;font-weight:400"> / 10</span></p>
    </td>
    <td width="50%" style="padding:12px 16px;background:#f8f9fb;border-radius:0 8px 0 0;">
      <p style="margin:0;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;">Est. Monthly Cost</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#0f1c3f;">${priceDisplay}<span style="font-size:14px;color:#999;font-weight:400"> CAD/mo</span></p>
    </td>
  </tr>
  <tr>
    <td width="50%" style="padding:12px 16px;background:#f8f9fb;border-radius:0 0 0 8px;">
      <p style="margin:0;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;">Organization Type</p>
      <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#0f1c3f;">${orgType}</p>
    </td>
    <td width="50%" style="padding:12px 16px;background:#f8f9fb;border-radius:0 0 8px 0;">
      <p style="margin:0;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;">Team Size</p>
      <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#0f1c3f;">${users}</p>
    </td>
  </tr>
  </table>
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
