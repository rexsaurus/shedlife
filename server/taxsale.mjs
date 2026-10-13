export function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (ch === '"') q = false; else f += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...body] = rows.filter(r => r.some(c => c.trim()));
  return body.map(r => Object.fromEntries(h.map((k, i) => [k.trim().toLowerCase(), (r[i] ?? '').trim()])));
}
const num = s => { const n = Number(String(s ?? '').replace(/[$,\s]/g, '')); return Number.isFinite(n) && String(s).trim() !== '' ? n : null; };
const pick = (r, ...keys) => { for (const k of Object.keys(r)) if (keys.some(x => k.includes(x))) return r[k]; return ''; };
export function toLots(rows, { county, sale, saleUrl, vacantOnly = true }) {
  return rows.map(r => {
    const desc = pick(r, 'description', 'use', 'type', 'land use');
    const ac = num(pick(r, 'acre')); const sqft = num(pick(r, 'sq', 'lot size'));
    return { id: `taxsale:${county}:${pick(r, 'apn')}`, source: `${county} County tax-defaulted sale`, kind: 'tax-sale', status: sale ? `Auction ${sale}` : 'Auction',
      title: `APN ${pick(r, 'apn')}${pick(r, 'situs', 'address') ? ' · ' + pick(r, 'situs', 'address') : ''}`, county, apn: pick(r, 'apn'),
      price: num(pick(r, 'minimum', 'opening')), priceLabel: 'Minimum bid', acres: ac ?? (sqft ? +(sqft / 43560).toFixed(3) : null), lotSqft: sqft,
      use: desc || null, url: pick(r, 'url', 'link') || saleUrl || null };
  }).filter(l => l.apn && (!vacantOnly || /vacant|unimproved|land|lot/i.test(l.use || '')));
}
