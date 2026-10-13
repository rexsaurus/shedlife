import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeRentcast, rentcastLand, allListings, acres } from '../server/listings.mjs';
import { parseCsv, toLots } from '../server/taxsale.mjs';

test('RentCast record normalizes to a listing', () => {
  const l = normalizeRentcast({ id: 'x', formattedAddress: '0 Main St, Montara, CA', city: 'Montara', county: 'San Mateo', latitude: 37.5, longitude: -122.5, price: 250000, lotSize: 43560, status: 'Active', mlsName: 'MLSListings', mlsNumber: '1', listingOffice: { website: 'https://broker.example' } });
  assert.equal(l.acres, 1); assert.equal(l.price, 250000); assert.equal(l.url, 'https://broker.example'); assert.equal(acres(21780), 0.5);
});
test('RentCast client sends key header + Land filter and dedupes', async () => {
  const calls = [];
  const fetchImpl = async (url, o) => { calls.push([url, o.headers['X-Api-Key']]); return { ok: true, json: async () => [{ id: 'a', price: 1 }] }; };
  const l = await rentcastLand('K', [{ lat: 1, lon: 2, radius: 3 }, { lat: 1, lon: 2, radius: 3 }], { fetchImpl });
  assert.equal(l.length, 1); assert.match(calls[0][0], /propertyType=Land/); assert.equal(calls[0][1], 'K');
});
test('no key: provider reports off, no crash', async () => {
  const r = await allListings({});
  assert.equal(r.providers.find(p => p.id === 'rentcast').ok, false);
});
test('county tax-sale CSV import keeps vacant lots', () => {
  const rows = parseCsv('APN,Minimum Bid,Acres,Description\n"123-45-678","$12,500",0.25,Vacant Land\n111-11-111,90000,0.1,Residential\n');
  const lots = toLots(rows, { county: 'santa-clara', sale: 'Oct 30–Nov 2, 2026', saleUrl: 'https://www.bid4assets.com/santaclara' });
  assert.equal(lots.length, 1); assert.equal(lots[0].price, 12500); assert.equal(lots[0].url, 'https://www.bid4assets.com/santaclara');
});
