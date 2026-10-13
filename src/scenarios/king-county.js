// Scenario: build a home on a vacant RA-5 lot in unincorporated King County, WA.
// Agencies, contacts and fees researched 2026-10-12 from primary sources (see docs/wa-king-county.md).
// Fees marked est:true and all `days` are game estimates. Contractors are FICTIONAL companies.
// Pure data, shared by browser, server and tests.

export const SCENARIO = {
  id: 'king-ra5',
  title: 'Five Acres in Rural King County',
  state: 'WA', county: 'King',
  pitch: 'You own 4.8 vacant acres zoned RA-5. Get a legal, livable home on it: water, septic, power, permits, final inspection.',
  startDate: Date.UTC(2026, 9, 12, 8, 0),
  budget: 100000, // cash on hand; homes need a construction loan (see LENDERS)
  landValue: 180000, // game estimate for the bundled parcel when the assessor value isn't loaded
  player: { income: 140000, debtsMonthly: 600, credit: 745 }, // fictional borrower profile
  deadlineDay: 240,
};

// ---- NPCs: real public bodies (general intake only) + fictional contractors
import { OFFICIALS } from '../officials.js';

export const AGENCIES = {
  permitting: {
    name: 'King County Permitting', org: 'Dept. of Local Services, Permitting Division', real: true,
    email: 'PermitQuestions@kingcounty.gov', phone: '206-296-6600', url: 'https://kingcounty.gov/en/dept/local-services/buildings-property/permits',
    portal: 'https://www.mybuildingpermit.com/', address: '919 SW Grady Way #300, Renton WA 98057',
    persona: 'Permit technician. Polite, procedural, cites King County Code, never commits before review is complete. Signs as "Permitting Division".',
    avatar: '🏛️',
  },
  health: {
    name: 'Public Health – Seattle & King County', org: 'Environmental Health, On-site Sewage & Drinking Water', real: true,
    email: null, phone: '206-477-8050', url: 'https://kingcounty.gov/en/dept/dph/health-safety/environmental-health/onsite-sewage-systems',
    channel: 'Public Health Permit Center portal (no public intake email)',
    persona: 'Environmental health specialist. Precise about soil logs, setbacks in WAC 246-272A, and water tests. Dry humor about winter water tables.',
    avatar: '🧪',
  },
  ecology: {
    name: 'WA Dept. of Ecology', org: 'Water Resources — Well Construction & Licensing', real: true,
    email: 'wclo@ecy.wa.gov', url: 'https://ecology.wa.gov/regulations-permits/reporting-requirements/well-construction-notice-of-intent',
    persona: 'State water resources staff. Brief. Reminds everyone that the Notice of Intent is due 72 hours before drilling and that exempt wells are limited.',
    avatar: '💧',
  },
  lni: {
    name: 'WA Labor & Industries', org: 'Electrical Section', real: true,
    email: null, phone: '1-800-647-0982', url: 'https://lni.wa.gov/licensing-permits/electrical/electrical-permits-fees-and-inspections/',
    channel: 'Electrical permits are purchased online (EPIS)',
    persona: 'Electrical inspector. Short sentences. Cares about who is doing the work and whether they are registered.',
    avatar: '⚡',
  },
  utility: {
    name: 'Puget Sound Energy', org: 'New construction / line extension', real: true,
    email: null, url: 'https://www.pse.com/en/business-electric-and-natural-gas/builders-and-developers',
    channel: 'PSE builder services request (online)', unverified: 'Service territory for this parcel not confirmed; Tanner Electric serves parts of North Bend.',
    persona: 'Utility project coordinator. Friendly, slow, quotes line extensions per job under PSE Rule 6.',
    avatar: '🔌',
  },
  designer: {
    name: 'Mossback Soil & Septic Design', org: 'Licensed on-site sewage designer (fictional)', real: false,
    email: 'hello@mossback.example', persona: 'Septic designer. Enthusiastic about dirt. Explains perc, soil logs and reserve areas in plain English.',
    avatar: '🪱',
  },
  driller: {
    name: 'Cedar Fork Well Drilling', org: 'Licensed well driller (fictional)', real: false,
    email: 'office@cedarfork.example', persona: 'Third-generation driller. Gruff, honest about depth uncertainty, books out weeks ahead.',
    avatar: '🛠️',
  },
  builder: {
    name: 'Snoqualmie Prefab Co.', org: 'Factory-built homes, L&I-approved (fictional)', real: false,
    email: 'sales@snoqualmieprefab.example', persona: 'Prefab sales lead. Upbeat, transparent on lead times, needs a building permit before setting a home.',
    avatar: '🏠',
  },
  'bank-cu': {
    name: 'Evergreen Valley Credit Union', org: 'Construction-to-permanent loans (fictional lender)', real: false, email: 'loans@evergreenvalley.example',
    persona: 'Loan officer at a member-owned credit union. Patient, explains every number, a little slow, never pushy.', avatar: '🏦',
  },
  'bank-ridge': {
    name: 'Puget Ridge Bank', org: 'Construction lending desk (fictional lender)', real: false, email: 'construction@pugetridge.example',
    persona: 'Brisk commercial-bank lender. Fast turnaround, stricter credit, talks in basis points.', avatar: '🏦',
  },
  usda: {
    name: 'USDA Rural Development (Washington)', org: 'Single Family Housing (Section 502 Direct and Guaranteed loans)', real: true, email: null,
    url: 'https://www.rd.usda.gov/programs-services/single-family-housing-programs', channel: 'Eligibility checks online; applications through RD offices or approved lenders',
    persona: 'Federal program staff. Friendly, careful about eligibility, points people to the online eligibility tool.', avatar: '🌾',
  },
  septicer: {
    name: 'Tolt River Septic Install', org: 'Licensed septic installer (fictional)', real: false,
    email: 'jobs@toltriver.example', persona: 'Installer. Practical, will not dig before an install permit is issued.',
    avatar: '🚜',
  },
};

// Everyone you can write to: agencies + contractors + (fictional) officials of real bodies.
export const NPCS = { ...AGENCIES, ...OFFICIALS };

// ---- Documents the player can hold. Quests consume/produce them.
export const DOCS = {
  'site-plan': 'Site plan (from your map)',
  'zoning-answer': 'Zoning confirmation (RA-5)',
  'cad': 'Critical Area Designation',
  'designer-contract': 'Septic designer engaged',
  'soil-logs': 'Soil logs (5 test pits)',
  'septic-design': 'Approved septic design',
  'well-site': 'Well site approval',
  'driller-contract': 'Well driller booked',
  'noi': 'Ecology Notice of Intent filed',
  'well-report': 'Well report + pump test',
  'water-tests': 'Water tests (bacteria, nitrate, arsenic)',
  'water-adequacy': 'Water adequacy approval',
  'home-plans': 'Home plans (from builder)',
  'building-permit': 'Building permit issued',
  'septic-installed': 'Septic installed + as-built',
  'power-design': 'Utility service design',
  'electrical-permit': 'L&I electrical permit',
  'home-set': 'Home set on foundation',
  'occupancy': 'Final inspection passed',
  'prequal-bank-cu': 'Pre-qualification letter (Evergreen Valley CU)', 'prequal-bank-ridge': 'Pre-qualification letter (Puget Ridge Bank)',
  'loan-approval-bank-cu': 'Loan approval + appraisal (Evergreen Valley CU)', 'loan-approval-bank-ridge': 'Loan approval + appraisal (Puget Ridge Bank)',
  'loan-funded': 'Construction loan funded',
};

// ---- Quest graph. Each quest is one email ask to one NPC.
// needs: docs that must be attached (missing → "needs-info" reply, small time cost, no fee)
// after: quests that must be done first (not done → "denied/too early" reply)
// fee: charged when accepted. days: until the reply that completes it. gives: docs produced.
// cite: where the real-world requirement comes from.
const kc = 'https://cdn.kingcounty.gov/-/media/king-county/depts/local-services/permits/fee-guides/';
export const QUESTS = [
  { id: 'zoning', npc: 'permitting', title: 'Ask what you can build', ask: 'Ask Permitting to confirm the zoning and whether a home + ADU is allowed.',
    needs: [], after: [], fee: 0, days: 3, gives: ['zoning-answer'], cite: 'KCC 21A.08 / 21A.12 (RA-5)' },
  { id: 'cad', npc: 'permitting', title: 'Critical Area Designation', ask: 'Apply for a Critical Area Designation (CAD) for the parcel.',
    needs: ['site-plan'], after: ['zoning'], fee: 1643, slopeFee: 1212, days: 30, gives: ['cad'], cite: `KCC 21A.24; 2026 Fee Guide 01 (${kc}01-fee-2026-pre-development-services-fees.pdf)` },
  { id: 'designer', npc: 'designer', title: 'Hire a septic designer', ask: 'Engage a licensed designer for the septic system.',
    needs: [], after: [], fee: 4500, est: true, days: 5, gives: ['designer-contract'], cite: 'WAC 246-272A (design by licensed designer)' },
  { id: 'soil', npc: 'designer', title: 'Dig soil logs', ask: 'Schedule the 5 soil test pits (2 drainfield, 2 reserve, 1 tank).',
    needs: [], after: ['designer'], fee: 1800, est: true, days: 12, gives: ['soil-logs'], cite: 'Public Health – SKC OSS site evaluation' },
  { id: 'septic-design', npc: 'health', title: 'Septic design approval', ask: 'Submit the septic design for approval.',
    needs: ['site-plan', 'cad', 'soil-logs'], after: ['cad', 'soil'], fee: 1181 + 1013, days: 30, gives: ['septic-design'], cite: 'Public Health OSS fee sheet 2026 (pressurized design $1,181 + winter water table review $1,013)' },
  { id: 'well-site', npc: 'health', title: 'Well site approval', ask: 'Apply for well site location approval.',
    needs: ['site-plan', 'cad'], after: ['cad'], fee: 450, days: 14, gives: ['well-site'], cite: 'Public Health well location review $450' },
  { id: 'driller', npc: 'driller', title: 'Book a well driller', ask: 'Book the driller for the approved well site.',
    needs: [], after: [], fee: 0, days: 6, gives: ['driller-contract'], cite: 'RCW 18.104 (licensed drillers)' },
  { id: 'noi', npc: 'ecology', title: 'File Notice of Intent', ask: 'File the water well Notice of Intent (start card).',
    needs: ['well-site', 'driller-contract'], after: ['well-site', 'driller'], fee: 200, days: 3, gives: ['noi'], cite: 'Ecology well construction NOI, 72 h before drilling ($200)' },
  { id: 'drill', npc: 'driller', title: 'Drill + pump test + water tests', ask: 'Drill the well, run the pump test and pull water samples.',
    needs: ['noi'], after: ['noi'], fee: 22000, est: true, days: 21, gives: ['well-report', 'water-tests'], cite: 'Public Health: 2-hr pump test; bacteria, nitrate, arsenic' },
  { id: 'water', npc: 'health', title: 'Water adequacy', ask: 'Submit well report and water tests for water adequacy review.',
    needs: ['well-report', 'water-tests'], after: ['drill'], fee: 0, days: 14, gives: ['water-adequacy'], cite: 'RCW 19.27.097 (adequate water before building permit)' },
  { id: 'plans', npc: 'builder', title: 'Order home plans', ask: 'Order the home model and get the permit plan set.',
    needs: [], after: [], fee: 2500, est: true, days: 10, gives: ['home-plans'], requiresHome: true, cite: 'L&I factory-built approval + county permit' },
  { id: 'permit', npc: 'permitting', title: 'Building permit', ask: 'Apply for the residential building permit.',
    needs: ['site-plan', 'cad', 'septic-design', 'water-adequacy', 'home-plans'], after: ['septic-design', 'water', 'plans'], fee: 'homePermit', days: 65,
    gives: ['building-permit'], cite: `2026 Fee Guide 02 (${kc}02-fee-2026-single-family-residential-construction.pdf) + $500 exempt-well fee (RCW 90.94)` },
  { id: 'power', npc: 'utility', title: 'Request power service', ask: 'Request a new service and line extension design.',
    needs: ['site-plan'], after: [], fee: 9500, est: true, days: 45, gives: ['power-design'], cite: 'PSE Rule 6 line extension (quoted per job)' },
  { id: 'septic-install', npc: 'septicer', title: 'Install septic', ask: 'Install the approved septic system.',
    needs: ['septic-design', 'building-permit'], after: ['permit'], fee: 26000 + 1181, est: true, days: 14, gives: ['septic-installed'], cite: 'Public Health install permit $1,181 + installer' },
  { id: 'electrical', npc: 'lni', title: 'Electrical permit', ask: 'Buy the electrical permit for the new house.',
    needs: ['building-permit'], after: ['permit'], fee: 113, days: 1, gives: ['electrical-permit'], cite: 'WAC 296-46B-906 (single-family $112.60)' },
  { id: 'set-home', npc: 'builder', title: 'Deliver + set the home', ask: 'Deliver and set the home on its foundation.',
    needs: ['building-permit', 'power-design'], after: ['permit', 'power'], fee: 'homeCost', days: 'homeDays', gives: ['home-set'], requiresHome: true, cite: 'Factory-built home set (game estimate)' },
  { id: 'final', npc: 'permitting', title: 'Final inspection', ask: 'Request final inspection and occupancy.',
    needs: ['home-set', 'septic-installed', 'electrical-permit'], after: ['set-home', 'septic-install', 'electrical'], fee: 0, days: 7, gives: ['occupancy'], cite: 'King County final inspection' },
];

// ---- Financing subgame. Lenders are fictional; terms are game estimates of typical 2026 construction-to-permanent loans.
export const LENDERS = {
  'bank-cu': { rate: 0.0725, appraisalFee: 700, appraisalDays: 21, closingPct: 0.02, minCredit: 680, maxLtv: 0.8 },
  'bank-ridge': { rate: 0.0775, appraisalFee: 650, appraisalDays: 12, closingPct: 0.015, minCredit: 720, maxLtv: 0.8 },
};
export const SITE_BUDGET = 60000; // septic + well + power + permits the loan also covers (game estimate)
for (const b of Object.keys(LENDERS)) QUESTS.push(
  { id: `${b}-prequal`, npc: b, section: 'Financing', exclusive: 'loan', title: 'Get pre-qualified', ask: 'Ask for a construction-to-permanent loan pre-qualification.',
    needs: [], after: [], fee: 0, days: 2, gives: [`prequal-${b}`], loan: 'prequal', cite: 'Lender underwriting: debt-to-income ≤43%, credit score (game simplification)' },
  { id: `${b}-apply`, npc: b, section: 'Financing', exclusive: 'loan', title: 'Apply + appraisal', ask: 'Apply for the construction loan and order the as-completed appraisal.',
    needs: ['site-plan', `prequal-${b}`, 'home-plans'], after: [`${b}-prequal`, 'plans'], fee: LENDERS[b].appraisalFee, est: true, days: LENDERS[b].appraisalDays,
    gives: [`loan-approval-${b}`], loan: 'apply', requiresHome: true, cite: 'Construction lenders require plans, a builder bid and an as-completed appraisal (game simplification)' },
  { id: `${b}-close`, npc: b, section: 'Financing', exclusive: 'loan', title: 'Close + fund the loan', ask: 'Close the construction loan now that the building permit is issued.',
    needs: [`loan-approval-${b}`, 'building-permit'], after: [`${b}-apply`, 'permit'], fee: 'loanClosing', est: true, days: 5,
    gives: ['loan-funded'], loan: 'close', cite: 'Lenders close construction loans after the building permit issues; interest-only during construction (game simplification)' },
);

export const questById = Object.fromEntries(QUESTS.map(q => [q.id, q]));

// King County 2026 Fee Guide 02 building permit fees by home type (+ $500 exempt-well fee, + $6.50 state surcharge + $126 screening).
export function homePermitFee(item) {
  const sqft = item?.sqft || 0, extra = 500 + 6.5 + 126;
  if (item?.factoryBuilt) return Math.round(2419 + 4639 + 1141 + extra); // modular
  return Math.round(8128 + 4639 + 2.46 * sqft + extra); // new custom house
}
