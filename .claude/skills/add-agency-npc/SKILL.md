---
name: add-agency-npc
description: Add or edit an NPC (a real public agency or a fictional contractor) in a ShedLife scenario, including contact details, persona and what it controls. Use when adding an agency, utility, inspector, contractor or vendor character, or fixing an NPC's contact info or voice.
---

# Add an NPC

NPCs live in `NPCS` in `src/scenarios/<scenario>.js`:
```js
health: { name, org, real: true, email|null, phone?, url, channel?, portal?, unverified?, persona, avatar }
```

## Real agencies (`real: true`)
- Contact info must come from the agency's own website: a general public intake email, phone, or portal URL. **Never** an individual staff member's name or address.
- If the agency only takes requests through a portal, set `email: null` and describe it in `channel`; the UI then links "Real portal ↗".
- Put anything you could not confirm in `unverified` and in `docs/wa-<county>.md`.
- Persona: how a real staff member at that office writes (procedural, cites code, never commits early). No mockery of real offices; humor stays gentle.

## Fictional contractors (`real: false`)
- Invented company names that don't collide with real businesses (search first). Emails use the reserved `.example` TLD.
- The UI tags them "fictional". Personality is welcome.

## After adding
- Give it at least one quest (`add-quest`) or it's only reachable for questions.
- `npm test`; open the game, check the thread header shows the right contact, and send a question to see the voice (`npc-voice`).
