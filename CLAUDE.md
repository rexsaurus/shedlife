# ShedLife — Claude Code guide

ShedLife is a game about getting a real home permitted on a real vacant parcel in Washington State.
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
| `docs/wa-king-county.md` | Research notes and sources behind every rule, fee and contact |

## Invariants (do not break)
1. **The engine decides, Claude narrates.** Never let model output change game state. New outcomes go in `engine.js` + `letters.js` (`factsOf`) with tests.
2. **Real agencies, real public contacts only.** General intake addresses / portals from the agency's own site. No individual staff names or emails. Contractors are fictional (`real:false`, `.example` emails).
3. **Every rule, fee and requirement has a `cite`/`ref`.** If you could not confirm it from a primary source, say UNVERIFIED in `docs/wa-king-county.md` and keep the game number labelled as an estimate (`est:true`).
4. **Human-in-the-loop for anything real.** The game may prepare a real email (mailto / Gmail draft), never send one. No automated portal submissions.
5. **Data sourcing rule** (docs/data-sources.md): official APIs, open government data, or licensed feeds. Using an Apify Actor that scrapes a commercial listing site needs Rex's explicit OK per use; government pages via `apify/rag-web-browser` are fine.
6. Keep `npm test` green; the full-playthrough test is the balance contract (an optimal run must win).

## Skills in this repo (`.claude/skills/`)
`add-county` · `add-agency-npc` · `add-quest` · `verify-regulation` · `refresh-data` · `npc-voice` · `playtest` · `draft-real-email`
Subagent: `regs-researcher` (`.claude/agents/`). MCP: Apify via `.mcp.json` (needs `APIFY_TOKEN`).
