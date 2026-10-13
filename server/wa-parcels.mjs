// Statewide Washington parcels (WaTech "Current Parcels", public ArcGIS REST, no key).
// Used by the map to show every parcel in view and to load any parcel into the game. No owner fields exist or are requested.
import { sampleTerrain, findParcel } from './parcel.mjs';
import { pointInPolygon, makeProjector, polygonArea } from '../src/geo.js';

export const WA_URL = 'https://services.arcgis.com/jsIt88o09Q0r1j8h/arcgis/rest/services/Current_Parcels/FeatureServer/0/query';
const FIELDS = 'PARCEL_ID_NR,ORIG_PARCEL_ID,COUNTY_NM,LANDUSE_CD,VALUE_LAND,VALUE_BLDG,SITUS_ADDRESS,SITUS_CITY_NM';
export const COUNTY_NAMES = { 1: 'Adams', 3: 'Asotin', 5: 'Benton', 7: 'Chelan', 9: 'Clallam', 11: 'Clark', 13: 'Columbia', 15: 'Cowlitz', 17: 'Douglas', 19: 'Ferry', 21: 'Franklin', 23: 'Garfield', 25: 'Grant', 27: 'Grays Harbor', 29: 'Island', 31: 'Jefferson', 33: 'King', 35: 'Kitsap', 37: 'Kittitas', 39: 'Klickitat', 41: 'Lewis', 43: 'Lincoln', 45: 'Mason', 47: 'Okanogan', 49: 'Pacific', 51: 'Pend Oreille', 53: 'Pierce', 55: 'San Juan', 57: 'Skagit', 59: 'Skamania', 61: 'Snohomish', 63: 'Spokane', 65: 'Stevens', 67: 'Thurston', 69: 'Wahkiakum', 71: 'Walla Walla', 73: 'Whatcom', 75: 'Whitman', 77: 'Yakima' };
// WA Dept. of Revenue land use codes (subset shown with names; others shown as the code).
export const LANDUSE = { 11: 'Single-family residence', 81: 'Agriculture', 83: 'Agriculture (current use)', 88: 'Designated forest land', 91: 'Undeveloped land', 92: 'Noncommercial forest', 94: 'Open space', 95: 'Timberland' };

export function normWa(p = {}) {
  return { id: p.PARCEL_ID_NR, origId: p.ORIG_PARCEL_ID, county: COUNTY_NAMES[+p.COUNTY_NM] || String(p.COUNTY_NM ?? ''),
    landuseCd: p.LANDUSE_CD ?? null, landuse: LANDUSE[p.LANDUSE_CD] || (p.LANDUSE_CD != null ? `DOR land use ${p.LANDUSE_CD}` : 'Land use unknown'),
    landValue: p.VALUE_LAND ?? null, bldgValue: p.VALUE_BLDG ?? null, address: p.SITUS_ADDRESS?.trim() || null, city: p.SITUS_CITY_NM?.trim() || null,
    vacant: p.VALUE_BLDG === 0 };
}

export const outerRing = g => g.type === 'Polygon' ? g.coordinates[0] : g.coordinates.reduce((a, p) => (p[0].length > a.length ? p[0] : a), []);
export function acresOf(ring) { const P = makeProjector(ring[0][0], ring[0][1]); return +(polygonArea(ring.map(P)) / 4046.856).toFixed(2); }
function interiorPoint(ring) {
  const c = ring.reduce((a, p) => [a[0] + p[0] / ring.length, a[1] + p[1] / ring.length], [0, 0]);
  if (pointInPolygon(c, ring)) return c;
  for (let i = 1; i < ring.length; i++) { const m = [(ring[0][0] + ring[i][0]) / 2, (ring[0][1] + ring[i][1]) / 2]; if (pointInPolygon(m, ring)) return m; }
  return c;
}

const cache = new Map();
export async function parcelsInBbox([w, s, e, n], { vacant = false, fetchImpl = fetch } = {}) {
  if (![w, s, e, n].every(Number.isFinite) || e - w > 0.15 || n - s > 0.1) throw new Error('Area too large — zoom in to load parcels');
  const key = [w, s, e, n].map(v => v.toFixed(4)).join(',') + vacant;
  if (cache.has(key)) return cache.get(key);
  const q = new URLSearchParams({ geometry: `${w},${s},${e},${n}`, geometryType: 'esriGeometryEnvelope', inSR: '4326', spatialRel: 'esriSpatialRelIntersects',
    where: vacant ? 'VALUE_BLDG = 0' : '1=1', outFields: FIELDS, outSR: '4326', geometryPrecision: '6', maxAllowableOffset: '0.000005',
    resultRecordCount: '2000', f: 'geojson' });
  const r = await fetchImpl(`${WA_URL}?${q}`); if (!r.ok) throw new Error(`WA parcels ${r.status}`);
  const j = await r.json(); if (j.error) throw new Error(j.error.message || 'WA parcels error');
  const out = { type: 'FeatureCollection', exceeded: !!j.properties?.exceededTransferLimit,
    features: (j.features || []).filter(f => f.geometry).map(f => ({ type: 'Feature', geometry: f.geometry, properties: normWa(f.properties) })) };
  if (cache.size > 200) cache.clear(); cache.set(key, out); return out;
}

export async function loadWaParcel(id, { fetchImpl = fetch } = {}) {
  const safe = String(id).replace(/[^0-9A-Za-z._-]/g, '');
  const q = new URLSearchParams({ where: `PARCEL_ID_NR='${safe}'`, outFields: FIELDS, outSR: '4326', f: 'geojson' });
  const r = await fetchImpl(`${WA_URL}?${q}`); if (!r.ok) throw new Error(`WA parcels ${r.status}`);
  const f = (await r.json()).features?.[0]; if (!f?.geometry) return null;
  const ring = outerRing(f.geometry), p = normWa(f.properties);
  let king = null;
  if (p.county === 'King') { const [lon, lat] = interiorPoint(ring); try { king = await findParcel({ county: 'king', lat, lon }); } catch { /* zoning optional */ } }
  return {
    source: { parcel: WA_URL, zoning: king ? 'King County PropertyInfo' : null, elevation: 'USGS 3DEP', fetched: new Date().toISOString() },
    parcel: { apn: king?.apn || p.origId || p.id, waId: p.id, county: p.county, state: 'WA', use: p.landuse + (p.vacant ? ' · no building value' : ''),
      city: p.city, address: p.address, jurisdiction: king?.jurisdiction || (p.city ? p.city : `Unincorporated ${p.county} County?`),
      zoning: king?.zoning || null, acres: acresOf(ring), landValue: p.landValue, ring },
    elevation: await sampleTerrain(ring),
  };
}
