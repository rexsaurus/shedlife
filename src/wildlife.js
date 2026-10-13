// Ambient life on the land view: deer graze, rabbits hop, squirrels dart between trees, coyotes trot (mostly at dusk/night),
// birds circle by day, clouds drift and cast shadows. Original low-poly meshes; purely decorative (no game effect).
import * as THREE from 'three';

const M = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const mats = { deer: M(0x8a5a36), deerLight: M(0xd8c3a5), rabbit: M(0x9c8f80), tail: M(0xf4f1ea), squirrel: M(0x7a4a2a), coyote: M(0x8f8476), coyoteDark: M(0x5f564c), bird: M(0x2b2b30), dark: M(0x1f1a17), cloud: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false }) };
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; return o; };

function deer() { const g = new THREE.Group();
  g.add(box(0.5, 0.55, 1.3, mats.deer, 0, 1.05, 0)); for (const [x, z] of [[-0.18, 0.5], [0.18, 0.5], [-0.18, -0.5], [0.18, -0.5]]) g.add(box(0.1, 0.8, 0.1, mats.deer, x, 0.4, z));
  const neck = box(0.22, 0.6, 0.22, mats.deer, 0, 1.45, 0.62); neck.rotation.x = -0.5; g.add(neck);
  g.add(box(0.26, 0.26, 0.45, mats.deer, 0, 1.75, 0.85)); g.add(box(0.2, 0.18, 0.1, mats.deerLight, 0, 1.05, -0.68));
  for (const s of [-1, 1]) { const a = box(0.04, 0.35, 0.04, mats.dark, s * 0.1, 2.0, 0.78); a.rotation.z = s * 0.4; g.add(a); }
  g.userData.head = g.children[6]; return g; }
function rabbit() { const g = new THREE.Group(); g.add(box(0.28, 0.24, 0.38, mats.rabbit, 0, 0.16, 0)); g.add(box(0.18, 0.18, 0.18, mats.rabbit, 0, 0.3, 0.22));
  for (const s of [-1, 1]) g.add(box(0.05, 0.22, 0.04, mats.rabbit, s * 0.05, 0.48, 0.2)); g.add(box(0.1, 0.1, 0.1, mats.tail, 0, 0.2, -0.22)); return g; }
function squirrel() { const g = new THREE.Group(); g.add(box(0.12, 0.12, 0.26, mats.squirrel, 0, 0.1, 0)); g.add(box(0.1, 0.1, 0.1, mats.squirrel, 0, 0.16, 0.16));
  const t = box(0.1, 0.32, 0.1, mats.squirrel, 0, 0.26, -0.16); t.rotation.x = -0.4; g.add(t); return g; }
function coyote() { const g = new THREE.Group(); g.add(box(0.36, 0.38, 1.0, mats.coyote, 0, 0.62, 0));
  for (const [x, z] of [[-0.12, 0.38], [0.12, 0.38], [-0.12, -0.38], [0.12, -0.38]]) g.add(box(0.08, 0.45, 0.08, mats.coyoteDark, x, 0.22, z));
  g.add(box(0.26, 0.26, 0.34, mats.coyote, 0, 0.82, 0.6)); g.add(box(0.12, 0.12, 0.2, mats.coyoteDark, 0, 0.76, 0.84));
  for (const s of [-1, 1]) g.add(box(0.06, 0.14, 0.04, mats.coyoteDark, s * 0.08, 1.0, 0.56));
  const t = box(0.1, 0.1, 0.5, mats.coyoteDark, 0, 0.55, -0.68); t.rotation.x = 0.5; g.add(t); return g; }
function bird() { const g = new THREE.Group(); g.add(box(0.12, 0.1, 0.36, mats.bird));
  const l = box(0.6, 0.03, 0.18, mats.bird, -0.32, 0, 0), r = box(0.6, 0.03, 0.18, mats.bird, 0.32, 0, 0); g.add(l, r); g.userData.wings = [l, r]; return g; }
function cloud() { const g = new THREE.Group(), n = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) { const s = 2.5 + Math.random() * 3.5, m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), mats.cloud); m.position.set((i - n / 2) * 3.2, Math.random() * 2.5, (Math.random() - 0.5) * 6); m.castShadow = true; g.add(m); }
  return g; }

export function createWildlife(world, { bounds, heightAt, trees = [] }) {
  const [x0, x1, z0, z1] = bounds, W = x1 - x0, D = z1 - z0, area = W * D;
  const rnd = (a, b) => a + Math.random() * (b - a), inside = (x, z) => [Math.min(Math.max(x, x0 + 2), x1 - 2), Math.min(Math.max(z, z0 + 2), z1 - 2)];
  const group = new THREE.Group(); world.add(group);
  const animals = [];
  const spawn = (kind, make, n, speed) => { for (let i = 0; i < n; i++) { const m = make(); const a = { kind, m, x: rnd(x0, x1), z: rnd(z0, z1), tx: 0, tz: 0, speed, pause: rnd(0, 4), phase: Math.random() * 10 }; a.tx = a.x; a.tz = a.z; group.add(m); animals.push(a); } };
  const k = Math.max(0.5, Math.min(2, area / 40000));
  spawn('deer', deer, Math.round(4 * k), 1.6); spawn('rabbit', rabbit, Math.round(7 * k), 2.6); spawn('coyote', coyote, Math.max(1, Math.round(2 * k)), 2.4);
  spawn('squirrel', squirrel, Math.round(8 * k), 3.2);
  const birds = []; for (let f = 0; f < 3; f++) { const cx = rnd(x0, x1), cz = rnd(z0, z1), r = rnd(15, 40), h = rnd(22, 40); for (let i = 0; i < 4; i++) { const b = bird(); group.add(b); birds.push({ b, cx, cz, r: r + i * 1.5, h: h + i * 0.6, w: rnd(0.15, 0.3) * (Math.random() < 0.5 ? -1 : 1), t: i * 0.35 + f }); } }
  const clouds = []; for (let i = 0; i < Math.round(4 * k); i++) { const c = cloud(); c.position.set(rnd(x0, x1), rnd(55, 75), rnd(z0, z1)); c.userData.v = rnd(1.2, 2.4); group.add(c); clouds.push(c); }

  function pickTarget(a) {
    if (a.kind === 'squirrel' && trees.length) { const t = trees[Math.floor(Math.random() * trees.length)]; [a.tx, a.tz] = [t.x + rnd(-1, 1), t.z + rnd(-1, 1)]; }
    else { const r = { deer: 25, rabbit: 8, coyote: 45 }[a.kind] || 10; [a.tx, a.tz] = inside(a.x + rnd(-r, r), a.z + rnd(-r, r)); }
    a.pause = { deer: rnd(2, 7), rabbit: rnd(0.5, 3), coyote: rnd(0.5, 2), squirrel: rnd(0.3, 2.5) }[a.kind];
  }
  return {
    group,
    update(dt, hour, simRate = 1) {
      dt = Math.min(dt, 0.1);
      const night = hour < 6 || hour > 19, dusk = (hour > 17 && hour < 21) || (hour > 4 && hour < 8);
      for (const a of animals) {
        const visible = a.kind === 'coyote' ? (night || dusk) : a.kind === 'squirrel' || a.kind === 'rabbit' ? !night || a.kind === 'rabbit' : true;
        a.m.visible = visible; if (!visible) continue;
        const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { a.pause -= dt; if (a.pause <= 0) pickTarget(a); if (a.kind === 'deer' && a.m.userData.head) a.m.rotation.x = Math.sin(performance.now() / 600 + a.phase) * 0.03; }
        else { const s = Math.min(d, a.speed * dt * (a.kind === 'coyote' && night ? 1.3 : 1)); a.x += dx / d * s; a.z += dz / d * s; a.m.rotation.y = Math.atan2(dx, dz); }
        const hop = a.kind === 'rabbit' && d >= 0.3 ? Math.abs(Math.sin(performance.now() / 120 + a.phase)) * 0.25 : 0;
        a.m.position.set(a.x, heightAt(a.x, a.z) + hop, a.z);
      }
      const t = performance.now() / 1000, day = hour > 6 && hour < 20;
      for (const B of birds) { B.b.visible = day; if (!day) continue; const ang = t * B.w + B.t; B.b.position.set(B.cx + Math.cos(ang) * B.r, B.h + Math.sin(t * 0.7 + B.t) * 1.5, B.cz + Math.sin(ang) * B.r); B.b.rotation.y = -ang + (B.w > 0 ? 0 : Math.PI); const f = Math.sin(t * 9 + B.t * 3) * 0.6; B.b.userData.wings[0].rotation.z = f; B.b.userData.wings[1].rotation.z = -f; }
      for (const c of clouds) { c.position.x += c.userData.v * dt * Math.min(simRate, 30); if (c.position.x > x1 + 40) { c.position.x = x0 - 40; c.position.z = rnd(z0, z1); } }
      mats.cloud.color.setHex(night ? 0x5a6478 : 0xffffff);
    },
  };
}
