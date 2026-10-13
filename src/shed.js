// Original low-poly shed: plank-coloured box, gable roof, door, window. 8ft x 10ft footprint (2.44m x 3.05m).
import * as THREE from 'three';
export const SHED = { name: 'Starter shed 8x10', w: 2.44, d: 3.05, h: 2.1 };
export function makeShed() {
  const g = new THREE.Group();
  const wall = new THREE.MeshLambertMaterial({ color: 0xc8a26b });
  const trim = new THREE.MeshLambertMaterial({ color: 0xf2efe6 });
  const roofM = new THREE.MeshLambertMaterial({ color: 0x5b6d7a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(SHED.w, SHED.h, SHED.d), wall);
  body.position.y = SHED.h / 2; g.add(body);
  // gable roof as triangular prism
  const s = new THREE.Shape(); s.moveTo(-SHED.w / 2 - 0.15, 0); s.lineTo(SHED.w / 2 + 0.15, 0); s.lineTo(0, 0.9); s.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: SHED.d + 0.3, bevelEnabled: false }), roofM);
  roof.position.set(0, SHED.h, -SHED.d / 2 - 0.15); g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.05), trim); door.position.set(0, 0.9, SHED.d / 2 + 0.02); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.8), trim); win.position.set(SHED.w / 2 + 0.02, 1.3, 0); g.add(win);
  g.traverse(m => { m.castShadow = true; });
  return g;
}
