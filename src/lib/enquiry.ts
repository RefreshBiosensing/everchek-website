/**
 * Enquiry submission, shared by every form on the site.
 *
 * Delivery goes to Web3Forms straight from the browser. That is how Web3Forms
 * is designed to be used and how the original ever-chek.com forms worked: the
 * free plan rejects server-to-server calls outright ("Use our API in client
 * side… Pro plan is required") and puts a bot challenge in front of them, so a
 * Pages Function calling it can never deliver anything.
 *
 * The access key is public by design — it was already in the original site's
 * HTML — and only permits submitting to the inbox configured on that key.
 *
 * Every caller must treat a non-`true` result as a failure and show the visitor
 * the fallback address. A form that reports success without delivering is worse
 * than no form at all.
 */
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const WEB3FORMS_KEY = 'efeceb0a-a931-4c23-a3c6-e92b4bac78c5';

/** Where the visitor came from, so an enquiry can be traced to a page and campaign. */
export function attribution(): Record<string, string> {
  const params = new URLSearchParams(location.search);
  let landing = '';
  try {
    landing = sessionStorage.getItem('ec_landing') || '';
  } catch {
    /* private mode — attribution is best-effort */
  }
  const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'src', 'inquiry']
    .map((k) => (params.get(k) ? `${k}=${params.get(k)}` : ''))
    .filter(Boolean)
    .join(' · ');
  return {
    source_page: location.pathname + location.search,
    landing_page: landing || location.pathname,
    referrer: document.referrer || 'direct',
    ...(utm ? { utm } : {}),
  };
}

export interface SubmitOptions {
  /** Shown in the email subject, e.g. 'Distribution'. */
  kind?: string;
  /** Which form produced it — reported to GA4 as form_source. */
  formSource: string;
}

/**
 * Sends one enquiry. Resolves only when Web3Forms confirms delivery;
 * throws otherwise, with the API's own message where there is one.
 */
export async function submitEnquiry(
  data: Record<string, any>,
  { kind, formSource }: SubmitOptions,
): Promise<void> {
  // Honeypot: bots fill the hidden field. Drop it silently — no request, and
  // the caller still shows success so the bot does not retry.
  if (data.website) return;

  const who = data.company || data.country || data.email || 'website visitor';
  const type = kind || data.inquiry_type || data.type || 'Website';

  const res = await fetch(WEB3FORMS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      ...data,
      website: undefined,
      access_key: WEB3FORMS_KEY,
      subject: `[EverChek] ${type} — ${who}`,
      from_name: 'EverChek Website',
      replyto: data.email,
      ...attribution(),
    }),
  });

  // Web3Forms answers 200 with {"success": false, "message": …} for a rejected
  // submission, so the HTTP status alone does not tell you it was delivered.
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON means something in front of the API answered, e.g. a challenge */
  }
  if (!res.ok || !body || body.success !== true) {
    throw new Error(body?.message || `Web3Forms returned ${res.status}`);
  }

  // The only conversion worth measuring on this site.
  (window as any).gtag?.('event', 'generate_lead', {
    form_source: formSource,
    inquiry_type: type,
    country: data.country ?? '',
    page_path: location.pathname,
  });
}
