---
name: draft-real-email
description: Turn a ShedLife in-game email to a real agency into a real, reviewable email draft for the owner — correct agency address, parcel facts, attachments list — without sending it. Use when Rex wants to actually contact King County Permitting, Ecology, Public Health, L&I or the utility based on the game.
---

# Draft a real email (never send)

1. Read the in-game thread (the game exposes it via `window.__shedlife.g.threads[npc]`, or ask Rex to paste it).
2. Rewrite it as a real email from Rex: specific parcel (PIN, address if any, zoning), one clear question or request, what is attached, and a request for the correct next step. Drop game-only language (days, budget, quests). No claims that a step is approved unless Rex has the real document.
3. Address: only the agency's public intake address from `NPCS[npc].email`. If `email` is null the agency uses a portal (`channel`/`url`): give Rex the text to paste there instead.
4. If a Gmail connector is available, create a **draft** (never send) and tell Rex where it is; otherwise give the text and a `mailto:` link.
5. Real filings and payments are Rex's to make. Do not submit portals, pay fees, or sign anything.
