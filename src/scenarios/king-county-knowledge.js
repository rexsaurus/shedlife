// What each NPC "knows" when a player asks a free-form question. One paraphrased fact per line, with source.
// Refresh with the refresh-data skill (Apify rag-web-browser or WebFetch on the agency pages). Checked 2026-10-12.
export const KNOWLEDGE = {
  permitting: [
    ['Detached, unconditioned accessory buildings under 200 sq ft need no building permit, but must still meet zoning setbacks and critical-area rules.', 'King County "Residential Accessory Building Permits" handout'],
    ['RA-5 zoning: 30 ft street setback, 10 ft interior setbacks, 20% maximum impervious surface.', 'KCC 21A.12.030'],
    ['One ADU per property; up to 1,000 sq ft heated plus 1,000 sq ft unheated; a notice on title must be recorded; detached only if the lot meets the zone minimum area.', 'King County ADU handout; KCC 21A.08'],
    ['An RV or park-model RV is not a dwelling. Camping use is limited to 60 days in any 365; vehicles cannot be stored on vacant land.', 'King County "Residential Tiny Homes" handout'],
    ['A tiny house on a foundation is a house: building permit, plans, habitable rooms ≥70 sq ft with 7 ft minimum dimension and 7 ft ceilings. Every home needs an approved well and septic.', 'King County "Residential Tiny Homes" handout'],
    ['A Critical Area Designation is required before Public Health septic or well applications on residential projects; it is valid for 5 years.', 'KCC 21A.24; King County Permitting'],
    ['2026 fees: new custom house $8,128 application review + $4,639 site review + $2.46/sq ft inspection; modular home $2,419 + $4,639 + $1,141; CAD $1,643 minimum (+$1,212 each if ecological or geological critical areas).', 'King County 2026 Fee Guides 01 and 02'],
    ['Exempt-well building permits in WRIAs 7, 8, 9, 10 and 15 pay a $500 fee (RCW 90.94); use is capped at a 950 gallons/day annual average.', 'RCW 90.94; King County Permitting'],
    ['Applications are filed online through MyBuildingPermit.com; questions go to PermitQuestions@kingcounty.gov or 206-296-6600.', 'kingcounty.gov permit customer services'],
  ],
  health: [
    ['A licensed on-site sewage designer must submit the septic application, with at least 5 soil logs: 2 drainfield, 2 reserve area, 1 tank.', 'Public Health – Seattle & King County OSS program'],
    ['Drainfield setbacks: 100 ft from a well, 10 ft from a building foundation, 5 ft from a property line, 100 ft from surface water. Tank: 50 ft from a well, 5 ft from a foundation.', 'WAC 246-272A-0210 Table IV'],
    ['2026 fees: septic design review $731 gravity / $1,181 pressurized; install permit $1,069 gravity / $1,181 pressurized; winter water table review $1,013; well location review $450.', 'Public Health OSS fee sheet effective 1/1/2026'],
    ['New wells need a 2-hour pump test (4 hours and ≥400 gal/day if it yields ≤5 gpm), two bacteria samples, nitrate (limit 10 mg/L) and arsenic (limit 0.01 mg/L).', 'Public Health – Seattle & King County private well program'],
    ['There is no general public intake email; applications go through the Public Health Permit Center. Eastgate office: 206-477-8050.', 'kingcounty.gov Environmental Health'],
  ],
  ecology: [
    ['File a well construction Notice of Intent 72 hours before drilling starts. It is not a permit or a water right, and does not approve using the water.', 'ecology.wa.gov well construction notice of intent (fetched via Apify 2026-10-12)'],
    ['NOI forms and fees are submitted online (EcoEPay; card payments add 3%). Paper forms by email from wclo@ecy.wa.gov.', 'ecology.wa.gov well construction notice of intent'],
    ['Water may only be withdrawn from a new well if it is legally available, and it must be put to beneficial use to establish a right.', 'ecology.wa.gov well construction notice of intent'],
    ['Permit-exempt wells are limited under RCW 90.44.050; in many basins RCW 90.94 adds fees and a 950 gal/day annual-average cap.', 'RCW 90.44.050; RCW 90.94'],
  ],
  lni: [
    ['Electrical permits in unincorporated King County come from L&I, bought online and issued immediately. Homeowners may pull one only for their own property.', 'L&I electrical permits; King County Fee Guide 02'],
    ['Request inspection within 3 business days of finishing (or 1 day after energizing); L&I targets inspections within 48 hours.', 'L&I electrical inspections'],
    ['Factory-built and modular homes need L&I approval in addition to the county permit. Check any contractor with L&I "Verify a Contractor".', 'L&I factory assembled structures; lni.wa.gov'],
  ],
  utility: [
    ['Line extensions are quoted per job under PSE tariff Rule 6; there is no published per-foot price.', 'PSE builder services (UNVERIFIED for this parcel)'],
    ['Tanner Electric Cooperative serves parts of North Bend and Ames Lake; check which utility serves the parcel first.', 'tannerelectric.coop'],
  ],
  designer: [['Soil logs come before design; wet-season (winter water table) review can add time on the Eastside.', 'game knowledge (fictional contractor)']],
  driller: [['Typical Western Washington wells run 100–400 ft; complete wells often $15–35K. Depth is never guaranteed.', 'cost estimate, UNVERIFIED']],
  builder: [['A factory-built home needs L&I approval and a county building permit before delivery.', 'King County "Residential Tiny Homes" handout']],
  septicer: [['Installation waits for the Public Health install permit; an as-built drawing is filed after.', 'Public Health OSS program']],
};
