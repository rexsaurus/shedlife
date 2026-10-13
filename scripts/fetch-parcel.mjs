// Pull one real parcel (San Mateo County public ArcGIS REST) + real elevation (USGS 3DEP)
// and write public/data/parcel.json. Owner names are deliberately NOT requested.
// Usage: node scripts/fetch-parcel.mjs [APN] [gridN]
import { writeFileSync } from 'node:fs';
import { bboxOf } from '../src/geo.js';

const APN = process.argv[2] || '036174080';
const N = Number(process.argv[3] || 24);
const PARCELS = 'https://gis.smcgov.org/maps/rest/services/Common/ACTIVE_PARCELS_APN/FeatureServer/0/query';
const DEM = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples';

const q = new URLSearchParams({ where: `APN='${APN.replace(/[^0-9A-Za-z-]/g, '')}'`, outFields: 'APN,PUCDESC,SITUS_CITY,UNINC,ZONE_ID', outSR: '4326', f: 'geojson' });
const gj = await (await fetch(`${PARCELS}?${q}`)).json();
const f = gj.features?.[0];
if (!f) throw new Error(`APN ${APN} not found`);
const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
const bb = bboxOf(ring);
const padX = (bb.maxX - bb.minX) * 0.35, padY = (bb.maxY - bb.minY) * 0.35;
const box = { minX: bb.minX - padX, maxX: bb.maxX + padX, minY: bb.minY - padY, maxY: bb.maxY + padY };
const pts = [];
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++)
  pts.push([box.minX + (box.maxX - box.minX) * i / (N - 1), box.minY + (box.maxY - box.minY) * j / (N - 1)]);
const heights = new Array(pts.length).fill(null);
for (let s = 0; s < pts.length; s += 200) {
  const chunk = pts.slice(s, s + 200);
  const body = new URLSearchParams({ geometry: JSON.stringify({ points: chunk, spatialReference: { wkid: 4326 } }), geometryType: 'esriGeometryMultipoint', returnFirstValueOnly: 'true', f: 'json' });
  const r = await (await fetch(DEM, { method: 'POST', body })).json();
  for (const smp of r.samples || []) heights[s + smp.locationId] = Number(smp.value);
}
const out = {
  source: { parcel: PARCELS, elevation: DEM, fetched: new Date().toISOString() },
  parcel: { apn: f.properties.APN, use: f.properties.PUCDESC, city: f.properties.SITUS_CITY, jurisdiction: f.properties.UNINC, ring },
  elevation: { units: 'm', n: N, bbox: box, heights },
};
writeFileSync(new URL('../public/data/parcel.json', import.meta.url), JSON.stringify(out));
console.log(`APN ${out.parcel.apn} (${out.parcel.use}), ${ring.length} vertices, ${heights.filter(h => h != null).length}/${N * N} elevation samples`);
