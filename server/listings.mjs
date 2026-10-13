// "Land for sale" providers. Only official APIs or official public-record lists; no scraping.
import { readFileSync, existsSync } from 'node:fs';

// Bay Area search circles for RentCast (lat, lon, radius miles).
export const BAY_AREA = [
  { label: 'Peninsula / Coastside', lat: 37.5, lon: -122.35, radius: 20 },
  { label: 'South Bay', lat: 37.3, lon: -121.9, radius: 25 },
  { label: 'East Bay', lat: 37.75, lon: -122.1, radius: 20 },
  { label: 'North Bay', lat: 38.2, lon: -122.6, radius: 25 },
];

export const acres = sqft => sqft ? +(sqft / 43560).toFixed(3) : null;

export function normalizeRentcast(r) {
  return {
    id: `rentcast:${r.id}`, source: 'RentCast (MLS-derived)', kind: 'listing', status: r.status,
    title: r.formattedAddress, city: r.city, county: r.county, lat: r.latitude, lon: r.longitude,
    price: r.price ?? null, priceLabel: 'List price', lotSqft: r.lotSize ?? null, acres: acres(r.lotSize),
    daysOnMarket: r.daysOnMarket ?? null, mls: r.mlsName ? `${r.mlsName} #${r.mlsNumber}` : null,
    url: r.listingOffice?.website || r.listingAgent?.website || null,
  };
}

export async function rentcastLand(key, areas = BAY_AREA, { fetchImpl = fetch, limit = 50 } = {}) {
  const out = [];
  for (const a of areas) {
    const q = new URLSearchParams({ latitude: a.lat, longitude: a.lon, radius: a.radius, propertyType: 'Land', status: 'Active', limit });
    const r = await fetchImpl(`https://api.rentcast.io/v1/listings/sale?${q}`, { headers: { 'X-Api-Key': key, accept: 'application/json' } });
    if (!r.ok) throw new Error(`RentCast ${r.status}: ${(await r.text()).slice(0, 200)}`);
    out.push(...(await r.json()).map(normalizeRentcast));
  }
  const seen = new Set();
  return out.filter(l => !seen.has(l.id) && seen.add(l.id));
}

// Official county tax-defaulted sale lists, imported by scripts/import-taxsale.mjs from the county's own file.
export function taxSaleLots(path = new URL('../data/taxsale-listings.json', import.meta.url)) {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8')).lots || [];
}

export async function allListings(env = process.env, opts = {}) {
  const res = { listings: [], providers: [] };
  if (env.RENTCAST_API_KEY) {
    try { const l = await rentcastLand(env.RENTCAST_API_KEY, BAY_AREA, opts); res.listings.push(...l); res.providers.push({ id: 'rentcast', ok: true, count: l.length }); }
    catch (e) { res.providers.push({ id: 'rentcast', ok: false, error: String(e.message) }); }
  } else res.providers.push({ id: 'rentcast', ok: false, error: 'RENTCAST_API_KEY not set (free Developer plan: https://app.rentcast.io/app/api)' });
  const t = taxSaleLots(); res.listings.push(...t); res.providers.push({ id: 'county-tax-sale', ok: true, count: t.length });
  res.listings.sort((a, b) => (a.price ?? 9e15) - (b.price ?? 9e15));
  return res;
}
