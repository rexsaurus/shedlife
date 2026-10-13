---
name: add-county
description: Add a new Washington county (or another jurisdiction) as a playable ShedLife scenario — parcel GIS source, agencies, fees, permit quest graph, site-plan rules and tests. Use when asked to support a new county, city, zone or state, or to "make it work for <place>".
---

# Add a county scenario

A scenario is one file in `src/scenarios/` plus a parcel source in `server/parcel.mjs`. Work in this order and keep `npm test` green.

## 1. Parcel + zoning source
- Find the county's public ArcGIS REST parcel layer (ArcGIS Hub, the county GIS site). You need: a query URL that returns `f=geojson` with no key, the parcel-ID field, and ideally a zoning field. Statewide fallback (no zoning): WaTech `https://services.arcgis.com/jsIt88o09Q0r1j8h/arcgis/rest/services/Current_Parcels/FeatureServer/0/query` (`PARCEL_ID_NR`, `COUNTY_NM` coded).
- Test it: `curl "<url>?where=1=1&resultRecordCount=1&outFields=*&f=json"`.
- Add an entry to `COUNTIES` in `server/parcel.mjs` with `norm()` mapping to `{ apn, use, city, jurisdiction, zoning, acres, state }`. Request only non-personal fields (no owner names).
- Pick a real vacant parcel that is residentially zoned and buildable; bundle it with `npm run fetch-parcel -- <id> <county-key>`.

## 2. Research (delegate)
Spawn the `regs-researcher` agent with the county name and zone. You need, with sources: building-permit agency + intake contact, health district (septic + well), Ecology region rules (water: exempt wells, mitigation, e.g. Kittitas needs water-bank mitigation), L&I (electrical is statewide), utility for the area, setbacks/impervious for the zone, ADU rules, RV/tiny-home rules, fees from the current fee schedule, and the real ORDER of steps. Save notes to `docs/wa-<county>.md` with UNVERIFIED marks.

## 3. Scenario file
Copy `src/scenarios/king-county.js` → `src/scenarios/<county>.js` and edit `SCENARIO`, `NPCS`, `DOCS`, `QUESTS`, fee functions. Rules for quests:
- One quest = one email ask to one NPC. `needs` = attachments required (missing → needs-info). `after` = quests that must be done (else too-early). `gives` = docs produced.
- Every quest has `cite`. Estimates get `est:true`.
- Use the `add-quest` and `add-agency-npc` skills for details.

## 4. Rules
If the zone's numbers differ, extend `RA`/`RULES` in `src/rules.js` (or add a zone table) — never hard-code a county name in the engine.

## 5. Wire + test
- Make the scenario selectable (currently `main.js` and `engine.js` import king-county directly; introduce a scenario registry if this is the second one).
- Add a test like `full playthrough reaches occupancy` for the new scenario and run `npm run simulate` to check the optimal run wins with a sensible margin (target: wins in 60–80% of the deadline with 10–25% of budget left).
