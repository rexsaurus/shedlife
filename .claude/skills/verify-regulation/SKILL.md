---
name: verify-regulation
description: Verify a regulation, fee, setback, turnaround or contact used in ShedLife against primary sources, and record the result with citations. Use when a rule or number is marked UNVERIFIED, looks wrong, a fee schedule year changes, or before demoing claims about real agencies.
---

# Verify a regulation

1. Find the claim: `src/rules.js` (`RULES`, `RA`), `src/scenarios/*.js` (`cite`, fees), `docs/wa-*.md`.
2. Go to the primary source, in this order: the code itself (KCC on kingcounty.gov / the county's code host, RCW/WAC on app.leg.wa.gov), the agency's current fee schedule PDF, then the agency's handouts. Secondary sites only to find the primary one.
   - Fetch with WebFetch; if a page is JS-heavy or blocked, use the Apify MCP tool `apify--rag-web-browser` with the URL (government pages only — see CLAUDE.md invariant 5).
   - Use the `regs-researcher` agent for anything needing more than ~3 lookups.
3. Record in `docs/wa-<county>.md`: the claim, the value, the exact source URL, the date checked, and VERIFIED / UNVERIFIED / CHANGED.
4. Update the code value and its `cite`/`ref`. If the value changed, run `npm test && npm run simulate` and rebalance if the optimal run no longer wins.
5. Never paste long passages from sources into the repo; paraphrase and link.
