// Vite dev/preview middleware: keeps API keys server-side and proxies public GIS calls.
import { allListings } from './listings.mjs';
import { loadParcel } from './parcel.mjs';
import { voiceReply, MODEL } from './npc.mjs';
const readJson = req => new Promise((ok, no) => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { no(e); } }); });

let cache = { at: 0, data: null };
const json = (res, code, body) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };

function mount(server) {
  server.middlewares.use(async (req, res, next) => {
    const u = new URL(req.url, 'http://x');
    try {
      if (u.pathname === '/api/listings') {
        if (!cache.data || Date.now() - cache.at > 6 * 3600e3 || u.searchParams.get('refresh')) cache = { at: Date.now(), data: await allListings() }; // 6h cache: RentCast free tier is 50 calls/month
        return json(res, 200, cache.data);
      }
      if (u.pathname === '/api/npc' && req.method === 'POST') return json(res, 200, await voiceReply(await readJson(req)));
      if (u.pathname === '/api/status') return json(res, 200, { claude: !!process.env.ANTHROPIC_API_KEY, model: MODEL, rentcast: !!process.env.RENTCAST_API_KEY, apify: !!process.env.APIFY_TOKEN });
      if (u.pathname === '/api/parcel') {
        const p = Object.fromEntries(u.searchParams);
        const d = await loadParcel({ county: p.county, apn: p.apn, lat: p.lat && +p.lat, lon: p.lon && +p.lon });
        return d ? json(res, 200, d) : json(res, 404, { error: 'No parcel found at that location/APN in the supported counties (San Mateo, Santa Clara)' });
      }
    } catch (e) { return json(res, 502, { error: String(e.message) }); }
    next();
  });
}
export default () => ({ name: 'shedlife-api', configureServer: mount, configurePreviewServer: mount });
