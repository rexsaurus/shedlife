# ShedLife product spec

Status: draft v0.1, 2026-10-12. Owner: Rex St John. Repo: github.com/rexsaurus/shedlife (private). Incubating as a subdomain of rexstjohn.com.

Companion docs: [README](../README.md) (current build, run instructions), [data-sources.md](data-sources.md) (every source we use and its terms).

---

## 1. Vision

ShedLife is SimCity for building a real property.

It's a fully isometric browser game in Three.js. You pick a real tract of land near you from real parcel and listing data. You clear and shape it with terrain tools. You browse real sheds, tiny homes, prefab ADUs and RVs from real vendors and drop them on the lot. You hire and source contractors, lay out water, sewer or septic, and power, and run the clock in real time or fast-forward. Along the way you have to deal with the actual zoning, setbacks, permits, coastal and flood rules, and fees for that parcel.

It's a game, but nothing in it is made up. The parcel lines come from the county. The elevation comes from USGS lidar. The rules come from the jurisdiction's code. The prices come from real vendors. ShedLife is a game layer on top of real estate, GIS and regulatory data.

The long-term goal: the plan you build in the game is a plan you could carry out. With a human approving every step, the same moves that place a shed in the game can request a real quote, order the real shed, book a licensed contractor, and prepare the real permit filing.

## 2. Motivation

**Building on land is illegible.** Most people who could put a small dwelling on a lot never start, and it's rarely because of the lumber. Before you can build, you have to work out what the zoning allows, the setbacks and lot coverage limits, whether you're in a flood zone, fire zone or the coastal zone, whether there's a sewer main or you need a septic system, what PG&E needs for new service, which permits apply, which contractors are licensed for which trade, and what all of it costs and in what order. That information is public, but it's scattered across county GIS servers, PDFs of the zoning code, permit portals and utility websites. That maze is a big reason affordable small dwellings don't get built.

**Games are good at making systems legible.** SimCity taught a generation how zoning, power, water and budgets interact, because you could poke at them and see what happened. ShedLife uses the same approach on one parcel, and the systems are the real ones. A red setback line that blocks your shed is a real setback. A permit that takes 60 sim-days is modeled on the real review timeline.

**Tiny homes and ADUs are having a moment.** California has spent the past decade loosening ADU law (Gov. Code §66314 et seq.; HCD ADU Handbook): ministerial approval, limits on parking requirements and impact fees, and deadlines on local review. Prefab ADU makers (Abodu, Cover, Boxabl, Studio Shed), shed companies (Tuff Shed, Home Depot, Lowe's) and tiny home builders (Tumbleweed) have products a regular person can order. The law and the products are mostly there now. What's missing is a way for a regular person to put the pieces together.

**AI agents can act now, so they need guardrails.** Agents can now look up a contractor's license, request a quote, fill out a form, or draft a permit application. ShedLife is a concrete, bounded place to build that the right way: the agent does the legwork, the game shows the consequences, and a human approves every real-world action.

**[REX: personal why?]** _Placeholder. Rex adds his own story here: why ShedLife, why now, what he'd build on a lot of his own._

## 3. Users

| Persona | What they want | What ShedLife gives them |
|---|---|---|
| **The dreamer** | "Could I put a tiny house on land somewhere near me?" | A real lot, a real price, a real rules readout. Answers in an afternoon instead of months. |
| **The homeowner adding an ADU or backyard studio** | Know what fits, what's allowed, what it costs, who to hire. | Their own parcel loaded from county GIS, setbacks drawn, the ADU rules applied, real prefab options dropped in. |
| **The land buyer doing due diligence** | Know before closing whether a lot is buildable. | Flood, fire, coastal, slope, sewer and water constraints surfaced on the parcel, with costs to get utilities in. |
| **The gamer** | A good sim sandbox. | An isometric builder where the challenge is real and the stakes are optional. |
| **Contractors and vendors (supply side, P3+)** | Qualified leads from people with a real plan. | A request that already includes the parcel, the site plan, the structure and the permit path. |
| **Planners and educators (secondary)** | Explain the code to the public. | A visual, interactive version of the rules. |

Out of scope for v1: commercial development, multifamily over 4 units, subdivisions, and states other than California.

## 4. Core loop

1. **Find land.** Browse land for sale (RentCast listings, official county tax-sale lists) or load any parcel by APN or by clicking a map.
2. **Read the lot.** The parcel loads in isometric 3D: real boundary, real terrain, and overlays for setbacks, flood, fire, coastal zone and slope.
3. **Shape it.** Clear vegetation, grade a pad, cut and fill, cut a driveway. Every move has a cost, an equipment need and possibly a permit trigger (grading volumes, tree removal).
4. **Place structures.** Pick from a catalog of real products with real dimensions and prices. Place and rotate them. The rules engine checks in real time: lot line, setbacks, coverage, height, separation, ADU limits.
5. **Connect utilities.** Run water, sewer or septic, power and access. Trench routes are drawn on the terrain with real lengths and costs.
6. **Permit it.** The rules engine builds the permit path: which permits, in what order, with what documents, fees and review times.
7. **Hire it.** Assign each task to a contractor type, check licenses, and request quotes.
8. **Run the clock.** Play at 1x to 600x (more later). Permits go through review, deliveries arrive, crews work, weather slows things down, and budget and schedule update.
9. **Finish it.** You get a certificate of occupancy (or a red-tag). The output is a real plan packet: site plan, bill of materials, permit checklist, contractor list, schedule and budget.
10. **(P4) Make it real.** Turn any step into a real-world action, with explicit human approval for each one.

What makes the loop fun: the constraints push back, every fix has a tradeoff, and fast-forward compresses months of waiting into minutes of watching.

## 5. Systems

### 5.1 Land acquisition
- **Parcel loading** from county ArcGIS REST (San Mateo in P0, Santa Clara wired up) by APN or lat/lon. We request only non-personal fields (APN, situs, use code, zone id). No owner names.
- **Land for sale:** RentCast `propertyType=Land` sale listings (MLS-derived, server-side key, 6 h cache) and official county tax-defaulted sale lists imported from the county's own download (`scripts/import-taxsale.mjs`). We don't scrape.
- **Later:** MLS/IDX via a broker partner on the RESO Web API (P3/P4). User-pasted listing URLs show as a link only and are never scraped.
- **Game model:** asking price, estimated closing costs (transfer tax, title, escrow), property tax estimate (Prop 13 base about 1% plus local assessments), and a due-diligence checklist. "Buy" is a sim action until P4, and even in P4 ShedLife never closes a real estate deal. It hands off to a licensed agent or escrow.

### 5.2 Terrain
- **Source:** USGS 3DEP 1 m DEM via ImageServer `getSamples` (P0: 24×24 samples, flat-shaded low-poly). Bundled snapshot for offline play.
- **P1 tools:** clear (vegetation and debris, haul-off cost), grade (flatten a pad to a target elevation), cut/fill (volumes in cubic yards, balance on site vs import/export), trench (for utilities), driveway.
- **Derived data:** slope per cell (flag above about 15% and 30%, which drive geotech, grading permit and cost), drainage direction, cut/fill totals.
- **Permit triggers:** grading volume thresholds and tree removal (heritage and significant tree ordinances) feed the rules engine.

### 5.3 Structures catalog
- **Categories:** sheds (permit-exempt-size and larger), backyard studios, prefab ADUs, tiny homes on foundation, tiny homes on wheels, RVs and park models, container units.
- **Record schema:** `id, vendor, product, url, category, footprint_w, footprint_d, height, sq_ft, price_usd, price_date, foundation_type, delivery_constraints (crane, truck width), utilities_required, certifications (HCD factory-built, NOAH/RVIA, ANSI A119.5), affiliate_program, source_note`.
- **Sourcing:** manual curation from vendor product pages, plus official affiliate or dealer feeds (Home Depot via Impact, Lowe's) where available. No scraping. Every price has a date and a link.
- **Initial vendors:** Tuff Shed, Home Depot, Lowe's, Studio Shed, Boxabl, Abodu, Cover, Tumbleweed, Airstream spec sheets.
- **Art:** original low-poly models generated from dimensions. No vendor 3D assets unless licensed.

### 5.4 Contractors and vendors
- **Trades modeled:** general (B), grading/excavation (A or C-12), concrete (C-8), electrical (C-10), plumbing (C-36), septic (C-42 / sanitation), solar (C-46), landscaping (C-27).
- **Verification:** CSLB license lookup and the CSLB data portal bulk license master data (status, classifications, bond, workers' comp).
- **Quotes:** Thumbtack Partner API (application required), Angi partner channels, Yelp Fusion (display only). BuildZoom for permit-history signals.
- **Sim model:** each contractor has a classification, crew size, day rate, lead time, reliability and region. In P0–P2 these are archetypes. Real businesses only show up from verified sources.
- **Rule:** a task can't be assigned (in sim or for real) to a contractor whose license classification doesn't cover it. That's both gameplay and a safety rail.

### 5.5 Utilities ("lay the pipe")
- **Water:** check for a water district (e.g. Montara Water & Sanitary District, Coastside County Water District). Model a connection fee, meter, service line length and trench cost, or a well (County Environmental Health well permit, drilling cost, yield risk). Coastside water connections can be limited, so the game surfaces it as a constraint.
- **Sewer / septic:** sewer main proximity, then lateral, connection and capacity fees. Otherwise an onsite wastewater treatment system (OWTS): percolation test, soils, setbacks from wells, streams and property lines, and system type (conventional vs alternative) under San Mateo County Environmental Health rules. Septic feasibility can make a lot unbuildable, and the game should show that early.
- **Power:** PG&E new service request flow, distance to nearest pole or transformer, overhead vs underground, trench and conduit, panel sizing. Off-grid alternative: solar plus battery with a C-46 contractor, with California Title 24 solar requirements noted for new dwellings.
- **Access and other:** driveway and encroachment permit for road work, fire access (width, turnaround, hydrant distance in State Responsibility Areas), stormwater and drainage.
- **Geometry:** utility runs are polylines on terrain. Length times trench cost plus fixed fees gives the cost. Separation rules (water/sewer spacing, septic setbacks) are checked by the rules engine.

### 5.6 Regulations and permits engine
The core of the product. It takes a plan and a parcel and returns violations, required permits and a timeline.

- **Inputs:** parcel (geometry, APN, zone id, jurisdiction), overlays (flood, fire, coastal, geohazard, wetlands), plan (structures, grading, utilities, trees).
- **Rule packs**, one per jurisdiction, versioned, each rule citing its source:
  - Zoning: permitted uses, setbacks (front/side/rear), lot coverage, FAR, height, separation between buildings, parking.
  - State ADU/JADU law (Gov. Code §66314 et seq.): size limits, minimum allowed setbacks, ministerial review deadline, fee limits. State rules override stricter local ones where the statute says so.
  - Building code (CA Title 24, CRC): permit exemption for small detached accessory structures (commonly ≤120 sq ft in California, local rules vary), when a structure counts as a dwelling, foundation and anchoring, energy code.
  - Overlays: FEMA NFHL flood zones (elevation and construction rules), CAL FIRE FHSZ (ignition-resistant construction, defensible space), Coastal Zone (Coastal Development Permit through the county's Local Coastal Program; Montara is in the coastal zone), CGS fault and landslide zones, NWI wetlands.
  - Health: well and OWTS rules (County Environmental Health).
  - Tiny homes on wheels and RVs: whether they can be lived in, for how long, and whether as an ADU, which varies by jurisdiction. Modeled explicitly, not assumed.
- **Rule format:** declarative (JSON/YAML), each rule having `id, jurisdiction, applies_when, check, message, citation_url, effective_date, last_verified`. Geometry checks (setback buffers, coverage) run on the client for instant feedback. The same rule pack runs in Node for the authoritative check.
- **Outputs:** live violations on the map (red outlines, setback bands), a permit path (permit type, agency, documents, fees, review time, dependencies), and an exportable checklist.
- **First jurisdiction:** unincorporated San Mateo County (P2), using the P0 Montara parcel as the test case.
- **Truthfulness:** every rule shows its citation and last-verified date. Where the code is ambiguous, the engine says "ask the planner" instead of guessing. ShedLife is not an authoritative determination, and the UI says so.

### 5.7 Sim clock and costs
- **Clock (P0):** pause, 1x (1 game minute per real second), 10x, 60x, 600x. The sun follows the clock. Later: day/week skip, and "advance to next event."
- **Event queue:** permit reviews (with plan-check correction loops), vendor lead times, crew schedules, inspections, weather days (rain stops grading), utility service lead times.
- **Budget:** land, closing, design and engineering, permit and impact fees, utilities connection, site work, structure, delivery and crane, foundation, labor, contingency. Every line item records whether it's a real quote, a catalog price, or an estimate, and where the number came from.
- **Outcome states:** on budget and on schedule, over, stalled (missing permit or failed inspection), or red-tagged (built without a required permit). The game gives real consequences for skipping steps.

### 5.8 Real-transaction bridge (P4)
How a sim action becomes a real action.

- **Action types, in order of risk:** export plan packet; request a quote; contact a vendor; place a deposit or order; book a contractor; prepare a permit application; submit a permit application.
- **Human approval for every action:** each one shows an approval card with exactly what will happen, to whom, with what data, at what cost, and whether it can be undone. Nothing is sent, ordered, paid or filed without an explicit click from the account holder. No standing approvals for spend or filings.
- **Agents:** an AI agent can prepare any of these (look up licenses, draft quote requests, fill application forms, compare bids). Execution is always gated by the human.
- **Payments:** through the vendor's own checkout or a licensed payment processor. ShedLife doesn't hold funds or act as escrow.
- **Filings:** the agent prepares the packet for the county portal (Accela Citizen Access). The human (or their licensed designer or contractor) submits it. No automated submissions to government portals.
- **Liability and roles:** ShedLife is a planning and coordination tool, not a contractor, architect, engineer, real estate broker, or lender. Contracts are between the user and the vendor or contractor. Clear disclosures, plus a referral fee or affiliate disclosure wherever money changes hands.
- **Audit log:** every real action records who approved it, when, what was sent, and the response.

## 6. Data sources
Full list with terms in [data-sources.md](data-sources.md). Policy: only official APIs, open data, or licensed feeds. No scraping against a site's terms.

| Layer | Sources | Status |
|---|---|---|
| Parcels | San Mateo County Active Parcels ArcGIS REST; Santa Clara County GIS / open data; Regrid; ArcGIS Hub; CA Open Data | San Mateo in P0, Santa Clara wired |
| Terrain | USGS 3DEP ImageServer `getSamples`; USGS EPQS; The National Map downloads | In P0 |
| Land for sale | RentCast sale listings (`propertyType=Land`); county tax-defaulted sale lists (Santa Clara via Bid4Assets, San Mateo via mytaxsale), imported from official downloads; later MLS via RESO Web API with a broker | Wired (RentCast needs key) |
| Not used | Zillow / Bridge (MLS-licensed, approved uses only), Redfin (no listings API; Data Center market data only), LandWatch/Land.com, LoopNet, Crexi, Realtor.com (partner only) | Market-level Redfin data possible for flavor |
| Hazards | FEMA NFHL; CAL FIRE FHSZ; CGS geohazards; California Coastal Commission coastal zone; USFWS NWI | P2 |
| Basemap | OpenStreetMap / Overpass (ODbL); Overture Maps; Microsoft building footprints (ODbL) | P1–P2 |
| Rules | San Mateo County zoning GIS and regulations text; Accela Citizen Access; HCD ADU Handbook and Gov. Code §66314 et seq.; CA Building Standards Code (Title 24); Municode / American Legal / eCode360; National Zoning Atlas | P2 |
| Structures | Tuff Shed, Home Depot (Impact affiliate), Lowe's, Studio Shed, Boxabl, Abodu, Cover, Tumbleweed, Tiny Home Builders, Airstream specs, RV Trader (link only) | P1 (curated) |
| Contractors | CSLB license lookup and data portal; Thumbtack Partner API; Angi Pro; BuildZoom; Yelp Fusion | P3 |
| Utilities | PG&E new service; Montara Water & Sanitary District; Coastside County Water District | P2–P3 |

Each adapter records `source_url`, `fetched_at`, and the license or terms that apply. Snapshots are bundled for offline play and to avoid hammering public servers.

## 7. Architecture

```
┌──────────── Browser (Vite + Three.js) ────────────┐
│ Isometric renderer (ortho camera, terrain mesh,   │
│ grid, structures, overlays)                       │
│ Tools: place/rotate, terrain, utilities, trees    │
│ Sim: clock, event queue, budget                   │
│ Rules client: instant geometry checks (same pack) │
│ UI: land panel, catalog, permit path, approvals   │
└───────────────┬───────────────────────────────────┘
                │ /api/*
┌───────────────▼──── Node server (Vite middleware → standalone) ─┐
│ Data adapters: parcel (county GIS), terrain (3DEP), listings    │
│ (RentCast, tax-sale import), hazards, zoning, catalog, CSLB,    │
│ quotes (Thumbtack/Angi)                                         │
│ Cache + snapshots (keys stay server-side; quota-aware TTLs)     │
│ Rules engine (authoritative): rule packs per jurisdiction       │
│ Transaction bridge (P4): action queue, approval tokens, audit   │
│ log, provider connectors                                        │
└─────────────────────────────────────────────────────────────────┘
```

- **Front end:** Three.js with an orthographic isometric camera and low-poly flat shading. All art is original. Local coordinates are meters east/north of the parcel centroid (`src/geo.js`). Scene state is serializable to a plan file (`plan.json`) that's the single source of truth for sim, rules and export.
- **Rules engine:** pure functions `(parcel, overlays, plan, rulePack) → {violations, permits, timeline}`. Shared code between browser and server. Rule packs are data, versioned in `rules/<jurisdiction>/`, each rule with citation and `last_verified`. Unit-tested against real cases (`npm test`).
- **Data adapters:** one module per source with a common interface `fetch(query) → {data, source_url, fetched_at, terms}`. Server-side only when a key is involved (as in `server/listings.mjs` today). Caching is built to fit free quotas.
- **Sim:** deterministic event queue keyed to sim time, so fast-forward is just draining the queue faster. Seeded randomness for weather and delays, so runs can be reproduced.
- **Persistence:** P0–P2 use localStorage and exportable plan files. P3+ adds accounts and server storage for plans, quotes and the audit log.
- **Security:** API keys never reach the client. Minimal personal data (no owner names from parcel layers). Approval tokens are single-use and scoped to one action.

## 8. Milestones

| Phase | Scope | Exit criteria |
|---|---|---|
| **P0** ✅ | Isometric scene of real vacant parcel APN 036174080 (Montara, unincorporated San Mateo County) from county GIS; USGS 3DEP terrain; 1 m grid; shed place/rotate with lot-line check; sim clock to 600x; land-for-sale panel (RentCast + county tax-sale import); `/api/parcel` by APN or lat/lon for San Mateo and Santa Clara | Done: runs offline from bundled snapshot; unit tests pass |
| **P1** | Terrain tools (clear, grade, cut/fill, trench, driveway) with volumes and costs; curated catalog of 30+ real structures with dimensions, prices, dates and links; budget panel; save/load plan files | Grade a pad on the Montara lot, place three real products, and get a cost breakdown with a source for every line |
| **P2** | Rules engine for unincorporated San Mateo County: zoning, setbacks, coverage, height, ADU/JADU state law, 120 sq ft shed exemption, FEMA flood, CAL FIRE FHSZ, Coastal Zone/CDP, slope, septic/sewer, water. Permit path with fees and review times; event queue; hazard overlays | A county planner (or permit expediter) reviews the output for 5 test plans and agrees with it on at least 90% of the determinations |
| **P3** | Contractor and vendor marketplace: CSLB verification, trade-to-license mapping, quote requests (Thumbtack Partner API, Angi), vendor and affiliate links, utility service flows (PG&E, local water/sanitary district); exportable plan packet | 10 real users send quote requests from a ShedLife plan and get real responses |
| **P4** | Real transactions with human approval: approval cards, audit log, vendor orders via vendor checkout, contractor booking, permit-application prep for Accela (human submits); MLS/IDX via a broker partner | First real shed ordered and first real permit application prepared end to end, with zero unapproved actions |

Later: more California jurisdictions (rule packs per county or city), other states, multiplayer and shared plans, and a "challenge mode" with scenario lots (steep, coastal, septic-only).

## 9. Risks

| Risk | Detail | Mitigation |
|---|---|---|
| **Legal: unauthorized practice / advice** | Rule outputs could be read as legal, engineering or architectural determinations. | Persistent disclaimers; citations and last-verified dates on every rule; "ask the planner" for ambiguous cases; no stamped plans; route engineering to licensed pros. |
| **Licensing: real estate and contracting** | Brokering land, acting as a contractor, or taking referral fees can trigger DRE or CSLB licensing rules. | ShedLife never acts as broker or contractor; MLS data only through a licensed broker partner; contracts directly between user and pro; legal review of any referral fee model before P3. |
| **Data terms** | Listing data (MLS, Zillow/Bridge, Redfin) is tightly licensed; ODbL share-alike; affiliate program rules; API quotas. | Official APIs and open data only; no scraping; per-source terms recorded in data-sources.md and in adapter metadata; attribution UI; re-verify terms before any commercial launch. |
| **Stale or wrong rules** | Codes change (ADU law changes almost every year); local interpretation varies. | Versioned rule packs with effective dates; scheduled re-verification; user-reported corrections; one jurisdiction done well before expanding. |
| **Safety** | Grading, trenching (call 811 before you dig), electrical, septic and structural work can hurt people or property. | The game models the real requirements (811 ticket, inspections, licensed trades) instead of shortcuts; no DIY guidance for licensed-trade work; a red-tag outcome for skipping permits. |
| **Agent misuse / runaway actions** | An agent could send, order or file without consent. | Per-action human approval, single-use scoped tokens, spend caps, audit log, no automated government submissions. |
| **Privacy** | Parcel layers and county records can include owner names and addresses. | Request only non-personal fields; no owner lookup features; minimal account data. |
| **Public server load** | Hammering county GIS and USGS servers. | Bundled snapshots, caching, rate limits. |
| **Expectations** | A game price isn't a quote. | Label every number as quote, catalog or estimate, with its date and source. |
| **Scope** | "100% real" across every jurisdiction is huge. | One parcel, then one county, then one state. Depth over breadth. |

## 10. Success metrics

**Game / engagement**
- Time to first placed structure on a real parcel: under 2 minutes.
- Plan completion rate (structures plus utilities plus permit path): above 30% of sessions that load a parcel.
- Return players week over week; plans shared.

**Truthfulness**
- Rules engine agreement with professional review (planner or expediter): at least 90% on the P2 test set, with zero severe misses (for example calling a coastal-zone lot exempt).
- Every cost line has a source and date: 100%.
- Median age of rule `last_verified`: under 90 days.

**Real-world impact (P3+)**
- Quote requests sent from ShedLife plans, and response rate.
- Plans that become real permit applications.
- Structures actually ordered and installed; dwellings that get a certificate of occupancy.
- Users who report ShedLife helped them decide (yes or no) on a lot before buying.

**Trust and safety**
- Unapproved real-world actions: zero.
- Data-terms complaints or takedowns: zero.
