// Server-side parcel + terrain loader (Node 18+). Public county ArcGIS REST + USGS 3DEP. No owner fields requested.
import { bboxOf } from '../src/geo.js';

export const COUNTIES = {
  'san-mateo': { name: 'San Mateo', url: 'https://gis.smcgov.org/maps/rest/services/Common/ACTIVE_PARCELS_APN/FeatureServer/0/query',
    apn: 'APN', fields: 'APN,PUCDESC,SITUS_CITY,UNINC', norm: p => ({ apn: p.APN, use: p.PUCDESC, city: p.SITUS_CITY, jurisdiction: p.UNINC }) },
  'santa-clara': { name: 'Santa Clara', url: 'https://services8.arcgis.com/fpjs8A5Vtkshblnd/arcgis/rest/services/Santa_Clara_County_Parcels/FeatureServer/0/query',
    apn: 'apn', fields: 'apn,situs_city', norm: p => ({ apn: p.apn, use: null, city: p.situs_city, jurisdiction: null }) },
};
const DEM = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples';
const cleanApn = a => String(a).replace(/[^0-9A-Za-z]/g, '');

async function queryCounty(c, extra) {
  const q = new URLSearchParams({ outFields: c.fields, outSR: '4326', f: 'geojson', ...extra });
  const r = await fetch(`${c.url}?${q}`); if (!r.ok) throw new Error(`${c.name} GIS ${r.status}`);
  return (await r.json()).features?.[0];
}

export async function findParcel({ county, apn, lat, lon }) {
  const list = county ? [[county, COUNTIES[county]]] : Object.entries(COUNTIES);
  for (const [key, c] of list) {
    if (!c) throw new Error(`unknown county ${county}`);
    const f = apn
      ? await queryCounty(c, { where: `${c.apn}='${cleanApn(apn)}'` })
      : await queryCounty(c, { geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects' });
    if (f) {
      const g = f.geometry; const ring = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0][0];
      return { county: c.name, ...c.norm(f.properties), ring };
    }
  }
  return null;
}

export async function sampleTerrain(ring, N = 24, pad = 0.35) {
  const bb = bboxOf(ring), px = (bb.maxX - bb.minX) * pad, py = (bb.maxY - bb.minY) * pad;
  const box = { minX: bb.minX - px, maxX: bb.maxX + px, minY: bb.minY - py, maxY: bb.maxY + py };
  const pts = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) pts.push([box.minX + (box.maxX - box.minX) * i / (N - 1), box.minY + (box.maxY - box.minY) * j / (N - 1)]);
  const heights = new Array(pts.length).fill(null);
  for (let s = 0; s < pts.length; s += 200) {
    const body = new URLSearchParams({ geometry: JSON.stringify({ points: pts.slice(s, s + 200), spatialReference: { wkid: 4326 } }), geometryType: 'esriGeometryMultipoint', returnFirstValueOnly: 'true', f: 'json' });
    const r = await (await fetch(DEM, { method: 'POST', body })).json();
    for (const smp of r.samples || []) heights[s + smp.locationId] = Number(smp.value);
  }
  const ok = heights.filter(h => Number.isFinite(h)); const fill = ok.length ? ok.reduce((a, b) => a + b) / ok.length : 0;
  return { units: 'm', n: N, bbox: box, heights: heights.map(h => Number.isFinite(h) ? h : fill) };
}

export async function loadParcel(q) {
  const parcel = await findParcel(q); if (!parcel) return null;
  return { source: { parcel: COUNTIES[Object.keys(COUNTIES).find(k => COUNTIES[k].name === parcel.county)].url, elevation: DEM, fetched: new Date().toISOString() },
    parcel, elevation: await sampleTerrain(parcel.ring) };
}
