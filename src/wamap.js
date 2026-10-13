// Statewide Washington parcel picker: OpenStreetMap basemap + WaTech parcels (via /api/wa/parcels).
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { makeProjector, polygonArea } from './geo.js';
import PLACES from './data/wa-places.js';

const WA_BOUNDS = [[45.54, -124.85], [49.0, -116.9]];
const MIN_ZOOM = 15;
export const JUMPS = [
  ['Snoqualmie Valley (King)', 47.535, -121.79], ['Cle Elum (Kittitas)', 47.2, -120.94], ['Whidbey Island', 48.03, -122.55],
  ['Skagit Valley', 48.42, -122.33], ['Sequim (Clallam)', 48.08, -123.1], ['Winthrop (Okanogan)', 48.48, -120.18],
  ['Enumclaw (King)', 47.2, -121.99], ['Port Orchard (Kitsap)', 47.53, -122.64],
];
const fmt$ = n => n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US');
const ringOf = g => g.type === 'Polygon' ? g.coordinates[0] : g.coordinates.reduce((a, p) => (p[0].length > a.length ? p[0] : a), []);
const acres = g => { const r = ringOf(g); const P = makeProjector(r[0][0], r[0][1]); return polygonArea(r.map(P)) / 4046.856; };

let map, layer, selLayer = null, seq = 0, vacantOnly = true, onPick, timer;
const $ = id => document.getElementById(id);

const style = f => f.properties.vacant
  ? { color: '#1b4332', weight: 1, fillColor: '#52b788', fillOpacity: 0.38 }
  : { color: '#555', weight: 0.6, fillColor: '#999', fillOpacity: 0.08 };

export function initMap(pick) {
  onPick = pick;
  map = L.map('wamapCanvas', { preferCanvas: true, zoomSnap: 0.5 }).fitBounds(WA_BOUNDS);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Parcels: WaTech statewide parcels' }).addTo(map);
  layer = L.geoJSON(null, { style, onEachFeature: (f, l) => {
    l.bindTooltip(`${f.properties.vacant ? '🟩 ' : ''}${f.properties.landuse} · ${acres(f.geometry).toFixed(2)} ac`, { sticky: true });
    l.on('click', () => select(f, l));
  } }).addTo(map);
  map.on('moveend', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
  $('waVacant').onchange = e => { vacantOnly = e.target.checked; load(); };
  $('waJumps').innerHTML = JUMPS.map(([n], i) => `<button data-j="${i}">${n}</button>`).join('');
  document.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { const [, la, lo] = JUMPS[+b.dataset.j]; map.setView([la, lo], 15.5); });
  setupSearch();
  $('waClose').onclick = closeMap;
}
export function openMap(center) {
  $('wamap').style.display = 'block'; map.invalidateSize();
  if (center) map.setView([center[1], center[0]], 15.5);
  load();
}
export const mapDebug = () => ({ map, layer });
export function closeMap() { $('wamap').style.display = 'none'; }
const status = t => { $('waStatus').textContent = t; };

async function load() {
  const z = map.getZoom();
  if (z < MIN_ZOOM) { layer.clearLayers(); return status(`Zoom in to see parcels (all of Washington's ~3 million are available). Or jump:`); }
  const b = map.getBounds(), my = ++seq;
  status('Loading parcels…');
  try {
    const r = await fetch(`/api/wa/parcels?bbox=${[b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(v => v.toFixed(5)).join(',')}&vacant=${vacantOnly ? 1 : 0}`);
    const fc = await r.json(); if (my !== seq) return;
    if (!r.ok) return status(fc.error);
    layer.clearLayers(); layer.addData(fc); selLayer = null;
    const v = fc.features.filter(f => f.properties.vacant).length;
    status(`${fc.features.length.toLocaleString()} parcels in view${vacantOnly ? '' : ` · ${v} vacant`}${fc.exceeded ? ' (zoom in for all)' : ''}. Click one.`);
  } catch (e) { status('Parcel service unavailable: ' + e.message); }
}

function select(f, l) {
  if (selLayer) layer.resetStyle(selLayer);
  selLayer = l; l.setStyle({ color: '#ffd23f', weight: 3, fillOpacity: 0.5 }); l.bringToFront?.();
  const p = f.properties, ac = acres(f.geometry);
  const warn = ac < 1 ? 'Small lot: a well needs 100 ft from any drainfield — tough under ~1 acre.' : ac > 200 ? 'Huge parcel: terrain is sampled coarsely.' : '';
  $('waCard').innerHTML = `<b>${p.address || 'No site address'}</b><br>${p.county} County${p.city ? ' · ' + p.city : ''}<br>
    ${p.landuse}<br>${ac.toFixed(2)} acres · land ${fmt$(p.landValue)} · buildings ${fmt$(p.bldgValue)}<br>
    <small>Parcel ${p.id}</small>${warn ? `<br><small style="color:#a8741a">${warn}</small>` : ''}
    ${p.county !== 'King' ? `<br><small style="color:#a8741a">Permit path is modeled on King County; ${p.county} County agencies are coming soon.</small>` : ''}
    <div style="margin-top:8px"><button class="primary" id="waBuild">Build here ▶</button></div>`;
  $('waBuild').onclick = async () => {
    $('waBuild').disabled = true; $('waBuild').textContent = 'Loading terrain…';
    try {
      const r = await fetch(`/api/wa/parcel?id=${encodeURIComponent(p.id)}`); const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      closeMap(); onPick(d);
    } catch (e) { $('waBuild').disabled = false; $('waBuild').textContent = 'Build here ▶'; status('Could not load parcel: ' + e.message); }
  };
}

// ---- Autocomplete: every bundled WA city/town/island instantly, plus live OpenStreetMap (Photon) results for anything else.
const ZOOM = { island: 13, city: 14, town: 14, village: 15, hamlet: 15, suburb: 15, locality: 15 };
const ICON = { island: '🏝️', city: '🏙️', town: '🏘️', village: '🏡', hamlet: '🏡', suburb: '🏘️' };
function localMatches(q) {
  const ql = q.toLowerCase().trim(); if (!ql) return [];
  const scored = [];
  for (const p of PLACES) { const n = p.n.toLowerCase(), i = n.indexOf(ql); if (i < 0) continue; scored.push([i === 0 ? 0 : n.includes(' ' + ql) ? 1 : 2, p.t === 'island' && /isl/.test(ql) ? -1 : 0, n.length, p]); }
  return scored.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]).slice(0, 8).map(x => x[3]);
}
let photonTimer = null, photonSeq = 0;
function setupSearch() {
  const box = $('waQuery'), sug = $('waSuggest'); let items = [], on = -1;
  const draw = () => {
    sug.innerHTML = items.length ? `<ul>${items.map((p, i) => `<li class="${i === on ? 'on' : ''}" data-i="${i}">${ICON[p.t] || '📍'} <b>${p.n}</b> <small>${p.t}${p.c ? ' · ' + p.c + ' County' : ''}${p.live ? ' · OSM' : ''}</small></li>`).join('')}</ul>` : '';
    sug.querySelectorAll('li').forEach(li => li.onmousedown = e => { e.preventDefault(); pick(items[+li.dataset.i]); });
  };
  const pick = p => { if (!p) return; box.value = p.n; items = []; draw(); map.setView([p.la, p.lo], ZOOM[p.t] || 15); status(`📍 ${p.n}${p.t === 'island' ? ' — zoom in to see parcels' : ''}`); };
  box.oninput = () => {
    const q = box.value; items = localMatches(q); on = items.length ? 0 : -1; draw();
    clearTimeout(photonTimer); if (q.trim().length < 3) return;
    const my = ++photonSeq;
    photonTimer = setTimeout(async () => {
      try {
        const r = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&bbox=-124.9,45.5,-116.9,49.1`)).json();
        if (my !== photonSeq) return;
        const live = (r.features || []).filter(f => f.properties.state === 'Washington').map(f => ({ n: f.properties.name, t: f.properties.osm_value || 'place', c: (f.properties.county || '').replace(' County', ''), la: f.geometry.coordinates[1], lo: f.geometry.coordinates[0], live: true }));
        const seen = new Set(items.map(p => p.n.toLowerCase()));
        items = items.concat(live.filter(p => p.n && !seen.has(p.n.toLowerCase()))).slice(0, 12); draw();
      } catch { /* offline: local list only */ }
    }, 250);
  };
  box.onkeydown = e => {
    if (e.key === 'ArrowDown') { on = Math.min(items.length - 1, on + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { on = Math.max(0, on - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Escape') { items = []; draw(); }
  };
  box.onblur = () => setTimeout(() => { items = []; draw(); }, 150);
  $('waSearch').onsubmit = e => { e.preventDefault(); if (items[on]) pick(items[on]); else { const m = localMatches(box.value)[0]; if (m) pick(m); else status('No match — keep typing or pick a suggestion.'); } };
}
