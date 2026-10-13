# ShedLife — Claude Code guide

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
