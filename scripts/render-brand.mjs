/**
 * Renders the app icon, Android adaptive icon layers, splash image and favicon from the brand
 * mascot `assets/brand/owl.svg` (run `npm run brand:render` after changing it).
 *
 * Output (paths referenced by app.json):
 *   assets/brand/icon.svg                       composed full icon (for store/marketing use)
 *   assets/images/icon.png                      1024² opaque (iOS + store icon; iOS adds the mask)
 *   assets/images/android-icon-background.png   1024² adaptive background (brand gradient)
 *   assets/images/android-icon-foreground.png   1024² adaptive foreground (owl inside the safe zone)
 *   assets/images/android-icon-monochrome.png   1024² themed-icon silhouette (alpha only)
 *   assets/images/splash-icon.png               1024² transparent owl (splash, see app.json)
 *   assets/images/favicon.png                   48² rounded icon (web)
 *   assets/images/store/play-feature-graphic.png  1024×500 Google Play feature graphic
 *
 * Uses @resvg/resvg-js (devDependency, prebuilt binaries; nothing ships in the app).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Comments are stripped first: they may mention the ids looked up below.
const source = readFileSync(join(root, 'assets/brand/owl.svg'), 'utf8').replace(
  /<!--[\s\S]*?-->/g,
  '',
);

/** Inner markup of the element with the given id (a `<g>` or `<defs>` block, not nested). */
function inner(tag, id) {
  const open = id ? new RegExp(`<${tag}[^>]*id="${id}"[^>]*>`) : new RegExp(`<${tag}[^>]*>`);
  const start = source.search(open);
  if (start < 0) throw new Error(`<${tag} ${id ?? ''}> not found in owl.svg`);
  const bodyStart = source.indexOf('>', start) + 1;
  // Count nested tags of the same name to find the matching close tag.
  let depth = 1;
  let i = bodyStart;
  const re = new RegExp(`<(/?)${tag}[\\s>]`, 'g');
  re.lastIndex = bodyStart;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) {
      i = m.index;
      break;
    }
  }
  return source.slice(bodyStart, i);
}

const owl = inner('g', 'owl');
const silhouette = inner('g', 'owl-silhouette');
const defs = inner('defs');

/** The owl's visual centre in owl.svg (ear tips to feet). */
const OWL_CENTER = { x: 512, y: 523 };

const BRAND = {
  blueTop: '#3B8BF5',
  blueBottom: '#1D6FD8',
  splashLight: '#1D6FD8',
  splashDark: '#10233F',
};

const gradient = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${BRAND.blueTop}"/><stop offset="1" stop-color="${BRAND.blueBottom}"/>
</linearGradient>`;

/** Places `content` (owl coordinates) scaled around the canvas centre of a `size` square. */
function placed(content, scale, size = 1024) {
  const c = size / 2;
  const s = (scale * size) / 1024;
  return `<g transform="translate(${c} ${c}) scale(${s}) translate(${-OWL_CENTER.x} ${-OWL_CENTER.y})">${content}</g>`;
}

function svg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`;
}

function render(file, markup, width) {
  const png = new Resvg(markup, { fitTo: { mode: 'width', value: width } }).render().asPng();
  const out = join(root, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  console.log(`${file} (${width}px, ${png.length} bytes)`);
}

const icon = svg(
  1024,
  1024,
  `<defs>${gradient}${defs}</defs><rect width="1024" height="1024" fill="url(#bg)"/>${placed(owl, 0.8)}`,
);
writeFileSync(join(root, 'assets/brand/icon.svg'), `${icon}\n`);
render('assets/images/icon.png', icon, 1024);

render(
  'assets/images/android-icon-background.png',
  svg(1024, 1024, `<defs>${gradient}</defs><rect width="1024" height="1024" fill="url(#bg)"/>`),
  1024,
);
// Adaptive icons show the centre 72/108 and may mask to a 66/108 circle: keep the owl inside.
render('assets/images/android-icon-foreground.png', svg(1024, 1024, placed(owl, 0.66)), 1024);
render(
  'assets/images/android-icon-monochrome.png',
  svg(1024, 1024, `<defs>${defs}</defs>${placed(silhouette, 0.66)}`),
  1024,
);
render('assets/images/splash-icon.png', svg(1024, 1024, placed(owl, 0.96)), 1024);

const radius = 1024 * 0.22;
render(
  'assets/images/favicon.png',
  svg(
    1024,
    1024,
    `<defs>${gradient}${defs}</defs><rect width="1024" height="1024" rx="${radius}" fill="url(#bg)"/>${placed(owl, 0.86)}`,
  ),
  48,
);

// Google Play feature graphic (1024×500): owl on the brand gradient, no text (localized text
// belongs in the listing; Play overlays nothing on it).
render(
  'assets/images/store/play-feature-graphic.png',
  svg(
    1024,
    500,
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BRAND.blueTop}"/><stop offset="1" stop-color="${BRAND.blueBottom}"/></linearGradient>${defs}</defs>` +
      `<rect width="1024" height="500" fill="url(#bg)"/>` +
      `<circle cx="512" cy="250" r="210" fill="#FFFFFF" fill-opacity="0.12"/>` +
      `<g transform="translate(512 256) scale(0.6) translate(${-OWL_CENTER.x} ${-OWL_CENTER.y})">${owl}</g>`,
  ),
  1024,
);

console.log(`Splash background: light ${BRAND.splashLight}, dark ${BRAND.splashDark} (app.json).`);
