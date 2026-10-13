// Structure catalog. Dimensions are typical real sizes; prices are game estimates of typical 2026
// Pacific Northwest installed prices, before permits — not quotes. Pure data, no Three.js.
const ft = v => +(v * 0.3048).toFixed(3);

// kind: accessory | dwelling | adu | rv | well | septic | power | water
export const CATALOG = [
  { id: 'shed10x12', name: 'Shed 10×12', kind: 'accessory', w: ft(10), d: ft(12), h: 2.3, sqft: 120, cost: 7200, buildDays: 3, color: 0xb5835a, roof: 0x4a5a66 },
  { id: 'shed12x16', name: 'Cabin shed 12×16', kind: 'accessory', w: ft(12), d: ft(16), h: 2.8, sqft: 192, cost: 14500, buildDays: 5, color: 0x9a6b45, roof: 0x3d4a40 },
  { id: 'studio', name: 'Studio 14×16 (conditioned)', kind: 'accessory', conditioned: true, w: ft(14), d: ft(16), h: 3.0, sqft: 224, cost: 42000, buildDays: 12, color: 0xe8e4da, roof: 0x2f3b45 },
  { id: 'tiny', name: 'Tiny home 12×28 (modular)', kind: 'dwelling', factoryBuilt: true, w: ft(12), d: ft(28), h: 4.0, sqft: 336, cost: 98000, buildDays: 21, color: 0x7d9aa8, roof: 0x3a3f44 },
  { id: 'prefab', name: 'Prefab home 24×40 (modular)', kind: 'dwelling', factoryBuilt: true, w: ft(24), d: ft(40), h: 4.5, sqft: 960, cost: 245000, buildDays: 45, color: 0xd9cfc1, roof: 0x444b52 },
  { id: 'cabin', name: 'Stick-built cabin 20×30', kind: 'dwelling', w: ft(20), d: ft(30), h: 5.0, sqft: 600, cost: 180000, buildDays: 120, color: 0x8a5a3b, roof: 0x2e2e2e },
  { id: 'adu', name: 'Detached ADU 20×24', kind: 'adu', factoryBuilt: true, w: ft(20), d: ft(24), h: 4.0, sqft: 480, cost: 150000, buildDays: 30, color: 0xa7b89b, roof: 0x39433a },
  { id: 'rv', name: 'Travel trailer 25 ft', kind: 'rv', w: ft(8), d: ft(25), h: 3.2, sqft: 200, cost: 32000, buildDays: 1, color: 0xf3f1ea, roof: 0xb9c2c8 },
  { id: 'well', name: 'Drilled well', kind: 'well', w: 1.2, d: 1.2, h: 1.0, sqft: 15, cost: 0, buildDays: 0, color: 0x4e7fa3, roof: 0x4e7fa3 },
  { id: 'septic', name: 'Septic tank + drainfield', kind: 'septic', w: ft(30), d: ft(60), h: 0.15, sqft: 1800, cost: 0, buildDays: 0, color: 0x6b5a45, roof: 0x6b5a45 },
  { id: 'solar', name: 'Ground-mount solar 8 kW', kind: 'power', w: 4, d: 7, h: 1.8, sqft: 300, cost: 22000, buildDays: 5, color: 0x1d2b4f, roof: 0x1d2b4f },
].map(i => ({ ...i,
  // King County: detached, unconditioned accessory structures under 200 sq ft are building-permit exempt (still must meet setbacks).
  permit: i.kind === 'accessory' && i.sqft < 200 && !i.conditioned ? 'exempt' : i.kind === 'rv' ? 'none' : 'building' }));

export const byId = Object.fromEntries(CATALOG.map(i => [i.id, i]));
export const isLivingSpace = i => i.kind === 'dwelling' || i.kind === 'adu';
