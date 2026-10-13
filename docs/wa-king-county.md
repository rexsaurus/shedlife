# King County, WA — research behind the game

Researched 2026-10-12 for a vacant rural parcel in **unincorporated King County** (RA zones). Every number in
`src/scenarios/king-county.js` and `src/rules.js` traces to a line here. **UNVERIFIED** = couldn't confirm from a
primary source; game uses it as an estimate. Not legal or permitting advice. Re-verify with the `verify-regulation` skill.

## Agencies (public intake only)
| NPC | Controls | Contact | Fees used (2026) | Status |
|---|---|---|---|---|
| King County Permitting (DLS) | Building permits, zoning, critical areas (CAD), SEPA, driveway standards, exempt-well fee | PermitQuestions@kingcounty.gov · 206-296-6600 · 919 SW Grady Way #300, Renton · apply via MyBuildingPermit.com | CAD $1,643 min (+$1,212 per ecological/geological area); custom house $8,128 + $4,639 site + $2.46/sq ft; modular $2,419 + $4,639 + $1,141; ADU $4,556 + $3,618 + $2.46/sq ft; screening $126; state surcharge $6.50 | Verified: [Fee Guide 01](https://cdn.kingcounty.gov/-/media/king-county/depts/local-services/permits/fee-guides/01-fee-2026-pre-development-services-fees.pdf), [Fee Guide 02](https://cdn.kingcounty.gov/-/media/king-county/depts/local-services/permits/fee-guides/02-fee-2026-single-family-residential-construction.pdf) |
| Public Health – Seattle & King County | Septic design/install, well site, water quality, plumbing | No public intake email; Public Health Permit Center portal; 206-477-8050 (Eastgate) | Design $731 gravity / $1,181 pressurized; install $1,069 / $1,181; winter water table $1,013; well location $450 | Verified: [OSS fee sheet](https://cdn.kingcounty.gov/-/media/king-county/depts/dph/documents/health-safety/environmental-health/fees/oss-service-fees-through-2026.pdf). Turnaround UNVERIFIED |
| WA Dept. of Ecology | Well Notice of Intent, driller licensing, water rights / exempt-well limits | Online NOI forms; wclo@ecy.wa.gov for paper forms | NOI $200 (proposed $250, UNVERIFIED) | Verified via Apify fetch of the [NOI page](https://ecology.wa.gov/regulations-permits/reporting-requirements/well-construction-notice-of-intent) |
| WA Labor & Industries | Electrical permits + inspections in unincorporated King County; factory-built approval; contractor lookup | Online (EPIS); 1-800-647-0982 | Single-family $112.60 first 1,300 sq ft + $35.90 per 500 sq ft (WAC 296-46B-906; 2026 increase UNVERIFIED) | Verified |
| Puget Sound Energy | New service / line extension | PSE builder services (online) | Quoted per job, Rule 6 — game uses $9,500 estimate | Territory for this parcel UNVERIFIED (Tanner Electric serves parts of North Bend / Ames Lake) |
| Contractors | Septic designer, well driller, prefab builder, septic installer | Fictional companies, `.example` emails | Estimates | — |

## Rules used
- **Shed exemption:** detached, unconditioned accessory buildings **under 200 sq ft** need no building permit; zoning/setbacks/critical areas still apply (King County "Residential Accessory Building Permits" handout).
- **RA setbacks / impervious** (KCC 21A.12.030): RA-2.5 30/5 ft, 25%; RA-5 30/10 ft, 20%; RA-10 30/10 ft, 15%; RA-20 30/10 ft, 12.5%. Game treats every lot line as interior (street edge not modeled). Accessory-structure setbacks UNVERIFIED (game uses zone interior).
- **ADU** (KCC 21A.08; King County ADU handout): one per property; ≤1,000 sq ft heated + 1,000 unheated; detached only if lot meets zone minimum; title notice recorded; Public Health approval required.
- **RVs / tiny homes** (King County "Residential Tiny Homes" handout): RV is not a dwelling; camping ≤60 days in 365; tiny house on foundation = house (permit, ≥70 sq ft rooms, 7 ft dimensions/ceilings); every home needs approved well + septic.
- **Septic** (WAC 246-272A-0210 Table IV): drainfield 100 ft to well, 10 ft to foundation, 5 ft to property line, 100 ft to surface water; tank 50 ft to well, 5 ft to foundation. Licensed designer; ≥5 soil logs.
- **Well:** WAC 173-160-171 setbacks (50 ft tank, 100 ft drainfield); NOI 72 h before drilling; pump test 2 h (4 h if ≤5 gpm); bacteria ×2, nitrate ≤10 mg/L, arsenic ≤0.01 mg/L.
- **Exempt-well fee** (RCW 90.94): $500 per building permit in WRIAs 7, 8, 9, 10, 15; 950 gal/day annual average cap; rule update WSR 26-12-038 effective 2026-06-27.
- **Water before permit:** RCW 19.27.097 (adequate water supply before a building permit).
- **Critical areas** (KCC 21A.24): CAD required before Public Health septic/well applications; valid 5 years. Steep slope hazard ≥40% (KCC 21A.06) → geological review fee in game.
- **Fire separation:** game uses 6 ft between a dwelling and other structures (IRC R302.1, simplified).

## Order of steps (synthesis, not a county checklist)
1. Zoning check (optional pre-app) → 2. CAD → 3. Septic designer, soil logs, design approval ∥ 4. Well site approval → Ecology NOI → drill → tests → water adequacy → 5. Building permit (septic design + water + plans + $500 well fee) → 6. Driveway to road standards → 7. Utility service + L&I electrical → 8. Septic install permit + inspections → 9. Final inspection.

## Costs (estimates, UNVERIFIED for WA)
Septic installed (pressurized/treatment, Western WA) $20–45K + $3–6K design; well $15–35K complete; line extension quoted per job; gravel driveway ~$15–40/linear ft.

## GIS (no key, tested)
- King County parcels + zoning: `https://gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_PropertyInfo/MapServer/2/query` (PIN, KCA_ZONING, KCA_ACRES, PREUSE_DESC, CTYNAME)
- WA statewide parcels (no zoning): `https://services.arcgis.com/jsIt88o09Q0r1j8h/arcgis/rest/services/Current_Parcels/FeatureServer/0/query`
- Bundled parcel: PIN 8847400030, RA-5, 4.79 ac, Vacant (Single-family), unincorporated.

## Kittitas County (next scenario)
County permits; Kittitas County Public Health (509-962-7515) for septic + adequate water supply determination; new exempt wells in the Yakima basin need water-bank mitigation and metering (WAC 173-539A) — a natural "hard mode".
