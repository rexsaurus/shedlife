// Site-plan rules for unincorporated King County, WA (RA zones), game-sized.
// Pure functions. The NPCs voice these results; they never invent them. Not legal or permitting advice.
import { pointInPolygon, polygonArea } from './geo.js';
import { isLivingSpace } from './catalog.js';

const FT = 0.3048;
export const RA = { // KCC 21A.12.030 densities & dimensions (street setback / interior setback / max impervious)
  'RA-2.5': { street: 30, interior: 5, impervious: 0.25 },
  'RA-5': { street: 30, interior: 10, impervious: 0.20 },
  'RA-10': { street: 30, interior: 10, impervious: 0.15 },
  'RA-20': { street: 30, interior: 10, impervious: 0.125 },
};
export const RULES = {
  interiorSetback: { ref: 'KCC 21A.12.030 (RA interior setback; street setback 30 ft — street edge not modeled, all lines treated as interior)' },
  drainfieldToBuilding: { m: 10 * FT, ref: 'WAC 246-272A-0210 Table IV (drainfield 10 ft to building foundation)' },
  drainfieldToLine: { m: 5 * FT, ref: 'WAC 246-272A-0210 Table IV (5 ft to property line)' },
  wellToDrainfield: { m: 100 * FT, ref: 'WAC 246-272A-0210 / WAC 173-160-171 (100 ft well to drainfield)' },
  separation: { m: 6 * FT, ref: 'IRC R302.1 fire separation (game: 6 ft between a dwelling and other structures)' },
  steepSlope: { max: 0.40, ref: 'KCC 21A.06 / 21A.24 (steep slope hazard ≥40%) — geological critical area review' },
  adu: { maxSqft: 1000, ref: 'King County ADU rules (KCC 21A.08.030: one ADU, ≤1,000 sq ft heated, detached needs min lot area)' },
  rv: { ref: 'King County "Residential Tiny Homes" handout: an RV is not a dwelling; camping ≤60 days in 365' },
  exempt: { ref: 'King County: detached unconditioned accessory buildings under 200 sq ft need no building permit (setbacks still apply)' },
};

function segDist([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
export const distToRing = (p, ring) => Math.min(...ring.map((a, i) => segDist(p, a, ring[(i + 1) % ring.length])));

// Footprint corners (plan metres, y = north) for a structure centred at (x, y) rotated by rot (radians, CCW).
export function footprint(item, x, y, rot = 0) {
  const hw = item.w / 2, hd = item.d / 2, c = Math.cos(rot), s = Math.sin(rot);
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => [x + a * c - b * s, y + a * s + b * c]);
}

// Minimum gap between two convex footprints (0 if they touch or overlap).
export function polyGap(A, B) {
  const edges = P => P.map((a, i) => [a, P[(i + 1) % P.length]]);
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const cross = ([a, b], [c, d]) => o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
  if (A.some(p => pointInPolygon(p, B)) || B.some(p => pointInPolygon(p, A))) return 0;
  for (const e of edges(A)) for (const f of edges(B)) if (cross(e, f)) return 0;
  let g = Infinity;
  for (const p of A) for (const [a, b] of edges(B)) g = Math.min(g, segDist(p, a, b));
  for (const p of B) for (const [a, b] of edges(A)) g = Math.min(g, segDist(p, a, b));
  return g;
}

const fmtFt = m => `${Math.round(m / FT)} ft`;

/**
 * plan: [{ uid, item, corners:[[x,y]x4], slope }]   lot: { ring (metres), zoning }
 * → { ok, violations:[{uid, rule, msg, ref}], flags:{steepSlope, exemptOnly, home, adu}, impervious }
 */
export function evaluate(plan, lot) {
  const violations = [];
  const v = (uid, rule, msg, ref) => violations.push({ uid, rule, msg, ref });
  const zone = RA[lot.zoning] || RA['RA-5'];
  const lotArea = polygonArea(lot.ring);

  for (const p of plan) {
    const { item } = p;
    if (!p.corners.every(c => pointInPolygon(c, lot.ring))) { v(p.uid, 'lot-line', `${item.name} crosses the property line.`, 'Parcel boundary (King County GIS)'); continue; }
    const gap = Math.min(...p.corners.map(c => distToRing(c, lot.ring)));
    const need = item.kind === 'septic' ? RULES.drainfieldToLine.m : item.kind === 'well' ? 0 : zone.interior * FT;
    if (need && gap < need - 1e-6) v(p.uid, 'setback', `${item.name} is ${fmtFt(gap)} from the lot line; ${lot.zoning || 'RA-5'} needs ${fmtFt(need)}.`, item.kind === 'septic' ? RULES.drainfieldToLine.ref : RULES.interiorSetback.ref);
  }

  for (let i = 0; i < plan.length; i++) for (let j = i + 1; j < plan.length; j++) {
    const a = plan[i], b = plan[j], gap = polyGap(a.corners, b.corners);
    const kinds = [a.item.kind, b.item.kind];
    const has = k => kinds.includes(k), other = k => (a.item.kind === k ? b : a);
    if (gap === 0) { v(b.uid, 'overlap', `${b.item.name} overlaps ${a.item.name}.`, 'Physical reality'); continue; }
    if (has('septic') && has('well')) { if (gap < RULES.wellToDrainfield.m) v(other('septic').uid, 'well-septic', `Well is ${fmtFt(gap)} from the drainfield; needs ${fmtFt(RULES.wellToDrainfield.m)}.`, RULES.wellToDrainfield.ref); continue; }
    if (has('septic') && !has('well')) { if (gap < RULES.drainfieldToBuilding.m && other('septic').item.kind !== 'rv') v(other('septic').uid, 'septic-building', `Drainfield is ${fmtFt(gap)} from ${other('septic').item.name}; needs ${fmtFt(RULES.drainfieldToBuilding.m)}.`, RULES.drainfieldToBuilding.ref); continue; }
    if ((isLivingSpace(a.item) || isLivingSpace(b.item)) && !has('well') && gap < RULES.separation.m)
      v(b.uid, 'separation', `${b.item.name} is ${fmtFt(gap)} from ${a.item.name}; needs ${fmtFt(RULES.separation.m)}.`, RULES.separation.ref);
  }

  const homes = plan.filter(p => p.item.kind === 'dwelling'), adus = plan.filter(p => p.item.kind === 'adu');
  homes.slice(1).forEach(h => v(h.uid, 'dwelling-count', 'One primary dwelling per RA lot.', 'KCC 21A.12.030 (RA-5: one dwelling per 5 acres)'));
  adus.slice(1).forEach(a => v(a.uid, 'adu-count', 'One ADU per property.', RULES.adu.ref));
  adus.forEach(a => { if (!homes.length) v(a.uid, 'adu-primary', 'A detached ADU needs a primary dwelling on the lot.', RULES.adu.ref); if (a.item.sqft > RULES.adu.maxSqft) v(a.uid, 'adu-size', `ADU over ${RULES.adu.maxSqft} sq ft.`, RULES.adu.ref); });
  plan.filter(p => p.item.kind === 'rv' && !homes.length).forEach(r => v(r.uid, 'rv', `${r.item.name} counts as an RV in King County (tiny homes on wheels and park models included) — camping up to 60 days a year, not a legal home.`, RULES.rv.ref));
  if (homes.length && !plan.some(p => p.item.kind === 'septic')) v(null, 'septic-missing', 'A home needs a septic system on the plan.', 'WAC 246-272A');
  if (homes.length && !plan.some(p => p.item.kind === 'well')) v(null, 'well-missing', 'A home needs a water source on the plan (well).', 'RCW 19.27.097');

  const impervious = plan.filter(p => !['septic', 'well'].includes(p.item.kind)).reduce((s, p) => s + p.item.w * p.item.d, 0) / lotArea;
  if (impervious > zone.impervious) v(null, 'impervious', `Impervious surface ${(impervious * 100).toFixed(1)}% over the ${zone.impervious * 100}% limit.`, 'KCC 21A.12.030');

  return { ok: violations.length === 0, violations, impervious,
    flags: { steepSlope: plan.some(p => p.slope >= RULES.steepSlope.max), home: homes[0]?.item || null, adu: adus[0]?.item || null,
      exemptOnly: plan.length > 0 && plan.every(p => p.item.permit === 'exempt' || p.item.permit === 'none') } };
}
