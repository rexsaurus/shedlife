// Original procedural 16-bit portraits (32×32, limited palette) with idle bob, blinking and talking.
// No third-party art; every face is generated from the NPC id, so it never depicts a real person.
import { rng } from './officials.js';

const SKIN = [ // light, base, shade
  ['#ffe2c6', '#f6c9a0', '#d9a37a'], ['#f3cfa8', '#e3b183', '#c08a5e'], ['#e0b28a', '#c98f62', '#a46c45'],
  ['#c99168', '#a8714a', '#7f5235'], ['#9c6b4a', '#7d5236', '#5c3a25'], ['#6f4a33', '#573826', '#3d2619'],
];
const HAIR = ['#2b1d14', '#4a2f1d', '#7a4b26', '#b5793a', '#d9b26a', '#8f8f8f', '#d8d8d8', '#1d1d24', '#6b2a1f', '#3b2a4a'];
const CLOTH = ['#2f3e5c', '#3d5a4a', '#6b2f3a', '#4a4a52', '#7a5c2e', '#2e5c7a', '#5b3a6b', '#8b6f4e', '#1f2a24', '#9a3b3b'];
const SHIRT = ['#f2efe6', '#dfe7ef', '#f3e6d0', '#e6d6e6'];
const STYLES = ['short', 'short', 'long', 'bob', 'bun', 'curly', 'bald', 'buzz', 'side'];

export function portraitSpec(id, bg = '#3a6f73') {
  const r = rng('face:' + id), pick = a => a[Math.floor(r() * a.length)];
  return { bg, skin: pick(SKIN), hair: pick(HAIR), style: pick(STYLES), cloth: pick(CLOTH), shirt: pick(SHIRT), tie: r() < 0.45 ? pick(CLOTH) : null,
    glasses: r() < 0.35, beard: r() < 0.22, mustache: r() < 0.15, earrings: r() < 0.25, brows: r() < 0.5 ? 1 : 0, phase: r() * 6 };
}

const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, Math.round(c * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

function draw(ctx, s, { blink, mouth, bob }) {
  const P = (x, y, c, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  // backdrop: chamber wall with panel lines and a seal disc
  P(0, 0, s.bg, 32, 32);
  for (let x = 0; x < 32; x += 8) P(x, 0, shade(s.bg, 0.85), 1, 26);
  P(0, 26, shade(s.bg, 0.7), 32, 6);
  P(24, 3, shade(s.bg, 1.25), 5, 5); P(25, 4, shade(s.bg, 1.45), 3, 3);
  const o = bob ? 1 : 0, cx = 15.5, cy = 12 + o, rx = 7, ry = 8.5;
  const inHead = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  const [skL, sk, skD] = s.skin, hair = s.hair, hairD = shade(hair, 0.7), out = '#1a1410';
  // long hair behind the head
  if (s.style === 'long') for (let y = 6 + o; y < 25; y++) for (let x = 7; x < 25; x++) if (!inHead(x, y) && (x < 10 || x > 21) && y < 24) P(x, y, y > 20 ? hairD : hair);
  // shoulders + clothes
  for (let y = 22; y < 32; y++) for (let x = 4; x < 28; x++) {
    const edge = y === 22 ? (x < 8 || x > 23) : y === 23 ? (x < 6 || x > 25) : false;
    if (!edge) P(x, y + (y === 22 || y === 23 ? o : 0), x < 9 || x > 22 ? shade(s.cloth, 0.8) : s.cloth);
  }
  for (let y = 22; y < 28; y++) { const w = Math.max(0, 3 - (y - 22) / 2); P(Math.round(15.5 - w), y + (y < 24 ? o : 0), s.shirt, Math.round(w * 2) + 1, 1); }
  if (s.tie) { P(15, 23 + o, s.tie, 2, 1); P(15, 24, shade(s.tie, 0.85), 2, 4); P(15, 28, s.tie, 2, 1); }
  else { P(13, 22 + o, shade(s.cloth, 0.6)); P(18, 22 + o, shade(s.cloth, 0.6)); }
  // neck
  P(13, 19 + o, skD, 6, 3);
  // ears
  P(8, 11 + o, sk, 1, 3); P(23, 11 + o, skD, 1, 3);
  if (s.earrings) { P(8, 14 + o, '#e7c24a'); P(23, 14 + o, '#e7c24a'); }
  // head with outline and side shading
  for (let y = 2; y < 22; y++) for (let x = 6; x < 26; x++) {
    if (!inHead(x, y)) { if (inHead(x - 1, y) || inHead(x + 1, y) || inHead(x, y - 1) || inHead(x, y + 1)) P(x, y, out); continue; }
    P(x, y, x > cx + 3.5 ? skD : x < cx - 4 ? skL : sk);
  }
  // hair on top
  const top = (x, y) => inHead(x, y) && y < 7 + o + (x < 10 || x > 21 ? 3 : 0);
  if (s.style !== 'bald') for (let y = 2; y < 22; y++) for (let x = 6; x < 26; x++) {
    const sideBob = s.style === 'bob' && inHead(x, y) && (x < 9 || x > 22) && y < 18 + o;
    const sideLong = s.style === 'long' && inHead(x, y) && (x < 9 || x > 22);
    const buzz = s.style === 'buzz' && inHead(x, y) && y < 5 + o;
    const side = s.style === 'side' && inHead(x, y) && (y < 6 + o || (x < 13 && y < 8 + o));
    const regular = ['short', 'bun', 'curly', 'long', 'bob'].includes(s.style) && top(x, y);
    if (buzz || side || regular || sideBob || sideLong) P(x, y, (x + y) % 5 === 0 ? hairD : hair);
  }
  if (s.style === 'curly') for (let x = 7; x < 25; x += 2) P(x, (x % 4 ? 2 : 3) + o, hair, 2, 1);
  if (s.style === 'bun') { P(13, 0 + o, hair, 6, 3); P(14, 0 + o, hairD, 2, 1); }
  if (s.style === 'bald') { P(7, 10 + o, hair, 2, 3); P(23, 10 + o, hair, 2, 3); }
  // brows + eyes
  P(11, 9 + o - s.brows, hairD, 3, 1); P(18, 9 + o - s.brows, hairD, 3, 1);
  if (blink) { P(11, 12 + o, skD, 3, 1); P(18, 12 + o, skD, 3, 1); }
  else { P(11, 11 + o, '#ffffff', 3, 2); P(18, 11 + o, '#ffffff', 3, 2); P(12, 11 + o, '#1d1d24', 2, 2); P(19, 11 + o, '#1d1d24', 2, 2); P(12, 11 + o, '#ffffff'); P(19, 11 + o, '#ffffff'); }
  if (s.glasses) { const g = '#2a2a30'; for (const ex of [10, 17]) { P(ex, 10 + o, g, 5, 1); P(ex, 13 + o, g, 5, 1); P(ex, 10 + o, g, 1, 4); P(ex + 4, 10 + o, g, 1, 4); } P(15, 11 + o, g, 2, 1); }
  // nose
  P(16, 13 + o, skD, 1, 2); P(15, 15 + o, skD, 2, 1);
  // beard / mustache
  if (s.beard) for (let y = 15; y < 22; y++) for (let x = 7; x < 25; x++) if (inHead(x, y) && y > 15 + o && (y > 18 + o || x < 11 || x > 20)) P(x, y, (x * y) % 7 ? hair : hairD);
  if (s.mustache || s.beard) P(13, 16 + o, hairD, 6, 1);
  // mouth
  if (mouth === 2) { P(14, 17 + o, '#5a1f24', 4, 2); P(15, 18 + o, '#c4525a', 2, 1); }
  else if (mouth === 1) { P(14, 17 + o, '#5a1f24', 4, 1); P(15, 18 + o, '#5a1f24', 2, 1); }
  else { P(14, 18 + o, '#8a3a3a', 4, 1); P(13, 17 + o, '#8a3a3a'); P(18, 17 + o, '#8a3a3a'); }
}

// One animation loop for every portrait on the page.
const live = new Set();
export function mountPortrait(canvas, spec) {
  canvas.width = 32; canvas.height = 32;
  const p = { canvas, ctx: canvas.getContext('2d'), spec, talkUntil: 0, nextBlink: performance.now() + 800 + spec.phase * 500, blinkUntil: 0 };
  live.add(p); tick(performance.now(), p); return p;
}
export function talk(p, ms) { if (p) p.talkUntil = performance.now() + Math.min(ms, 6000); }
function tick(now, p) {
  if (now > p.nextBlink) { p.blinkUntil = now + 130; p.nextBlink = now + 2200 + Math.random() * 2600; }
  const talking = now < p.talkUntil;
  const mouth = talking ? [0, 1, 2, 1][Math.floor(now / 110) % 4] : 0;
  draw(p.ctx, p.spec, { blink: now < p.blinkUntil, mouth, bob: Math.floor(now / 700 + p.spec.phase) % 2 === 0 });
}
function loop(now) { for (const p of live) { if (!p.canvas.isConnected) live.delete(p); else tick(now, p); } requestAnimationFrame(loop); }
if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(loop);
