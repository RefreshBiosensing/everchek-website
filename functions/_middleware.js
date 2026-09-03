// Cloudflare Pages Function: serve a Markdown rendering of any page to clients
// that ask for it with `Accept: text/markdown`.
//
// Why keep this: retrieval bots and LLM fetch tools do better with clean prose
// than with a full HTML document, and this costs nothing to serve.
//
// The previous version hard-coded a Markdown copy of the home page. That copy
// drifted: it still advertised a "<8% MARD" figure that has since been removed
// from the site, and every link in it pointed at a /*.html URL that now 301s.
// A hand-maintained second copy of the content is a claim-consistency risk on a
// medical-device site, so this version derives the Markdown from the page that
// was actually built. There is one source of truth.

const BASE = 'https://ever-chek.com';

export async function onRequest(context) {
  const { request, next } = context;
  const accept = request.headers.get('Accept') || '';
  const response = await next();
  const type = response.headers.get('Content-Type') || '';

  if (!type.includes('text/html')) return response;

  if (accept.includes('text/markdown')) {
    const html = await response.text();
    return new Response(htmlToMarkdown(html), {
      status: response.status,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Robots-Tag': response.headers.get('X-Robots-Tag') ?? 'all',
        Link: serviceMetaLink(),
      },
    });
  }

  const headers = new Headers(response.headers);
  headers.set('Link', serviceMetaLink());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const serviceMetaLink = () =>
  '</.well-known/agent-skills/index.json>; rel="service-meta"; type="application/json"';

function htmlToMarkdown(html) {
  // Drop everything that is chrome rather than content.
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '');

  const main = body.match(/<main[^>]*>([\s\S]*)<\/main>/i);
  body = main ? main[1] : body;

  const md = body
    // headings
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `\n\n# ${strip(t)}\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n\n## ${strip(t)}\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n\n### ${strip(t)}\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `\n\n#### ${strip(t)}\n`)
    // links, kept absolute so a bot can follow them
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, t) => {
      const text = strip(t);
      if (!text) return '';
      const url = href.startsWith('/') ? BASE + href : href;
      return `[${text}](${url})`;
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `\n- ${strip(t)}`)
    .replace(/<(p|div|section|tr|br)[^>]*>/gi, '\n')
    .replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (_, t) => `${strip(t)} | `)
    .replace(/<[^>]+>/g, ' ');

  return decode(md)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const strip = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
