/**
 * Scenes for the categories added 2026-10-23 (backend categories.php, after
 * vocabulary-spelling). Same rules as scenes.mjs: 256² viewBox, transparent, a Clan character
 * with a foreground prop hiding the bottom edge of the bust, no ids / url(#...).
 */
import {
  blob,
  C,
  character,
  circle,
  d,
  darken,
  ellipse,
  glyph,
  INK,
  lighten,
  line,
  path,
  paw,
  rrect,
  shadow,
  soft,
  sparkle,
  streaks,
  word,
} from './props.mjs';

const r1 = (n) => Math.round(n * 10) / 10;
/** Closed polygon path through [x, y] points. */
const poly = (pts) => 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L') + ' Z';
/** Regular polygon / star points around (x, y); `inner` > 0 alternates radii (star). */
function ring(x, y, r, n, startDeg, inner = 0) {
  const pts = [];
  const count = inner ? n * 2 : n;
  for (let i = 0; i < count; i++) {
    const a = ((startDeg + (i * 360) / count) * Math.PI) / 180;
    const rr = inner && i % 2 ? inner : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// small props
// ---------------------------------------------------------------------------

/** Cog wheel with `n` teeth, outer radius r, and a hub. */
function gear(x, y, r, n, fill, rotate = 0) {
  const pts = [];
  for (let i = 0; i < n * 4; i++) {
    const a = ((i / (n * 4)) * 360 + rotate) * (Math.PI / 180);
    const rr = i % 4 < 2 ? r : r * 0.78;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return (
    soft(poly(pts), darken(fill, 0.14), r * 0.12) +
    circle(x - r * 0.04, y - r * 0.05, r * 0.66, fill) +
    circle(x, y, r * 0.3, darken(fill, 0.22)) +
    circle(x, y, r * 0.14, lighten(fill, 0.5))
  );
}

/** Glowing light bulb, glass centred at (x, y); `inner` is drawn on the glass. */
function bulb(x, y, r, inner = '') {
  return (
    circle(x, y, r * 1.7, C.yellow, { opacity: 0.18 }) +
    circle(x, y, r * 1.3, C.yellow, { opacity: 0.22 }) +
    soft(
      d`M${x - r * 0.48} ${y + r * 0.8} Q${x - r} ${y + r * 0.4} ${x - r} ${y - r * 0.05} Q${x - r} ${y - r} ${x} ${y - r} Q${x + r} ${y - r} ${x + r} ${y - r * 0.05} Q${x + r} ${y + r * 0.4} ${x + r * 0.48} ${y + r * 0.8} Z`,
      '#FFE27A',
      r * 0.12,
    ) +
    ellipse(x - r * 0.48, y - r * 0.4, r * 0.16, r * 0.28, '#FFFFFF', {
      opacity: 0.75,
      transform: `rotate(35 ${r1(x - r * 0.48)} ${r1(y - r * 0.4)})`,
    }) +
    soft(rrect(x - r * 0.48, y + r * 0.86, r * 0.96, r * 0.5, r * 0.12), '#9AA8C2', r * 0.08) +
    line(
      d`M${x - r * 0.44} ${y + r * 1.04} H${x + r * 0.44} M${x - r * 0.44} ${y + r * 1.2} H${x + r * 0.44}`,
      '#6F7F9E',
      r * 0.07,
    ) +
    soft(
      d`M${x - r * 0.3} ${y + r * 1.38} H${x + r * 0.3} L${x + r * 0.16} ${y + r * 1.56} H${x - r * 0.16} Z`,
      '#5A6B8C',
      r * 0.08,
    ) +
    inner
  );
}

const noteHead = (x, y, s, fill) =>
  ellipse(x, y, 7 * s, 5.4 * s, fill, { transform: `rotate(-22 ${r1(x)} ${r1(y)})` });

/** Eighth note with its head at (x, y). */
function note(x, y, s, fill) {
  return (
    noteHead(x, y, s, fill) +
    line(d`M${x + 6 * s} ${y - 2 * s} V${y - 30 * s}`, fill, 3.6 * s) +
    line(
      d`M${x + 6 * s} ${y - 30 * s} Q${x + 18 * s} ${y - 24 * s} ${x + 15 * s} ${y - 12 * s}`,
      fill,
      3.6 * s,
    )
  );
}

/** Two beamed notes, heads at (x, y) and (x + 24s, y - 6s). */
function notes2(x, y, s, fill) {
  return (
    noteHead(x, y, s, fill) +
    noteHead(x + 24 * s, y - 6 * s, s, fill) +
    line(
      d`M${x + 6 * s} ${y - 2 * s} V${y - 30 * s} M${x + 30 * s} ${y - 8 * s} V${y - 36 * s}`,
      fill,
      3.6 * s,
    ) +
    line(d`M${x + 6 * s} ${y - 30 * s} L${x + 30 * s} ${y - 36 * s}`, fill, 7 * s)
  );
}

/** Puffy cloud centred at (x, y), `w` wide. */
function cloud(x, y, w, fill = '#FFFFFF') {
  const k = w / 100;
  return (
    ellipse(x + 2 * k, y + 15 * k, 46 * k, 14 * k, '#C9D6EA') +
    circle(x - 26 * k, y + 4 * k, 20 * k, fill) +
    circle(x + 2 * k, y - 8 * k, 28 * k, fill) +
    circle(x + 30 * k, y + 4 * k, 18 * k, fill) +
    ellipse(x + 2 * k, y + 10 * k, 46 * k, 14 * k, fill)
  );
}

/** Sun with short rays. */
function sun(x, y, r) {
  let s = circle(x, y, r * 1.7, C.yellow, { opacity: 0.18 });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    s += line(
      d`M${x + Math.cos(a) * r * 1.3} ${y + Math.sin(a) * r * 1.3} L${x + Math.cos(a) * r * 1.65} ${y + Math.sin(a) * r * 1.65}`,
      '#FFB020',
      r * 0.22,
    );
  }
  return s + blob(x, y, r, r, C.yellow, '#F2A81E');
}

/** Speech bubble with a word; the tail points to (tx, ty). */
function bubble(x, y, w, h, text, fill, ink, tx, ty) {
  const cx = x + w / 2;
  return (
    soft(d`M${cx - 12} ${y + h - 6} L${tx} ${ty} L${cx + 12} ${y + h - 6} Z`, fill, 6) +
    soft(rrect(x, y + 3, w, h, h / 2), darken(fill, 0.14), 4) +
    soft(rrect(x, y, w, h, h / 2), fill, 4) +
    word(text, cx, y + h / 2, h * 0.42, ink)
  );
}

// ---------------------------------------------------------------------------
// logic-riddles: raccoon detective with a magnifying glass and a ? light bulb
// ---------------------------------------------------------------------------
function logicRiddles() {
  const r = character('raccoon', 'kid', 152, 112, 0.6);
  const h = r.head;
  let s = '';
  // the bright idea: a bulb with a question mark
  s += bulb(52, 56, 30, glyph('?', 52, 52, 30, INK, 5.5));
  s += sparkle(100, 26, 7, C.yellow) + sparkle(16, 116, 5, C.yellow);
  s += r.svg;
  // detective cap (deerstalker)
  const hy = h.y - h.ry * 0.52;
  s += soft(
    d`M${h.x - h.rx * 0.74} ${hy + 4} Q${h.x - h.rx * 0.7} ${hy - h.ry * 0.78} ${h.x} ${hy - h.ry * 0.8} Q${h.x + h.rx * 0.7} ${hy - h.ry * 0.78} ${h.x + h.rx * 0.74} ${hy + 4} Z`,
    '#C9935A',
    6,
  );
  s += line(
    d`M${h.x - h.rx * 0.36} ${hy - h.ry * 0.7} Q${h.x - h.rx * 0.44} ${hy - 10} ${h.x - h.rx * 0.46} ${hy + 3} M${h.x + h.rx * 0.36} ${hy - h.ry * 0.7} Q${h.x + h.rx * 0.44} ${hy - 10} ${h.x + h.rx * 0.46} ${hy + 3} M${h.x - h.rx * 0.7} ${hy - 12} Q${h.x} ${hy - 22} ${h.x + h.rx * 0.7} ${hy - 12}`,
    '#A8723E',
    3,
  );
  s += soft(
    d`M${h.x - h.rx * 0.62} ${hy + 2} Q${h.x} ${hy + 15} ${h.x + h.rx * 0.62} ${hy + 2} Q${h.x} ${hy - 4} ${h.x - h.rx * 0.62} ${hy + 2} Z`,
    '#8A5A2E',
    5,
  );
  s += circle(h.x, hy - h.ry * 0.8, 5, '#8A5A2E');
  // desk with a case file
  s += soft(rrect(14, 200, 228, 56, 14), '#5A6B8C', 6);
  s += soft(rrect(14, 200, 228, 12, 6), lighten('#5A6B8C', 0.25), 4);
  s += soft(d`M150 216 L232 210 L236 250 L154 254 Z`, C.paper, 4);
  s += line(d`M164 226 L218 222 M166 236 L206 233`, '#D8BF8E', 4);
  // magnifying glass held up
  const gx = 90;
  const gy = 160;
  s += line(d`M${gx + 24} ${gy + 26} L${gx + 52} ${gy + 60}`, '#8A5A2E', 13);
  s += circle(gx, gy, 39, '#3E4A66');
  s += circle(gx, gy, 31, '#D8EEFF');
  // a big paw print seen through the lens
  s += ellipse(gx + 2, gy + 9, 11, 9, C.purple);
  s += circle(gx - 11, gy - 5, 4.8, C.purple) + circle(gx - 3, gy - 12, 4.8, C.purple);
  s += circle(gx + 8, gy - 12, 4.8, C.purple) + circle(gx + 15, gy - 4, 4.8, C.purple);
  s += line(d`M${gx - 22} ${gy - 6} Q${gx - 18} ${gy - 20} ${gx - 6} ${gy - 24}`, '#FFFFFF', 4.5, {
    opacity: 0.9,
  });
  s += paw(gx + 52, gy + 58, 13, r.fur);
  s += paw(226, 200, 13, r.fur);
  return s;
}

// ---------------------------------------------------------------------------
// language-swap: cat and frog saying "HELLO" / "BONJOUR"
// ---------------------------------------------------------------------------
function languageSwap() {
  const cat = character('cat', 'kid', 68, 150, 0.46);
  const frog = character('frog', 'kid', 188, 158, 0.46);
  let s = cat.svg + frog.svg;
  s += bubble(4, 12, 116, 40, 'HELLO', '#FFFFFF', C.blue, 58, 84);
  s += bubble(112, 54, 140, 40, 'BONJOUR', C.yellow, INK, 182, 104);
  // swap banner in front with two arrows
  s += shadow(128, 250, 116, 6);
  s += soft(rrect(8, 204, 240, 48, 20), C.purple, 6);
  s += soft(rrect(8, 204, 240, 12, 8), lighten(C.purple, 0.22), 4);
  s += line(d`M96 220 H160 M148 210 L160 220 L148 230`, '#FFFFFF', 6);
  s += line(d`M160 238 H96 M108 228 L96 238 L108 248`, C.yellow, 6);
  s += paw(44, 206, 12, cat.fur) + paw(210, 206, 12, frog.fur);
  return s;
}

// ---------------------------------------------------------------------------
// inventions-technology: otter inventor with gears, a light bulb and a robot
// ---------------------------------------------------------------------------
function inventions() {
  const o = character('otter', 'kid', 100, 112, 0.58);
  const h = o.head;
  let s = '';
  s += gear(206, 62, 36, 9, C.orange, 8);
  s += gear(236, 116, 22, 7, C.teal, 0);
  s += bulb(36, 44, 20);
  s += o.svg;
  // goggles on the forehead
  const gy = h.y - h.ry * 0.62;
  s += line(
    d`M${h.x - h.rx * 0.9} ${gy + 6} Q${h.x} ${gy - 8} ${h.x + h.rx * 0.9} ${gy + 6}`,
    '#5A4636',
    6,
  );
  for (const k of [-0.3, 0.3]) {
    s += circle(h.x + h.rx * k, gy - 2, 12, '#5A6B8C');
    s += circle(h.x + h.rx * k, gy - 2, 8.5, '#9FE3F5');
    s += circle(h.x + h.rx * k - 3, gy - 5, 2.6, '#FFFFFF');
  }
  // workbench
  s += soft(rrect(12, 202, 232, 54, 14), C.wood, 6);
  s += soft(rrect(12, 202, 232, 12, 6), lighten(C.wood, 0.25), 4);
  // robot on the bench
  const rx = 194;
  s += line(d`M${rx} 128 V114`, '#5A6B8C', 4) + circle(rx, 111, 6, C.red);
  s += line(d`M${rx - 24} 176 L${rx - 38} 160 M${rx + 24} 176 L${rx + 38} 160`, '#8C9CBE', 7);
  s += circle(rx - 40, 157, 6, '#B9C6DE') + circle(rx + 40, 157, 6, '#B9C6DE');
  s += soft(rrect(rx - 22, 166, 44, 36, 10), '#9AAACB', 5);
  s += circle(rx - 8, 182, 4, C.yellow) + circle(rx + 7, 182, 4, C.red);
  s += soft(rrect(rx - 28, 126, 56, 40, 12), '#B9C6DE', 5);
  s += soft(rrect(rx - 20, 134, 40, 24, 8), '#2E3A57', 3);
  s += circle(rx - 9, 144, 5, '#7CF0E4') + circle(rx + 9, 144, 5, '#7CF0E4');
  s += line(d`M${rx - 6} 151 q6 4 12 0`, '#7CF0E4', 2.4);
  // wrench in a paw
  s += line(d`M62 214 L108 174`, '#9AA8C2', 8);
  s += soft(d`M102 166 Q114 158 120 168 L112 172 L114 180 Q104 184 102 174 Z`, '#9AA8C2', 4);
  s += paw(66, 208, 13, o.fur) + paw(140, 206, 13, o.fur);
  s += sparkle(150, 36, 6, C.yellow);
  return s;
}

// ---------------------------------------------------------------------------
// our-planet: turtle hugging a smiling Earth, with sun and cloud
// ---------------------------------------------------------------------------
function ourPlanet() {
  const t = character('turtle', 'kid', 128, 98, 0.58);
  let s = '';
  s += sun(42, 48, 22);
  s += cloud(208, 54, 70);
  s += t.svg;
  // grassy hill
  s += soft(d`M2 256 Q12 192 128 184 Q244 192 254 256 Z`, '#6CC46A', 6);
  s += soft(d`M2 256 Q30 216 128 212 Q226 216 254 256 Z`, '#5DB45B', 4);
  for (const [x, y] of [
    [28, 238],
    [226, 238],
    [50, 214],
    [206, 214],
  ])
    s += line(d`M${x - 4} ${y} l4 -8 l4 8`, '#4FA04D', 3);
  // Earth
  const gx = 128;
  const gy = 194;
  const gr = 50;
  s += blob(gx, gy, gr, gr, C.blue, darken(C.blue, 0.2));
  s += path(
    d`M${gx - 40} ${gy - 20} Q${gx - 26} ${gy - 40} ${gx - 4} ${gy - 34} Q${gx + 4} ${gy - 20} ${gx - 10} ${gy - 12} Q${gx - 24} ${gy - 4} ${gx - 30} ${gy + 14} Q${gx - 46} ${gy + 2} ${gx - 40} ${gy - 20} Z`,
    C.leaf,
  );
  s += path(
    d`M${gx + 18} ${gy - 36} Q${gx + 40} ${gy - 30} ${gx + 46} ${gy - 8} Q${gx + 34} ${gy - 4} ${gx + 24} ${gy - 14} Q${gx + 12} ${gy - 22} ${gx + 18} ${gy - 36} Z`,
    C.leaf,
  );
  s += path(
    d`M${gx + 10} ${gy + 26} Q${gx + 30} ${gy + 18} ${gx + 38} ${gy + 30} Q${gx + 26} ${gy + 44} ${gx + 12} ${gy + 44} Q${gx + 4} ${gy + 34} ${gx + 10} ${gy + 26} Z`,
    C.leaf,
  );
  s += ellipse(gx - 22, gy - 32, 10, 6, '#FFFFFF', { opacity: 0.45 });
  // happy face
  s += circle(gx - 13, gy + 2, 5, INK) + circle(gx + 13, gy + 2, 5, INK);
  s += circle(gx - 11.5, gy, 1.7, '#FFFFFF') + circle(gx + 14.5, gy, 1.7, '#FFFFFF');
  s += line(d`M${gx - 8} ${gy + 13} Q${gx} ${gy + 20} ${gx + 8} ${gy + 13}`, INK, 3.4);
  s += ellipse(gx - 24, gy + 12, 6, 3.6, C.pink, { opacity: 0.75 });
  s += ellipse(gx + 24, gy + 12, 6, 3.6, C.pink, { opacity: 0.75 });
  // hugging arms
  s += line(d`M64 232 Q64 198 84 188`, t.fur, 18);
  s += line(d`M192 232 Q192 198 172 188`, t.fur, 18);
  s += paw(86, 186, 13, t.fur) + paw(170, 186, 13, t.fur);
  s += path(d`M204 124 q-7 -8 0 -13 q4 -2 7 2 q3 -4 7 -2 q7 5 0 13 l-7 6 Z`, C.red);
  return s;
}

// ---------------------------------------------------------------------------
// art-music: giraffe painter with a palette and floating music notes
// ---------------------------------------------------------------------------
function artMusic() {
  const g = character('giraffe', 'kid', 114, 120, 0.56);
  const h = g.head;
  let s = '';
  s += note(204, 86, 1.3, C.purple);
  s += notes2(186, 148, 1.05, C.pink);
  s += note(34, 96, 1.0, C.teal);
  s += g.svg;
  // beret
  s += soft(
    d`M${h.x - h.rx * 0.62} ${h.y - h.ry * 0.62} Q${h.x - h.rx * 0.5} ${h.y - h.ry * 1.06} ${h.x + h.rx * 0.14} ${h.y - h.ry * 1.02} Q${h.x + h.rx * 0.86} ${h.y - h.ry * 0.94} ${h.x + h.rx * 0.6} ${h.y - h.ry * 0.6} Q${h.x} ${h.y - h.ry * 0.74} ${h.x - h.rx * 0.62} ${h.y - h.ry * 0.62} Z`,
    C.red,
    6,
  );
  s += line(d`M${h.x + h.rx * 0.1} ${h.y - h.ry * 1.04} l3 -9`, darken(C.red, 0.2), 4);
  // palette
  s += shadow(100, 250, 90, 5);
  s += soft(
    d`M18 222 Q14 184 66 182 Q130 178 168 196 Q196 212 182 236 Q170 256 124 254 Q100 252 98 240 Q96 226 80 232 Q60 240 40 244 Q20 244 18 222 Z`,
    C.woodShade,
    8,
  );
  s += path(
    d`M24 218 Q22 190 66 188 Q128 184 164 200 Q186 214 174 232 Q162 248 126 247 Q106 246 104 236 Q100 220 80 226 Q60 234 42 236 Q26 236 24 218 Z`,
    C.wood,
  );
  s += ellipse(78, 210, 10, 7, darken(C.woodShade, 0.2));
  for (const [x, y, col] of [
    [46, 210, C.red],
    [62, 196, C.yellow],
    [110, 198, C.blue],
    [140, 208, C.leaf],
    [156, 228, C.pink],
    [128, 234, C.purple],
  ])
    s +=
      blob(x, y, 10, 8, col, darken(col, 0.15)) +
      circle(x - 3, y - 3, 2.4, '#FFFFFF', { opacity: 0.6 });
  // brush in the right paw
  s += line(d`M198 238 L234 162`, '#8A5A2E', 7);
  s += soft(d`M229 166 L238 150 L246 154 L239 170 Z`, '#9AA8C2', 3);
  s += soft(d`M238 150 Q240 132 250 124 Q254 138 246 154 Z`, C.red, 4);
  s += paw(214, 208, 13, g.fur);
  s += paw(30, 214, 13, g.fur);
  s += sparkle(236, 40, 6, C.yellow) + sparkle(160, 26, 5, C.sky);
  return s;
}

// ---------------------------------------------------------------------------
// food-world: bear chef with a basket of fruit
// ---------------------------------------------------------------------------
function foodWorld() {
  const b = character('bear', 'kid', 128, 116, 0.56);
  const h = b.head;
  let s = b.svg;
  // chef's toque
  const by = h.y - h.ry * 0.62;
  s += circle(h.x - 22, by - 30, 22, '#E8ECF5') + circle(h.x + 22, by - 30, 22, '#E8ECF5');
  s += circle(h.x, by - 42, 26, '#FFFFFF');
  s += circle(h.x - 20, by - 33, 18, '#FFFFFF') + circle(h.x + 20, by - 33, 18, '#FFFFFF');
  s += soft(
    d`M${h.x - 34} ${by - 26} L${h.x + 34} ${by - 26} L${h.x + 32} ${by + 4} Q${h.x} ${by + 10} ${h.x - 32} ${by + 4} Z`,
    '#FFFFFF',
    6,
  );
  s += line(d`M${h.x - 32} ${by - 2} Q${h.x} ${by + 4} ${h.x + 32} ${by - 2}`, '#D5DBE8', 3);
  s += line(d`M${h.x - 12} ${by - 22} V${by - 6} M${h.x + 12} ${by - 22} V${by - 6}`, '#E3E7F0', 3);
  // fruit on top of the basket
  s += soft(d`M52 196 Q62 148 116 156 Q96 168 86 196 Z`, '#FFD84A', 3);
  s += line(d`M58 192 Q70 158 112 158`, '#E8B520', 3);
  s += path(d`M114 154 l7 -3 l1 6 Z`, '#8A5A2E');
  for (const [x, y] of [
    [176, 174],
    [192, 174],
    [184, 161],
    [168, 161],
    [200, 161],
    [184, 186],
  ])
    s += circle(x, y, 8.5, C.purple) + circle(x - 2.5, y - 2.5, 2.6, '#B9A0F2');
  s += line(d`M184 153 V143`, '#5D8A3A', 3);
  s += soft(d`M185 145 Q197 135 205 143 Q195 151 185 145 Z`, C.leaf, 3);
  s += blob(104, 182, 22, 21, C.red, darken(C.red, 0.18));
  s += line(d`M104 162 Q104 156 108 152`, '#8A5A2E', 3.5);
  s += soft(d`M108 156 Q120 148 124 156 Q114 162 108 156 Z`, C.leaf, 3);
  s += circle(96, 174, 5, '#FFFFFF', { opacity: 0.45 });
  s += blob(146, 186, 20, 20, C.orange, darken(C.orange, 0.15)) + circle(146, 168, 2.6, '#5D8A3A');
  s += circle(139, 179, 4, '#FFFFFF', { opacity: 0.4 });
  s += blob(214, 186, 16, 18, '#9FD65A', darken('#9FD65A', 0.15));
  s += line(d`M214 168 V162`, '#8A5A2E', 3);
  // basket
  s += shadow(128, 250, 112, 6);
  s += soft(d`M28 196 H228 L210 252 H46 Z`, C.woodShade, 6);
  for (let i = 0; i < 3; i++) {
    const y = 210 + i * 14;
    s += line(d`M${34 + i * 6} ${y} H${222 - i * 6}`, darken(C.woodShade, 0.14), 4);
  }
  for (let x = 54; x <= 204; x += 25)
    s += line(d`M${x} 202 L${x + (128 - x) * 0.1} 248`, C.wood, 6);
  s += soft(rrect(20, 190, 216, 14, 7), C.wood, 4);
  s += paw(34, 192, 13, b.fur) + paw(222, 192, 13, b.fur);
  return s;
}

// ---------------------------------------------------------------------------
// sports-games: dog with a football and a chess king on the pitch
// ---------------------------------------------------------------------------
function sportsGames() {
  const dog = character('dog', 'kid', 120, 108, 0.58);
  const h = dog.head;
  let s = dog.svg;
  // sweatband
  const band = d`M${h.x - h.rx * 0.84} ${h.y - h.ry * 0.46} Q${h.x} ${h.y - h.ry * 0.86} ${h.x + h.rx * 0.84} ${h.y - h.ry * 0.46}`;
  s += line(band, C.red, 10) + line(band, '#FFFFFF', 2.4, { opacity: 0.8 });
  // pitch
  s += soft(rrect(6, 196, 244, 60, 16), C.green, 6);
  s += soft(rrect(6, 196, 244, 10, 6), lighten(C.green, 0.25), 4);
  s += line(d`M128 208 V256 M88 256 Q88 228 128 228 Q168 228 168 256`, '#FFFFFF', 3, {
    opacity: 0.7,
  });
  // chess king (right)
  const kx = 206;
  const ink = '#4A3F75';
  const lit = lighten(ink, 0.2);
  s += shadow(kx, 248, 34, 5);
  s += soft(
    d`M${kx - 30} 246 Q${kx - 30} 230 ${kx - 18} 228 H${kx + 18} Q${kx + 30} 230 ${kx + 30} 246 Z`,
    ink,
    5,
  );
  s += soft(
    d`M${kx - 14} 228 Q${kx - 8} 196 ${kx - 12} 172 H${kx + 12} Q${kx + 8} 196 ${kx + 14} 228 Z`,
    lit,
    5,
  );
  s += soft(rrect(kx - 20, 164, 40, 10, 5), ink, 4);
  s += soft(d`M${kx - 16} 164 Q${kx - 24} 140 ${kx} 136 Q${kx + 24} 140 ${kx + 16} 164 Z`, lit, 5);
  s += line(d`M${kx} 134 V112 M${kx - 9} 121 H${kx + 9}`, ink, 6.5);
  s += ellipse(kx - 7, 150, 3, 7, '#FFFFFF', { opacity: 0.35 });
  s += ellipse(kx - 5, 200, 2.6, 12, '#FFFFFF', { opacity: 0.3 });
  // football (left): white ball with dark patches
  const fx = 62;
  const fy = 208;
  s += shadow(fx, 250, 36, 5);
  s += blob(fx, fy, 40, 40, '#FFFFFF', '#D6DCE8');
  s += soft(poly(ring(fx, fy, 12, 5, -90)), INK, 3);
  for (let i = 0; i < 5; i++) {
    const deg = -54 + i * 72;
    const a = (deg * Math.PI) / 180;
    s += line(
      d`M${fx + Math.cos(a) * 11} ${fy + Math.sin(a) * 11} L${fx + Math.cos(a) * 24} ${fy + Math.sin(a) * 24}`,
      INK,
      2.4,
    );
    s += soft(poly(ring(fx + Math.cos(a) * 33, fy + Math.sin(a) * 33, 9, 5, deg)), INK, 3);
  }
  s += ellipse(fx - 16, fy - 24, 7, 3.6, '#FFFFFF', { opacity: 0.8 });
  s += paw(106, 196, 13, dog.fur) + paw(160, 198, 13, dog.fur);
  s += streaks(14, 160, 12, lighten(C.blue, 0.3), 10, 3, 4);
  return s;
}

// ---------------------------------------------------------------------------
// brain-games: fox and frog playing memory, flipping a matching star card
// ---------------------------------------------------------------------------
function brainGames() {
  const fox = character('fox', 'kid', 70, 112, 0.46);
  const frog = character('frog', 'kid', 188, 116, 0.46);
  let s = fox.svg + frog.svg;
  // table
  s += soft(rrect(6, 172, 244, 84, 16), '#5A6B8C', 6);
  s += soft(rrect(6, 172, 244, 12, 6), lighten('#5A6B8C', 0.25), 4);
  const card = (x, y, fill) => soft(rrect(x - 14, y - 18, 28, 36, 6), fill, 4);
  const back = (x, y) =>
    card(x, y, C.purple) +
    soft(rrect(x - 9, y - 13, 18, 26, 4), lighten(C.purple, 0.2), 2) +
    glyph('?', x, y - 1, 13, '#FFFFFF', 3);
  const star = (x, y, r) => soft(poly(ring(x, y, r, 5, -90, r * 0.48)), C.yellow, r * 0.22);
  const heart = (x, y) =>
    path(
      d`M${x} ${y + 8} Q${x - 12} ${y - 1} ${x - 8} ${y - 7} Q${x - 4} ${y - 11} ${x} ${y - 5} Q${x + 4} ${y - 11} ${x + 8} ${y - 7} Q${x + 12} ${y - 1} ${x} ${y + 8} Z`,
      C.red,
    );
  // 2 rows of 5 cards: one star and a heart pair already face up
  [48, 88, 128, 168, 208].forEach((x, i) => {
    s +=
      i === 1
        ? card(x, 200, '#FFFFFF') + star(x, 201, 11)
        : i === 3
          ? card(x, 200, '#FFFFFF') + heart(x, 201)
          : back(x, 200);
    s += i === 2 ? card(x, 240, '#FFFFFF') + heart(x, 241) : back(x, 240);
  });
  // the card being flipped up: the matching star
  s += `<g transform="rotate(-12 128 140)">${card(128, 140, '#FFFFFF')}${star(128, 141, 14)}</g>`;
  s += paw(108, 160, 12, fox.fur);
  s += paw(214, 178, 12, frog.fur);
  s += sparkle(160, 104, 9, C.yellow) + sparkle(98, 108, 6, C.yellow) + sparkle(130, 92, 5, C.sky);
  s += sparkle(24, 40, 6, C.sky) + sparkle(236, 44, 7, C.pink);
  return s;
}

// ---------------------------------------------------------------------------
// life-skills: penguin crossing guard with a helmet and a STOP sign
// ---------------------------------------------------------------------------
function lifeSkills() {
  const p = character('penguin', 'kid', 108, 110, 0.58);
  const h = p.head;
  let s = '';
  // sign post (behind the penguin's paw)
  s += line(d`M206 120 V236`, '#9AA8C2', 8);
  s += p.svg;
  // safety helmet
  const hy = h.y - h.ry * 0.42;
  s += soft(
    d`M${h.x - h.rx * 0.96} ${hy} Q${h.x - h.rx * 0.9} ${h.y - h.ry * 1.16} ${h.x} ${h.y - h.ry * 1.14} Q${h.x + h.rx * 0.9} ${h.y - h.ry * 1.16} ${h.x + h.rx * 0.96} ${hy} Z`,
    C.yellow,
    6,
  );
  s += soft(
    d`M${h.x - h.rx} ${hy} Q${h.x} ${hy - 10} ${h.x + h.rx} ${hy} L${h.x + h.rx} ${hy + 6} Q${h.x} ${hy - 4} ${h.x - h.rx} ${hy + 6} Z`,
    '#F0A818',
    4,
  );
  s += line(
    d`M${h.x - 16} ${h.y - h.ry * 1.04} Q${h.x - 18} ${hy - 20} ${h.x - 22} ${hy - 8} M${h.x} ${h.y - h.ry * 1.1} V${hy - 10} M${h.x + 16} ${h.y - h.ry * 1.04} Q${h.x + 18} ${hy - 20} ${h.x + 22} ${hy - 8}`,
    '#F0A818',
    4,
  );
  s += ellipse(h.x - h.rx * 0.5, h.y - h.ry * 0.86, 8, 4.5, '#FFFFFF', { opacity: 0.55 });
  // flipper raised to hold the sign
  s += line(d`M150 180 Q170 168 194 154`, p.fur, 18);
  // zebra crossing
  s += soft(rrect(4, 198, 248, 58, 12), '#4A5470', 6);
  for (let i = 0; i < 6; i++) {
    const x0 = 18 + i * 38;
    const k = (i - 2.5) * 3;
    s += path(d`M${x0} 208 H${x0 + 22} L${x0 + 26 + k} 250 H${x0 - 2 + k} Z`, '#FFFFFF', {
      opacity: 0.92,
    });
  }
  // STOP sign
  const sx = 206;
  const sy = 90;
  s += soft(poly(ring(sx, sy, 42, 8, 22.5)), '#FFFFFF', 6);
  s += soft(poly(ring(sx, sy, 36, 8, 22.5)), '#E8414F', 4);
  s += word('STOP', sx, sy, 17, '#FFFFFF', 3.4);
  s += paw(198, 150, 13, p.fur);
  s += circle(196, 146, 4, '#FFFFFF', { opacity: 0.25 });
  s += paw(56, 196, 13, p.fur);
  return s;
}

export const MORE_SCENES = {
  'logic-riddles': logicRiddles,
  'language-swap': languageSwap,
  'inventions-technology': inventions,
  'our-planet': ourPlanet,
  'art-music': artMusic,
  'food-world': foodWorld,
  'sports-games': sportsGames,
  'brain-games': brainGames,
  'life-skills': lifeSkills,
};
