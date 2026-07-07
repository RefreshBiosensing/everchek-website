// Cloudflare Pages Function: Markdown for Agents + Link Headers
// When Accept: text/markdown is sent, returns markdown version of HTML pages

const HTML_TO_MD = {
  'index.html': (
`# EverChek China | CGM SKD & OEM Manufacturer

EverChek is a B2B CGM (Continuous Glucose Monitor) SKD and OEM manufacturer from China, sub-brand of Refresh.cc.

We supply semi-knocked-down and private-label CGM systems for healthcare brands, distributors, and medtech companies worldwide.

- **Accuracy**: <8% MARD
- **Facilities**: ISO 13485-certified
- **Models**: SKD, OEM, Private Label
- **Location**: Shenzhen, China

## Key Pages

- [Home](https://ever-chek.com/)
- [CGM SKD](https://ever-chek.com/cgm-skd.html)
- [CGM OEM](https://ever-chek.com/cgm-oem.html)
- [Certifications](https://ever-chek.com/certifications.html)
- [About Us](https://ever-chek.com/about-us.html)
- [Contact](https://ever-chek.com/contact.html)
- [Blog](https://ever-chek.com/cgm-blogs.html)

## Contact

Email: contact@ever-chek.com
Website: https://ever-chek.com`
  )
};

export async function onRequest(context) {
  const { request, next } = context;
  const accept = request.headers.get("Accept") || "";
  const url = new URL(request.url);
  let path = url.pathname;

  // Handle / -> index.html
  if (path === "/" || path === "") path = "/index.html";

  // If agent requests markdown
  if (accept.includes("text/markdown")) {
    // Get the HTML page filename
    const pageKey = path === "/" || path === "" ? "index.html" : path.substring(1);
    
    if (HTML_TO_MD[pageKey]) {
      return new Response(HTML_TO_MD[pageKey], {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "X-Markdown-Tokens": "true"
        }
      });
    }
    
    // For unknown pages, try to fetch and convert
    const response = await next();
    if (response.headers.get("Content-Type")?.includes("text/html")) {
      const html = await response.text();
      // Basic conversion - extract text content
      const md = `# ${extractTitle(html)}\n\n${extractText(html)}`;
      return new Response(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "X-Markdown-Tokens": "true"
        }
      });
    }
    return response;
  }

  // For normal requests, add Link header
  const response = await next();
  if (response.headers.get("Content-Type")?.includes("text/html")) {
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Link", '</.well-known/agent-skills/index.json>; rel="service-meta"; type="application/json"');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
  
  return response;
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].trim() : "EverChek";
}

function extractText(html) {
  // Remove scripts, styles, nav, footer
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // Extract visible text
  const body = text.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!body) return "Content not available.";
  text = body[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .trim();
  // Return first 500 chars as summary
  return text.substring(0, 500) + (text.length > 500 ? "\n\n[Continue reading](https://ever-chek.com)" : "");
}
