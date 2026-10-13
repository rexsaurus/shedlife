# ShedLife roadmap

Last updated 2026-10-12. Full product detail lives in [SPEC.md](SPEC.md). The task-level backlog with acceptance criteria lives in [CLAUDE.md](../CLAUDE.md#backlog-prioritized). Data sources and terms are in [data-sources.md](data-sources.md).

Order of work: depth before breadth. One parcel, then one county (unincorporated San Mateo), then one state (California).

## P0: isometric sandbox on a real parcel ✅ (done)
- Vite + Three.js, orthographic isometric camera, wheel zoom
- Real parcel APN 036174080 (vacant, Montara, unincorporated San Mateo County) from county ArcGIS REST
- Real terrain: 24×24 USGS 3DEP 1 m samples, flat-shaded low-poly
- 1 m grid clipped to the lot, parcel line
- Original 8×10 shed: place, snap 0.5 m, rotate (R), red when it crosses the lot line
- Sim clock: pause / 1× / 10× / 60× / 600×, sun follows the clock
- Land-for-sale panel: RentCast `propertyType=Land` (server-side key, 6 h cache) and official county tax-sale CSV import
- `/api/parcel` by APN or lat/lon for San Mateo and Santa Clara counties
- 9 unit tests (`npm test`)

## P1: terrain tools and a real structures catalog
- Plan file (`plan.json`) as the single source of truth, with save/load/export
- Terrain tools: clear, grade pad, cut/fill with cubic-yard volumes, trench, driveway
- Slope analysis overlay (15% and 30% thresholds)
- Curated catalog of 30+ real products (sheds, studios, prefab ADUs, tiny homes, RVs) with dimensions, price, price date, URL
- Procedural original low-poly models from catalog dimensions
- Budget panel: every line is quote / catalog / estimate, with source and date
- **Exit:** grade a pad on the Montara lot, place three real products, and get a sourced cost breakdown

## P2: rules engine for unincorporated San Mateo County
- Declarative rule packs (`rules/san-mateo-uninc/`) with citation, effective date, last-verified date
- Zoning (setbacks, coverage, height, separation), CA ADU/JADU state law, 120 sq ft shed exemption, Title 24 notes
- Overlays: FEMA NFHL flood, CAL FIRE FHSZ, Coastal Zone / CDP, CGS geohazards, NWI wetlands
- Utilities: water (district or well), sewer or septic (OWTS), PG&E power, access
- Permit path: permits, agencies, documents, fees, review times, dependencies
- Event queue: permit review, deliveries, crews, inspections, weather
- **Exit:** a planner or permit expediter agrees on at least 90% of determinations across 5 test plans, with no severe misses

## P3: contractor and vendor marketplace
- CSLB license verification (bulk data portal plus lookup), trade-to-classification mapping
- Quote requests through Thumbtack Partner API / Angi partner channels (once approved)
- Vendor and affiliate links with disclosure
- Utility service flows (PG&E, Montara Water & Sanitary District, Coastside County Water District)
- Exportable plan packet (site plan, bill of materials, permit checklist, schedule, budget)
- **Exit:** 10 real users send quote requests from a ShedLife plan and get real responses

## P4: real transactions, with a human approving every step
- Approval cards, single-use scoped approval tokens, spend caps, audit log
- Vendor orders through the vendor's own checkout; contractor booking
- Permit application prep for Accela Citizen Access (the human submits; no automated filings)
- MLS/IDX listings through a licensed broker partner (RESO Web API)
- **Exit:** first real shed ordered and first real permit application prepared end to end, with zero unapproved actions

## Later
- More California jurisdictions (one rule pack per county or city), then other states
- Scenario / challenge lots (steep, coastal, septic-only)
- Shared and multiplayer plans
