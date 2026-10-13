// Original low-poly meshes for catalog items. No third-party assets.
import * as THREE from 'three';
const lam = c => new THREE.MeshLambertMaterial({ color: c });

export function makeStructure(item) {
  const g = new THREE.Group(); g.userData.item = item;
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const { w, d, h } = item;
  if (item.kind === 'septic') {
    add(new THREE.BoxGeometry(w, 0.08, d), lam(0x8a7a5a), 0, 0.04, 0);
    for (let i = -2; i <= 2; i++) add(new THREE.BoxGeometry(w * 0.85, 0.1, 0.25), lam(0x5d4c35), 0, 0.1, i * d / 6);
    add(new THREE.CylinderGeometry(0.9, 0.9, 0.4, 10), lam(0x3f4a52), 0, 0.2, d / 2 - 1);
  } else if (item.kind === 'well') {
    add(new THREE.CylinderGeometry(0.4, 0.45, 0.9, 10), lam(item.color), 0, 0.45, 0);
    add(new THREE.ConeGeometry(0.75, 0.5, 4), lam(0x5b6d7a), 0, 1.15, 0).rotation.y = Math.PI / 4;
  } else if (item.kind === 'power') {
    const p = add(new THREE.BoxGeometry(w, 0.08, d), lam(item.color), 0, 1.2, 0); p.rotation.x = -0.45;
    add(new THREE.BoxGeometry(0.1, 1.2, 0.1), lam(0x888888), 0, 0.6, 0);
  } else if (item.kind === 'rv') {
    add(new THREE.BoxGeometry(w, h - 0.5, d), lam(item.color), 0, (h - 0.5) / 2 + 0.5, 0);
    add(new THREE.BoxGeometry(w + 0.02, 0.35, d * 0.95), lam(0x8fa3b0), 0, 1.5, 0);
    for (const z of [-0.6, 0.6]) add(new THREE.CylinderGeometry(0.35, 0.35, w + 0.1, 10), lam(0x222222), 0, 0.35, z).rotation.z = Math.PI / 2;
  } else {
    add(new THREE.BoxGeometry(w, h, d), lam(item.color), 0, h / 2, 0);
    const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.2, 0); s.lineTo(w / 2 + 0.2, 0); s.lineTo(0, Math.min(w * 0.35, 1.8)); s.closePath();
    add(new THREE.ExtrudeGeometry(s, { depth: d + 0.4, bevelEnabled: false }), lam(item.roof), 0, h, -d / 2 - 0.2);
    const trim = lam(0xf2efe6);
    add(new THREE.BoxGeometry(0.9, Math.min(2, h * 0.85), 0.06), trim, 0, Math.min(1, h * 0.43), d / 2 + 0.03);
    if (item.kind !== 'accessory' || item.conditioned) for (const z of [-d / 4, d / 4]) add(new THREE.BoxGeometry(0.06, 0.8, 1), lam(0xbfd8e6), w / 2 + 0.03, h * 0.6, z);
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
