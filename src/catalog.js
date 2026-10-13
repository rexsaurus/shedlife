// Structure catalog = real Washington vendor products (src/data/vendors.js, researched 2026-10-12)
// + generic site/utility items + a few generic builds (game estimates). Pure data, no Three.js.
import VENDORS from './data/vendors.js';
import { rng } from './officials.js';

const ft = v => +(v * 0.3048).toFixed(3);
const PALETTE = [[0xc8a26b, 0x4a5a66], [0xb5835a, 0x3d4a40], [0xe8e4da, 0x2f3b45], [0x7d9aa8, 0x3a3f44], [0xd9cfc1, 0x444b52], [0xa7b89b, 0x39433a], [0x8a5a3b, 0x2e2e2e], [0x9fb3c8, 0x2b3a4a], [0xc94c3c, 0x3a2f2a], [0xe5d3a1, 0x5a4a3a]];
const DAYS = { accessory: 3, rv: 1, adu: 30, dwelling: 45 };
// Model archetype + palette per real product line (what the vendor's product actually looks like).
function styleFor(v) {
  const n = `${v.vendor} ${v.product}`.toLowerCase();
  if (n.includes('lofted barn')) return ['barn', [[0x9b2d20, 0x3b3b3b], [0x7a4a2a, 0x2f3b45], [0xc9b79a, 0x5a3a2a]]];
  if (n.includes('cabana')) return ['cabana', [[0xd8cdb4, 0x3d4a40]]];
  if (n.includes('dormer')) return ['dormer', [[0x6f8f7a, 0x2f2f2f]]];
  if (n.includes('utility')) return ['utility', [[0xb9b29f, 0x3b4652], [0x8a5a3b, 0x2e2e2e]]];
  if (n.includes('ranch') && v.kind === 'accessory') return ['ranchshed', [[0xc8b28e, 0x4a3a2a]]];
  if (n.includes('park model') || n.includes('pmrv')) return ['parkmodel', [[0xb08a5e, 0x2f3b45], [0x7d9aa8, 0x3a3f44]]];
  if (v.onWheels || n.includes('tiny')) return ['thow', [[0xa8794c, 0x2b2b2b], [0x5f7f8c, 0x2b2b2b], [0xc49a6c, 0x3a3f44], [0x3e4f43, 0x1f1f1f]]];
  if (n.includes('lindal')) return ['cedar', [[0xa0663a, 0x3a3f44], [0x8a5a34, 0x2e2e2e]]];
  if (n.includes('modular')) return ['ranch', [[0xd9cfc1, 0x444b52], [0x9fb3c8, 0x3a3f44], [0xb7b19c, 0x3b4652]]];
  return [v.kind === 'accessory' ? 'gable' : 'modern', PALETTE];
}
const PER_SQFT_EST = { adu: 420, dwelling: 330, rv: 450, accessory: 45 }; // used only when a vendor quotes on request

// Missing sizes → square footprint from sq ft (flagged estFootprint). Never invents a listed price.
function fromVendor(v) {
  let wFt = v.widthFt, dFt = v.depthFt; const sqft = v.sqft ?? (wFt && dFt ? wFt * dFt : null);
  let estFootprint = false;
  if (!wFt || !dFt) { estFootprint = true; if (dFt && !wFt) wFt = v.onWheels || v.kind === 'rv' ? 8.5 : Math.max(12, Math.round((sqft || 300) / dFt));
    else if (wFt && !dFt) dFt = Math.round((sqft || 300) / wFt); else { const s = Math.sqrt(sqft || 300); wFt = Math.round(s * 0.8); dFt = Math.round((sqft || 300) / wFt); } }
  const [style, pal] = styleFor(v), r = rng(v.id), [color, roof] = pal[Math.floor(r() * pal.length)];
  const priced = Number.isFinite(v.priceUsd);
  const area = sqft || wFt * dFt;
  return {
    id: v.id, name: v.product, vendor: v.vendor, vendorCity: v.vendorCity, url: v.productUrl || v.vendorUrl, vendorUrl: v.vendorUrl,
    kind: v.kind, w: ft(wFt), d: ft(dFt), h: ft(v.heightFt || (v.kind === 'accessory' ? 9 : v.kind === 'rv' ? 13 : 15)), sqft: Math.round(area), wFt, dFt,
    cost: Math.round(priced ? v.priceUsd : PER_SQFT_EST[v.kind] * area), priceType: v.priceType, priceListed: priced ? v.priceUsd : null, estPrice: !priced, estFootprint,
    includes: v.includes, notes: v.notes, conditioned: !!v.conditioned, onWheels: !!v.onWheels, factoryBuilt: v.factoryBuilt ?? (v.kind !== 'accessory'),
    status: v.status, checked: v.checked, buildDays: DAYS[v.kind] || 7, color, roof, style, source: 'vendor',
  };
}

const GENERIC = [
  { id: 'well', name: 'Drilled well', kind: 'well', w: 1.2, d: 1.2, h: 1.0, sqft: 15, cost: 0, buildDays: 0, color: 0x4e7fa3, roof: 0x4e7fa3, includes: 'Cost comes from the driller quest' },
  { id: 'septic', name: 'Septic tank + drainfield', kind: 'septic', w: ft(30), d: ft(60), h: 0.15, sqft: 1800, cost: 0, buildDays: 0, color: 0x6b5a45, roof: 0x6b5a45, includes: 'Cost comes from the designer + installer quests' },
  { id: 'solar', name: 'Ground-mount solar 8 kW', kind: 'power', w: 4, d: 7, h: 1.8, sqft: 300, cost: 22000, buildDays: 5, color: 0x1d2b4f, roof: 0x1d2b4f, estPrice: true },
  { id: 'tiny', style: 'modern', name: 'Generic modular tiny home 12×28', vendor: 'Generic builder (game estimate)', kind: 'dwelling', factoryBuilt: true, w: ft(12), d: ft(28), h: 4.0, sqft: 336, cost: 98000, buildDays: 21, color: 0x7d9aa8, roof: 0x3a3f44, estPrice: true },
  { id: 'cabin', style: 'cabin', name: 'Generic stick-built cabin 20×30', vendor: 'Generic builder (game estimate)', kind: 'dwelling', w: ft(20), d: ft(30), h: 5.0, sqft: 600, cost: 180000, buildDays: 120, color: 0x8a5a3b, roof: 0x2e2e2e, estPrice: true },
  { id: 'shed10x12', style: 'gable', name: 'Generic shed 10×12', vendor: 'Generic builder (game estimate)', kind: 'accessory', w: ft(10), d: ft(12), h: 2.3, sqft: 120, cost: 7200, buildDays: 3, color: 0xb5835a, roof: 0x4a5a66, estPrice: true },
  { id: 'studio', style: 'studio', name: 'Generic studio 14×16 (insulated, heated)', vendor: 'Generic builder (game estimate)', kind: 'accessory', conditioned: true, w: ft(14), d: ft(16), h: 3.0, sqft: 224, cost: 42000, buildDays: 12, color: 0xe8e4da, roof: 0x2f3b45, estPrice: true },
  { id: 'adu', style: 'modern', name: 'Generic detached ADU 20×24', vendor: 'Generic builder (game estimate)', kind: 'adu', factoryBuilt: true, w: ft(20), d: ft(24), h: 4.0, sqft: 480, cost: 150000, buildDays: 30, color: 0xa7b89b, roof: 0x39433a, estPrice: true },
].map(i => ({ source: 'generic', ...i }));

export const CATALOG = [...GENERIC, ...VENDORS.map(fromVendor)].map(i => ({ ...i,
  // King County: detached, unconditioned accessory buildings under 200 sq ft need no building permit (setbacks still apply).
  // Tiny homes on wheels and park models are RVs in King County: not a dwelling.
  permit: i.kind === 'accessory' && i.sqft < 200 && !i.conditioned ? 'exempt' : i.kind === 'rv' ? 'none' : ['well', 'septic', 'power'].includes(i.kind) ? 'site' : 'building' }));

export const byId = Object.fromEntries(CATALOG.map(i => [i.id, i]));
export const isLivingSpace = i => i.kind === 'dwelling' || i.kind === 'adu';
// Paid at placement: everything except homes/ADUs (paid on delivery via the "set home" quest) and quest-priced site work.
export const paidOnPlacement = i => !isLivingSpace(i) && i.cost > 0;
export const SHOP_TABS = [
  ['sheds', 'Sheds & barns', i => i.kind === 'accessory'],
  ['tiny', 'Tiny homes & park models', i => i.kind === 'rv' || (i.kind === 'dwelling' && i.sqft < 500)],
  ['homes', 'Modular homes & ADUs', i => (i.kind === 'dwelling' && i.sqft >= 500) || i.kind === 'adu'],
  ['site', 'Well, septic, power', i => ['well', 'septic', 'power'].includes(i.kind)],
];
