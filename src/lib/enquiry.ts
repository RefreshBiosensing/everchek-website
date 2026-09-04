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
/** Our own origin. Used first when server-side delivery is configured (Resend),
 *  because a same-origin request cannot be blocked by an ad blocker or a
 *  firewall rule aimed at third-party form endpoints. */
const OWN_ENDPOINT = '/api/enquiry';
export const FALLBACK_EMAIL = 'contact@ever-chek.com';

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

/** Distinguishes "the request never left the browser" from "the API said no".
 *  A blocked or offline request throws TypeError from fetch. */
export class EnquiryError extends Error {
  constructor(message: string, readonly blocked: boolean) {
    super(message);
    this.name = 'EnquiryError';
  }
}

/** One attempt at the third-party endpoint. Throws EnquiryError on failure. */
async function postToWeb3Forms(payload: Record<string, any>): Promise<void> {
  let res: Response;
  try {
    res = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // fetch only rejects when the request could not be made at all: an ad
    // blocker or firewall dropped it, or the network is down.
    throw new EnquiryError(`request blocked or network unavailable (${err})`, true);
  }
  // Web3Forms answers 200 with {"success": false, "message": …} for a rejected
  // submission, so the HTTP status alone does not tell you it was delivered.
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON means something in front of the API answered, e.g. a challenge */
  }
  if (!res.ok || !body || body.success !== true) {
    throw new EnquiryError(body?.message || `Web3Forms returned ${res.status}`, false);
  }
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

  const payload = {
    ...data,
    website: undefined,
    access_key: WEB3FORMS_KEY,
    subject: `[EverChek] ${type} — ${who}`,
    from_name: 'EverChek Website',
    replyto: data.email,
    ...attribution(),
  };

  // Same-origin first, once server-side delivery exists. Set PUBLIC_ENQUIRY_API=1
  // alongside RESEND_API_KEY and the enquiry never touches a third-party domain,
  // which is what makes it blockable. Off by default, so we do not spend a
  // round-trip (and a 501 in the console) on every submission.
  if (import.meta.env.PUBLIC_ENQUIRY_API === '1') try {
    const own = await fetch(OWN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (own.ok) {
      track(data, type, formSource);
      return;
    }
    if (own.status !== 501) {
      const b = await own.json().catch(() => null);
      throw new EnquiryError(b?.error || `Delivery failed (${own.status})`, false);
    }
  } catch (err) {
    if (err instanceof EnquiryError) throw err;
    // Same-origin unreachable — carry on to the third-party endpoint.
  }


  // One retry: most failures here are a dropped request, not a refusal.
  try {
    await postToWeb3Forms(payload);
  } catch (err) {
    if (err instanceof EnquiryError && err.blocked) {
      await new Promise((r) => setTimeout(r, 1200));
      await postToWeb3Forms(payload);
    } else {
      throw err;
    }
  }

  track(data, type, formSource);
}

/** The only conversion worth measuring on this site. */
function track(data: Record<string, any>, type: string, formSource: string) {
  (window as any).gtag?.('event', 'generate_lead', {
    form_source: formSource,
    inquiry_type: type,
    country: data.country ?? '',
    page_path: location.pathname,
  });
}

/**
 * A mailto: carrying everything the visitor typed, for when delivery fails.
 * Losing a B2B enquiry costs far more than an ugly fallback.
 */
export function mailtoFallback(data: Record<string, any>, type = 'Website'): string {
  const lines = [
    ['Name', data.name],
    ['Company', data.company],
    ['Email', data.email],
    ['Country / market', data.country],
    ['Phone', data.phone],
    ['Estimated annual volume', data.quantity],
  ]
    .filter(([, v]) => v && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${v}`);
  const body = `${lines.join('\n')}\n\n${data.message ?? ''}`;
  return `mailto:${FALLBACK_EMAIL}?subject=${encodeURIComponent(
    `[EverChek] ${type} enquiry`,
  )}&body=${encodeURIComponent(body)}`;
}

/**
 * Last resort: submit the form the way the browser has always done it — a real
 * POST with a page navigation, landing on the thank-you page.
 *
 * `fetch` can fail even when the enquiry was delivered: a content blocker or a
 * proxy can drop the response while the request goes through. Showing a red
 * error in that case is the worst outcome — the visitor believes the enquiry
 * was lost and walks away. A native POST needs no CORS, no readable response
 * and no JSON, so it works wherever the browser can reach the endpoint at all,
 * and the visitor ends on a page that plainly says the message arrived.
 *
 * It may produce a duplicate when the first attempt did get through. A
 * duplicate enquiry costs a moment of the sales team's time; a lost one costs
 * the lead.
 */
export function submitNatively(form: HTMLFormElement): void {
  const redirect = form.querySelector<HTMLInputElement>('[name="redirect"]');
  if (redirect) {
    // Keep the visitor on the origin they are actually browsing, so a preview
    // deployment does not bounce them to production.
    redirect.value = location.origin + (redirect.dataset.path || '/thank-you/');
  }
  // Carry the attribution the fetch path would have added.
  for (const [name, value] of Object.entries(attribution())) {
    if (form.querySelector(`[name="${name}"]`)) continue;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  form.removeAttribute('novalidate');
  HTMLFormElement.prototype.submit.call(form);
}

/** Scrolls the status panel into view and announces it to screen readers. */
export function revealStatus(el: Element | null | undefined): void {
  if (!el) return;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
