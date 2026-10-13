# CLAUDE.md: guide for coding agents working on ShedLife

**This repo is public.** Never commit secrets, API keys, tokens, `.env`, or personal data. If you see one staged, stop and remove it.

## Project summary
ShedLife is SimCity for building a real property: a fully isometric Three.js browser game layered on real land, terrain, zoning, vendor and contractor data. The player picks a real parcel, shapes the land, drops real sheds, tiny homes, prefab ADUs and RVs on it, runs the sim clock, and works through the real permits. Long term, the same moves can request real quotes, order real structures, book licensed contractors and prepare real permit filings, with a human approving every real-world action.

- Product spec: [docs/SPEC.md](docs/SPEC.md)
- Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Data sources and terms: [docs/data-sources.md](docs/data-sources.md)
- Owner: Rex St John. Incubating as a subdomain of rexstjohn.com.

## Run, test, build
Requires Node 18+ (uses global `fetch`, `node:test`).
```
npm install
cp .env.example .env        # optional: add RENTCAST_API_KEY (never commit .env; it's gitignored)
npm run dev                 # http://localhost:5173, with /api/* middleware
npm test                    # node --test test/  (9 tests, all must pass)
npm run build               # vite build -> dist/ (static only)
npm run preview             # serves dist/ and also mounts /api/*
npm run fetch-parcel -- 036174080 [san-mateo|santa-clara]   # refresh bundled parcel snapshot from live APIs
node scripts/import-taxsale.mjs list.csv --county santa-clara --sale "Oct 30–Nov 2, 2026" --url https://www.bid4assets.com/santaclara [--all]
```
Note: `/api/*` only exists in `vite dev` and `vite preview` (via `server/plugin.mjs`). A static `dist/` deploy has no API. The game falls back to the bundled `public/data/parcel.json`. A standalone server is on the backlog.

## Architecture and file map
```
index.html                 UI shell (HUD, clock buttons, land-for-sale panel)
vite.config.js             loads .env into process.env server-side; mounts the API plugin
src/main.js                Three.js scene: ortho iso camera, terrain mesh, grid, parcel line, place/rotate tool, clock loop, land panel, reloadable world (buildWorld)
src/geo.js                 pure geometry (no Three.js): bboxOf, makeProjector (equirectangular to local meters), polygonArea, pointInPolygon, sampleHeight (bilinear), snap
src/clock.js               SimClock: speeds [0,1,10,60,600]; 1x = 1 game minute per real second
src/shed.js                original low-poly 8x10 shed (2.44 x 3.05 m)
server/plugin.mjs          Vite dev/preview middleware: GET /api/listings (6 h cache, ?refresh=1), GET /api/parcel?apn=&county= or ?lat=&lon=
server/parcel.mjs          county GIS parcel lookup (COUNTIES table) + USGS 3DEP terrain sampling
server/listings.mjs        RentCast Land provider, tax-sale provider, allListings()
server/taxsale.mjs         CSV parser + normalizer for official county tax-sale lists
scripts/fetch-parcel.mjs   writes public/data/parcel.json
scripts/import-taxsale.mjs writes data/taxsale-listings.json (not committed until a real list is imported)
public/data/parcel.json    bundled snapshot: APN 036174080, Montara, 24x24 elevation grid
test/*.test.js             node:test unit tests (geometry, clock, bundled data, listings, tax-sale import)
docs/                      SPEC, ROADMAP, data-sources, screenshots
```
Coordinates: lon/lat (EPSG:4326) in data; local meters east/north of the parcel centroid in the scene. Three.js uses x = east, z = -north, y = up. Keep pure logic in Three-free modules so it can be tested in Node.

## Data adapters
| Adapter | Endpoint | Auth | Limits / terms |
|---|---|---|---|
| San Mateo parcels (`server/parcel.mjs`) | `https://gis.smcgov.org/maps/rest/services/Common/ACTIVE_PARCELS_APN/FeatureServer/0/query` | none | Public ArcGIS REST. Request only `APN,PUCDESC,SITUS_CITY,UNINC`. **No owner fields.** Be gentle; prefer the bundled snapshot. |
| Santa Clara parcels | `https://services8.arcgis.com/fpjs8A5Vtkshblnd/arcgis/rest/services/Santa_Clara_County_Parcels/FeatureServer/0/query` | none | Public. Request only `apn,situs_city`. |
| USGS 3DEP terrain | `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples` (POST multipoint, ≤200 points per batch) | none | Public domain. Batch requests; don't loop per point. |
| RentCast land listings (`server/listings.mjs`) | `GET https://api.rentcast.io/v1/listings/sale?propertyType=Land&status=Active&latitude&longitude&radius&limit` with `X-Api-Key` | `RENTCAST_API_KEY` in `.env`, **server-side only** | Free Developer plan is about 50 requests/month. Each refresh uses 4 calls (4 Bay Area circles), which is why the 6 h cache exists. Display with attribution; no resale of raw data. |
| County tax-defaulted sales (`server/taxsale.mjs`) | Official county list, downloaded by a human and imported as CSV | none | Public record. Bid4Assets and county sites block automation, and mytaxsale robots.txt disallows `/auction/`. **Never scrape them**; import the county's file. |
| Planned (P2–P3) | FEMA NFHL, CAL FIRE FHSZ, CGS, Coastal Commission, NWI, SMC zoning GIS, CSLB data portal, Thumbtack Partner API, Angi, Yelp Fusion, PG&E, MWSD | varies | See docs/data-sources.md. Thumbtack and Angi need partner approval first. |
| Not allowed | Zillow / Bridge, Redfin listings, LandWatch/Land.com, LoopNet, Crexi, Realtor.com | n/a | No public API, and their terms forbid scraping. Don't add adapters for them. Redfin Data Center market-level downloads are OK. |

New adapters: one module per source, return `{ data, source_url, fetched_at, terms }`, keys only server-side, cache to fit quotas, inject `fetchImpl` so tests never hit the network, and add the source to docs/data-sources.md.

## Conventions (non-negotiable)
1. **Original art only.** Procedural or hand-made low-poly. No third-party models, textures, or vendor 3D assets unless explicitly licensed and noted.
2. **No scraping against terms.** Official APIs, open data, licensed feeds, or user-supplied files only. Check robots.txt and ToS. User-pasted listing URLs are shown as links, never fetched and parsed.
3. **No owner PII.** Never request or store owner names or mailing addresses from parcel layers. No "look up who owns this" feature.
4. **Human approval before any real purchase, hire, order, payment, message to a vendor/contractor, or government filing.** Agents may prepare; only an explicit, per-action human approval executes. No automated submissions to permit portals. No standing approvals for spend.
5. **Every number and rule is sourced.** Prices carry vendor, URL and date. Rules carry citation URL, effective date and `last_verified`. Ambiguous rules return "ask the planner", not a guess.
6. **Secrets stay out of git and out of the browser.** `.env` is gitignored, and keys are read only in `server/`.
7. **Tests:** `npm test` must pass. Network calls in tests are mocked through `fetchImpl`. Add a test for every new pure function and adapter.
8. **Style:** ES modules, small pure functions, no framework on the front end beyond Three.js. Keep dependencies minimal and ask before adding heavy ones.
9. ShedLife is not a contractor, broker, architect, engineer, or lawyer. UI copy must not claim authoritative determinations.

## Current status (2026-10-12)
P0 is done: real parcel (APN 036174080, Montara) with 3DEP terrain, grid, shed place/rotate with lot-line check, sim clock to 600x, land-for-sale panel (RentCast needs a key; tax-sale list empty until imported), `/api/parcel` for San Mateo and Santa Clara. 9/9 tests pass. Known gaps: no plan persistence, one hard-coded shed, no setbacks or rules, API only in dev/preview, and elevation is a coarse 24×24 grid.

## Backlog (prioritized)
Work top to bottom. Each item is done when its acceptance criteria pass and `npm test` is green.

### P1: terrain and structures
1. **Plan model + persistence.** `src/plan.js` with a serializable `{ parcelRef, structures[], terrainOps[], utilities[] }`, plus save/load to localStorage and JSON export/import. *AC:* placing structures, reloading the page restores them; export, then import, round-trips identically (unit test).
2. **Structures catalog.** `data/catalog.json` with 30+ real products across shed, studio, prefab ADU, tiny home, RV. Fields per SPEC §5.3, each with `url` and `price_date`. Procedural model from dimensions (`src/structures.js`) replacing the hard-coded shed. *AC:* catalog schema test; picker UI; footprint matches dimensions within 1 cm; no vendor assets.
3. **Footprint checks.** Generalize the lot-line check to rotated rectangles of any catalog size plus structure-to-structure overlap. *AC:* unit tests for inside, crossing and overlap cases.
4. **Terrain tools.** Clear, grade pad (target elevation), cut/fill with cubic-yard volume calc, trench, driveway. Edits stored as `terrainOps` and replayed on load. *AC:* volume calc unit-tested against an analytic case; edits survive reload.
5. **Slope overlay.** Per-cell slope with 15% / 30% bands. *AC:* unit test on a synthetic grid; toggle in UI.
6. **Budget panel.** Line items tagged `quote|catalog|estimate` with source and date. *AC:* every line renders a source; totals unit-tested.
7. **Standalone API server.** `server/index.mjs` (plain Node http) reusing the plugin handlers so a built `dist/` can be deployed with the API. *AC:* `node server/index.mjs` serves `dist/` and `/api/*`; no key leaks to the client bundle (grep test on `dist/`).
8. **Higher-res terrain option.** Configurable sample grid (for example 48×48) within the 3DEP batch limits. *AC:* fetch script flag; performance stays at 60 fps on a laptop.

### P2: rules engine (unincorporated San Mateo County)
1. **Rule engine core.** `src/rules/engine.js`: pure `(parcel, overlays, plan, pack) → { violations, permits, timeline }`, shared by browser and Node. *AC:* runs in both; deterministic; unit-tested.
2. **Rule pack format.** `rules/san-mateo-uninc/*.json` with `id, applies_when, check, message, citation_url, effective_date, last_verified`. *AC:* schema validation test; every rule has a citation.
3. **Zoning + setbacks.** Zone from parcel `ZONE_ID` / county zoning layer; setback bands drawn on the lot; coverage, height and separation checks. *AC:* Montara test parcel shows correct setback bands per the cited code section.
4. **State ADU/JADU + shed exemption.** Gov. Code §66314 et seq. and CRC small accessory exemption (≤120 sq ft, local variation noted). *AC:* test plans for exempt shed, permit-required studio and ADU produce the expected permit lists.
5. **Hazard overlays adapters.** FEMA NFHL, CAL FIRE FHSZ, Coastal Zone, CGS, NWI. Cached, sourced. *AC:* Montara parcel reports coastal zone = true, with a test using mocked responses.
6. **Utilities model.** Water (district/well), sewer or OWTS, PG&E power, access; polyline routing with lengths and costs; septic setbacks. *AC:* unit tests for lengths, costs and separation violations.
7. **Permit path + event queue.** Deterministic, seeded sim queue for reviews, deliveries, crews, inspections, weather. Fast-forward drains it faster. *AC:* same seed gives the same timeline; the permit path lists agency, fees, docs and dependencies with citations.
8. **Professional review.** 5 test plans reviewed by a planner or expediter. *AC:* at least 90% agreement, zero severe misses, results recorded in `docs/rules-review.md`.

### P3: contractors and vendors
1. **CSLB verification.** Import CSLB data portal license master into a local index; trade-to-classification map (A, B, C-8, C-10, C-12, C-27, C-36, C-42, C-46). *AC:* lookup by license number returns status and classifications; assignment blocked when the classification doesn't match (test).
2. **Quote requests.** Thumbtack Partner API / Angi adapters behind feature flags, only after partner approval. Requests are drafted, then sent only on human approval. *AC:* mocked tests; nothing sends without an approval token.
3. **Vendor and affiliate links.** Disclosed affiliate links from the catalog. *AC:* disclosure visible wherever a link pays.
4. **Utility service flows.** PG&E new service and local water/sanitary district steps as checklists with links. *AC:* checklist generated for the Montara plan.
5. **Plan packet export.** PDF/ZIP with site plan, BOM, permit checklist, schedule, budget, sources. *AC:* export for the Montara test plan contains all sections.

### P4: real transactions (human in the loop)
1. **Approval system.** Action queue, approval cards (what, to whom, data, cost, reversibility), single-use scoped tokens, spend caps. *AC:* tests prove no action executes without a matching token; tokens can't be reused.
2. **Audit log.** Append-only record of approver, time, payload and response. *AC:* every executed action has a log entry (test).
3. **Vendor orders.** Hand off to the vendor's own checkout; ShedLife never holds funds. *AC:* end-to-end order on one real vendor with explicit approval.
4. **Permit application prep.** Fill the packet for Accela Citizen Access; the human submits. *AC:* a complete packet for one real application; zero automated submissions.
5. **MLS/IDX via broker partner.** RESO Web API adapter under the broker's license terms. *AC:* listings displayed with required IDX attribution; legal sign-off recorded.
6. **Legal review.** DRE/CSLB/referral-fee review before launch. *AC:* written sign-off in `docs/` (no confidential content in the public repo).
