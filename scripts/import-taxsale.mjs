// Import an official county tax-defaulted property list (CSV exported from the county's own spreadsheet/notice)
// into data/taxsale-listings.json. Keeps vacant/unimproved lots by default.
// Usage: node scripts/import-taxsale.mjs <file.csv> --county santa-clara --sale "Oct 30–Nov 2, 2026" --url https://www.bid4assets.com/santaclara [--all]
// Expected headers (case-insensitive, any order): APN, Minimum Bid / Opening Bid, Acres or Lot Size (sq ft), Description / Use, Item URL (optional)
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv, toLots } from '../server/taxsale.mjs';
const [file, ...rest] = process.argv.slice(2);
const opt = k => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : null; };
const lots = toLots(parseCsv(readFileSync(file, 'utf8')), { county: opt('county') || 'santa-clara', sale: opt('sale'), saleUrl: opt('url'), vacantOnly: !rest.includes('--all') });
writeFileSync(new URL('../data/taxsale-listings.json', import.meta.url), JSON.stringify({ imported: new Date().toISOString(), from: file, lots }, null, 1));
console.log(`${lots.length} lots written to data/taxsale-listings.json`);
