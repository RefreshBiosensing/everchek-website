// Dictionary parity check: every key present in the English UI dictionary must
// exist in each translated one, and no locale may carry keys English does not.
// A missing key renders as `undefined` in the page, so this runs before deploy.
//
//   node scripts/check-i18n-parity.mjs
import fs from 'node:fs';
import YAML from 'yaml';

const flat = (o, p = '', out = []) => {
  if (Array.isArray(o)) o.forEach((v, i) => flat(v, `${p}[${i}]`, out));
  else if (o && typeof o === 'object') for (const k of Object.keys(o)) flat(o[k], `${p}.${k}`, out);
  else out.push(p);
  return out;
};

const read = (l) => flat(YAML.parse(fs.readFileSync(`content/i18n/${l}.yaml`, 'utf8')));
const en = read('en');
let bad = 0;

for (const file of fs.readdirSync('content/i18n')) {
  const locale = file.replace(/\.yaml$/, '');
  if (locale === 'en') continue;
  const other = read(locale);
  const missing = en.filter((k) => !other.includes(k));
  const extra = other.filter((k) => !en.includes(k));
  console.log(`${locale}: ${missing.length} missing, ${extra.length} extra`);
  for (const k of missing) console.log(`  missing ${k}`);
  for (const k of extra) console.log(`  extra   ${k}`);
  bad += missing.length + extra.length;
}
process.exit(bad ? 1 : 0);
