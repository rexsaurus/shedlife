---
name: refresh-data
description: Refresh ShedLife's bundled real-world data — the parcel and terrain snapshot, King County fee guides, agency contacts and handout knowledge, and optional land listings via Apify. Use when data looks stale, a new year's fee guide is out, the bundled parcel should change, or before a demo.
---

# Refresh data

## Parcel + terrain
`npm run fetch-parcel -- <PIN> king` rewrites `public/data/parcel.json` (King County PropertyInfo layer + USGS 3DEP). Pick parcels with:
`https://gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_PropertyInfo/MapServer/2/query?where=KCA_ZONING LIKE 'RA-5%' AND PREUSE_DESC LIKE 'Vacant%' AND CTYNAME IS NULL&outFields=PIN,KCA_ZONING,KCA_ACRES,PREUSE_DESC&returnGeometry=false&resultRecordCount=20&f=json`
Then `npm test` (the bundled-data test checks shape and that no owner fields leaked).

## Fees (yearly, January)
King County publishes Fee Guides 01 (pre-development) and 02 (single-family) as PDFs under `cdn.kingcounty.gov/-/media/king-county/depts/local-services/permits/fee-guides/`; Public Health publishes the OSS fee sheet. Update `QUESTS[].fee` and `homePermitFee()` in `src/scenarios/king-county.js`, update the citations, run the `verify-regulation` steps.

## Agency knowledge (what NPCs know when answering questions)
`src/scenarios/king-county-knowledge.js` holds short paraphrased facts per NPC with source URLs. To refresh, fetch the agency pages with the Apify MCP `apify--rag-web-browser` (or WebFetch), paraphrase the parts that matter for a homeowner, keep each fact one line, keep the URL.

## Land listings (optional)
`server/listings.mjs` supports RentCast (official API) and county tax-sale imports. Any Apify Actor that scrapes a commercial listing site (Zillow, LandWatch, …) needs Rex's explicit OK for that use first (CLAUDE.md invariant 5); if approved, save the dataset to `data/` as a dated snapshot with the Actor id, and normalize it with the same shape as `normalizeRentcast()`.
