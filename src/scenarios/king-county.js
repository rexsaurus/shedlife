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
  deadlineDay: 270,
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
  surveyor: { name: 'Tolt Line Survey & Stake', org: 'Licensed land surveyor (fictional)', real: false, email: 'crew@toltline.example',
    persona: 'Surveyor. Quietly obsessed with pins, monuments and the difference between a fence and a property line.', avatar: '📐' },
  excavator: { name: 'Raging River Excavation', org: 'Clearing, grading, driveways (fictional)', real: false, email: 'dispatch@ragingriver.example',
    persona: 'Excavator owner-operator. Plain-spoken, weather-obsessed, will not move dirt without the permit and erosion control in place.', avatar: '🚜' },
  'crew-fast': { name: 'Summit Civil Works', org: 'Site development contractor (fictional)', real: false, email: 'estimating@summitcivil.example',
    persona: 'Estimator for a bigger outfit. Polished, quotes schedules to the day, upsells drainage.', avatar: '🏗️' },
  'crew-cheap': { name: 'Stumpjumper Land Clearing', org: 'Owner-operator land clearing (fictional)', real: false, email: 'stumpjumper@stumpjumper.example',
    persona: 'One guy with an excavator and a dump truck. Cheap, honest about rain delays, writes short emails with no punctuation.', avatar: '🪓' },
  biologist: { name: 'Salal & Stream Ecological', org: 'Wetland and stream biologists (fictional)', real: false, email: 'reports@salalstream.example',
    persona: 'Field biologist. Enthusiastic about salmon and amphibians, careful and exact about buffers.', avatar: '🐟' },
  wdfw: { name: 'WA Dept. of Fish & Wildlife', org: 'Habitat Program — Hydraulic Project Approval (HPA)', real: true, email: null,
    url: 'https://wdfw.wa.gov/licenses/environmental/hpa', channel: 'HPA applications through WDFW\'s online permitting system (APPS)',
    persona: 'Habitat biologist. Protective of fish, practical with homeowners, explains conditions clearly.', avatar: '🎣' },
  insurer: { name: 'Cascadia Mutual Insurance', org: 'Builder\'s risk + homeowners (fictional)', real: false, email: 'agents@cascadiamutual.example',
    persona: 'Insurance agent. Friendly, asks about wildfire and wood stoves, explains deductibles with analogies.', avatar: '🛡️' },
  titleco: { name: 'Evergreen Title & Escrow', org: 'Title insurance and escrow (fictional)', real: false, email: 'orders@evergreentitle.example',
    persona: 'Escrow officer. Meticulous, cheerful about easements, never rushes a closing.', avatar: '📜' },
  oic: { name: 'WA Office of the Insurance Commissioner', org: 'Consumer advocacy', real: true, email: null, url: 'https://www.insurance.wa.gov/',
    channel: 'Consumer advocacy hotline and online help', persona: 'State consumer advocate. Neutral, explains coverage types and how to file a complaint.', avatar: '⚖️' },
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
  'loan-estimate-bank-cu': 'Loan Estimate (Evergreen Valley CU)', 'loan-estimate-bank-ridge': 'Loan Estimate (Puget Ridge Bank)',
  'survey': 'Boundary + topo survey (stakes set)', 'buffer-plan': 'Critical area report + buffer plan', 'hpa': 'Hydraulic Project Approval (WDFW)',
  'grading-permit': 'Clearing & grading permit', 'site-cleared': 'Site work complete',
  'bid-excavator': 'Site-work bid (Raging River)', 'bid-crew-fast': 'Site-work bid (Summit Civil)', 'bid-crew-cheap': 'Site-work bid (Stumpjumper)',
  'crew-hired': 'Site-work crew hired', 'trees-cleared': 'Trees felled + hauled', 'grubbed': 'Stumps grubbed + erosion control in',
  'pad-graded': 'House pad leveled', 'driveway': 'Gravel driveway in',
  'builders-risk': 'Builder\'s risk insurance policy', 'title-policy': 'Lender\'s title insurance policy', 'homeowners': 'Homeowners insurance policy',
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

// ---- Site work + insurance. `when` makes a quest apply only to some parcels (the CAD reveals what's on yours).
const stream = g => !!g.site?.stream;
QUESTS.push(
  { id: 'survey', npc: 'surveyor', section: 'Site work', title: 'Survey + stake the lot', ask: 'Run a boundary and topographic survey and stake the house, well and drainfield.',
    needs: [], after: ['zoning'], fee: 3500, est: true, days: 14, gives: ['survey'], cite: 'Licensed survey to prove setbacks and grades (game estimate; RCW 18.43 licenses surveyors)' },
  { id: 'biologist', npc: 'biologist', section: 'Site work', when: stream, title: 'Stream study + buffer plan', ask: 'Delineate the stream, set the buffer and write the critical area report.',
    needs: ['cad'], after: ['cad'], fee: 4500, est: true, days: 21, gives: ['buffer-plan'], cite: 'KCC 21A.24 stream buffers (rural Type N: 65 ft + 15 ft building setback); consultant cost is a game estimate' },
  { id: 'hpa', npc: 'wdfw', section: 'Site work', when: stream, title: 'Hydraulic Project Approval', ask: 'Apply for an HPA for the driveway culvert crossing the stream.',
    needs: ['site-plan', 'buffer-plan'], after: ['biologist'], fee: 0, days: 45, gives: ['hpa'], cite: 'RCW 77.55.021 (HPA for work in state waters; 45-day decision; no application fee listed by WDFW)' },
  { id: 'grading', npc: 'permitting', section: 'Site work', title: 'Clearing & grading permit', ask: 'Apply for the clearing and grading permit for the house pad and driveway.',
    needs: ['site-plan', 'cad', 'survey'], after: ['cad', 'survey', 'biologist'], fee: 3000, est: true, days: 30, gives: ['grading-permit'],
    cite: 'King County clearing/grading: RA zones need a clearing permit over 7,000 sq ft cleared or 5,000 board feet of timber; grading over 100 cu yd; drainage review at 2,000 sq ft impervious or 7,000 sq ft disturbed (fee is a game estimate)' },
  { id: 'title', npc: 'titleco', section: 'Insurance', title: 'Lender\'s title insurance', ask: 'Open title and order a lender\'s title insurance policy for the construction loan.',
    needs: [], after: ['zoning'], fee: 1800, est: true, days: 7, gives: ['title-policy'], cite: 'Lender\'s title policy is common for construction loans (UNVERIFIED as a universal requirement; game estimate)' },
  { id: 'builders-risk', npc: 'insurer', section: 'Insurance', title: 'Builder\'s risk insurance', ask: 'Bind a builder\'s risk policy for the construction period.',
    needs: ['building-permit'], after: ['permit'], fee: 2200, est: true, days: 2, gives: ['builders-risk'], cite: 'Builder\'s risk is required during the construction phase of construction-to-permanent loans (lender guides; game estimate)' },
  { id: 'homeowners', npc: 'insurer', section: 'Insurance', title: 'Homeowners insurance', ask: 'Bind a homeowners policy now that the home is set.',
    needs: [], after: ['set-home'], fee: 1600, est: true, days: 1, gives: ['homeowners'], cite: 'Required by the lender at completion; you need it to move in (game estimate, first-year premium)' },
);
for (const [id, extra] of [['set-home', ['builders-risk']], ['permit', ['grading']]]) questById0(id).after.push(...extra);
// Physical prerequisites: the installer needs a level pad; the delivery truck needs a road.
questById0('septic-install').requiresDocs = ['pad-graded'];
questById0('set-home').requiresDocs = ['pad-graded', 'driveway'];

// ---- Hiring a site-work crew: get bids, hire one, then four work stages on the clock.
export const CREWS = {
  excavator: { mult: 1.0, speed: 1.0, rainDays: 0, pitch: 'Mid-priced, reliable, one crew start to finish.' },
  'crew-fast': { mult: 1.35, speed: 0.6, rainDays: 0, pitch: 'Premium: two machines and a dedicated crew, fastest schedule.' },
  'crew-cheap': { mult: 0.78, speed: 1.6, rainDays: 7, pitch: 'Lowest price: one operator, squeezes you between other jobs; rain delays likely.' },
};
// Quote for a crew from what the CAD found (tree count, stream). Game estimates of typical Western WA site-work costs.
export function crewQuote(g, c) {
  const C = CREWS[c], trees = g.site?.trees ?? 60, stream = !!g.site?.stream;
  const base = { timber: 120 * trees, stumps: 6000 + 40 * trees, grade: 7000, road: 9000 + (stream ? 2500 : 0) };
  const days = { timber: 4 + Math.ceil(trees / 25), stumps: 4, grade: 5, road: 6 };
  const cost = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round(v * C.mult / 50) * 50]));
  const dur = Object.fromEntries(Object.entries(days).map(([k, v]) => [k, Math.ceil(v * C.speed) + (k === 'grade' ? C.rainDays : 0)]));
  const total = Object.values(cost).reduce((a, b) => a + b, 0), totalDays = Object.values(dur).reduce((a, b) => a + b, 0);
  return { cost, dur, total, totalDays, deposit: Math.round(total * 0.1 / 50) * 50 };
}
const STAGES = [
  ['timber', 'Fell + haul the trees', 'Fell the trees in the clearing limits and haul the logs.', ['trees-cleared'], 'King County: a clearing permit covers >7,000 sq ft cleared or >5,000 board feet; Class IV-General conversions usually ride with the permit (game cost estimate)'],
  ['stumps', 'Grub stumps + erosion control', 'Grub the stumps and install silt fence and construction entrance (TESC).', ['grubbed'], 'Temporary erosion and sediment control per King County Surface Water Design Manual (game estimate)'],
  ['grade', 'Level the house pad', 'Cut and fill to level the house pad and septic area.', ['pad-graded'], 'Grading over 100 cu yd needs the grading permit (game estimate)'],
  ['road', 'Gravel driveway + culvert', 'Build the gravel driveway (and the stream culvert, if any) to the pad.', ['driveway', 'site-cleared'], 'Driveway to King County Road Standards; culvert under the HPA if a stream crosses (game estimate)'],
];
for (const c of Object.keys(CREWS)) {
  QUESTS.push(
    { id: `${c}-bid`, npc: c, section: 'Site work', title: 'Get a site-work bid', ask: 'Walk the site and send a written bid for clearing, stumps, grading and the driveway.',
      when: g => !g.crew || g.crew === c, needs: [], after: ['cad'], fee: 0, days: 3, gives: [`bid-${c}`], crew: 'bid', cite: 'Get at least two written bids; check the contractor is registered with WA L&I (RCW 18.27)' },
    { id: `${c}-hire`, npc: c, section: 'Site work', exclusive: 'crew', when: g => !g.crew || g.crew === c, title: 'Hire this crew (10% deposit)', ask: 'Accept your bid and schedule the work. Deposit attached.',
      needs: [`bid-${c}`], after: [`${c}-bid`], fee: g => crewQuote(g, c).deposit, days: 2, gives: ['crew-hired'], crew: 'hire', crewId: c, cite: 'Written contract with a registered contractor; deposits are common (game estimate 10%)' },
    ...STAGES.map(([k, title, ask, gives, cite], i) => ({
      id: `${c}-${k}`, npc: c, section: 'Site work', when: g => g.crew === c, title, ask,
      needs: i === 0 ? ['grading-permit'] : [], after: i === 0 ? [`${c}-hire`, 'grading', 'hpa'] : [`${c}-${STAGES[i - 1][0]}`],
      fee: g => crewQuote(g, c).cost[k] - (i === 0 ? crewQuote(g, c).deposit : 0), est: true, days: g => crewQuote(g, c).dur[k], gives, crew: k, cite })),
  );
}
function questById0(id) { return QUESTS.find(q => q.id === id); }

// ---- Financing subgame. Lenders are fictional; terms are game estimates of typical 2026 construction-to-permanent loans.
export const LENDERS = {
  'bank-cu': { rate: 0.0725, appraisalFee: 700, appraisalDays: 21, closingPct: 0.02, minCredit: 680, maxLtv: 0.8 },
  'bank-ridge': { rate: 0.0775, appraisalFee: 650, appraisalDays: 12, closingPct: 0.015, minCredit: 720, maxLtv: 0.8 },
};
export const SITE_BUDGET = 60000; // septic + well + power + permits the loan also covers (game estimate)
for (const b of Object.keys(LENDERS)) QUESTS.push(
  { id: `${b}-prequal`, npc: b, section: 'Financing', exclusive: 'loan', title: 'Get pre-qualified', ask: 'Ask for a construction-to-permanent loan pre-qualification.',
    needs: [], after: [], fee: 0, days: 2, gives: [`prequal-${b}`, `loan-estimate-${b}`], loan: 'prequal', cite: 'Lender underwriting: debt-to-income ≤43%, credit score (game simplification)' },
  { id: `${b}-apply`, npc: b, section: 'Financing', exclusive: 'loan', title: 'Apply + appraisal', ask: 'Apply for the construction loan and order the as-completed appraisal.',
    needs: ['site-plan', `prequal-${b}`, 'home-plans'], after: [`${b}-prequal`, 'plans'], fee: LENDERS[b].appraisalFee, est: true, days: LENDERS[b].appraisalDays,
    gives: [`loan-approval-${b}`], loan: 'apply', requiresHome: true, cite: 'Construction lenders require plans, a builder bid and an as-completed appraisal (game simplification)' },
  { id: `${b}-close`, npc: b, section: 'Financing', exclusive: 'loan', title: 'Close + fund the loan', ask: 'Close the construction loan now that the building permit is issued.',
    needs: [`loan-approval-${b}`, 'building-permit', 'builders-risk', 'title-policy'], after: [`${b}-apply`, 'permit', 'builders-risk', 'title'], fee: 'loanClosing', est: true, days: 5,
    gives: ['loan-funded'], loan: 'close', cite: 'Lenders close construction loans after the building permit issues; interest-only during construction (game simplification)' },
);
for (const b of Object.keys(LENDERS)) { const other = Object.keys(LENDERS).find(o => o !== b); QUESTS.push(
  { id: `${b}-negotiate`, npc: b, section: 'Financing', exclusive: 'loan', title: 'Negotiate the rate', ask: `Attach the competing Loan Estimate from ${other === 'bank-cu' ? 'Evergreen Valley CU' : 'Puget Ridge Bank'} and ask for a better rate.`,
    needs: [`loan-estimate-${other}`], after: [`${b}-prequal`, `${other}-prequal`], fee: 0, days: 3, gives: [], loan: 'negotiate', cite: 'Shopping lenders with Loan Estimates (CFPB TRID); lenders may match within their floor (game rule)' },
  { id: `${b}-points`, npc: b, section: 'Financing', exclusive: 'loan', title: 'Buy down the rate (1 point)', ask: 'Pay one discount point (1% of the loan) to lower the rate.',
    needs: [], after: [`${b}-prequal`, 'plans'], fee: 'points', days: 2, gives: [], loan: 'points', requiresHome: true, cite: 'Discount points: 1% of the loan for ~0.25% lower rate (game rule; real pricing varies)' },
); }
for (const b of Object.keys(LENDERS)) QUESTS.push(
  { id: `${b}-landline`, npc: b, section: 'Financing', title: 'Land equity line ($40k)', ask: 'Open a line of credit secured by the land I own, to cover costs before the construction loan funds.',
    needs: [`prequal-${b}`], after: [`${b}-prequal`], fee: 500, est: true, days: 10, gives: [], loan: 'land', exclusive: 'landline',
    cite: 'Land equity loans/lines use owned land as collateral; higher rates than mortgages (game estimate: $40k at 9.5%)' });
export const LAND_LINE = { amount: 40000, rate: 0.095 };
export const RATE_FLOOR = 0.005; // a lender won't go more than 0.50% under its posted rate

export const questById = Object.fromEntries(QUESTS.map(q => [q.id, q]));

// King County 2026 Fee Guide 02 building permit fees by home type (+ $500 exempt-well fee, + $6.50 state surcharge + $126 screening).
export function homePermitFee(item) {
  const sqft = item?.sqft || 0, extra = 500 + 6.5 + 126;
  if (item?.factoryBuilt) return Math.round(2419 + 4639 + 1141 + extra); // modular
  return Math.round(8128 + 4639 + 2.46 * sqft + extra); // new custom house
}
