import * as THREE from 'three';
import { makeProjector, polygonArea, pointInPolygon, sampleHeight, snap } from './geo.js';
import { SimClock } from './clock.js';
import { makeShed, SHED } from './shed.js';

let parcel, elevation, c, proj, ringM, baseH, unproj, heightAt, bx0, by0, bx1, by1, span, zoom, terrain, areaM2, hs;
const world = new THREE.Group();
function setData(data) {
({ parcel, elevation } = data);
c = parcel.ring.reduce((a, p) => [a[0] + p[0] / parcel.ring.length, a[1] + p[1] / parcel.ring.length], [0, 0]);
proj = makeProjector(c[0], c[1]);
ringM = parcel.ring.map(proj);
baseH = sampleHeight(elevation, c[0], c[1]);
unproj = (x, y) => [c[0] + x / proj([c[0] + 1, c[1]])[0], c[1] + y / proj([c[0], c[1] + 1])[1]];
heightAt = (x, z) => { const [lon, lat] = unproj(x, -z); return sampleHeight(elevation, lon, lat) - baseH; };

}
const placed = []; let forSale = '';
const clock = new SimClock();
// --- renderer + isometric orthographic camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xcfe3ef);
const cam = new THREE.OrthographicCamera();
const fitCam = () => { const a = innerWidth / innerHeight; Object.assign(cam, { left: -zoom * a, right: zoom * a, top: zoom, bottom: -zoom, near: -1000, far: 1000 }); cam.updateProjectionMatrix(); };
cam.position.set(100, 100 * Math.SQRT1_2 * 1.15, 100); cam.lookAt(0, 0, 0); // classic ~35° iso
scene.add(world);
scene.add(new THREE.HemisphereLight(0xffffff, 0x667755, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(40, 80, 20); sun.castShadow = true; scene.add(sun);

function buildWorld(data) {
setData(data);
world.clear(); placed.splice(0).forEach(p => scene.remove(p.s));
[bx0, by0] = proj([elevation.bbox.minX, elevation.bbox.minY]); [bx1, by1] = proj([elevation.bbox.maxX, elevation.bbox.maxY]);
span = Math.max(bx1 - bx0, by1 - by0); zoom = span * 0.55; fitCam();
Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span }); sun.shadow.camera.updateProjectionMatrix();

// --- terrain from real USGS 3DEP samples (flat-shaded low-poly)
const n = elevation.n;
const geo = new THREE.PlaneGeometry(bx1 - bx0, by1 - by0, n - 1, n - 1); geo.rotateX(-Math.PI / 2);
const pos = geo.attributes.position, colors = [];
for (let k = 0; k < pos.count; k++) {
  const x = pos.getX(k) + (bx0 + bx1) / 2, z = pos.getZ(k) - (by0 + by1) / 2;
  pos.setX(k, x); pos.setZ(k, z); pos.setY(k, heightAt(x, z));
  const inLot = pointInPolygon([x, -z], ringM);
  const col = new THREE.Color(inLot ? 0x8fbf6a : 0x7aa35a).offsetHSL(0, 0, (Math.random() - 0.5) * 0.04);
  colors.push(col.r, col.g, col.b);
}
geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
terrain = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
terrain.geometry.computeVertexNormals(); terrain.receiveShadow = true; world.add(terrain);

// --- parcel boundary (real county geometry) + 1m grid inside the lot
const lineGeo = new THREE.BufferGeometry().setFromPoints(ringM.map(([x, y]) => new THREE.Vector3(x, heightAt(x, -y) + 0.15, -y)));
world.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffd23f })));
const gridPts = [];
const xs = ringM.map(p => p[0]), ys = ringM.map(p => p[1]);
for (let x = Math.ceil(Math.min(...xs)); x <= Math.max(...xs); x++) for (let y = Math.ceil(Math.min(...ys)); y <= Math.max(...ys); y++) {
  if (pointInPolygon([x, y], ringM) && pointInPolygon([x + 1, y], ringM)) gridPts.push(new THREE.Vector3(x, heightAt(x, -y) + 0.05, -y), new THREE.Vector3(x + 1, heightAt(x + 1, -y) + 0.05, -y));
  if (pointInPolygon([x, y], ringM) && pointInPolygon([x, y + 1], ringM)) gridPts.push(new THREE.Vector3(x, heightAt(x, -y) + 0.05, -y), new THREE.Vector3(x, heightAt(x, -y - 1) + 0.05, -y - 1));
}
world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })));

areaM2 = polygonArea(ringM); hs = elevation.heights.filter(h => h != null); info();
}

// --- place / rotate tool
const ghost = makeShed(); ghost.traverse(m => { if (m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.5; } }); scene.add(ghost);
let rot = 0;
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let valid = false;
addEventListener('pointermove', e => {
  mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(mouse, cam);
  const hit = ray.intersectObject(terrain)[0]; if (!hit) return;
  const x = snap(hit.point.x, 0.5), z = snap(hit.point.z, 0.5);
  const hw = SHED.w / 2, hd = SHED.d / 2, cs = Math.cos(rot), sn = Math.sin(rot);
  const corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => [x + a * cs + b * sn, -(z - a * sn + b * cs)]);
  valid = corners.every(p => pointInPolygon(p, ringM));
  ghost.position.set(x, Math.max(...corners.map(([px, py]) => heightAt(px, -py))), z); ghost.rotation.y = rot;
  ghost.traverse(m => m.material && m.material.color && m.material.emissive?.setHex(valid ? 0x000000 : 0x990000));
});
renderer.domElement.addEventListener('click', () => {
  if (!valid) return info('Outside the parcel line — sheds must sit inside the lot.');
  const s = makeShed(); s.position.copy(ghost.position); s.rotation.y = rot; scene.add(s);
  placed.push({ s, at: clock.t }); info();
});
const rotate = () => { rot = (rot + Math.PI / 2) % (2 * Math.PI); ghost.rotation.y = rot; };
addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R') rotate(); });
document.getElementById('rotate').onclick = rotate;
document.getElementById('clear').onclick = () => { placed.splice(0).forEach(p => scene.remove(p.s)); info(); };
addEventListener('wheel', e => { zoom = Math.min(Math.max(zoom * (e.deltaY > 0 ? 1.1 : 0.9), 5), span * 2); fitCam(); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fitCam(); });

// --- sim clock

document.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => {
  clock.setSpeed(Number(b.dataset.speed)); document.querySelectorAll('[data-speed]').forEach(o => o.classList.toggle('on', o === b));
});
function info(msg = '') {
  document.getElementById('info').innerHTML =
    `<b>APN ${parcel.apn}</b> · ${parcel.city || ''}, ${parcel.county || 'San Mateo'} County${parcel.jurisdiction ? ` (${parcel.jurisdiction})` : ''}<br>${parcel.use || ''}${forSale ? `<br>💲 ${forSale}` : ''}<br>` +
    `Lot ≈ ${Math.round(areaM2 * 10.7639).toLocaleString()} sq ft · relief ${(Math.max(...hs) - Math.min(...hs)).toFixed(1)} m in view<br>` +
    `Sheds placed: ${placed.length}<br><small>Parcel: county GIS · Elevation: USGS 3DEP. Click to place, R to rotate, wheel to zoom.</small>` + (msg ? `<br><b style="color:#a00">${msg}</b>` : '');
}
let last = performance.now();
renderer.setAnimationLoop(now => {
  clock.tick((now - last) / 1000); last = now;
  document.getElementById('clock').textContent = clock.label();
  const hour = new Date(clock.t).getUTCHours() + new Date(clock.t).getUTCMinutes() / 60;
  const a = (hour - 6) / 12 * Math.PI; sun.position.set(Math.cos(a) * 60, Math.max(Math.sin(a), 0.05) * 80, 20);
  sun.intensity = hour > 6 && hour < 18 ? 1.6 : 0.2;
  renderer.render(scene, cam);
});
window.__shedlife = { placed, clock, parcel };

buildWorld(await (await fetch('/data/parcel.json')).json());

// --- Land for sale panel
const fmt$ = n => n == null ? '—' : '$' + Math.round(n).toLocaleString();
async function loadListings() {
  const box = document.getElementById('listings'), st = document.getElementById('lstatus');
  try {
    const r = await (await fetch('/api/listings')).json();
    st.textContent = r.providers.map(p => `${p.id}: ${p.ok ? p.count : 'off'}`).join(' · ');
    st.title = r.providers.filter(p => !p.ok).map(p => p.error).join('\n');
    box.innerHTML = r.listings.length ? '' : '<li class="empty">No live listings yet. Add RENTCAST_API_KEY to .env, or import an official county tax-sale list (see README).</li>';
    for (const l of r.listings) {
      const li = document.createElement('li');
      li.innerHTML = `<b>${fmt$(l.price)}</b> <small>${l.priceLabel}</small><br>${l.title}<br><small>${l.acres != null ? l.acres + ' ac · ' : ''}${l.source}${l.status ? ' · ' + l.status : ''}</small><br>` +
        `<button>Load lot</button> ${l.url ? `<a href="${l.url}" target="_blank" rel="noopener">Listing ↗</a>` : ''}`;
      li.querySelector('button').onclick = async () => {
        info('Loading parcel + terrain…');
        const q = l.apn ? `apn=${encodeURIComponent(l.apn)}&county=${l.county}` : `lat=${l.lat}&lon=${l.lon}`;
        const res = await fetch(`/api/parcel?${q}`); const d = await res.json();
        if (!res.ok) return info(d.error);
        forSale = `${fmt$(l.price)} ${l.priceLabel.toLowerCase()} · ${l.source}`; buildWorld(d);
      };
      box.appendChild(li);
    }
  } catch (e) { st.textContent = 'Listings API unavailable (run npm run dev)'; }
}
loadListings();
