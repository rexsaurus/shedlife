// Original low-poly meshes. Each catalog item has a `style` that reproduces the archetype of the real product
// (gambrel lofted barn, cabana, gable-dormer shed, tiny home on a trailer, park model, ranch modular, cedar post-and-beam,
// modern mono-pitch ADU…) at the product's real dimensions. Geometry is built here from scratch; no third-party assets.
import * as THREE from 'three';

const mats = new Map();
const lam = c => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c })); return mats.get(c); };
const GLASS = 0x9fc6dd, TRIM = 0xf2efe6, DARK = 0x2a2a2a, DECK = 0x9a7350, STONE = 0x8a8a84;

function kit(g) {
  const add = (geo, color, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, lam(color)); m.position.set(x, y, z); g.add(m); return m; };
  const box = (w, h, d, color, x, y, z) => add(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  // prism along z from a 2D profile in x-y
  const prism = (pts, depth, color, x = 0, y = 0, z = 0) => {
    const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath();
    return add(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), color, x, y, z - depth / 2);
  };
  const gable = (w, d, rise, color, y, o = 0.2) => prism([[-w / 2 - o, 0], [w / 2 + o, 0], [0, rise]], d + 2 * o, color, 0, y, 0);
  const gambrel = (w, d, rise, color, y, o = 0.12) => { const a = w / 2 + o; return prism([[-a, 0], [-a * 0.84, rise * 0.6], [-a * 0.36, rise], [a * 0.36, rise], [a * 0.84, rise * 0.6], [a, 0]], d + 2 * o, color, 0, y, 0); };
  const window = (x, y, z, ww, wh, face) => { // face: 'x+','x-','z+','z-'
    const t = 0.05, [fw, fd] = face[0] === 'x' ? [t, ww] : [ww, t], s = face[1] === '+' ? 1 : -1;
    box(fw + (face[0] === 'x' ? 0.02 : 0.12), wh + 0.12, fd + (face[0] === 'z' ? 0.02 : 0.12), TRIM, x + (face[0] === 'x' ? s * 0.01 : 0), y, z + (face[0] === 'z' ? s * 0.01 : 0));
    box(fw, wh, fd, GLASS, x + (face[0] === 'x' ? s * 0.03 : 0), y, z + (face[0] === 'z' ? s * 0.03 : 0));
  };
  return { add, box, prism, gable, gambrel, window };
}

export function makeStructure(item) {
  const g = new THREE.Group(); g.userData.item = item;
  const K = kit(g), { box, gable, gambrel, window, prism, add } = K;
  const { w, d } = item, color = item.color, roof = item.roof;
  const style = item.style || ({ septic: 'septic', well: 'well', power: 'power', rv: 'rv' }[item.kind]) || 'gable';
  switch (style) {
    case 'septic': {
      box(w, 0.08, d, 0x8a7a5a, 0, 0.04, 0);
      for (let i = -2; i <= 2; i++) box(w * 0.85, 0.1, 0.25, 0x5d4c35, 0, 0.1, i * d / 6);
      add(new THREE.CylinderGeometry(0.9, 0.9, 0.4, 10), 0x3f4a52, 0, 0.2, d / 2 - 1); break;
    }
    case 'well': {
      add(new THREE.CylinderGeometry(0.4, 0.45, 0.9, 10), color, 0, 0.45, 0);
      add(new THREE.ConeGeometry(0.75, 0.5, 4), 0x5b6d7a, 0, 1.15, 0).rotation.y = Math.PI / 4; break;
    }
    case 'power': {
      const p = box(w, 0.08, d, color, 0, 1.2, 0); p.rotation.x = -0.45;
      for (const z of [-d / 3, d / 3]) box(0.1, 1.2, 0.1, 0x888888, 0, 0.6, z); break;
    }
    case 'barn': { // lofted barn: low walls, tall gambrel roof, double doors with white X trim on the gable end
      const h = Math.min(2.0, 1.4 + w * 0.08); box(w, h, d, color, 0, h / 2, 0); gambrel(w, d, Math.max(1.2, w * 0.42), roof, h);
      const dw = Math.min(1.6, w * 0.55); box(dw, h * 0.9, 0.05, color, 0, h * 0.45, d / 2 + 0.03);
      for (const s of [-1, 1]) { const x = box(0.06, Math.hypot(dw / 2, h * 0.9), 0.06, TRIM, s * dw / 4, h * 0.45, d / 2 + 0.07); x.rotation.z = s * Math.atan2(dw / 2, h * 0.9); }
      box(dw + 0.1, 0.08, 0.07, TRIM, 0, h * 0.9, d / 2 + 0.07); box(0.06, h * 0.9, 0.07, TRIM, 0, h * 0.45, d / 2 + 0.07);
      if (d > 4) window(w / 2, h * 0.6, 0, 0.6, 0.5, 'x+'); break;
    }
    case 'cabana': { // enclosed rear room + covered front porch under one roof
      const h = 2.1, room = d * 0.68; box(w, h, room, color, 0, h / 2, -d / 2 + room / 2); gable(w, d, w * 0.32, roof, h);
      box(w, 0.12, d - room, DECK, 0, 0.06, d / 2 - (d - room) / 2);
      for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) box(0.12, h, 0.12, TRIM, x, h / 2, d / 2 - 0.1);
      box(0.9, 1.8, 0.05, TRIM, 0, 0.9, -d / 2 + room + 0.03); window(w / 3, 1.3, -d / 2 + room + 0.01, 0.6, 0.5, 'z+'); window(-w / 3, 1.3, -d / 2 + room + 0.01, 0.6, 0.5, 'z+'); break;
    }
    case 'dormer': { // gable shed with a dormer on one roof slope
      const h = 2.0, rise = w * 0.38; box(w, h, d, color, 0, h / 2, 0); gable(w, d, rise, roof, h);
      const dz = Math.min(1.6, d * 0.3); box(0.9, 0.8, dz, color, w * 0.18, h + rise * 0.45, 0);
      prism([[-0.55, 0], [0.55, 0], [0, 0.4]], dz + 0.2, roof, w * 0.18, h + rise * 0.45 + 0.4, 0);
      window(w * 0.18 + 0.46, h + rise * 0.45, 0, dz * 0.6, 0.4, 'x+');
      box(1.4, 1.8, 0.05, TRIM, 0, 0.9, d / 2 + 0.03); window(w / 2, 1.3, -d / 4, 0.6, 0.5, 'x+'); break;
    }
    case 'ranchshed': { // low wide gable, door on the long side, windows with shutters
      const h = 2.0; box(w, h, d, color, 0, h / 2, 0); gable(w, d, w * 0.22, roof, h);
      box(0.05, 1.8, 1.2, TRIM, w / 2 + 0.03, 0.9, 0);
      for (const z of [-d / 3, d / 3]) { window(w / 2, 1.3, z, 0.55, 0.55, 'x+'); for (const s of [-1, 1]) box(0.05, 0.6, 0.18, roof, w / 2 + 0.04, 1.3, z + s * 0.38); }
      break;
    }
    case 'thow': { // tiny house on wheels: trailer, wood siding, shed roof, loft window, side door
      const base = 0.6, h = Math.min(3.9, item.h || 4) - base;
      box(w + 0.1, 0.15, d + 0.4, DARK, 0, base - 0.1, 0); box(0.15, 0.12, 1.2, DARK, 0, base - 0.12, d / 2 + 0.8);
      for (const z of [-0.45, 0.45]) for (const s of [-1, 1]) { const wh = add(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12), 0x1d1d1d, s * (w / 2 - 0.1), 0.36, z); wh.rotation.z = Math.PI / 2; }
      prism([[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.86], [-w / 2, h]], d, color, 0, base, 0);
      const r = box(w + 0.4, 0.12, d + 0.4, roof, 0, base + h * 0.93 + 0.05, 0); r.rotation.z = Math.atan2(h * 0.14, w);
      box(0.05, 1.95, 0.85, TRIM, w / 2 + 0.03, base + 1, d * 0.18); box(0.6, 0.18, 0.9, DECK, w / 2 + 0.3, 0.3, d * 0.18);
      window(w / 2, base + 1.4, -d * 0.15, 1.6, 1.0, 'x+'); window(w / 2, base + 1.4, d * 0.38, 0.6, 0.7, 'x+');
      window(0, base + h * 0.8, d / 2, w * 0.5, 0.5, 'z+'); window(-w / 2, base + 1.3, 0, 2.2, 0.9, 'x-'); break;
    }
    case 'parkmodel': { // park model: skirted base, low gable, covered porch on the long side
      const base = 0.55, h = 2.6; box(w - 0.1, base, d - 0.2, STONE, 0, base / 2, 0); box(w, h, d, color, 0, base + h / 2, 0); gable(w, d, w * 0.25, roof, base + h);
      box(1.8, 0.12, d * 0.45, DECK, w / 2 + 0.9, base - 0.05, d * 0.15);
      for (const z of [d * 0.15 - d * 0.2, d * 0.15 + d * 0.2]) box(0.12, h, 0.12, TRIM, w / 2 + 1.7, base + h / 2, z);
      const pr = box(1.9, 0.1, d * 0.45, roof, w / 2 + 0.9, base + h + 0.05, d * 0.15); pr.rotation.z = -0.15;
      box(0.05, 2, 0.9, TRIM, w / 2 + 0.03, base + 1, d * 0.15); for (const z of [-d * 0.3, d * 0.38]) window(w / 2, base + 1.5, z, 1.1, 0.8, 'x+'); break;
    }
    case 'ranch': { // ranch-style modular: foundation, long low gable, porch along the front, many windows
      const base = 0.5, h = 2.6; box(w + 0.1, base, d + 0.1, STONE, 0, base / 2, 0); box(w, h, d, color, 0, base + h / 2, 0); gable(w, d, w * 0.2, roof, base + h, 0.35);
      const pd = Math.min(2.2, w * 0.3); box(pd, 0.15, d * 0.5, DECK, w / 2 + pd / 2, base - 0.05, 0);
      for (const z of [-d * 0.24, 0, d * 0.24]) box(0.14, h, 0.14, TRIM, w / 2 + pd - 0.15, base + h / 2, z);
      box(0.06, 2.1, 1.0, 0x6b4a2a, w / 2 + 0.03, base + 1.05, 0);
      for (const z of [-d * 0.38, -d * 0.16, d * 0.16, d * 0.38]) window(w / 2, base + 1.55, z, 1.2, 1.0, 'x+');
      for (const z of [-d * 0.3, 0, d * 0.3]) window(-w / 2, base + 1.55, z, 1.2, 1.0, 'x-');
      window(0, base + 1.55, d / 2, 1.4, 1.0, 'z+'); break;
    }
    case 'cedar': { // cedar post-and-beam: steep gable, glass gable end, deck
      const base = 0.4, h = 2.8, rise = w * 0.5; box(w, base, d, STONE, 0, base / 2, 0); box(w, h, d, color, 0, base + h / 2, 0);
      gable(w, d, rise, roof, base + h, 0.5);
      prism([[-w / 2 + 0.3, 0], [w / 2 - 0.3, 0], [0, rise - 0.35]], 0.06, GLASS, 0, base + h, d / 2 + 0.04);
      box(w - 0.6, h - 0.4, 0.06, GLASS, 0, base + h / 2 + 0.1, d / 2 + 0.04);
      for (const x of [-w / 4, 0, w / 4]) box(0.12, h + rise * 0.6, 0.1, 0x5a3a24, x, base + (h + rise * 0.6) / 2, d / 2 + 0.08);
      box(w + 1, 0.15, 2.2, DECK, 0, base - 0.05, d / 2 + 1.1); break;
    }
    case 'modern': case 'studio': { // modern mono-pitch: tall glass front, dark accent cladding
      const base = style === 'studio' ? 0.2 : 0.4, h = style === 'studio' ? 2.7 : 3.2;
      box(w, base, d, STONE, 0, base / 2, 0);
      prism([[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.78], [-w / 2, h]], d, color, 0, base, 0);
      const r = box(w + 0.5, 0.14, d + 0.5, roof, 0, base + h * 0.89 + 0.08, 0); r.rotation.z = Math.atan2(h * 0.22, w);
      box(w * 0.35, h * 0.75, 0.06, roof, w * 0.3, base + h * 0.37, d / 2 + 0.03);
      box(w * 0.5, h * 0.7, 0.06, GLASS, -w * 0.15, base + h * 0.4, d / 2 + 0.04);
      for (const z of [-d / 4, d / 4]) window(w / 2, base + 1.5, z, 1, 1, 'x+');
      if (style === 'modern') box(w * 0.6, 0.12, 1.6, DECK, -w * 0.15, base - 0.05, d / 2 + 0.8); break;
    }
    case 'cabin': { // stick-built cabin: gable, front porch, chimney
      const base = 0.4, h = 2.7; box(w, base, d, STONE, 0, base / 2, 0); box(w, h, d, color, 0, base + h / 2, 0); gable(w, d, w * 0.38, roof, base + h, 0.4);
      box(w, 0.14, 2, DECK, 0, base - 0.05, d / 2 + 1); for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) box(0.14, h, 0.14, 0x5a3a24, x, base + h / 2, d / 2 + 1.8);
      box(0.8, h + w * 0.38 + 0.8, 0.8, STONE, -w / 2 + 0.6, (h + w * 0.38 + 0.8) / 2, -d / 4);
      box(1, 2.1, 0.06, 0x6b4a2a, 0, base + 1.05, d / 2 + 0.03); for (const x of [-w / 3, w / 3]) window(x, base + 1.5, d / 2, 1, 1, 'z+'); break;
    }
    case 'rv': { // generic travel trailer
      const h = item.h || 3.2; box(w, h - 0.5, d, color, 0, (h - 0.5) / 2 + 0.5, 0); box(w + 0.02, 0.35, d * 0.95, 0x8fa3b0, 0, 1.5, 0);
      for (const z of [-0.6, 0.6]) { const wh = add(new THREE.CylinderGeometry(0.35, 0.35, w + 0.1, 10), DARK, 0, 0.35, z); wh.rotation.z = Math.PI / 2; } break;
    }
    default: { // 'gable' / 'utility' shed
      const h = style === 'utility' ? 2.2 : 2.0; box(w, h, d, color, 0, h / 2, 0); gable(w, d, w * (style === 'utility' ? 0.25 : 0.35), roof, h);
      box(Math.min(1.5, w * 0.5), 1.85, 0.05, TRIM, 0, 0.92, d / 2 + 0.03);
      if (d > 3) window(w / 2, 1.3, -d / 4, 0.6, 0.5, 'x+'); if (d > 6) window(w / 2, 1.3, d / 4, 0.6, 0.5, 'x+');
    }
  }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

export function tint(group, hex) {
  group.traverse(m => { if (m.isMesh) { if (!m.userData.own) { m.material = m.material.clone(); m.userData.own = true; } m.material.emissive?.setHex(hex); } });
}
export function ghostify(group) {
  group.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.userData.own = true; m.material.transparent = true; m.material.opacity = 0.55; m.castShadow = false; } });
}
