// Spelling and encoding repairs, applied to content/ as an explicit, reviewable pass.
//
// This is deliberately separate from everything else. The site copy is the owner's,
// and the only changes allowed here are ones they approved: genuine misspellings and
// mojibake. Nothing rephrases, shortens, or removes a claim.
//
// Every entry below was found in the original site and confirmed by hand.
//
// Run:  node scripts/fix-typos.mjs          apply
//       node scripts/fix-typos.mjs --dry    report only

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = 'content';

// [pattern, replacement, why]
const FIXES = [
  // --- misspellings ---
  [/\bshould't't\b/g, "shouldn't", "typo: should't't"],
  [/\bContinous\b/g, 'Continuous', 'typo: Continous (appears in an H2)'],
  [/\bTradtional\b/g, 'Traditional', 'typo: Tradtional (appears in an H2)'],
  [/\bpainfree\b/g, 'pain-free', 'typo: painfree'],
  [/\bsub8%/g, 'sub-8%', 'typo: sub8%'],
  [/\bfactorycalibrated\b/g, 'factory-calibrated', 'typo: factorycalibrated'],
  [/workflows\.,\s*while/g, 'workflows, while', 'stray full stop: "workflows., while"'],

  // --- unit errors ---
  // dB is a ratio; radiated power is dBm. An RF engineer spots this immediately.
  [/(\bEffective Radiated Power\b[^\n]*?)\b0db\b/gi, '$1 0 dBm', 'unit: 0db -> 0 dBm'],
  [/(?<![\w-])0db(?![\w-])/g, '0 dBm', 'unit: 0db -> 0 dBm'],

  // --- mojibake: UTF-8 read as GBK/Latin-1, then re-encoded ---
  [/掳C/g, ' °C', 'mojibake: 掳 -> °'],
  [/掳/g, '°', 'mojibake: 掳 -> °'],
  [/m虏/g, 'm²', 'mojibake: 虏 -> ²'],
  [/虏/g, '²', 'mojibake: 虏 -> ²'],
  [/鈥攆/g, ' — f', 'mojibake: 鈥攆 -> em dash + f'],
  [/鈥攁/g, ' — a', 'mojibake: 鈥攁 -> em dash + a'],
  [/鈥攖/g, ' — t', 'mojibake: 鈥攖 -> em dash + t'],
  [/鈥攛/g, ' — w', 'mojibake: 鈥攛 -> em dash + w'],
  [/鈥�?/g, '—', 'mojibake: 鈥 -> em dash'],
  [/鈥檚/g, '’s', 'mojibake: 鈥檚 -> curly apostrophe + s'],
  [/[�]/g, '', 'stray replacement character'],

  // --- broken en-dash year ranges: an em-dash entity ate the century ---
  [/\b(19|20)(\d{2})\s*[—–-]\s*0(\d{2})\b/g, (_, c, a, b) => `${c}${a}–${c}${b}`,
    'year range: 2017—019 -> 2017–2019'],

  // --- missing space before a parenthetical ---
  [/\bSystem\(CGMS\)/g, 'System (CGMS)', 'spacing: System(CGMS)'],
  [/\bsystem\(CGMS\)/g, 'system (CGMS)', 'spacing: system(CGMS)'],
];

const walk = (dir) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.ya?ml$/.test(e.name)) out.push(p);
  }
  return out;
};

const counts = new Map();
let filesTouched = 0;

for (const file of walk(ROOT)) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  const hits = [];

  for (const [pattern, replacement, why] of FIXES) {
    const found = after.match(pattern);
    if (!found) continue;
    after = after.replace(pattern, replacement);
    hits.push(`${why} ×${found.length}`);
    counts.set(why, (counts.get(why) ?? 0) + found.length);
  }

  if (after !== before) {
    filesTouched++;
    console.log(`\n${file}`);
    for (const h of hits) console.log(`   ${h}`);
    if (!DRY) writeFileSync(file, after);
  }
}

console.log(`\n${DRY ? '[dry run] ' : ''}${filesTouched} file(s), ${[...counts.values()].reduce((a, b) => a + b, 0)} replacement(s)`);
for (const [why, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${why}`);

// Anything that still looks like mojibake and is not covered above needs a human.
const SUSPECT = /[一-鿿]/;
const leftovers = [];
for (const file of walk(ROOT)) {
  if (file.includes('/zh')) continue; // a Chinese page is meant to have Chinese
  for (const [i, line] of readFileSync(file, 'utf8').split('\n').entries()) {
    if (SUSPECT.test(line)) leftovers.push(`${file}:${i + 1}  ${line.trim().slice(0, 100)}`);
  }
}
if (leftovers.length) {
  console.log(`\nCJK characters left in non-Chinese content — check these by hand:`);
  for (const l of leftovers.slice(0, 20)) console.log('  ' + l);
} else {
  console.log('\nNo stray CJK left in non-Chinese content.');
}
