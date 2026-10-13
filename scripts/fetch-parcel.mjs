// Refresh the bundled default parcel. Usage: node scripts/fetch-parcel.mjs [APN] [county=san-mateo]
import { writeFileSync } from 'node:fs';
import { loadParcel } from '../server/parcel.mjs';
const d = await loadParcel({ apn: process.argv[2] || '036174080', county: process.argv[3] || 'san-mateo' });
if (!d) throw new Error('parcel not found');
writeFileSync(new URL('../public/data/parcel.json', import.meta.url), JSON.stringify(d));
console.log(`APN ${d.parcel.apn} (${d.parcel.county}), ${d.parcel.ring.length} vertices, ${d.elevation.heights.length} elevation samples`);
