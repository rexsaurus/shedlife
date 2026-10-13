---
name: add-official-body
description: Add a real council, commission, planning commission or hearing examiner office to ShedLife's Officials tab, seated with fictional generated officials and animated portraits. Use when asked to add more commissioners, councils, cities or counties as talkable NPCs.
---

# Add an official body

Bodies live in `BODIES` in `src/officials.js`; officials are generated from them.

1. Confirm the body's **structure** from its own site: official name, seat names (districts/positions), what it controls in land use. Record the source in `docs/officials.md`.
2. Add `{ id, name, short, kind: 'council'|'commission'|'examiner', seats: [...], color, role, relevant? }`. `role` is one plain sentence a homeowner would understand.
3. **Never use real people.** Seats are filled by `makeOfficial()` with seeded fictional names, priorities and styles; do not hand-write a real officeholder's name, photo, quotes or positions — even if asked. If a generated name happens to match a real local official, change the seed (rename the seat id suffix) or add the name to an exclusion list.
4. Portraits are procedural (`src/portraits.js`) — never trace or reference a real person's photo.
5. `npm test`, then open the Officials tab and talk to one member; check the reply says it can't decide individual permits (Appearance of Fairness, RCW 42.36).
