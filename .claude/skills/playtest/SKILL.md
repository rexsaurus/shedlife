---
name: playtest
description: Playtest and balance-check ShedLife — unit tests, the optimal-run simulator, and a headless browser playthrough with screenshots. Use after any change to rules, quests, fees, the engine or the UI, before committing, or when asked to "check it works", "balance it" or "take screenshots".
---

# Playtest

1. `npm test` — must be green. The `full playthrough` test proves an optimal player can win.
2. `npm run simulate` — prints, per home type, the day the optimal run wins (or where it gets stuck) and money left. Healthy: tiny home wins with a margin; the expensive prefab should be unaffordable at the default budget (it's a trap choice).
3. Browser: `npm run dev` in the background, then `python3 scripts/playtest.py out/` (Playwright, Chromium). It places a home/septic/well, emails Permitting twice, skips to replies and saves `out/0-intro.png`, `out/1-play.png`. Look at the screenshots — layout regressions show up there first.
4. Manual checks worth doing before a demo: a setback violation shows red on the map and comes back as CORRECTIONS; sending a quest out of order returns NOT YET with no fee; ⏭ Next mail jumps to the next reply; the win modal appears after Final inspection.
