// Government application forms. Each field has an `answer(g)` the engine checks against, and a `hint` telling the player
// where the value lives (an earlier approval email, the parcel panel, the site plan). Form names follow the real
// applications in spirit; layouts are game simplifications, not reproductions of county forms.
import { rng } from '../officials.js';

// Reference / license numbers issued when steps are approved. Deterministic per parcel.
export const REF_PREFIX = {
  cad: ['CADE', 'Critical Area Designation number'], designer: ['SD', 'designer license number'], driller: ['DRL', 'driller license number'],
  'well-site': ['WSA', 'well site approval number'], 'septic-design': ['OSSD', 'septic design approval number'], drill: ['WR', 'well report number'],
  water: ['WAD', 'water adequacy number'], grading: ['GRDE', 'clearing & grading permit number'], permit: ['RESB', 'building permit number'],
  electrical: ['ELE', 'electrical permit number'], biologist: ['CAR', 'critical area report number'], 'septic-install': ['ASB', 'septic as-built number'],
  survey: ['SRV', 'survey record number'],
};
export function issueRef(g, qid) {
  if (!REF_PREFIX[qid]) return null;
  g.refs ||= {};
  if (!g.refs[qid]) { const r = rng(`${g.parcelId || 'demo'}:${qid}`); g.refs[qid] = `${REF_PREFIX[qid][0]}26-${String(1000 + Math.floor(r() * 9000))}`; }
  if (qid === 'drill' && !g.refs.yield) g.refs.yield = 6 + Math.floor(rng(`${g.parcelId}:yield`)() * 18);
  if (qid === 'survey' && !g.refs.clearing) g.refs.clearing = Math.round((6000 + (g.site?.trees ?? 60) * 90) / 100) * 100;
  return g.refs[qid];
}
const ref = q => g => g.refs?.[q];
const from = q => `from your ${REF_PREFIX[q][1].replace(' number', '')} email`;

const PARCEL = { id: 'parcel', label: 'Parcel number (PIN)', type: 'text', answer: g => String(g.parcelId || ''), hint: 'top of the right-hand panel' };
const home = g => g.plan.eval.flags.home;
const wellToDrainfield = g => { // measured on the site plan, feet
  const w = g.plan.items.find(p => p.item.kind === 'well'), s = g.plan.items.find(p => p.item.kind === 'septic'); if (!w || !s) return null;
  const c = p => p.corners.reduce((a, [x, y]) => [a[0] + x / 4, a[1] + y / 4], [0, 0]); const [a, b] = [c(w), c(s)];
  return Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]) / 0.3048);
};
export const measuredWellDistance = wellToDrainfield;

export const FORMS = {
  zoning: { name: 'Zoning & development inquiry', fields: [PARCEL] },
  cad: { name: 'Critical Area Designation (CAD) application', fields: [PARCEL,
    { id: 'acres', label: 'Lot size (acres)', type: 'number', answer: g => g.acres, tol: 0.15, hint: 'parcel panel' },
    { id: 'use', label: 'Proposed use', type: 'select', options: ['Single-family residence', 'Commercial', 'Subdivision', 'Agriculture'], answer: () => 'Single-family residence' }] },
  'septic-design': { name: 'On-site sewage system design application', fields: [PARCEL,
    { id: 'designer', label: 'Designer license number', type: 'text', answer: ref('designer'), hint: 'from your septic designer\'s engagement email' },
    { id: 'cadno', label: 'CAD number', type: 'text', answer: ref('cad'), hint: from('cad') },
    { id: 'system', label: 'System type', type: 'select', options: ['Gravity', 'Pressure distribution', 'Mound'], answer: () => 'Pressure distribution', hint: 'soil logs report says pressure distribution' }] },
  'well-site': { name: 'Private well site application', fields: [PARCEL,
    { id: 'dist', label: 'Distance from well to drainfield (ft)', type: 'number', answer: wellToDrainfield, tol: 6, min: 100, hint: 'measure on your site plan (shown under Site plan check)' },
    { id: 'cadno', label: 'CAD number', type: 'text', answer: ref('cad'), hint: from('cad') }] },
  noi: { name: 'Water well Notice of Intent (start card)', fields: [PARCEL,
    { id: 'driller', label: 'Driller license number', type: 'text', answer: ref('driller'), hint: 'from your well driller\'s booking email' },
    { id: 'wsa', label: 'Well site approval number', type: 'text', answer: ref('well-site'), hint: from('well-site') },
    { id: 'county', label: 'County', type: 'select', options: ['King', 'Snohomish', 'Pierce', 'Kittitas'], answer: g => g.county || 'King' }] },
  water: { name: 'Water adequacy review submittal', fields: [PARCEL,
    { id: 'wr', label: 'Well report number', type: 'text', answer: ref('drill'), hint: 'from the driller\'s completion email' },
    { id: 'gpm', label: 'Pump test yield (gpm)', type: 'number', answer: g => g.refs?.yield, tol: 0, hint: 'from the driller\'s completion email' }] },
  grading: { name: 'Clearing & grading permit application', fields: [PARCEL,
    { id: 'cadno', label: 'CAD number', type: 'text', answer: ref('cad'), hint: from('cad') },
    { id: 'area', label: 'Area to be cleared (sq ft)', type: 'number', answer: g => g.refs?.clearing, tol: 200, hint: 'clearing limits from your survey email' },
    { id: 'tesc', label: 'Erosion control (TESC) plan included', type: 'check', answer: () => true }] },
  hpa: { name: 'Hydraulic Project Approval application (APPS)', fields: [PARCEL,
    { id: 'type', label: 'Stream type', type: 'select', options: ['Type S (shoreline)', 'Type F (fish-bearing)', 'Type N (seasonal, non-fish)', 'Type O'], answer: () => 'Type N (seasonal, non-fish)', hint: 'from your stream study' },
    { id: 'car', label: 'Critical area report number', type: 'text', answer: ref('biologist'), hint: from('biologist') }] },
  permit: { name: 'Residential building permit application', fields: [PARCEL,
    { id: 'model', label: 'Home model', type: 'select', options: g => g.plan.items.filter(p => ['dwelling', 'adu'].includes(p.item.kind)).map(p => p.item.name).concat(['Other']), answer: g => home(g)?.name, hint: 'the home on your site plan' },
    { id: 'sqft', label: 'Heated floor area (sq ft)', type: 'number', answer: g => home(g)?.sqft, tol: 0, hint: 'shop listing for your home' },
    { id: 'value', label: 'Construction valuation ($)', type: 'number', answer: g => home(g)?.cost, min: g => Math.round((home(g)?.cost || 0) * 0.9), hint: 'at least your home\'s price' },
    { id: 'oss', label: 'Septic design approval number', type: 'text', answer: ref('septic-design'), hint: from('septic-design') },
    { id: 'wad', label: 'Water adequacy number', type: 'text', answer: ref('water'), hint: from('water') },
    { id: 'grde', label: 'Clearing & grading permit number', type: 'text', answer: ref('grading'), hint: from('grading') }] },
  electrical: { name: 'Electrical work permit (homeowner)', fields: [
    { id: 'resb', label: 'Building permit number', type: 'text', answer: ref('permit'), hint: from('permit') },
    { id: 'sqft', label: 'Dwelling size (sq ft)', type: 'number', answer: g => home(g)?.sqft, tol: 0 },
    { id: 'who', label: 'Who does the work', type: 'select', options: ['Owner (own property)', 'Licensed electrical contractor'], answer: () => null }] },
  final: { name: 'Final inspection request', fields: [
    { id: 'resb', label: 'Building permit number', type: 'text', answer: ref('permit'), hint: from('permit') },
    { id: 'ele', label: 'Electrical permit number', type: 'text', answer: ref('electrical'), hint: from('electrical') },
    { id: 'asb', label: 'Septic as-built number', type: 'text', answer: ref('septic-install'), hint: 'from the septic installer\'s completion email' }] },
};

const norm = v => String(v ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
const val = (x, g) => typeof x === 'function' ? x(g) : x;
/** → list of human-readable errors (empty = OK). */
export function checkForm(g, qid, values = {}) {
  const F = FORMS[qid]; if (!F) return [];
  const errs = [];
  for (const f of F.fields) {
    const want = f.answer(g), got = values[f.id];
    if (f.type === 'check') { if (want && !got) errs.push(`${f.label}: required`); continue; }
    if (got == null || got === '') { errs.push(`${f.label}: missing`); continue; }
    if (want == null) continue; // any answer accepted
    if (f.type === 'number') {
      const n = Number(got), min = val(f.min, g);
      if (!Number.isFinite(n)) { errs.push(`${f.label}: not a number`); continue; }
      if (min != null && n < min) { errs.push(`${f.label}: ${n} is below the minimum ${min}`); continue; }
      if (f.tol != null && Math.abs(n - want) > f.tol) errs.push(`${f.label}: ${n} doesn't match our records`);
    } else if (norm(got) !== norm(want)) errs.push(`${f.label}: "${got}" doesn't match our records`);
  }
  return errs;
}
export function autofill(g, qid) {
  const F = FORMS[qid]; if (!F) return {};
  return Object.fromEntries(F.fields.map(f => { const a = f.answer(g); return [f.id, f.type === 'check' ? true : a ?? (f.options ? val(f.options, g)[0] : '')]; }));
}
