// Cloudflare Pages Function: receives enquiry forms and delivers them by email.
//
// The form component posts JSON here. Two shapes arrive:
//   - the full form on /contact/ and /request-nda/
//   - the short form in the CTA banner at the foot of every page
// Only email + message are required; every other field is reported when present.
//
// Delivery: Web3Forms by default, because the site already has a working
// Web3Forms key and that means enquiries keep arriving with zero new setup.
// Resend is used instead when RESEND_API_KEY and ENQUIRY_TO are configured,
// which is worth doing later — it gives a real From address on the company
// domain and better deliverability than a shared relay.
//
// Optional environment variables (Cloudflare Pages > Settings > Environment):
//   WEB3FORMS_KEY  override the built-in access key
//   RESEND_API_KEY + ENQUIRY_TO   switch to Resend
//   ENQUIRY_FROM   e.g. "EverChek <sales@ever-chek.com>" (Resend only)
//
// NOTE: whichever path is used, send one real test submission after deploying
// and confirm it arrives. An enquiry form that fails silently is indistinguishable
// from having no visitors, and this site went a long time without anyone checking.

const WEB3FORMS_KEY_DEFAULT = 'efeceb0a-a931-4c23-a3c6-e92b4bac78c5';

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  // Honeypot: real users never fill the hidden "website" field. Answer 200 so
  // the bot sees success and does not retry.
  if (data.website) return json({ ok: true });

  for (const key of ['email', 'message']) {
    if (!data[key] || String(data[key]).trim() === '') {
      return json({ error: 'Missing fields' }, 400);
    }
  }

  // Attribution. Without these an enquiry cannot be traced to a page, a market
  // or a campaign, which is what made the previous setup impossible to optimise.
  const attribution = [
    ['Submitted from', data.source_page],
    ['Landing page', data.landing_page],
    ['Referrer', data.referrer],
    ['Campaign', data.utm],
    ['Locale', data.locale],
  ];

  const details = [
    ['Name', data.name],
    ['Company', data.company],
    ['Email', data.email],
    ['Country / market', data.country],
    ['Enquiry type', data.inquiry_type || data.type],
    ['Estimated annual volume', data.quantity],
  ];

  const present = (pairs) => pairs.filter(([, v]) => v && String(v).trim() !== '');

  const who = data.company || data.country || data.email;
  const kind = data.inquiry_type || data.type || 'Website';
  const subject = `[EverChek] ${kind} — ${who}`;

  const html = `
    <h2 style="font-family:sans-serif">${esc(kind)} enquiry</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      ${rows(present(details))}
    </table>
    <p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap"><b>Message</b><br>${esc(data.message)}</p>
    <hr style="border:0;border-top:1px solid #ddd;margin:18px 0">
    <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:12px;color:#555">
      ${rows(present(attribution))}
    </table>`;

  const text =
    present(details).map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n\nMessage:\n${data.message}\n\n--\n` +
    present(attribution).map(([k, v]) => `${k}: ${v}`).join('\n');

  try {
    if (env.RESEND_API_KEY && env.ENQUIRY_TO) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.ENQUIRY_FROM || 'EverChek Website <onboarding@resend.dev>',
          to: [env.ENQUIRY_TO],
          reply_to: data.email,
          subject,
          html,
        }),
      });
      if (!res.ok) return json({ error: 'Send failed' }, 502);
      return json({ ok: true });
    }

    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: env.WEB3FORMS_KEY || WEB3FORMS_KEY_DEFAULT,
        subject,
        from_name: 'EverChek Website',
        replyto: data.email,
        message: text,
      }),
    });
    if (!res.ok) return json({ error: 'Send failed' }, 502);
    return json({ ok: true });
  } catch {
    return json({ error: 'Send failed' }, 502);
  }
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const rows = (pairs) =>
  pairs.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('');

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
