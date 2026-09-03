// Converts every raster image under public/ to WebP, capped at a sane display
// width, and rewrites the references in content/ to point at the .webp file.
//
// Why: the site shipped 39 MB of images. One blog photo was a 7.1 MB
// 4032x3024 camera original displayed a few hundred pixels wide; the home page
// alone pulled 5.16 MB. On the mobile connections the MENA / LATAM / SEA buyers
// actually use, that is multiple seconds before the value proposition renders.
//
// Originals are kept on disk (nothing is deleted) so a bad conversion can be
// reverted by pointing the reference back at the original file.
//
// Run:  node scripts/optimise-images.mjs
//       node scripts/optimise-images.mjs --dry

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import sharp from 'sharp';

const PUBLIC_DIR = 'public';
const CONTENT_DIR = 'content';
const SRC_DIR = 'src';
const DRY = process.argv.includes('--dry');

// Nothing on this site is displayed wider than the 1180px container, so 1600px
// covers a 2x retina render of a full-bleed image with room to spare.
const MAX_WIDTH = 1600;
const QUALITY = 82;
// Below this there is nothing to gain and the WebP can come out larger.
const MIN_BYTES = 40 * 1024;

const walk = (dir) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
};

const isRaster = (f) => ['.png', '.jpg', '.jpeg'].includes(extname(f).toLowerCase());
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

const files = walk(PUBLIC_DIR).filter(isRaster);
let before = 0;
let after = 0;
let converted = 0;
const rewrites = new Map(); // "/images/a.png" -> "/images/a.webp"

for (const file of files) {
  const size = statSync(file).size;
  before += size;

  if (size < MIN_BYTES) {
    after += size;
    continue;
  }

  const webpPath = file.replace(/\.(png|jpe?g)$/i, '.webp');
  const meta = await sharp(file).metadata();
  const width = Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH);

  if (!DRY) {
    await sharp(file)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(webpPath);
  }

  const newSize = DRY ? size : statSync(webpPath).size;

  // A conversion that does not actually help is not worth the extra file.
  if (!DRY && newSize >= size) {
    after += size;
    continue;
  }

  after += newSize;
  converted++;
  const urlFrom = '/' + relative(PUBLIC_DIR, file).split('\\').join('/');
  const urlTo = '/' + relative(PUBLIC_DIR, webpPath).split('\\').join('/');
  rewrites.set(urlFrom, urlTo);

  console.log(
    `  ${meta.width}x${meta.height} ${kb(size).padStart(8)} -> ${width}px ${kb(newSize).padStart(8)}  ${urlFrom}`,
  );
}

// Point every reference at the new file.
let touched = 0;
for (const file of [...walk(CONTENT_DIR), ...walk(SRC_DIR)]) {
  if (!/\.(yaml|yml|astro|ts|js|mjs)$/.test(file)) continue;
  const raw = readFileSync(file, 'utf8');
  let out = raw;
  for (const [from, to] of rewrites) out = out.split(from).join(to);
  if (out !== raw) {
    if (!DRY) writeFileSync(file, out);
    touched++;
  }
}

console.log(
  `\n${DRY ? '[dry run] ' : ''}${converted} image(s) converted · ` +
    `${kb(before)} -> ${kb(after)} (${(100 - (after / before) * 100).toFixed(0)}% smaller) · ` +
    `${touched} file(s) had references rewritten`,
);
