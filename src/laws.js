// Law view: real statute/regulation text (src/data/laws.js) + auto-linking of cites anywhere in the game.
import LAWS from './data/laws.js';
export const lawById = Object.fromEntries(LAWS.map(l => [l.id, l]));
export { LAWS };
// Which laws matter to which NPC (agencies, contractors, bodies).
export const LAW_REFS = {
  permitting: ['KCC 21A.12.030', 'KCC 21A.08.030', 'RCW 19.27.097', 'RCW 36.70B.080', 'KCC 16.82', 'IRC R105.2'],
  health: ['WAC 246-272A-0210', 'RCW 19.27.097'], ecology: ['RCW 90.44.050', 'RCW 90.94.030', 'WAC 173-160-171'],
  wdfw: ['RCW 77.55.021', 'KCC 21A.24'], lni: ['RCW 19.28.261', 'WAC 296-46B-901', 'RCW 18.27.020'],
  biologist: ['KCC 21A.24', 'RCW 77.55.021'], excavator: ['KCC 16.82', 'RCW 60.04.021', 'RCW 18.27.040'], 'crew-fast': ['KCC 16.82', 'RCW 60.04.021', 'RCW 18.27.040'],
  'crew-cheap': ['KCC 16.82', 'RCW 60.04.021', 'RCW 18.27.040'], septicer: ['WAC 246-272A-0210', 'RCW 60.04.021'], designer: ['WAC 246-272A-0210'],
  driller: ['WAC 173-160-171', 'RCW 90.44.050'], builder: ['RCW 18.27.020', 'RCW 60.04.021'], surveyor: ['KCC 21A.12.030'],
  'king-council': ['KCC 21A.12.030', 'KCC 21A.08.030', 'RCW 36.70A.070', 'RCW 42.36.010', 'RCW 42.36.060'],
  'king-hex': ['RCW 36.70C.040', 'RCW 42.36.010', 'RCW 36.70B.080'],
  council: ['RCW 36.70A.070', 'RCW 42.36.010', 'RCW 42.36.060'], commission: ['RCW 36.70A.070', 'RCW 42.36.010', 'RCW 42.36.060'],
};
const CITE = /\b(RCW \d+[A-Z]?\.\d+[A-Z]?(?:\.\d+)?|WAC \d+-\d+[A-Z]?-\d+|KCC \d+[A-Z]?\.\d+(?:\.\d+)?|IRC R\d+(?:\.\d+)?)/g;
const legUrl = c => c.startsWith('RCW') ? `https://app.leg.wa.gov/RCW/default.aspx?cite=${c.slice(4)}` : c.startsWith('WAC') ? `https://app.leg.wa.gov/WAC/default.aspx?cite=${c.slice(4)}` : null;
/** Wrap legal cites in already-escaped HTML with links into the Law view (or the official site). */
export function lawLinkify(html) {
  return html.replace(CITE, c => {
    const id = lawById[c] ? c : Object.keys(lawById).find(k => c.startsWith(k + '.') || k.startsWith(c));
    if (id) return `<a href="#" class="lawlink" data-law="${id}">📜 ${c}</a>`;
    const u = legUrl(c); return u ? `<a href="${u}" target="_blank" rel="noopener">${c}</a>` : c;
  });
}
