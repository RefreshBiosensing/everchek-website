// Feature-block diagrams for /cgm-oem/ and /cgm-skd/, generated as SVG.
//
// Two rules learned the hard way:
//
// 1. The picture carries the idea; the page copy carries the detail. Earlier
//    versions crammed whole sentences into the graphic and read as clutter.
//    Budget: roughly a dozen short labels per diagram, nothing that reads as
//    prose.
// 2. SVG has no layout engine, so text silently overflows its box. Every label
//    here is measured against real DM Sans advance widths (scripts/
//    dm-sans-metrics.json, sampled from the live webfont) and either wraps,
//    shrinks, or fails the build. It never overflows silently again.
//
// Run: node scripts/make-diagrams.mjs
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const OUT = 'public/images/diagrams';
mkdirSync(OUT, { recursive: true });
const M = JSON.parse(readFileSync('scripts/dm-sans-metrics.json', 'utf8'));

const INK = '#12181F', MID = '#5A6675', SOFT = '#8A97A6';
const B600 = '#0B5FA5', B700 = '#0A4C84', B300 = '#80BCE2', B100 = '#E3F0FA';
const LINE = '#DDE3EA', WHITE = '#FFFFFF', OK = '#0B7355', WARN = '#B45309';
const GREY = '#EEF1F4', GREYL = '#DCE1E6';
const W = 880, H = 440;

const face = (w) => (w >= 700 ? 'b' : w >= 600 ? 'sb' : 'r');
/** Width of `s` in px at `size`, using measured DM Sans advances. */
const measure = (s, size, weight = 400) => {
  const t = M[face(weight)];
  let u = 0;
  for (const ch of String(s)) u += t[ch] ?? t['o'];
  return u * size;
};

const problems = [];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A text label that is guaranteed to fit `max` px, wrapping onto extra lines. */
function label(x, y, s, o = {}) {
  const size = o.s ?? 14, weight = o.w ?? 400, max = o.max ?? Infinity;
  const anchor = o.a ?? 'start', lh = o.lh ?? size * 1.35;
  const words = String(s).split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (measure(test, size, weight) <= max || !cur) cur = test;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  for (const l of lines) {
    const w = measure(l, size, weight);
    if (w > max + 0.5) problems.push(`"${l}" is ${w.toFixed(0)}px at ${size}px/${weight}, limit ${max}px`);
  }
  return lines
    .map((l, i) =>
      `<text x="${x}" y="${y + i * lh}" font-size="${size}" fill="${o.f ?? MID}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${o.ls ?? 0}">${esc(l)}</text>`,
    )
    .join('');
}
const eyebrow = (x, y, s) => label(x, y, s.toUpperCase(), { s: 11.5, f: SOFT, w: 700, ls: 1.1 });
const R = (x, y, w, h, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 10}" fill="${o.fill ?? WHITE}" stroke="${o.stroke ?? LINE}" stroke-width="${o.sw ?? 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
const tick = (cx, cy, c = OK) =>
  `<path d="M${cx - 5} ${cy} l3.6 3.9 l7.6 -8.6" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const xmark = (cx, cy, c = WARN) =>
  `<path d="M${cx - 4} ${cy - 4} l8 8 M${cx + 4} ${cy - 4} l-8 8" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`;
const arrowR = (x, y, len = 40, c = B600) =>
  `<path d="M${x} ${y} h${len - 9}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><path d="M${x + len} ${y} l-10 -6 v12 z" fill="${c}"/>`;
const arrowD = (x, y, len = 34, c = B600) =>
  `<path d="M${x} ${y} v${len - 9}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><path d="M${x} ${y + len} l-6 -10 h12 z" fill="${c}"/>`;

const svg = (title, body, h = H) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" font-family="DM Sans Variable, DM Sans, Inter, system-ui, sans-serif" role="img"><title>${esc(title)}</title>${body}</svg>`;

const files = {};

/* ══ OEM 1 · Save on R&D — two stacks, one is already built ══ */
{
  const b = [], bw = 302, bh = 50, gap = 9, x1 = 56, x2 = 522, top = 54;
  const layers = ['Sensor chemistry', 'Membrane & coating', 'Algorithm & calibration', 'PCBA & firmware', 'Clinical validation'];
  // The right stack carries one extra row, so both summaries sit below the
  // taller of the two rather than at a hard-coded y.
  const rowY = (i) => top + i * (bh + gap);
  const tallest = rowY(layers.length) + bh;      // right stack has 6 rows
  const sumY = tallest + 44;

  b.push(eyebrow(x1, 34, 'Build it yourself'));
  layers.forEach((l, i) => {
    b.push(R(x1, rowY(i), bw, bh, { fill: GREY, stroke: GREYL }));
    b.push(label(x1 + 20, rowY(i) + 30, l, { s: 14, w: 600, max: bw - 40 }));
  });
  b.push(label(x1, sumY, '5+ years', { s: 30, w: 700, f: WARN, max: 200 }));
  b.push(label(x1, sumY + 26, 'before a first sale', { s: 13.5, f: SOFT, max: 280 }));

  b.push(eyebrow(x2, 34, 'Build on the EverChek stack'));
  layers.forEach((l, i) => {
    b.push(R(x2, rowY(i), bw, bh, { fill: B100, stroke: B300 }));
    b.push(tick(x2 + 22, rowY(i) + 25, B600));
    b.push(label(x2 + 44, rowY(i) + 30, l, { s: 14, w: 600, f: B700, max: bw - 64 }));
  });
  b.push(R(x2, rowY(5), bw, bh, { fill: WHITE, stroke: B600, sw: 2, dash: '6 5' }));
  b.push(label(x2 + 22, rowY(5) + 30, 'Your brand, app and market', { s: 14, w: 700, f: B600, max: bw - 44 }));
  b.push(label(x2, sumY, 'Months', { s: 30, w: 700, f: B600, max: 200 }));
  b.push(label(x2, sumY + 26, 'you add only the top layer', { s: 13.5, f: SOFT, max: 300 }));
  b.push(arrowR(400, rowY(2) + 25, 100));
  files['oem-1-save-rd'] = svg('Build a CGM platform yourself, or build on a stack that already exists', b.join(''), sumY + 46);
}

/* ══ OEM 2 · Scale — one line, rising volume ══ */
{
  const b = [];
  b.push(eyebrow(56, 34, 'One qualified line, from pilot to commercial volume'));
  const steps = [['Pilot', 96], ['Validation batch', 150], ['Ramp-up', 214], ['Commercial volume', 286]];
  let x = 56;
  steps.forEach(([s, h], i) => {
    const y = 336 - h, last = i === 3;
    b.push(R(x, y, 176, h, { fill: last ? B600 : B100, stroke: last ? B700 : B300 }));
    b.push(label(x + 88, y + h / 2 + 5, s, { s: 13.5, w: 700, f: last ? WHITE : B700, a: 'middle', max: 152 }));
    if (i < 3) b.push(arrowR(x + 178, 300, 22));
    x += 206;
  });
  b.push(`<line x1="56" y1="348" x2="824" y2="348" stroke="${LINE}" stroke-width="2"/>`);
  ['Same line', 'Same process', 'Same tooling'].forEach((s, i) => {
    const cx = 56 + i * 210;
    b.push(tick(cx + 8, 384, B600));
    b.push(label(cx + 28, 389, s, { s: 14, w: 600, f: B700, max: 180 }));
  });
  files['oem-2-scale'] = svg('Volume scales on one qualified line; the product does not change', b.join(''));
}

/* ══ OEM 3 · Market entry — two timelines ══ */
{
  const b = [];
  b.push(eyebrow(56, 34, 'Time to a product on the market'));
  const rows = [
    ['Building it yourself', [['Hardware', 168, GREY], ['Software & clinical', 196, GREY], ['Dossier', 132, GREY], ['Launch', 96, GREYL]], MID, false],
    ['With EverChek OEM', [['Configure & brand', 150, B100], ['Dossier', 132, B100], ['Launch', 96, B600]], B700, true],
  ];
  rows.forEach(([name, segs, col, mine], r) => {
    const y = 76 + r * 160;
    b.push(label(56, y, name, { s: 15, w: 700, f: col, max: 300 }));
    let x = 56;
    segs.forEach(([s, w, c]) => {
      b.push(R(x, y + 18, w, 54, { fill: c, stroke: c === B600 ? B700 : (mine ? B300 : GREYL) }));
      b.push(label(x + w / 2, y + 50, s, { s: 12.5, w: 600, f: c === B600 ? WHITE : (mine ? B700 : MID), a: 'middle', max: w - 16 }));
      x += w + 7;
    });
    b.push(label(x + 12, y + 50, mine ? 'earlier' : 'baseline', { s: 13, w: 700, f: mine ? B600 : SOFT, max: 110 }));
  });
  b.push(eyebrow(56, 386, 'Already done before you start'));
  ['Production-ready hardware', 'Clinically tested software', 'Lines already running'].forEach((s, i) => {
    const x = 56 + i * 268;
    b.push(tick(x + 8, 414, B600));
    b.push(label(x + 28, 419, s, { s: 13.5, max: 236 }));
  });
  files['oem-3-market-entry'] = svg('Development timeline: building alone versus an OEM programme', b.join(''));
}

/* ══ OEM 4 · Regulatory — evidence in, submission out ══ */
{
  const b = [];
  b.push(eyebrow(56, 34, 'We supply the evidence · you hold the registration'));
  const docs = ['Technical file', 'Biocompatibility (ISO 10993)', 'Cytotoxicity data',
                'Electrical safety & EMC', 'Risk file (ISO 14971)', 'Stability & shelf life'];
  b.push(R(56, 56, 344, 306, { fill: B100, stroke: B300, sw: 2 }));
  b.push(label(80, 88, 'Arrives with the product', { s: 15, w: 700, f: B700, max: 296 }));
  docs.forEach((d, i) => {
    const y = 108 + i * 40;
    b.push(R(80, y, 296, 32, { fill: WHITE, stroke: B300 }));
    b.push(`<rect x="94" y="${y + 9}" width="11" height="14" rx="2" fill="${B100}" stroke="${B600}" stroke-width="1.3"/>`);
    b.push(label(116, y + 21, d, { s: 13, f: MID, w: 600, max: 248 }));
  });
  b.push(arrowR(414, 205, 56));
  b.push(R(486, 56, 338, 306));
  b.push(label(510, 88, 'Your submission', { s: 15, w: 700, f: INK, max: 290 }));
  ['Local regulator', 'Notified body', 'Tender authority'].forEach((a, i) => {
    const y = 118 + i * 62;
    b.push(R(510, y, 290, 44, { fill: '#F7F9FB', stroke: LINE }));
    b.push(label(532, y + 28, a, { s: 13.5, w: 600, f: B700, max: 220 }));
    b.push(`<path d="M778 ${y + 16} l-8 -6 v12 z" fill="${B600}"/>`);
  });
  b.push(label(510, 330, 'You lead it. We supply what it is built on.', { s: 13.5, f: SOFT, max: 300 }));
  files['oem-4-regulatory'] = svg('The regulatory evidence package supplied with an OEM programme', b.join(''));
}

/* ══ OEM 5 · Data ownership ══ */
{
  const b = [];
  b.push(eyebrow(56, 34, 'Where the patient data goes'));
  b.push(`<g transform="translate(120,140)"><circle r="34" fill="${B100}" stroke="${B600}" stroke-width="2.5"/><circle r="14" fill="${WHITE}" stroke="${B600}" stroke-width="2.5"/><path d="M0 14 v22" stroke="${B600}" stroke-width="2.5" stroke-linecap="round"/></g>`);
  b.push(label(120, 214, 'Sensor', { s: 14, w: 700, f: B700, a: 'middle', max: 160 }));
  b.push(arrowR(178, 140, 46));
  b.push(R(238, 104, 178, 74, { fill: WHITE, stroke: LINE, dash: '6 5' }));
  b.push(label(327, 136, 'EverChek API', { s: 14, w: 700, f: MID, a: 'middle', max: 152 }));
  b.push(label(327, 156, 'transport only', { s: 12.5, f: SOFT, a: 'middle', max: 152 }));
  b.push(arrowR(430, 140, 46));
  b.push(R(490, 88, 334, 106, { fill: B100, stroke: B600, sw: 2 }));
  b.push(label(516, 128, 'Your platform', { s: 17, w: 700, f: B700, max: 286 }));
  b.push(label(516, 156, 'Every reading, trend and analysis', { s: 13.5, f: B700, max: 286 }));
  b.push(`<line x1="56" y1="248" x2="824" y2="248" stroke="${LINE}" stroke-width="1.5" stroke-dasharray="5 5"/>`);
  b.push(eyebrow(56, 288, 'You keep'));
  ['Ownership of the data', 'The end-user relationship', 'Your own privacy policy'].forEach((s, i) => {
    b.push(tick(64, 314 + i * 32, OK));
    b.push(label(84, 319 + i * 32, s, { s: 13.5, max: 300 }));
  });
  b.push(eyebrow(486, 288, 'We never'));
  ['Hold your patient data', 'Contact your end users', 'Analyse or resell it'].forEach((s, i) => {
    b.push(xmark(494, 314 + i * 32));
    b.push(label(514, 319 + i * 32, s, { s: 13.5, max: 300 }));
  });
  files['oem-5-data'] = svg('Data passes through the API into the partner platform, never into EverChek', b.join(''));
}

/* ══ SKD 1 · Tenders ══ */
{
  const b = [];
  b.push(eyebrow(56, 34, 'A tender with a local-content rule'));
  b.push(R(56, 56, 366, 158, { fill: GREY, stroke: GREYL }));
  b.push(label(84, 90, 'Finished device, imported', { s: 15, w: 700, f: MID, max: 310 }));
  b.push(R(84, 108, 310, 44, { fill: WHITE, stroke: GREYL }));
  b.push(label(239, 136, 'built entirely abroad', { s: 13.5, f: SOFT, a: 'middle', max: 280 }));
  b.push(xmark(92, 182));
  b.push(label(112, 188, '0% local content — fails the rule', { s: 14, w: 600, f: WARN, max: 300 }));

  b.push(R(458, 56, 366, 158, { fill: B100, stroke: B300, sw: 2 }));
  b.push(label(486, 90, 'SKD kit, assembled in-country', { s: 15, w: 700, f: B700, max: 310 }));
  b.push(R(486, 108, 138, 44, { fill: WHITE, stroke: B300 }));
  b.push(label(555, 136, 'kit imported', { s: 13, f: B700, a: 'middle', max: 120 }));
  b.push(arrowR(632, 130, 26));
  b.push(R(666, 108, 130, 44, { fill: B600, stroke: B700 }));
  b.push(label(731, 136, 'assembled here', { s: 13, w: 600, f: WHITE, a: 'middle', max: 116 }));
  b.push(tick(494, 182, B600));
  b.push(label(514, 188, 'Counts as locally manufactured', { s: 14, w: 600, f: B700, max: 300 }));

  b.push(eyebrow(56, 264, 'What we supply for the bid'));
  ['Technical documentation', 'Bill of materials & origin', 'Assembly process & training', 'Long-term supply'].forEach((s, i) => {
    const x = 56 + i * 196;
    b.push(R(x, 284, 182, 84, { fill: WHITE, stroke: LINE }));
    b.push(tick(x + 24, 316, B600));
    b.push(label(x + 20, 344, s, { s: 13, w: 600, f: MID, max: 146, lh: 17 }));
  });
  files['skd-1-tenders'] = svg('Local SKD assembly meets a content rule that a finished import cannot', b.join(''));
}

/* ══ SKD 2 · Healthcare brands ══ */
{
  const b = [];
  b.push(eyebrow(56, 34, 'You have the market · the technology is the gap'));
  b.push(R(56, 56, 366, 150, { fill: B100, stroke: B300 }));
  b.push(label(84, 90, 'You already have', { s: 15, w: 700, f: B700, max: 300 }));
  ['Brand recognition', 'A distribution network', 'Clinical relationships'].forEach((s, i) => {
    b.push(tick(92, 116 + i * 30, B600));
    b.push(label(112, 121 + i * 30, s, { s: 13.5, f: B700, max: 290 }));
  });
  b.push(R(458, 56, 366, 150, { fill: GREY, stroke: GREYL }));
  b.push(label(486, 90, 'What stops you', { s: 15, w: 700, f: WARN, max: 300 }));
  ['Years of sensor chemistry', 'Calibration and MARD', 'Tooling and lines'].forEach((s, i) => {
    b.push(xmark(494, 116 + i * 30));
    b.push(label(514, 121 + i * 30, s, { s: 13.5, max: 290 }));
  });
  b.push(arrowD(440, 214, 30));
  b.push(eyebrow(56, 288, 'The SKD kit closes it'));
  const kit = ['Sensor + transmitter', 'Applicator', 'Adhesive patch', 'Your branding'];
  kit.forEach((s, i) => {
    const x = 56 + i * 196, last = i === 3;
    b.push(R(x, 306, 178, 74, { fill: last ? B600 : B100, stroke: last ? B700 : B300 }));
    b.push(label(x + 89, 350, s, { s: 13.5, w: 700, f: last ? WHITE : B700, a: 'middle', max: 154 }));
    if (i < 3) b.push(label(x + 186, 350, '+', { s: 19, f: SOFT, a: 'middle', max: 20 }));
  });
  files['skd-2-brands'] = svg('An SKD kit supplies the technology a healthcare brand does not have', b.join(''));
}

/* ══ SKD 3 · Medical manufacturers ══ */
{
  const b = [];
  b.push(eyebrow(56, 34, 'Your plant already qualifies'));
  ['Cleanroom', 'Assembly line', 'QA / QC lab', 'Packaging', 'Warehouse'].forEach((s, i) => {
    const x = 56 + i * 156;
    b.push(R(x, 54, 142, 68, { fill: B100, stroke: B300 }));
    b.push(label(x + 71, 94, s, { s: 13.5, w: 600, f: B700, a: 'middle', max: 122 }));
  });
  b.push(label(56, 152, 'Qualified, staffed, paid for — and not fully loaded.', { s: 14, f: SOFT, max: 700 }));
  b.push(arrowD(440, 176, 34));
  b.push(eyebrow(56, 244, 'Add CGM as a second line'));
  [['SKD kits arrive', 'no sensor R&D'], ['Assembly on your line', 'capacity you own'], ['Your brand', 'manufacturer margin']].forEach(([a, c], i) => {
    const x = 56 + i * 262;
    b.push(R(x, 262, 246, 110, { fill: WHITE, stroke: LINE }));
    b.push(`<circle cx="${x + 30}" cy="296" r="15" fill="${B600}"/>`);
    b.push(label(x + 30, 301, String(i + 1), { s: 13.5, w: 700, f: WHITE, a: 'middle', max: 24 }));
    b.push(label(x + 22, 338, a, { s: 14, w: 700, f: INK, max: 200 }));
    b.push(label(x + 22, 358, c, { s: 12.5, f: SOFT, max: 200 }));
  });
  files['skd-3-manufacturers'] = svg('Adding a CGM line to a plant that is already qualified', b.join(''));
}

/* ══ SKD 4 · Distributors ══ */
{
  const b = [];
  b.push(eyebrow(56, 34, 'Reselling versus owning the label'));
  const chain = (x0, items, mine) => {
    const out = [];
    let x = x0;
    items.forEach((s, i) => {
      const hi = mine && i === 1;
      out.push(R(x, 58, 104, 46, { fill: hi ? B600 : (mine ? B100 : GREY), stroke: hi ? B700 : (mine ? B300 : GREYL) }));
      out.push(label(x + 52, 86, s, { s: 12.5, w: 600, f: hi ? WHITE : (mine ? B700 : MID), a: 'middle', max: 92 }));
      if (i < items.length - 1) out.push(arrowR(x + 106, 81, 22, mine ? B600 : SOFT));
      x += 130;
    });
    return out.join('');
  };
  b.push(chain(56, ['Brand owner', 'You', 'Customer'], false));
  b.push(chain(458, ['SKD kits', 'Your brand', 'Customer'], true));
  b.push(`<line x1="440" y1="46" x2="440" y2="376" stroke="${LINE}" stroke-width="1.5" stroke-dasharray="5 5"/>`);
  const rows = [['Product', 'a third-party label', 'your own label'],
                ['Margin', 'reseller spread', 'manufacturer margin'],
                ['Registration', 'held by the brand', 'held by you'],
                ['Competition', 'many sellers, one product', 'only you sell it']];
  b.push(eyebrow(56, 148, 'What changes'));
  rows.forEach(([k, from, to], i) => {
    const y = 178 + i * 50;
    b.push(label(56, y + 18, k, { s: 13.5, w: 700, f: INK, max: 120 }));
    b.push(R(184, y, 232, 34, { fill: GREY, stroke: GREYL, r: 8 }));
    b.push(label(300, y + 22, from, { s: 12.5, f: MID, a: 'middle', max: 212 }));
    b.push(arrowR(424, y + 17, 26, SOFT));
    b.push(R(470, y, 250, 34, { fill: B100, stroke: B300, r: 8 }));
    b.push(label(595, y + 22, to, { s: 12.5, w: 600, f: B700, a: 'middle', max: 230 }));
  });
  files['skd-4-distributors'] = svg('Moving from reselling a third-party brand to owning your own label', b.join(''));
}

let total = 0;
for (const [name, content] of Object.entries(files)) {
  writeFileSync(`${OUT}/${name}.svg`, content);
  total += Buffer.byteLength(content);
  console.log(`  ${(Buffer.byteLength(content) / 1024).toFixed(1).padStart(5)} KB  ${name}.svg`);
}
console.log(`\n${Object.keys(files).length} diagrams · ${(total / 1024).toFixed(1)} KB`);

if (problems.length) {
  console.error(`\n${problems.length} label(s) do not fit:`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('every label measured and fits');
