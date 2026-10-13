import * as THREE from 'three';
import { makeProjector, polygonArea, pointInPolygon, sampleHeight, snap } from './geo.js';
import { SimClock } from './clock.js';
import { CATALOG, byId, SHOP_TABS, paidOnPlacement } from './catalog.js';
import { BODIES, bodyById } from './officials.js';
import { portraitSpec, mountPortrait, talk } from './portraits.js';
import { initMap, openMap, mapDebug } from './wamap.js';
import { autoplay } from './autoplay.js';
import { makeStructure, tint, ghostify } from './meshes.js';
import { evaluate, footprint } from './rules.js';
import { SCENARIO, NPCS, QUESTS, questById } from './scenarios/king-county.js';
import { newGame, send, tick, draft, questLog, nextMailDay, unread, docName, fmt$ } from './engine.js';

const $ = id => document.getElementById(id);
const DAY = 86_400_000;

// ---------------------------------------------------------------- world
let parcel, elevation, c, proj, ringM, baseH, unproj, heightAt, bx0, by0, bx1, by1, span, zoom, terrain, areaM2, hs;
const world = new THREE.Group();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xcfe3ef);
const cam = new THREE.OrthographicCamera();
const fitCam = () => { // keep the lot centred in the gap between the inbox (left) and quest log (right)
  const a = innerWidth / innerHeight; Object.assign(cam, { left: -zoom * a, right: zoom * a, top: zoom, bottom: -zoom, near: -2000, far: 2000 });
  cam.setViewOffset(innerWidth, innerHeight, -(400 - 330) / 2, 0, innerWidth, innerHeight); cam.updateProjectionMatrix();
};
cam.position.set(100, 100 * Math.SQRT1_2 * 1.15, 100); cam.lookAt(0, 0, 0);
scene.add(world);
scene.add(new THREE.HemisphereLight(0xffffff, 0x667755, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(40, 80, 20); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun);

function buildWorld(data) {
  ({ parcel, elevation } = data);
  c = parcel.ring.reduce((a, p) => [a[0] + p[0] / parcel.ring.length, a[1] + p[1] / parcel.ring.length], [0, 0]);
  proj = makeProjector(c[0], c[1]);
  ringM = parcel.ring.map(proj);
  baseH = sampleHeight(elevation, c[0], c[1]);
  unproj = (x, y) => [c[0] + x / proj([c[0] + 1, c[1]])[0], c[1] + y / proj([c[0], c[1] + 1])[1]];
  heightAt = (x, z) => { const [lon, lat] = unproj(x, -z); return sampleHeight(elevation, lon, lat) - baseH; };
  world.clear();
  [bx0, by0] = proj([elevation.bbox.minX, elevation.bbox.minY]); [bx1, by1] = proj([elevation.bbox.maxX, elevation.bbox.maxY]);
  span = Math.max(bx1 - bx0, by1 - by0); zoom = span * 0.36; fitCam();
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span }); sun.shadow.camera.updateProjectionMatrix();
  const n = elevation.n;
  const geo = new THREE.PlaneGeometry(bx1 - bx0, by1 - by0, n - 1, n - 1); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, colors = [];
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k) + (bx0 + bx1) / 2, z = pos.getZ(k) - (by0 + by1) / 2;
    pos.setX(k, x); pos.setZ(k, z); pos.setY(k, heightAt(x, z));
    const col = new THREE.Color(pointInPolygon([x, -z], ringM) ? 0x8fbf6a : 0x5f8f4a).offsetHSL(0, 0, (Math.random() - 0.5) * 0.04);
    colors.push(col.r, col.g, col.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  terrain.geometry.computeVertexNormals(); terrain.receiveShadow = true; world.add(terrain);
  // evergreen forest outside the lot (decor)
  const trunk = new THREE.MeshLambertMaterial({ color: 0x5a3e2b }), crown = new THREE.MeshLambertMaterial({ color: 0x2f5d3a });
  for (let i = 0; i < 260; i++) {
    const x = bx0 + Math.random() * (bx1 - bx0), y = by0 + Math.random() * (by1 - by0);
    if (pointInPolygon([x, y], ringM)) continue;
    const s = 0.7 + Math.random() * 0.8, t = new THREE.Group();
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.3 * s, 2 * s, 5), trunk); a.position.y = s;
    const b = new THREE.Mesh(new THREE.ConeGeometry(1.8 * s, 7 * s, 6), crown); b.position.y = 5 * s;
    t.add(a, b); t.position.set(x, heightAt(x, -y), -y); t.traverse(m => m.castShadow = true); world.add(t);
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(ringM.map(([x, y]) => new THREE.Vector3(x, heightAt(x, -y) + 0.2, -y)).concat([]));
  world.add(new THREE.LineLoop(lineGeo, new THREE.LineBasicMaterial({ color: 0xffd23f })));
  // 10 ft interior setback line (RA-5), drawn as a dashed inner ring
  const sb = 3.048, inner = ringM.map(([x, y], i) => { const [cx, cy] = ringM.reduce((a, p) => [a[0] + p[0] / ringM.length, a[1] + p[1] / ringM.length], [0, 0]); const d = Math.hypot(x - cx, y - cy); return [x - (x - cx) / d * sb * 1.2, y - (y - cy) / d * sb * 1.2]; });
  const dash = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(inner.map(([x, y]) => new THREE.Vector3(x, heightAt(x, -y) + 0.15, -y))), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 1.2, gapSize: 1, transparent: true, opacity: 0.6 }));
  dash.computeLineDistances(); world.add(dash);
  // trees standing inside the lot (cleared by the "Clear, grade + driveway" step)
  lotTrees = new THREE.Group(); world.add(lotTrees);
  const xs2 = ringM.map(p => p[0]), ys2 = ringM.map(p => p[1]);
  const want = Math.min(70, Math.round(polygonArea(ringM) / 260));
  for (let i = 0, n = 0; i < 600 && n < want; i++) {
    const x = Math.min(...xs2) + Math.random() * (Math.max(...xs2) - Math.min(...xs2)), y = Math.min(...ys2) + Math.random() * (Math.max(...ys2) - Math.min(...ys2));
    if (!pointInPolygon([x, y], ringM)) continue; n++;
    const s = 0.6 + Math.random() * 0.7, t = new THREE.Group();
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.28 * s, 2 * s, 5), trunk); a.position.y = s;
    const b = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 6.5 * s, 6), crown); b.position.y = 4.6 * s;
    t.add(a, b); t.position.set(x, heightAt(x, -y), -y); t.traverse(m => m.castShadow = true); lotTrees.add(t);
  }
  streamMesh = null; stumps = null; padDone = false; roadMesh = null;
  areaM2 = polygonArea(ringM); hs = elevation.heights;
}

// ---------------------------------------------------------------- game state
let lotTrees = null, streamMesh = null, stumps = null, padDone = false, roadMesh = null;
let g, clock, plan = [], uid = 0, tool = null, rot = 0, ghost = null, valid = false, selNpc = 'permitting', erase = false;
const lot = () => ({ ring: ringM, zoning: parcel.zoning || 'RA-5' });

function startGame() {
  g = newGame(SCENARIO); g.parcelId = parcel.apn; g.zoning = parcel.zoning || 'RA-5'; g.county = parcel.county; g.playerName = 'Rex';
  g.threads.permitting[0].body = `Welcome. You own ${parcel.acres?.toFixed(1)} acres in ${parcel.jurisdiction || parcel.county + ' County'}${parcel.zoning ? `, zoned ${parcel.zoning}` : ' (zoning not published statewide; we apply RA-5 rural rules)'}.${parcel.county && parcel.county !== 'King' ? `\n\nHeads up: this permit path is modeled on King County. ${parcel.county} County's agencies differ in the real world.` : ''}\n\nTo live there legally you need water, septic, power, a building permit and a final inspection. Start by asking us what can be built, then shop for a home and place it with a well and drainfield on the map.\n\nEvery request is an email. Agencies reply on the clock; use ⏭ to wait for mail. The 🏛️ Officials tab lets you talk to council members and commissioners.\n\n— King County Permitting`;
  clock = new SimClock(SCENARIO.startDate); clock.setSpeed(0);
  plan.splice(0).forEach(p => scene.remove(p.mesh));
  syncPlan(); syncSite(); selNpc = 'permitting'; voice(g.threads.permitting[0], 'permitting'); render();
}

function syncSite() {
  const felled = g.docs.includes('trees-cleared'), grubbed = g.docs.includes('grubbed');
  if (lotTrees) lotTrees.visible = !felled;
  if (felled && !grubbed && !stumps && lotTrees) { // stumps where the trees stood
    stumps = new THREE.Group(); const m = new THREE.MeshLambertMaterial({ color: 0x8a6a48 });
    lotTrees.children.forEach(t => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.4, 6), m); s.position.copy(t.position).add(new THREE.Vector3(0, 0.2, 0)); stumps.add(s); });
    world.add(stumps);
  }
  if (stumps) stumps.visible = felled && !grubbed;
  if (g.docs.includes('pad-graded') && !padDone) { padDone = true; levelPads(); }
  if (g.docs.includes('driveway') && !roadMesh) buildDriveway();
  if (g.quests.cad === 'done' && g.site?.stream && !streamMesh) {
    const xs = ringM.map(p => p[0]), ys = ringM.map(p => p[1]), y0 = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * 0.72;
    const pts = []; for (let x = Math.min(...xs) - 30; x <= Math.max(...xs) + 30; x += 3) { const y = y0 + Math.sin(x / 9) * 4; pts.push(new THREE.Vector3(x, heightAt(x, -y) + 0.15, -y)); }
    streamMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.9, 6), new THREE.MeshLambertMaterial({ color: 0x3d8bd4 }));
    streamMesh.scale.y = 0.25; streamMesh.position.y = 0; world.add(streamMesh);
  }
}
// Flatten terrain under homes/ADUs/drainfields (+3 m margin) to their mean height, and drop the structures onto the pad.
function levelPads() {
  const pads = plan.filter(p => ['dwelling', 'adu', 'septic'].includes(p.item.kind)).map(p => {
    const xs = p.corners.map(c => c[0]), ys = p.corners.map(c => c[1]);
    const box = [Math.min(...xs) - 3, Math.max(...xs) + 3, Math.min(...ys) - 3, Math.max(...ys) + 3];
    const hsum = p.corners.reduce((a, [x, y]) => a + heightAt(x, -y), 0) / 4; return { p, box, h: hsum };
  });
  const pos = terrain.geometry.attributes.position;
  for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), y = -pos.getZ(k); for (const pd of pads) if (x >= pd.box[0] && x <= pd.box[1] && y >= pd.box[2] && y <= pd.box[3]) pos.setY(k, pd.h); }
  pos.needsUpdate = true; terrain.geometry.computeVertexNormals();
  for (const pd of pads) pd.p.mesh.position.y = pd.h;
}
// Gravel driveway from the nearest lot line to the home.
function buildDriveway() {
  const home = plan.find(p => p.item.kind === 'dwelling') || plan[0]; if (!home) return;
  const hx = home.corners.reduce((a, c) => a + c[0] / 4, 0), hy = home.corners.reduce((a, c) => a + c[1] / 4, 0);
  let best = null; ringM.forEach((a, i) => { const b = ringM[(i + 1) % ringM.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((hx - a[0]) * dx + (hy - a[1]) * dy) / L)), p = [a[0] + t * dx, a[1] + t * dy], d = Math.hypot(p[0] - hx, p[1] - hy); if (!best || d < best.d) best = { p, d }; });
  roadMesh = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: 0xb8ad97 }); const n = Math.max(2, Math.ceil(best.d / 2));
  for (let i = 0; i < n; i++) { const t = i / n, x = best.p[0] + (hx - best.p[0]) * t, y = best.p[1] + (hy - best.p[1]) * t;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 3.6), mat); seg.position.set(x, heightAt(x, -y) + 0.08, -y); seg.rotation.y = Math.atan2(hx - best.p[0], -(hy - best.p[1])); seg.receiveShadow = true; roadMesh.add(seg); }
  world.add(roadMesh);
}
function syncPlan() {
  g.plan = { items: plan.map(({ uid, item, corners, slope }) => ({ uid, item, corners, slope })), eval: evaluate(plan, lot()) };
  const bad = new Set(g.plan.eval.violations.map(v => v.uid));
  for (const p of plan) { tint(p.mesh, bad.has(p.uid) ? 0x990000 : 0x000000); setBuilt(p); }
}
const BUILT_BY = { dwelling: 'home-set', adu: 'home-set', septic: 'septic-installed', well: 'well-report', power: 'electrical-permit' };
function isBuilt(p) { if (p.item.permit === 'exempt' || p.item.kind === 'rv') return true; if (p.item.kind === 'accessory') return g.docs.includes('building-permit'); return g.docs.includes(BUILT_BY[p.item.kind]); }
function setBuilt(p) {
  const b = isBuilt(p); if (p.built === b) return; p.built = b;
  p.mesh.traverse(m => { if (m.isMesh) { m.material.transparent = !b; m.material.opacity = b ? 1 : 0.45; } });
}

// slope under a footprint: max rise / footprint diagonal
const slopeOf = (corners, item) => { const h = corners.map(([x, y]) => heightAt(x, -y)); return (Math.max(...h) - Math.min(...h)) / Math.hypot(item.w, item.d); };

// ---------------------------------------------------------------- placement
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
function setTool(id) {
  tool = id; erase = false; $('erase').classList.remove('on');
  if (ghost) scene.remove(ghost); ghost = null;
  document.querySelectorAll('[data-item]').forEach(b => b.classList.toggle('on', b.dataset.item === id));
  if ($('toolName')) $('toolName').textContent = id ? `Placing: ${byId[id].name}` : '';
  if (id) { ghost = makeStructure(byId[id]); ghostify(ghost); scene.add(ghost); }
}
const hit = e => { mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(mouse, cam); return ray.intersectObject(terrain)[0]; };
renderer.domElement.addEventListener('pointermove', e => {
  const h = hit(e); if (!h) return;
  if (!ghost) return tipFor(e);
  const item = byId[tool], x = snap(h.point.x, 0.5), z = snap(h.point.z, 0.5);
  const corners = footprint(item, x, -z, rot);
  valid = corners.every(p => pointInPolygon(p, ringM));
  const test = evaluate([...plan, { uid: -1, item, corners, slope: slopeOf(corners, item) }], lot()).violations.filter(v => v.uid === -1);
  ghost.position.set(x, Math.max(...corners.map(([px, py]) => heightAt(px, -py))), z); ghost.rotation.y = rot;
  tint(ghost, !valid ? 0x990000 : test.length ? 0x996600 : 0x003300);
  showTip(!valid ? 'Outside the property line' : test.length ? '⚠ ' + test[0].msg : `${item.name} · ${item.sqft} sq ft · ${item.permit === 'exempt' ? 'no building permit needed' : item.permit === 'none' ? 'not a dwelling' : 'needs permits'}${item.cost ? ' · ' + fmt$(item.cost) : ''}`);
});
function tipFor(e) {
  const meshes = plan.map(p => p.mesh); const hitM = ray.intersectObjects(meshes, true)[0];
  if (!hitM) return showTip('');
  let o = hitM.object; while (o.parent && !o.userData.item) o = o.parent;
  const p = plan.find(p => p.mesh === o); const vs = g.plan.eval.violations.filter(v => v.uid === p?.uid);
  showTip(p ? `${p.item.name} — ${p.built ? 'built' : 'planned'}${vs.length ? ' · ⚠ ' + vs[0].msg : ''}${erase ? ' · click to remove' : ''}` : '');
}
function showTip(t) { $('tip').style.display = t ? 'block' : 'none'; $('tip').textContent = t; }

renderer.domElement.addEventListener('click', e => {
  if (g.outcome) return;
  if (erase) {
    hit(e); const h = ray.intersectObjects(plan.map(p => p.mesh), true)[0]; if (!h) return;
    let o = h.object; while (o.parent && !o.userData.item) o = o.parent;
    const i = plan.findIndex(p => p.mesh === o); if (i < 0) return;
    if (plan[i].built && plan[i].item.cost && plan[i].item.permit !== 'site') return toast('Built structures stay. (Demolition permits are a different game.)');
    if (paidOnPlacement(plan[i].item)) { g.budget += plan[i].item.cost; g.spent -= plan[i].item.cost; }
    scene.remove(plan[i].mesh); plan.splice(i, 1); syncPlan(); return render();
  }
  if (!tool || !valid) return;
  if (placeItem(tool, ghost.position.x, -ghost.position.z, rot) && !e.shiftKey) setTool(null);
});
// Place a catalog item at plan coords (x east, y north, metres from lot centre). Used by clicks and by tests.
function placeItem(id, x, y, r = 0) {
  const item = byId[id], buyNow = paidOnPlacement(item);
  const corners = footprint(item, x, y, r);
  if (!corners.every(p => pointInPolygon(p, ringM))) return false;
  if (buyNow && item.cost > g.budget) { toast(`Not enough money for ${item.name}.`); return false; }
  if (item.kind === 'dwelling' && plan.some(p => p.item.kind === 'dwelling')) toast('Heads up: RA-5 allows one primary home per lot.');
  const mesh = makeStructure(item); mesh.position.set(x, Math.max(...corners.map(([px, py]) => heightAt(px, -py))), -y); mesh.rotation.y = r; scene.add(mesh);
  plan.push({ uid: ++uid, item, corners, slope: slopeOf(corners, item), mesh });
  if (buyNow && item.cost) { g.budget -= item.cost; g.spent += item.cost; }
  syncPlan(); render(); return true;
}
const rotate = () => { rot = (rot + Math.PI / 2) % (2 * Math.PI); if (ghost) ghost.rotation.y = rot; };
addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'r' || e.key === 'R') rotate();
  if (e.key === 'Escape') setTool(null);
  if (e.key === 'x' || e.key === 'X') $('erase').click();
  if (e.key === ' ') { e.preventDefault(); setSpeed(clock.speed ? 0 : 1440); }
});
$('rotate').onclick = rotate;
$('erase').onclick = () => { setTool(null); erase = !erase; $('erase').classList.toggle('on', erase); };
addEventListener('wheel', e => { if (e.target !== renderer.domElement) return; zoom = Math.min(Math.max(zoom * (e.deltaY > 0 ? 1.1 : 0.9), 8), span * 2); fitCam(); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fitCam(); });

// ---------------------------------------------------------------- clock
function setSpeed(s) { clock.setSpeed(s); document.querySelectorAll('[data-speed]').forEach(o => o.classList.toggle('on', Number(o.dataset.speed) === s)); }
document.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => setSpeed(Number(b.dataset.speed)));
const gameDay = () => Math.floor((clock.t - SCENARIO.startDate) / DAY);
$('skip').onclick = () => {
  const nd = nextMailDay(g); if (!Number.isFinite(nd)) return toast('No replies pending. Send someone an email!');
  clock.t = Math.max(clock.t, SCENARIO.startDate + nd * DAY); advance();
};
function advance() {
  const d = gameDay(); if (d <= g.day && !g.outcome) return;
  const got = tick(g, d).filter(m => m.from !== 'me');
  if (got.length) {
    setSpeed(0);
    const m = got[got.length - 1]; const n = NPCS[m.from];
    toast(`${n.avatar} ${n.name}: ${m.subject}${got.length > 1 ? ` (+${got.length - 1} more)` : ''}`, () => { selNpc = m.from; render(); });
    syncPlan(); syncSite();
  }
  if (g.outcome) { setSpeed(0); endModal(); }
  render();
}

// ---------------------------------------------------------------- Claude voice
let voiceOn = false;
async function voice(msg, npc) {
  if (!voiceOn || !msg?.verdict) return;
  try {
    const r = await (await fetch('/api/npc', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ npc, verdict: msg.verdict, day: msg.deliverDay, parcel, thread: (g.threads[npc] || []).filter(m => m.id < msg.id && (m.delivered || m.from === 'me')) }) })).json();
    if (r.ok) { msg.body = r.body; msg.voiced = true; render(); if (npc === selNpc && msg.delivered) talk(headPortrait, r.body.split(/\s+/).length * 75); } else console.warn('voice', r.error);
  } catch (e) { console.warn(e); }
}

// ---------------------------------------------------------------- UI
let composeQuest = null, inboxTab = 'agencies', headPortrait = null;
const AGENCY_BG = { excavator: '#7a5c2e', 'crew-fast': '#8b6f1f', 'crew-cheap': '#5a4a2e', permitting: '#2d6a4f', health: '#2c5d7c', ecology: '#1f6f8b', lni: '#a8741a', utility: '#4a4a52', 'bank-cu': '#3d6b4f', 'bank-ridge': '#2f3e5c', usda: '#6b5a2e' };
const specFor = id => portraitSpec(id, NPCS[id].official ? NPCS[id].color : AGENCY_BG[id] || '#7a5c2e');
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { inboxTab = b.dataset.tab; render(); });
function render() {
  if (!g) return;
  $('sDay').textContent = g.day; $('sDeadline').textContent = SCENARIO.deadlineDay;
  $('sBudget').textContent = fmt$(g.budget); $('sBudget').style.color = g.budget < 20000 ? 'var(--red)' : '';
  const core = QUESTS.filter(q => !q.loan); $('sProgress').textContent = `${core.filter(q => g.quests[q.id] === 'done').length}/${core.length}`;
  $('sLoan').textContent = g.loan ? `${fmt$(g.loan.amount)} @ ${(g.loan.rate * 100).toFixed(2)}%` : 'none'; $('sLoan').title = g.loan ? `Interest paid so far: ${fmt$(g.loan.interest)}` : 'Talk to a bank in the Agencies tab';
  $('clock').textContent = `Day ${gameDay()}`;
  const u = unread(g); $('unread').innerHTML = u ? `<span class="badge b-answer">${u}</span>` : '';
  // threads (agencies & contractors | officials grouped by body)
  const last = id => (g.threads[id] || []).filter(m => m.delivered).at(-1);
  const row = id => {
    const n = NPCS[id], l = last(id), has = (g.threads[id] || []).some(m => m.delivered && !m.read && m.from !== 'me');
    const waiting = (g.threads[id] || []).some(m => !m.delivered);
    return `<div class="th ${id === selNpc ? 'sel' : ''}" data-npc="${id}"><canvas class="pt" data-pt="${id}"></canvas><div><div class="nm">${n.official ? n.shortName : n.name}${n.official ? ` <span class="tag">${n.seat}</span>` : n.real ? '' : '<span class="tag">fictional</span>'}${waiting ? ' <span class="tag">⏳</span>' : ''}</div><div class="sub">${l ? l.subject : n.official ? (n.priorities.length ? 'Cares about ' + n.priorities.join(', ') : 'Hears permit appeals') : n.org}</div></div>${has ? '<span class="dot"></span>' : ''}</div>`;
  };
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === inboxTab));
  if (inboxTab === 'agencies') {
    const order = Object.keys(NPCS).filter(id => !NPCS[id].official).sort((a, b) => (last(b)?.deliverDay ?? -1) - (last(a)?.deliverDay ?? -1));
    $('threads').innerHTML = order.map(row).join('');
  } else {
    $('threads').innerHTML = BODIES.map(b => `<div class="bodyhead" style="background:${b.color}" title="${esc(b.role)}">${b.name}${b.relevant ? ' · your parcel' : ''}</div>` +
      Object.keys(NPCS).filter(id => NPCS[id].body === b.id).map(row).join('')).join('');
  }
  document.querySelectorAll('canvas[data-pt]').forEach(c => mountPortrait(c, specFor(c.dataset.pt)));
  document.querySelectorAll('.th').forEach(el => el.onclick = () => { selNpc = el.dataset.npc; composeQuest = null; render(); });
  // thread
  const n = NPCS[selNpc], msgs = g.threads[selNpc] || [];
  msgs.forEach(m => { if (m.delivered) m.read = true; });
  if ($('threadHead').dataset.npc !== selNpc) {
    const b = n.official ? bodyById[n.body] : null;
    $('threadHead').innerHTML = `<canvas class="ptBig" id="ptHead"></canvas><div><b>${n.name}</b><br><span class="claude">${n.official ? `${b.name} · ${n.seat}<br><i>Fictional official · real body.</i> ${esc(b.role)}` : `${n.org}${n.email ? ' · ' + n.email : ''}${n.channel ? ' · ' + n.channel : ''}${n.real ? '<br><i>Real agency · illustrative staffer portrait</i>' : ''}`}</span></div>`;
    $('threadHead').dataset.npc = selNpc; headPortrait = mountPortrait($('ptHead'), specFor(selNpc));
  }
  $('thread').innerHTML = msgs.map(m => m.from === 'me'
      ? `<div class="msg me"><div class="hd"><b>You</b><span>Day ${m.day}</span></div>${n.official ? '' : `<b>${esc(m.subject)}</b>\n`}${esc(m.body)}${m.attachments?.length ? `<div class="att">📎 ${m.attachments.map(docName).join(', ')}</div>` : ''}</div>`
      : m.delivered
        ? `<div class="msg"><div class="hd"><b>${n.official ? n.shortName : n.name}${label(m.verdict?.kind) ? `<span class="badge b-${m.verdict?.kind}">${label(m.verdict?.kind)}</span>` : ''}</b><span>Day ${m.deliverDay}${m.voiced ? ' · ✦ Claude' : ''}</span></div>${n.official ? '' : `<b>${esc(m.subject)}</b>\n`}${esc(m.body)}</div>`
        : `<div class="msg pending">⏳ Waiting for a reply from ${n.name}… (expected around day ${m.deliverDay})</div>`).join('') || `<div class="claude" style="padding:8px">${n.official ? 'Say hello. Officials write the rules, but can\'t decide your permit.' : 'No messages yet.'}</div>`;
  $('thread').scrollTop = 1e9;
  renderCompose(); renderQuests();
}
const label = k => ({ accepted: 'APPROVED', 'needs-info': 'NEEDS INFO', 'too-early': 'NOT YET', corrections: 'CORRECTIONS', 'cant-pay': 'CAN’T PAY', pending: 'IN REVIEW', duplicate: 'DONE', answer: 'ANSWER', welcome: 'WELCOME' }[k] || '');
const linkify = t => esc(t).replace(/\((https?:[^)\s]+)\)/g, (m, u) => `(<a href="${u}" target="_blank" rel="noopener">source</a>)`);
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function renderCompose() {
  const n = NPCS[selNpc], qs = QUESTS.filter(q => q.npc === selNpc);
  $('cTo').textContent = `To: ${n.official ? n.name : n.avatar + ' ' + n.name}`;
  const opts = qs.map(q => `<option value="${q.id}">${{ done: '✅', pending: '⏳', open: '•' }[g.quests[q.id]]} ${q.title}</option>`).join('') + `<option value="">${n.official ? '💬 Talk' : '💬 Ask a question'}</option>`;
  const log = questLog(g); const keep = composeQuest ?? (qs.find(q => g.quests[q.id] === 'open' && log.find(l => l.id === q.id).ready)?.id || qs.find(q => g.quests[q.id] === 'open')?.id || '');
  if ($('cQuest').dataset.npc !== selNpc || $('cQuest').dataset.keep !== keep) {
    $('cQuest').innerHTML = opts; $('cQuest').value = keep; $('cQuest').dataset.npc = selNpc; $('cQuest').dataset.keep = keep; fillDraft();
  } else { const v = $('cQuest').value; $('cQuest').innerHTML = opts; $('cQuest').value = v; }
  const qsel = $('cQuest').value ? questById[$('cQuest').value] : null;
  const held = qsel ? ['site-plan', ...g.docs].filter(d => qsel.needs.includes(d)) : [];
  const checked = new Set([...document.querySelectorAll('#atts input:checked')].map(i => i.value));
  if ($('atts').dataset.sig !== held.join() + selNpc + ($('cQuest').value || '')) {
    const want = new Set($('cQuest').value ? draft(g, $('cQuest').value).attachments : []);
    $('atts').innerHTML = !held.length ? '<span class="claude">No attachments needed.</span>' : '📎 ' + held.map(d => `<label><input type="checkbox" value="${d}" ${want.has(d) || checked.has(d) ? 'checked' : ''}> ${docName(d)}</label>`).join('');
    $('atts').dataset.sig = held.join() + selNpc + ($('cQuest').value || '');
  }
  const real = n.real ? (n.email ? `mailto:${n.email}?subject=${encodeURIComponent(subjectNow())}&body=${encodeURIComponent($('cBody').value)}` : n.url) : null;
  $('realMail').textContent = n.real ? (n.email ? 'Open as real email ↗' : 'Real portal ↗') : n.official ? 'fictional member of a real body' : 'fictional company';
  $('atts').style.display = n.official ? 'none' : '';
  real ? $('realMail').setAttribute('href', real) : $('realMail').removeAttribute('href');
  $('send').disabled = !!g.outcome;
}
const subjectNow = () => $('cQuest').value ? `${questById[$('cQuest').value].title} — Parcel ${g.parcelId}` : `Question — Parcel ${g.parcelId}`;
function fillDraft() {
  const q = $('cQuest').value;
  if (q) { const d = draft(g, q); $('cBody').value = d.body; $('cHint').innerHTML = linkify(questById[q].cite);
    $('atts').dataset.sig = ''; }
  else if (NPCS[selNpc].official) { $('cBody').value = ''; $('cBody').placeholder = `Say something to ${NPCS[selNpc].shortName}…`; $('cHint').textContent = 'Officials answer right away. They set the rules but can\'t decide your permit.'; }
  else { $('cBody').value = `Hello ${NPCS[selNpc].name},\n\n`; $('cHint').textContent = 'Questions are free, take ~2 days, and never change your permits.'; }
}
$('cQuest').onchange = () => { composeQuest = $('cQuest').value; $('cQuest').dataset.keep = composeQuest; fillDraft(); $('atts').dataset.sig = ''; render(); };
$('send').onclick = () => {
  const questId = $('cQuest').value || null;
  const attachments = [...document.querySelectorAll('#atts input:checked')].map(i => i.value);
  const r = send(g, { npc: selNpc, questId, body: $('cBody').value, subject: subjectNow(), attachments });
  voice(r.reply, selNpc);
  composeQuest = null; $('cQuest').dataset.keep = '#'; $('atts').dataset.sig = '';
  if (NPCS[selNpc].official) { if (!voiceOn) talk(headPortrait, 2500); else toast(`${NPCS[selNpc].shortName} is thinking…`); }
  else toast(`✉ Sent to ${NPCS[selNpc].name}. Reply expected around day ${r.reply.deliverDay}. Press ⏭ or run the clock.`);
  render();
};

function renderQuests() {
  const icon = q => q.status === 'done' ? '✅' : q.status === 'pending' ? '⏳' : q.ready ? '🟢' : '🔒';
  let sec = '';
  $('qlist').innerHTML = questLog(g).map(q => (q.section && q.section !== sec ? (sec = q.section, `<h2 style="margin-top:12px">${q.section} <span class="claude" style="text-transform:none">pick one lender</span></h2>`) : '') + `<div class="q ${q.status === 'done' ? 'done' : !q.ready && q.status === 'open' ? 'locked' : ''}" data-q="${q.id}"><span class="st">${icon(q)}</span><div><div class="t">${q.title}</div><div class="m">${NPCS[q.npc].avatar} ${NPCS[q.npc].name}${typeof q.feeNow === 'number' && q.feeNow ? ' · ' + fmt$(q.feeNow) + (q.est ? ' est.' : '') : ''}${q.status === 'open' && !q.ready ? ' · after: ' + q.waitingOn.join(', ') : ''}</div></div></div>`).join('');
  document.querySelectorAll('.q').forEach(el => el.onclick = () => { const q = questById[el.dataset.q]; selNpc = q.npc; composeQuest = q.id; $('cQuest').dataset.keep = '#'; render(); });
  const vs = g.plan.eval.violations;
  $('viol').innerHTML = !plan.length ? '<li style="color:var(--mute)">Place a home, a well and a septic drainfield on the lot.</li>' : vs.length ? vs.map(v => `<li title="${esc(v.ref)}">${esc(v.msg)}</li>`).join('') : '<li style="color:var(--green)">✓ Site plan meets the rules we check</li>';
  $('docs').innerHTML = g.docs.length ? g.docs.map(d => `<li>${docName(d)}</li>`).join('') : '<li style="color:var(--mute)">None yet</li>';
  $('parcel').innerHTML = `<b>${parcel.county || 'King'} County · ${parcel.apn}</b><br>${parcel.zoning || 'zoning n/a (RA-5 rules)'} · ${parcel.acres?.toFixed(2)} ac · ${parcel.jurisdiction || ''}<br>${parcel.use || ''}${parcel.address ? ' · ' + parcel.address : ''}<br>Relief ${(Math.max(...hs) - Math.min(...hs)).toFixed(0)} m in view${(parcel.county || 'King') === 'King' ? ` · <a href="https://blue.kingcounty.com/Assessor/eRealProperty/Detail.aspx?ParcelNbr=${parcel.apn}" target="_blank" rel="noopener">Assessor ↗</a>` : ''}${g.quests.cad === 'done' && g.site ? `<br><b>Site:</b> ${g.site.stream ? '🌊 seasonal stream — buffer + HPA needed' : 'no streams or wetlands'} · ~${g.site.trees} trees in the build area` : ''}<br><button id="pickLand" style="margin-top:6px">🗺 Pick other land in Washington</button>`;
  $('pickLand').onclick = () => openMap(c);
}

let toastCb = null;
function toast(t, cb) { $('toast').textContent = t; $('toast').style.display = 'block'; toastCb = cb; clearTimeout(toast.h); toast.h = setTimeout(() => $('toast').style.display = 'none', 4500); }
$('toast').onclick = () => { $('toast').style.display = 'none'; toastCb?.(); };

function modal(html) { $('modalCard').innerHTML = html; $('modal').style.display = 'flex'; }
function introModal() {
  modal(`<h1>🏡 ${SCENARIO.title}</h1><p>${SCENARIO.pitch}</p>
  <p><b>Real parcel:</b> ${parcel.county || 'King'} County ${parcel.apn}, ${parcel.zoning || ''} ${parcel.acres?.toFixed(1)} acres, real USGS terrain. Or pick any parcel in Washington from the map.</p>
  <p><b>How to play</b></p><ol style="padding-left:18px;margin:4px 0">
  <li><b>Shop</b> real Washington sheds and homes 🛒, then place your home, a well and a septic drainfield. Respect the setbacks.</li>
  <li>Every move is an <b>email</b> to a real agency or a contractor. Pick a request, attach documents, send.</li>
  <li>Replies arrive on the clock. Press <b>⏭ Next mail</b> to wait. Approvals unlock the next steps.</li>
  <li><b>Finance it.</b> You have ${fmt$(SCENARIO.budget)} cash — not enough for a home. Get pre-qualified at a bank 🏦, apply with your plans, close after the building permit. Interest runs monthly.</li>
  <li>Win: pass final inspection by day ${SCENARIO.deadlineDay} without running out of money.</li></ol>
  <p class="claude">Agency names and contacts are real; fees follow King County's 2026 fee guides; contractors are fictional. Replies are a game simulation, not permitting advice.</p>
  <p style="text-align:right"><button id="goMap">🗺 Pick land on the map</button> <button class="primary" id="go">Start on this lot</button></p>`);
  $('go').onclick = () => { $('modal').style.display = 'none'; };
  $('goMap').onclick = () => { $('modal').style.display = 'none'; openMap(); };
}
function endModal() {
  const o = g.outcome;
  modal(o.won ? `<h1>🎉 You live here now.</h1><p>Final inspection passed on <b>day ${o.day}</b>.</p><p>Spent ${fmt$(g.spent)} · ${fmt$(g.budget)} left · ${Object.values(g.threads).flat().filter(m => m.from === 'me').length} emails sent.</p>${o.mortgage ? `<p>Your construction loan converted to a 30-year mortgage: <b>${fmt$(o.mortgage)}/month</b> (${fmt$(g.loan.interest)} of interest paid during the build).</p>` : ''}<p class="claude">In real life this took ${o.day} days of waiting. You did it in minutes. Now you know the path.</p><p style="text-align:right"><button class="primary" id="again">Play again</button></p>`
    : `<h1>⌛ Out of time</h1><p>${o.reason}. You finished ${Object.values(g.quests).filter(s => s === 'done').length} of ${QUESTS.length} steps.</p><p style="text-align:right"><button class="primary" id="again">Try again</button></p>`);
  $('again').onclick = () => { $('modal').style.display = 'none'; startGame(); };
}

// ---------------------------------------------------------------- build bar
const ICON = { accessory: '🛖', dwelling: '🏠', adu: '🏡', rv: '🚐', well: '💧', septic: '🟫', power: '☀️' };
$('catalog').innerHTML = ['well', 'septic', 'solar'].map(id => `<button data-item="${id}">${ICON[byId[id].kind]} ${byId[id].name.split(' ')[0] === 'Drilled' ? 'Well' : byId[id].name.split(' ')[0]}</button>`).join('') + '<button id="shopBtn" class="primary">🛒 Shop homes & sheds</button><span id="toolName" class="claude"></span>';
document.querySelectorAll('#catalog [data-item]').forEach(b => b.onclick = () => setTool(tool === b.dataset.item ? null : b.dataset.item));
$('shopBtn').onclick = () => openShop();
$('topShop').onclick = () => openShop();
$('topMap').onclick = () => openMap(c);
let shopTab = 'homes';
const hex = n => '#' + n.toString(16).padStart(6, '0');
const priceLabel = i => i.priceType === 'listed' ? 'listed price' : i.priceType === 'starting-at' ? 'starting at · excl. site work' : i.priceType === 'base-kit' ? 'base kit' : i.estPrice ? 'game estimate' : '';
const thumbs = new Map(); let thumbR = null;
function thumbFor(item) {
  if (thumbs.has(item.id)) return thumbs.get(item.id);
  thumbR ||= new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setSize(160, 120);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x667755, 1.6)); const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(10, 20, 14); sc.add(l);
  const m = makeStructure(item); sc.add(m);
  const size = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()), k = Math.max(size.x, size.y, size.z) * 0.72;
  const c2 = new THREE.OrthographicCamera(-k * 1.33, k * 1.33, k, -k, -100, 100); c2.position.set(10, 8, 10); c2.lookAt(0, size.y * 0.35, 0);
  thumbR.render(sc, c2); const url = thumbR.domElement.toDataURL(); thumbs.set(item.id, url); return url;
}
function openShop(tab = shopTab) {
  shopTab = tab;
  const tabs = [...SHOP_TABS, ['all', 'Everything', () => true]];
  const f = tabs.find(t => t[0] === tab)[2];
  const items = CATALOG.filter(f).sort((a, b) => a.cost - b.cost);
  $('shopTabs').innerHTML = tabs.map(([id, n]) => `<button data-st="${id}" class="${id === tab ? 'on' : ''}">${n}</button>`).join('');
  $('shopGrid').innerHTML = items.map(i => {
    const badges = [
      i.permit === 'exempt' && ['ok', 'No building permit (<200 sq ft)'], i.permit === 'building' && ['', 'Building permit'],
      i.kind === 'rv' && ['bad', 'RV in King County — not a legal home'], isHome(i) && ['ok', 'Legal dwelling'], i.kind === 'adu' && ['', 'Needs a primary home'],
      i.factoryBuilt && i.kind !== 'accessory' && ['', 'Factory-built'], i.estFootprint && ['warn', 'Footprint estimated'], i.status === 'UNVERIFIED' && ['warn', 'Unverified listing'],
    ].filter(Boolean);
    const afford = !paidOnPlacement(i) || i.cost <= g.budget;
    return `<div class="item"><img class="thumb" src="${thumbFor(i)}" alt=""><div class="body">
      <b>${esc(i.name)}</b><br><small>${esc(i.vendor || 'Site work')}${i.vendorCity ? ' · ' + esc(i.vendorCity) : ''}</small>
      <div>${i.wFt ? `${i.wFt}×${i.dFt} ft · ` : ''}${i.sqft} sq ft</div>
      <div class="price">${i.cost ? fmt$(i.cost) : 'priced by quests'} <small>${priceLabel(i)}</small></div>
      ${i.includes ? `<small class="claude">${esc(i.includes)}</small>` : ''}
      <div class="badges">${badges.map(([k, t]) => `<span class="bdg ${k}">${t}</span>`).join('')}</div>
      <div class="act"><button class="primary" data-buy="${i.id}" ${afford ? '' : 'disabled'}>${afford ? 'Place on lot' : 'Can’t afford'}</button>${i.url ? ` <a href="${i.url}" target="_blank" rel="noopener">Vendor page ↗</a>` : ''}</div></div></div>`;
  }).join('');
  $('shop').style.display = 'flex';
  document.querySelectorAll('[data-st]').forEach(b => b.onclick = () => openShop(b.dataset.st));
  document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { $('shop').style.display = 'none'; setTool(b.dataset.buy); toast(`Placing ${byId[b.dataset.buy].name}: click the lot. R rotates, Esc cancels.`); });
}
const isHome = i => i.kind === 'dwelling';
$('shopClose').onclick = () => { $('shop').style.display = 'none'; };

// ---------------------------------------------------------------- loop
let last = performance.now();
renderer.setAnimationLoop(now => {
  if (clock) {
    clock.tick((now - last) / 1000);
    if (g && !g.outcome) advance();
    const hour = new Date(clock.t).getUTCHours() + new Date(clock.t).getUTCMinutes() / 60;
    const a = (hour - 6) / 12 * Math.PI; sun.position.set(Math.cos(a) * 60, Math.max(Math.sin(a), 0.15) * 80, 20);
    sun.intensity = clock.speed >= 1440 ? 1.6 : hour > 6 && hour < 18 ? 1.6 : 0.3;
  }
  last = now; renderer.render(scene, cam);
});

buildWorld(await (await fetch('/data/parcel.json')).json());
try { const s = await (await fetch('/api/status')).json(); voiceOn = s.claude; $('sVoice').textContent = s.claude ? '✦ Claude' : 'Scripted'; $('sVoice').title = s.claude ? s.model : 'Add ANTHROPIC_API_KEY to .env'; } catch { $('sVoice').textContent = 'Scripted'; }
initMap(d => { buildWorld(d); startGame(); toast(`📍 New land: ${d.parcel.acres} acres in ${d.parcel.county} County. Fresh budget, fresh inbox.`); });
startGame(); introModal();
window.__shedlife = { mapDebug, openShop, autoplay: () => { const r = autoplay(g); clock.t = SCENARIO.startDate + g.day * DAY; syncPlan(); syncSite(); render(); return r; }, get g() { return g; }, plan, clock: () => clock, placeItem, get ring() { return ringM; }, render };
