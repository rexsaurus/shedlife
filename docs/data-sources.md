# ShedLife data sources

Researched 2026-10-12. Rule: only official APIs, open data, or licensed feeds. **No scraping against a site's terms of service.**
Verify terms again before any commercial launch; several of these change often.

## Listings / land for sale (the "Redfin / Zillow" layer)

| Source | Status | Notes |
|---|---|---|
| Zillow (Bridge Interactive, Zillow Group APIs) — https://www.zillowgroup.com/developers/ , https://www.bridgeinteractive.com/developers/ | **Restricted** | The old public Zillow API (GetSearchResults, Zestimate) was retired in 2021. Listing data now flows through Bridge and is MLS-licensed: you need an approved use case and usually MLS participation. Terms prohibit scraping and storing/redisplaying data outside approved uses. |
| Redfin — https://www.redfin.com/news/data-center/ | **No listings API** | Redfin publishes free downloadable *market-level* datasets (prices, inventory by metro/zip) in its Data Center. No public per-listing API; ToS forbids scraping. Good for "market mood" in the game, not parcels. |
| MLS via RESO Web API — https://www.reso.org/reso-web-api/ | Licensed | The legitimate route to live listings: get an IDX/VOW license through a broker + the local MLS (Bay Area: MLSListings / bridgeMLS). Realistic for P3/P4 via a broker partner. |
| Land-specific portals (LandWatch, Land.com, Lands of America) | No public API | Partner/feed agreements only. |
| **Plan** | | P0–P2 use public parcel GIS (what exists on the ground, not what's for sale). "For sale" comes later via an MLS/IDX partner or user-supplied listing URL (user pastes a link; we don't scrape). |

## Parcels, ownership boundaries, assessor
- **San Mateo County Active Parcels (used in P0)** — https://gis.smcgov.org/maps/rest/services/Common/ACTIVE_PARCELS_APN/FeatureServer/0 — public ArcGIS REST, GeoJSON output, APN, situs, use code, zone id. We request only non-personal fields (no owner names).
- Santa Clara County open data / parcels — https://data.sccgov.org/ and https://gis.sccgov.org/
- Regrid (nationwide normalized parcels, paid API, free tier for some uses) — https://regrid.com/api
- ArcGIS Hub (find any county's parcel layer) — https://hub.arcgis.com/
- California statewide parcel effort / CA Open Data — https://data.ca.gov/

## Elevation / terrain
- **USGS 3DEP ImageServer `getSamples` (used in P0)** — https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer — public domain, 1 m lidar DEM where available, batched multipoint queries.
- USGS Elevation Point Query Service — https://epqs.nationalmap.gov/v1/docs
- The National Map downloads (lidar point clouds, DEM tiles) — https://apps.nationalmap.gov/downloader/

## Hazards and constraints
- FEMA National Flood Hazard Layer (ArcGIS REST) — https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer and https://www.fema.gov/flood-maps/national-flood-hazard-layer
- CAL FIRE Fire Hazard Severity Zones — https://osfm.fire.ca.gov/what-we-do/community-wildfire-preparedness-and-mitigation/fire-hazard-severity-zones
- California Geological Survey (Alquist-Priolo faults, landslide/liquefaction) — https://www.conservation.ca.gov/cgs/geohazards
- California Coastal Commission coastal zone boundary (Montara is in it) — https://www.coastal.ca.gov/
- USFWS wetlands — https://www.fws.gov/program/national-wetlands-inventory

## Basemap / context
- OpenStreetMap (ODbL; attribution + share-alike on derived DBs) — https://www.openstreetmap.org/copyright ; Overpass API for roads/buildings: https://wiki.openstreetmap.org/wiki/Overpass_API
- Overture Maps (buildings, places; open licenses) — https://overturemaps.org/
- Microsoft Global ML Building Footprints (ODbL) — https://github.com/microsoft/GlobalMLBuildingFootprints

## Zoning, codes, permits (rules engine, P2)
- San Mateo County Planning & Building zoning maps/GIS — https://www.smcgov.org/planning and https://gis.smcgov.org/ (zoning layers on the same ArcGIS server; ZONE_ID on parcels)
- San Mateo County Zoning Regulations (text) — https://www.smcgov.org/planning/zoning-regulations
- San Mateo County permit portal (Accela Citizen Access) — https://aca-prod.accela.com/SMCGOV/ (filing is human-in-the-loop; no automated submissions)
- California ADU / JADU law (Gov. Code §66314 et seq.) and HCD ADU Handbook — https://www.hcd.ca.gov/policy-and-research/accessory-dwelling-units
- California Building Standards Code (Title 24; read free online) — https://www.dgs.ca.gov/BSC/Codes ; CA Residential Code shed exemption (detached accessory ≤120 sq ft generally exempt from building permit, local rules vary)
- Municode / American Legal / eCode360 for other cities' codes (read online; check each site's reuse terms) — https://library.municode.com/
- Zoning Atlas (National Zoning Atlas, open methodology) — https://www.zoningatlas.org/

## Structures catalog (P1) — real sheds, tiny homes, RVs
Use vendor product pages as links + manually curated specs (dimensions, price, URL), or official affiliate/dealer feeds. No scraping.
- Tuff Shed (has dealer/installer network in CA) — https://www.tuffshed.com/
- Home Depot sheds (Affiliate program via Impact) — https://www.homedepot.com/b/Storage-Organization-Sheds/N-5yc1vZc5ru ; https://www.homedepot.com/c/affiliate_program
- Lowe's sheds (affiliate) — https://www.lowes.com/
- Studio Shed (prefab ADUs/backyard studios, Colorado; ships to CA) — https://www.studioshed.com/
- Boxabl (Casita, factory-built ADU) — https://www.boxabl.com/
- Mighty Buildings / Cover / Abodu (Bay Area-relevant prefab ADUs) — https://abodu.com/ , https://www.buildcover.com/
- Tiny home builders: Tumbleweed — https://www.tumbleweedhouses.com/ ; Tiny Home Builders directory — https://www.tinyhomebuilders.com/
- RVs: RV Trader (listings, no public API) — https://www.rvtrader.com/ ; manufacturer spec sheets (Airstream https://www.airstream.com/)
- Container homes / cabins: catalog by manual curation.

## Contractors (P3)
- **CSLB license lookup (California)** — https://www.cslb.ca.gov/onlineservices/checklicenseII/checklicense.aspx ; CSLB also publishes license master data for download — https://www.cslb.ca.gov/onlineservices/dataportal/ (legit bulk source for verification)
- Angi (Angi Leads / partner API for pros; consumer search has no open API) — https://www.angi.com/ ; https://www.angi.com/pro
- Thumbtack Partner API (request-a-quote integrations, application required) — https://developers.thumbtack.com/
- BuildZoom (permit-history-based contractor ratings; data partnerships) — https://www.buildzoom.com/
- Houzz Pro / Porch / Yelp Fusion API (Yelp: business search, display-only terms) — https://docs.developer.yelp.com/
- Utility hookups (lay the pipe): PG&E new service — https://www.pge.com/en/account/service-requests/building-and-renovation.html ; Montara Water & Sanitary District — https://mwsd.montara.org/ ; Coastside County Water District for Half Moon Bay area.

## P0 decision
Use San Mateo County parcel REST + USGS 3DEP (both public, no key, permissive). Bundle one parcel snapshot (`public/data/parcel.json`, refresh with `npm run fetch-parcel -- <APN>`) so the game runs offline and doesn't hammer county servers.
