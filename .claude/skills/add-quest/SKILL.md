---
name: add-quest
description: Add or change a step in the ShedLife permit quest graph (an email request to an NPC with prerequisites, attachments, fee, delay and resulting documents). Use when the permit path is missing a real step, a step is in the wrong order, a fee or turnaround changes, or a new structure type needs its own approvals.
---

# Add a quest

Quests are entries in `QUESTS` (`src/scenarios/<scenario>.js`). The engine turns them into email outcomes:

| Field | Meaning |
|---|---|
| `id`, `npc`, `title`, `ask` | `ask` is the sentence pre-filled in the player's draft |
| `after` | quest ids that must be done → otherwise reply `too-early` |
| `needs` | doc ids that must be attached (and held) → otherwise `needs-info` (no fee) |
| `fee` | number, or `'homePermit'` / `'homeCost'` (computed from the planned home in `engine.feeFor`) |
| `days` | reply delay in game days (or `'homeDays'`) |
| `gives` | doc ids added to the player's documents when the approval arrives |
| `cite` | the real-world source. Required. `est: true` if the fee is an estimate |
| `requiresHome` | needs a dwelling on the site plan |

Steps:
1. Add any new doc ids to `DOCS`.
2. Insert the quest; wire `after`/`needs` so the order matches reality (see `docs/wa-king-county.md` "Order of steps").
3. If it builds something visible, map it in `BUILT_BY` in `src/main.js`.
4. If it introduces a new verdict kind, add it to `engine.verdict()`, `letters.factsOf()`, `letters.scriptedReply()`, the badge `label()` in `main.js`, and a test.
5. `npm test && npm run simulate` — the optimal run must still win before the deadline and within budget. Rebalance `budget`/`deadlineDay` in `SCENARIO` if needed and say why in the commit.
