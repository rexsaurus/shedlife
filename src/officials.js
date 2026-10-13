// Elected and appointed land-use officials around Seattle, as talkable NPCs.
// The BODIES and SEATS are real (structure only). Every PERSON is fictional and generated from a seed —
// ShedLife never puts words in a real official's mouth or draws a real person's likeness.
export const rng = seed => { let a = 0; for (const ch of String(seed)) a = Math.imul(a ^ ch.charCodeAt(0), 2654435761); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pick = (r, a) => a[Math.floor(r() * a.length)];

// Real bodies (seat structure as of 2026; verify with the verify-regulation skill before claiming more).
export const BODIES = [
  { id: 'king-council', name: 'King County Council', short: 'King Co. Council', kind: 'council', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `District ${n}`), color: '#2d6a4f',
    role: 'Adopts the King County Code (zoning in Title 21A, the Comprehensive Plan, fee ordinances) for unincorporated King County — including your parcel.', relevant: true },
  { id: 'king-hex', name: 'King County Hearing Examiner', short: 'Hearing Examiner', kind: 'examiner', seats: ['Hearing Examiner'], color: '#5b3a6b',
    role: 'Independent office that hears appeals of many King County permit and code-enforcement decisions and issues written decisions.', relevant: true },
  { id: 'seattle-council', name: 'Seattle City Council', short: 'Seattle Council', kind: 'council', seats: [1, 2, 3, 4, 5, 6, 7].map(n => `District ${n}`).concat(['Position 8 (at-large)', 'Position 9 (at-large)']), color: '#1f5f8b',
    role: 'Legislates land use inside Seattle city limits (the Seattle Municipal Code). Not your parcel, but a big voice on regional housing.' },
  { id: 'bellevue-council', name: 'Bellevue City Council', short: 'Bellevue Council', kind: 'council', seats: [1, 2, 3, 4, 5, 6, 7].map(n => `Position ${n}`), color: '#3a6f73',
    role: 'Legislates land use inside Bellevue. Neighbors to rural King County on the Eastside.' },
  { id: 'snohomish-council', name: 'Snohomish County Council', short: 'Snohomish Council', kind: 'council', seats: [1, 2, 3, 4, 5].map(n => `District ${n}`), color: '#7a5c2e',
    role: 'Adopts zoning and the comprehensive plan for unincorporated Snohomish County, north of King County.' },
  { id: 'pierce-council', name: 'Pierce County Council', short: 'Pierce Council', kind: 'council', seats: [1, 2, 3, 4, 5, 6, 7].map(n => `District ${n}`), color: '#8b3a3a',
    role: 'Adopts zoning and the comprehensive plan for unincorporated Pierce County, south of King County.' },
  { id: 'kitsap-bocc', name: 'Kitsap County Board of Commissioners', short: 'Kitsap Commissioners', kind: 'commission', seats: [1, 2, 3].map(n => `District ${n}`), color: '#2e5c7a',
    role: 'Three-member board that is both the legislative and executive branch of Kitsap County, across the Sound.' },
  { id: 'kittitas-bocc', name: 'Kittitas County Board of Commissioners', short: 'Kittitas Commissioners', kind: 'commission', seats: [1, 2, 3].map(n => `District ${n}`), color: '#9a6b2f',
    role: 'Three-member board for Kittitas County over Snoqualmie Pass — where new rural wells need water-bank mitigation.' },
  { id: 'skagit-bocc', name: 'Skagit County Board of Commissioners', short: 'Skagit Commissioners', kind: 'commission', seats: [1, 2, 3].map(n => `District ${n}`), color: '#4f6b2f',
    role: 'Three-member board for Skagit County, farmland and floodplain country to the north.' },
  { id: 'island-bocc', name: 'Island County Board of Commissioners', short: 'Island Commissioners', kind: 'commission', seats: [1, 2, 3].map(n => `District ${n}`), color: '#2f6b5c',
    role: 'Three-member board for Whidbey and Camano Islands, where water and septic are always on the agenda.' },
];

const FIRST = ['Avery', 'Marisol', 'Desmond', 'Priya', 'Walt', 'Keiko', 'Tobias', 'Renata', 'Malik', 'Ingrid', 'Hollis', 'Soraya', 'Emmett', 'Lucia', 'Dashiell', 'Noor', 'Gideon', 'Tamsin', 'Rafael', 'Odette', 'Bram', 'Yesenia', 'Callum', 'Mei', 'Augustin', 'Delphine', 'Tariq', 'Wren', 'Leopold', 'Fumiko', 'Cyrus', 'Bettina', 'Anselm', 'Juniper', 'Okello', 'Rosalind', 'Lars', 'Paloma', 'Ezra', 'Henrietta', 'Kai', 'Marguerite', 'Thaddeus', 'Ximena', 'Booker', 'Ottilie', 'Ruben', 'Saoirse', 'Ignatius', 'Vesna'];
const LAST = ['Thornbury', 'Quillfeather', 'Okonkwo-Vale', 'Ashgrove', 'Delacroix-Finn', 'Merriweather', 'Halvorsen-Ruiz', 'Brightwater', 'Castellane', 'Nakamura-Pike', 'Fernhollow', 'Abernathy-Cole', 'Silverthorn', 'Mbeki-Lund', 'Larkspur', 'Underhill', 'Saltmarsh', 'Kowalczyk-Bay', 'Fairweather', 'Ravensworth', 'Gallowglass', 'Moonridge', 'Whitlock-Osei', 'Cedarvale', 'Pemberton-Ruiz', 'Tidewell', 'Stonebridge', 'Oyelaran-Shaw', 'Hazelton', 'Wintergreen', 'Marchbanks', 'Ironwood', 'Calloway-Tran', 'Bellweather', 'Rookhaven', 'Duquesne-Hale', 'Foxglove', 'Sandoval-Reed', 'Blackwood', 'Ellingsworth'];
// Fictional priorities, spread so the cast disagrees with itself (no real official's positions).
const PRIORITIES = [
  'more housing of every kind, faster', 'keeping rural areas rural', 'salmon and stream habitat', 'groundwater and wells',
  'wildfire readiness', 'property owners\' rights and less red tape', 'small farms', 'transit and roads', 'permit timelines',
  'septic failures and water quality', 'tiny homes and ADUs', 'flood risk', 'affordability for young families', 'forest land',
  'fiscal restraint', 'tribal treaty rights and consultation', 'climate resilience', 'neighborhood character',
];
const STYLE = [
  'warm and folksy, tells short stories about constituents', 'crisp and data-driven, quotes numbers', 'wry, a little tired, deeply competent',
  'earnest and idealistic, loves a public hearing', 'blunt, impatient with jargon', 'diplomatic, always sees three sides', 'cheerful policy nerd',
  'old-school and formal', 'skeptical but fair', 'a former contractor who talks shop',
];
const EXAMINER_STYLE = 'measured, precise, procedural; explains standards of review and deadlines; never prejudges a case';

function makeOfficial(body, seat) {
  const id = `${body.id}-${seat.replace(/\W+/g, '').toLowerCase()}`;
  const r = rng(id);
  const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
  const p1 = pick(r, PRIORITIES); let p2 = pick(r, PRIORITIES); while (p2 === p1) p2 = pick(r, PRIORITIES);
  const style = body.kind === 'examiner' ? EXAMINER_STYLE : pick(r, STYLE);
  const title = body.kind === 'examiner' ? 'Hearing Examiner' : body.kind === 'commission' ? 'Commissioner' : 'Councilmember';
  return {
    id, official: true, real: false, body: body.id, seat, title, name: `${title} ${name}`, shortName: name,
    org: `${body.name} · ${seat} (fictional member of a real body)`, avatar: '🏛️', color: body.color,
    priorities: body.kind === 'examiner' ? [] : [p1, p2], style,
    persona: body.kind === 'examiner'
      ? `A fictional hearing examiner for the real ${body.name} office. ${style}.`
      : `A fictional ${title.toLowerCase()} holding ${seat} on the real ${body.name}. Cares most about ${p1} and ${p2}. Style: ${style}.`,
  };
}

export const OFFICIALS = Object.fromEntries(BODIES.flatMap(b => b.seats.map(s => makeOfficial(b, s))).map(o => [o.id, o]));
export const bodyById = Object.fromEntries(BODIES.map(b => [b.id, b]));

// General, real process knowledge every official can draw on (paraphrased; see docs/officials.md).
export const OFFICIAL_KNOWLEDGE = [
  ['Individual building permits are decided by permitting staff, not by elected officials; councils and commissions write the rules (zoning code, comprehensive plan, fees).', 'King County Code Title 20/21A; general WA local government practice'],
  ['Washington\'s Appearance of Fairness doctrine limits private (ex parte) contact with decision-makers about pending quasi-judicial land-use matters; that contact belongs on the public record.', 'RCW 42.36'],
  ['Comprehensive plans and development regulations are adopted under the Growth Management Act, which separates urban growth areas from rural lands.', 'RCW 36.70A'],
  ['Residents can testify at public hearings, send written public comment, and ask to meet staff about how a code amendment would work.', 'General public-participation practice; RCW 36.70A.140'],
  ['Many King County permit decisions can be appealed to the Hearing Examiner within a short deadline after the decision; the examiner holds a hearing and issues a written decision.', 'KCC 20.22 (Hearing Examiner) — deadlines vary by decision type'],
];
