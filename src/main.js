import * as THREE from 'three';
import { makeProjector, polygonArea, pointInPolygon, sampleHeight, snap } from './geo.js';
import { SimClock } from './clock.js';
import { CATALOG, byId } from './catalog.js';
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
  areaM2 = polygonArea(ringM); hs = elevation.heights;
}

// ---------------------------------------------------------------- game state
let g, clock, plan = [], uid = 0, tool = null, rot = 0, ghost = null, valid = false, selNpc = 'permitting', erase = false;
const lot = () => ({ ring: ringM, zoning: parcel.zoning || 'RA-5' });

function startGame() {
  g = newGame(SCENARIO); g.parcelId = parcel.apn; g.zoning = parcel.zoning; g.playerName = 'Rex';
  clock = new SimClock(SCENARIO.startDate); clock.setSpeed(0);
  plan.splice(0).forEach(p => scene.remove(p.mesh));
  syncPlan(); selNpc = 'permitting'; voice(g.threads.permitting[0], 'permitting'); render();
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
    if (plan[i].built && plan[i].item.cost) return toast('Built structures stay. (Demolition permits are a different game.)');
    scene.remove(plan[i].mesh); plan.splice(i, 1); syncPlan(); return render();
  }
  if (!tool || !valid) return;
  if (placeItem(tool, ghost.position.x, -ghost.position.z, rot) && !e.shiftKey) setTool(null);
});
// Place a catalog item at plan coords (x east, y north, metres from lot centre). Used by clicks and by tests.
function placeItem(id, x, y, r = 0) {
  const item = byId[id], buyNow = item.permit === 'exempt' || item.permit === 'none';
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
    syncPlan();
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
    if (r.ok) { msg.body = r.body; msg.voiced = true; render(); } else console.warn('voice', r.error);
  } catch (e) { console.warn(e); }
}

// ---------------------------------------------------------------- UI
let composeQuest = null;
function render() {
  if (!g) return;
  $('sDay').textContent = g.day; $('sDeadline').textContent = SCENARIO.deadlineDay;
  $('sBudget').textContent = fmt$(g.budget); $('sBudget').style.color = g.budget < 20000 ? 'var(--red)' : '';
  $('sProgress').textContent = `${Object.values(g.quests).filter(s => s === 'done').length}/${QUESTS.length}`;
  $('clock').textContent = `Day ${gameDay()}`;
  const u = unread(g); $('unread').innerHTML = u ? `<span class="badge b-answer">${u}</span>` : '';
  // threads
  const last = id => (g.threads[id] || []).filter(m => m.delivered).at(-1);
  const order = Object.keys(NPCS).sort((a, b) => (last(b)?.deliverDay ?? -1) - (last(a)?.deliverDay ?? -1));
  $('threads').innerHTML = order.map(id => {
    const n = NPCS[id], l = last(id), has = (g.threads[id] || []).some(m => m.delivered && !m.read && m.from !== 'me');
    const waiting = (g.threads[id] || []).some(m => !m.delivered);
    return `<div class="th ${id === selNpc ? 'sel' : ''}" data-npc="${id}"><div class="av">${n.avatar}</div><div><div class="nm">${n.name}${n.real ? '' : '<span class="tag">fictional</span>'}${waiting ? ' <span class="tag">⏳ awaiting</span>' : ''}</div><div class="sub">${l ? l.subject : n.org}</div></div>${has ? '<span class="dot"></span>' : ''}</div>`;
  }).join('');
  document.querySelectorAll('.th').forEach(el => el.onclick = () => { selNpc = el.dataset.npc; composeQuest = null; render(); });
  // thread
  const n = NPCS[selNpc], msgs = g.threads[selNpc] || [];
  msgs.forEach(m => { if (m.delivered) m.read = true; });
  $('thread').innerHTML = `<div class="msg" style="background:#f6f2e8"><b>${n.avatar} ${n.name}</b><br><span class="claude">${n.org}${n.email ? ' · ' + n.email : ''}${n.channel ? ' · ' + n.channel : ''}</span></div>` +
    msgs.map(m => m.from === 'me'
      ? `<div class="msg me"><div class="hd"><b>You</b><span>Day ${m.day}</span></div><b>${esc(m.subject)}</b>\n${esc(m.body)}${m.attachments?.length ? `<div class="att">📎 ${m.attachments.map(docName).join(', ')}</div>` : ''}</div>`
      : m.delivered
        ? `<div class="msg"><div class="hd"><b>${n.name}<span class="badge b-${m.verdict?.kind}">${label(m.verdict?.kind)}</span></b><span>Day ${m.deliverDay}${m.voiced ? ' · ✦ Claude' : ''}</span></div><b>${esc(m.subject)}</b>\n${esc(m.body)}</div>`
        : `<div class="msg pending">⏳ Waiting for a reply from ${n.name}… (expected around day ${m.deliverDay})</div>`).join('');
  $('thread').scrollTop = 1e9;
  renderCompose(); renderQuests();
}
const label = k => ({ accepted: 'APPROVED', 'needs-info': 'NEEDS INFO', 'too-early': 'NOT YET', corrections: 'CORRECTIONS', 'cant-pay': 'CAN’T PAY', pending: 'IN REVIEW', duplicate: 'DONE', answer: 'ANSWER', welcome: 'WELCOME' }[k] || '');
const linkify = t => esc(t).replace(/\((https?:[^)\s]+)\)/g, (m, u) => `(<a href="${u}" target="_blank" rel="noopener">source</a>)`);
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function renderCompose() {
  const n = NPCS[selNpc], qs = QUESTS.filter(q => q.npc === selNpc);
  $('cTo').textContent = `To: ${n.avatar} ${n.name}`;
  const opts = qs.map(q => `<option value="${q.id}">${{ done: '✅', pending: '⏳', open: '•' }[g.quests[q.id]]} ${q.title}</option>`).join('') + '<option value="">💬 Ask a question</option>';
  const log = questLog(g); const keep = composeQuest ?? (qs.find(q => g.quests[q.id] === 'open' && log.find(l => l.id === q.id).ready)?.id || qs.find(q => g.quests[q.id] === 'open')?.id || '');
  if ($('cQuest').dataset.npc !== selNpc || $('cQuest').dataset.keep !== keep) {
    $('cQuest').innerHTML = opts; $('cQuest').value = keep; $('cQuest').dataset.npc = selNpc; $('cQuest').dataset.keep = keep; fillDraft();
  } else { const v = $('cQuest').value; $('cQuest').innerHTML = opts; $('cQuest').value = v; }
  const held = ['site-plan', ...g.docs];
  const checked = new Set([...document.querySelectorAll('#atts input:checked')].map(i => i.value));
  if ($('atts').dataset.sig !== held.join() + selNpc) {
    const want = new Set($('cQuest').value ? draft(g, $('cQuest').value).attachments : []);
    $('atts').innerHTML = '📎 ' + held.map(d => `<label><input type="checkbox" value="${d}" ${want.has(d) || checked.has(d) ? 'checked' : ''}> ${docName(d)}</label>`).join('');
    $('atts').dataset.sig = held.join() + selNpc;
  }
  const real = n.real ? (n.email ? `mailto:${n.email}?subject=${encodeURIComponent(subjectNow())}&body=${encodeURIComponent($('cBody').value)}` : n.url) : null;
  $('realMail').textContent = n.real ? (n.email ? 'Open as real email ↗' : 'Real portal ↗') : 'fictional company';
  real ? $('realMail').setAttribute('href', real) : $('realMail').removeAttribute('href');
  $('send').disabled = !!g.outcome;
}
const subjectNow = () => $('cQuest').value ? `${questById[$('cQuest').value].title} — Parcel ${g.parcelId}` : `Question — Parcel ${g.parcelId}`;
function fillDraft() {
  const q = $('cQuest').value;
  if (q) { const d = draft(g, q); $('cBody').value = d.body; $('cHint').innerHTML = linkify(questById[q].cite);
    $('atts').dataset.sig = ''; }
  else { $('cBody').value = `Hello ${NPCS[selNpc].name},\n\n`; $('cHint').textContent = 'Questions are free, take ~2 days, and never change your permits.'; }
}
$('cQuest').onchange = () => { composeQuest = $('cQuest').value; $('cQuest').dataset.keep = composeQuest; fillDraft(); $('atts').dataset.sig = ''; render(); };
$('send').onclick = () => {
  const questId = $('cQuest').value || null;
  const attachments = [...document.querySelectorAll('#atts input:checked')].map(i => i.value);
  const r = send(g, { npc: selNpc, questId, body: $('cBody').value, subject: subjectNow(), attachments });
  voice(r.reply, selNpc);
  composeQuest = null; $('cQuest').dataset.keep = '#'; $('atts').dataset.sig = '';
  toast(`✉ Sent to ${NPCS[selNpc].name}. Reply expected around day ${r.reply.deliverDay}. Press ⏭ or run the clock.`);
  render();
};
$('newMail').onclick = () => { const order = Object.keys(NPCS); selNpc = order[(order.indexOf(selNpc) + 1) % order.length]; composeQuest = null; render(); };

function renderQuests() {
  const icon = q => q.status === 'done' ? '✅' : q.status === 'pending' ? '⏳' : q.ready ? '🟢' : '🔒';
  $('qlist').innerHTML = questLog(g).map(q => `<div class="q ${q.status === 'done' ? 'done' : !q.ready && q.status === 'open' ? 'locked' : ''}" data-q="${q.id}"><span class="st">${icon(q)}</span><div><div class="t">${q.title}</div><div class="m">${NPCS[q.npc].avatar} ${NPCS[q.npc].name}${typeof q.feeNow === 'number' && q.feeNow ? ' · ' + fmt$(q.feeNow) + (q.est ? ' est.' : '') : ''}${q.status === 'open' && !q.ready ? ' · after: ' + q.waitingOn.join(', ') : ''}</div></div></div>`).join('');
  document.querySelectorAll('.q').forEach(el => el.onclick = () => { const q = questById[el.dataset.q]; selNpc = q.npc; composeQuest = q.id; $('cQuest').dataset.keep = '#'; render(); });
  const vs = g.plan.eval.violations;
  $('viol').innerHTML = !plan.length ? '<li style="color:var(--mute)">Place a home, a well and a septic drainfield on the lot.</li>' : vs.length ? vs.map(v => `<li title="${esc(v.ref)}">${esc(v.msg)}</li>`).join('') : '<li style="color:var(--green)">✓ Site plan meets the rules we check</li>';
  $('docs').innerHTML = g.docs.length ? g.docs.map(d => `<li>${docName(d)}</li>`).join('') : '<li style="color:var(--mute)">None yet</li>';
  $('parcel').innerHTML = `<b>PIN ${parcel.apn}</b> · ${parcel.zoning} · ${parcel.acres?.toFixed(2)} ac<br>${parcel.jurisdiction} · ${parcel.use}<br>Relief ${(Math.max(...hs) - Math.min(...hs)).toFixed(0)} m in view · <a href="https://blue.kingcounty.com/Assessor/eRealProperty/Detail.aspx?ParcelNbr=${parcel.apn}" target="_blank" rel="noopener">Assessor ↗</a>`;
}

let toastCb = null;
function toast(t, cb) { $('toast').textContent = t; $('toast').style.display = 'block'; toastCb = cb; clearTimeout(toast.h); toast.h = setTimeout(() => $('toast').style.display = 'none', 4500); }
$('toast').onclick = () => { $('toast').style.display = 'none'; toastCb?.(); };

function modal(html) { $('modalCard').innerHTML = html; $('modal').style.display = 'flex'; }
function introModal() {
  modal(`<h1>🏡 ${SCENARIO.title}</h1><p>${SCENARIO.pitch}</p>
  <p><b>Real parcel:</b> King County PIN ${parcel.apn}, ${parcel.zoning}, ${parcel.acres?.toFixed(1)} acres, real USGS terrain.</p>
  <p><b>How to play</b></p><ol style="padding-left:18px;margin:4px 0">
  <li>Draw a site plan: place a home, a well and a septic drainfield (bottom bar). Respect the setbacks.</li>
  <li>Every move is an <b>email</b> to a real agency or a contractor. Pick a request, attach documents, send.</li>
  <li>Replies arrive on the clock. Press <b>⏭ Next mail</b> to wait. Approvals unlock the next steps.</li>
  <li>Win: pass final inspection by day ${SCENARIO.deadlineDay} without running out of ${fmt$(SCENARIO.budget)}.</li></ol>
  <p class="claude">Agency names and contacts are real; fees follow King County's 2026 fee guides; contractors are fictional. Replies are a game simulation, not permitting advice.</p>
  <p style="text-align:right"><button class="primary" id="go">Start</button></p>`);
  $('go').onclick = () => { $('modal').style.display = 'none'; };
}
function endModal() {
  const o = g.outcome;
  modal(o.won ? `<h1>🎉 You live here now.</h1><p>Final inspection passed on <b>day ${o.day}</b>.</p><p>Spent ${fmt$(g.spent)} · ${fmt$(g.budget)} left · ${Object.values(g.threads).flat().filter(m => m.from === 'me').length} emails sent.</p><p style="text-align:right"><button class="primary" id="again">Play again</button></p>`
    : `<h1>⌛ Out of time</h1><p>${o.reason}. You finished ${Object.values(g.quests).filter(s => s === 'done').length} of ${QUESTS.length} steps.</p><p style="text-align:right"><button class="primary" id="again">Try again</button></p>`);
  $('again').onclick = () => { $('modal').style.display = 'none'; startGame(); };
}

// ---------------------------------------------------------------- build bar
$('catalog').innerHTML = CATALOG.map(i => `<button data-item="${i.id}" title="${i.name} · ${i.sqft} sq ft${i.cost ? ' · ' + fmt$(i.cost) : ''}">${{ accessory: '🛖', dwelling: '🏠', adu: '🏡', rv: '🚐', well: '💧', septic: '🟫', power: '☀️' }[i.kind]} ${i.name.split(' (')[0]}</button>`).join('');
document.querySelectorAll('[data-item]').forEach(b => b.onclick = () => setTool(tool === b.dataset.item ? null : b.dataset.item));

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
startGame(); introModal();
window.__shedlife = { get g() { return g; }, plan, clock: () => clock, placeItem, get ring() { return ringM; }, render };
