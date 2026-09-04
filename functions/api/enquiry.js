// Cloudflare Pages Function: optional server-side delivery for enquiry forms.
//
// NOT the default path. The forms submit to Web3Forms straight from the browser
// (src/lib/enquiry.ts) because the Web3Forms free plan refuses server-to-server
// calls — it answers 403 "Use our API in client side … Pro plan is required"
// and puts a bot challenge in front of the endpoint. A Function calling it can
// never deliver anything, so that path is gone rather than left looking alive.
//
// This endpoint exists for the upgrade: Resend gives a real From address on the
// company domain and better deliverability than a shared relay. To switch:
//
//   1. Create a Resend account and verify ever-chek.com.
//   2. Set in Cloudflare Pages > Settings > Variables and secrets:
//        RESEND_API_KEY   the API key
//        ENQUIRY_TO       where enquiries should land
//        ENQUIRY_FROM     optional, e.g. "EverChek <sales@ever-chek.com>"
//   3. Point the forms here instead of Web3Forms.
//
// Until then it answers 501, so nothing can mistake it for a working endpoint.
//
// Rule for any future change: only report success when the provider confirms
// delivery. A form that says "sent" without sending is worse than no form —
// it looks exactly like having no visitors.

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.RESEND_API_KEY || !env.ENQUIRY_TO) {
    return json({ error: 'Server-side delivery is not configured' }, 501);
  }

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

  const details = [
    ['Name', data.name],
    ['Company', data.company],
    ['Email', data.email],
    ['Country / market', data.country],
    ['Phone', data.phone],
    ['Enquiry type', data.inquiry_type || data.type],
    ['Estimated annual volume', data.quantity],
  ];
  // Without these an enquiry cannot be traced to a page, a market or a campaign.
  const attribution = [
    ['Submitted from', data.source_page],
    ['Landing page', data.landing_page],
    ['Referrer', data.referrer],
    ['Campaign', data.utm],
    ['Locale', data.locale],
  ];
  const present = (pairs) => pairs.filter(([, v]) => v && String(v).trim() !== '');

  const who = data.company || data.country || data.email;
  const kind = data.inquiry_type || data.type || 'Website';

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

  try {
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
        subject: `[EverChek] ${kind} — ${who}`,
        html,
      }),
    });
    // Resend returns the message id on success; anything else is a failure,
    // whatever the status code says.
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.id) {
      return json({ error: body?.message || `Delivery failed (${res.status})` }, 502);
    }
    return json({ ok: true, id: body.id });
  } catch (err) {
    return json({ error: `Delivery failed: ${err}` }, 502);
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
