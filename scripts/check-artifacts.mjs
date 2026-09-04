// Build-artifact guard. Run against dist/ after a build; fails on anything that
// should never reach a visitor — obfuscated emails carried over from the
// mirrored site, unresolved placeholders, mirror-era .html links, mojibake.
//
//   node scripts/check-artifacts.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CHECKS = [
  ['Cloudflare email obfuscation', /\[email(?:&#160;| )?protected\]|__cf_email__|\/cdn-cgi\/l\/email-protection/g],
  ['unresolved template/value', /\bundefined\b|\bNaN\b|\{\{[^}]+\}\}/g],
  ['placeholder text', /Loading\.\.\.|Lorem ipsum|TODO|FIXME|配图位/g],
  ['mirror-era .html link', /href="[^"]*\.html"/g],
  ['relative path from the mirror', /href="\.\.\/|src="\.\.\//g],
  ['mojibake', /[掳虏鈥锟]|�/g],
  ['double-escaped entity', /&amp;(amp|lt|gt|quot|#\d+);/g],
  ['dead anchor', /href="#"/g],
  ['leftover P20 branding', /\bP20\b|p20-website/g],
];
// The CMS admin page is authored in Chinese for the site owner.
const SKIP = [/^dist\/admin\//];

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : []);

let bad = 0;
for (const file of walk('dist')) {
  if (SKIP.some((r) => r.test(file))) continue;
  const body = readFileSync(file, 'utf8')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  for (const [name, re] of CHECKS) {
    const hits = body.match(re);
    if (hits) { console.error(`✗ ${file}: ${name} — ${[...new Set(hits)].slice(0, 3).join(' | ')}`); bad += hits.length; }
  }
}
console.log(bad ? `\n${bad} artifact(s) found` : '✓ no build artifacts');
process.exit(bad ? 1 : 0);
