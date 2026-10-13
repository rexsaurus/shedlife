# ShedLife — Claude Code guide

**This repo is public.** Never commit secrets, API keys, tokens, `.env`, or personal data. If you see one staged, stop and remove it.

ShedLife is a **training simulator** for building a home on real Washington land — real parcels, the real permit path,
real vendors, real loan mechanics — on an accelerated clock, made just fun enough that learning it doesn't hurt.
The isometric map is the site plan; **the inbox is the game**: every move is an email to a real public agency
or a (fictional) contractor. A deterministic engine decides every outcome; Claude only writes the replies.

## Run
```
npm install
npm run dev            # http://localhost:5173 (Vite + server middleware in server/plugin.mjs)
npm test               # node:test — rules, engine, full scripted playthrough, bundled data
npm run simulate       # balance check: optimal run per home type (days, money left)
npm run fetch-parcel -- <PIN> king    # refresh public/data/parcel.json from King County GIS + USGS 3DEP
python3 scripts/playtest.py           # headless browser playthrough + screenshots (needs `pip install playwright`)
```
Secrets live in `.env` (git-ignored, never read or print it): `ANTHROPIC_API_KEY` (+ `ANTHROPIC_WORKSPACE_ID` for
user-scoped `sk-ant-usr` keys), `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`), `APIFY_TOKEN`, `RENTCAST_API_KEY`.

## Architecture
| File | Role |
|---|---|
| `src/scenarios/king-county.js` | Scenario data: budget/deadline, NPCs (real agencies + fictional contractors), documents, **permit quest graph**, fee formulas |
| `src/engine.js` | Pure game state. `send()` → deterministic verdict (`accepted`, `needs-info`, `too-early`, `corrections`, `cant-pay`, `answer`…), fees, delays; `tick(day)` delivers mail and applies effects; win/lose |
| `src/rules.js` | WA site-plan rules (KCC 21A.12 setbacks/impervious, WAC 246-272A septic & well distances, ADU/RV/dwelling counts, steep slopes) with citations |
| `src/catalog.js` | Structures with real dimensions; permit class (<200 sq ft unconditioned accessory = exempt) |
| `src/letters.js` | `factsOf(verdict)` (facts Claude must keep) + scripted fallback letters |
| `server/npc.mjs` | Claude voices a verdict in the NPC's persona (`POST /api/npc`). Falls back to scripted text on any error |
| `server/parcel.mjs` | Parcel + terrain loader (King County PropertyInfo layer with zoning, plus CA counties) |
| `src/main.js`, `src/meshes.js`, `index.html` | Three.js map, placement, inbox/compose/quest-log UI |
| `src/officials.js` | Real Seattle-area **bodies and seats** (King/Seattle/Bellevue/Snohomish/Pierce councils, Kitsap/Kittitas/Skagit/Island commissions, King County Hearing Examiner) seated with **fictional, seed-generated people** |
| `src/portraits.js` | Original procedural 16-bit portraits (32×32) with bob/blink/talk animation, seeded by NPC id |
| `src/data/vendors.js` | GENERATED from `data/wa-vendors.json` (real WA vendor products, cited, dated) by `npm run vendors` |
| Loans (`LENDERS` in the scenario, `prequalMax`/`loanAmountFor`/`monthlyPayment` in engine) | Fictional lenders, real loan mechanics: prequal (43% DTI) → apply + appraisal → close after permit; interest-only monthly; converts to 30-yr mortgage |
| `server/wa-parcels.mjs`, `src/wamap.js` | Statewide WaTech parcels on an OpenStreetMap basemap; pick any parcel (King adds zoning from county GIS) |
| `docs/diagram/` | 3D "rat's nest → engine → game" diagram (render with Playwright to `docs/shedlife-stack.png`) |
| `src/scenarios/king-county-forms.js` | Government application forms (fields, answers, hints), reference/license numbers issued on approval, `checkForm`/`autofill` |
| Bills (`openInvoices`, `payInvoice`, `negotiateInvoice`, `followUp`, `threaten` in engine; `BILL_TERMS` in scenario) | Non-government work is invoiced net 30; negotiate once; 1.5%/mo late fees; overdue → work on hold; >30 days → lien blocks the loan; win requires all bills paid |
| `src/laws.js`, `data/laws.json` | Law view: verbatim RCW/WAC excerpts from app.leg.wa.gov (KCC/IRC summarized), `LAW_REFS` per NPC, `lawLinkify` turns cites into links |
| `src/wildlife.js` | Decorative deer, rabbits, squirrels, coyotes (dusk/night), birds, drifting clouds |
| `data/wa-places.json` | WA cities (kelvins/US-Cities-Database) + islands geocoded via OSM/Photon, for map autocomplete (live Photon fallback) |
| `src/autoplay.js` | Scripted player used by tests and `npm run simulate` (fills forms, negotiates and pays bills, waits for the loan before site work) |
| `docs/wa-king-county.md` | Research notes and sources behind every rule, fee and contact |

## Invariants (do not break)
1. **The engine decides, Claude narrates.** Never let model output change game state. New outcomes go in `engine.js` + `letters.js` (`factsOf`) with tests.
2. **No real people as characters.** Officials sit on real bodies but are fictional and generated; Claude never names, quotes or impersonates a real officeholder, and portraits are procedural. Real vendors appear only as their products, prices and links.
3. **Real agencies, real public contacts only.** General intake addresses / portals from the agency's own site. No individual staff names or emails. Contractors are fictional (`real:false`, `.example` emails).
4. **Every rule, fee and requirement has a `cite`/`ref`.** If you could not confirm it from a primary source, say UNVERIFIED in `docs/wa-king-county.md` and keep the game number labelled as an estimate (`est:true`).
5. **Human-in-the-loop for anything real.** The game may prepare a real email (mailto / Gmail draft), never send one. No automated portal submissions.
6. **Data sourcing rule** (docs/data-sources.md): official APIs, open government data, or licensed feeds. Using an Apify Actor that scrapes a commercial listing site needs Rex's explicit OK per use; government pages via `apify/rag-web-browser` are fine.
7. Keep `npm test` green; the full-playthrough test is the balance contract (an optimal run must win).

## Skills in this repo (`.claude/skills/`)
`add-county` · `add-agency-npc` · `add-official-body` · `add-vendor-product` · `add-quest` · `verify-regulation` · `refresh-data` · `npc-voice` · `playtest` · `draft-real-email`
Subagent: `regs-researcher` (`.claude/agents/`). MCP: Apify via `.mcp.json` (needs `APIFY_TOKEN`).

## Project conventions (from the original guide; still apply)
1. **Original art only.** Procedural or hand-made low-poly. No third-party models, textures, or vendor 3D assets unless explicitly licensed and noted.
2. **No scraping against terms.** Official APIs, open data, licensed feeds, or user-supplied files only. Check robots.txt and ToS. User-pasted listing URLs are shown as links, never fetched and parsed.
3. **No owner PII.** Never request or store owner names or mailing addresses from parcel layers. No "look up who owns this" feature.
4. **Human approval before any real purchase, hire, order, payment, message to a vendor/contractor, or government filing.** Agents may prepare; only an explicit, per-action human approval executes. No automated submissions to permit portals. No standing approvals for spend.
5. **Every number and rule is sourced.** Prices carry vendor, URL and date. Rules carry citation URL, effective date and `last_verified`. Ambiguous rules return "ask the planner", not a guess.
6. **Secrets stay out of git and out of the browser.** `.env` is gitignored, and keys are read only in `server/`.
7. **Tests:** `npm test` must pass. Network calls in tests are mocked through `fetchImpl`. Add a test for every new pure function and adapter.
8. **Style:** ES modules, small pure functions, no framework on the front end beyond Three.js. Keep dependencies minimal and ask before adding heavy ones.
9. ShedLife is not a contractor, broker, architect, engineer, or lawyer. UI copy must not claim authoritative determinations.


## California data adapters (original P0, still in `server/`)
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


## History
P0 began on a San Mateo County, CA parcel (Montara). On 2026-10-12 the game pivoted to Washington State (King County RA-5 parcel, statewide WaTech parcels) as an inbox-driven training simulator. The original California P1–P4 backlog lives in [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/SPEC.md](docs/SPEC.md); treat it as reference, not the current plan.
