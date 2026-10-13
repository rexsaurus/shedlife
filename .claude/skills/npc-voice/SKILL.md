---
name: npc-voice
description: Tune how Claude voices ShedLife NPC emails — persona prompts, fact preservation, model choice, latency and fallbacks. Use when replies sound wrong, drop or invent facts, are too long, a new verdict kind needs wording, or the Claude API call fails.
---

# NPC voice

Flow: `engine.send()` creates the reply with a scripted body → the browser POSTs `{npc, verdict, thread, parcel, day}` to `/api/npc` → `server/npc.mjs` builds a prompt from the NPC persona + `factsOf(verdict)` → Claude writes the body → the UI swaps it in (marked "✦ Claude"). The reply is hidden until its delivery day, so latency is invisible.

## Rules for the prompt
- The FACTS list is the contract: every fact appears, numbers verbatim, nothing added. Real agencies never get invented staff names, fees, dates or statutes.
- 60–160 words, plain text, no subject line.

## Test a change
```
curl -s localhost:5173/api/npc -H 'content-type: application/json' -d '{"npc":"health","verdict":{"kind":"needs-info","title":"Septic design approval","missing":["Soil logs (5 test pits)"]},"parcel":{"apn":"8847400030","zoning":"RA-5"},"day":40}'
```
Check: all facts present, numbers unchanged, persona right, sign-off right. Try every verdict kind for the NPC you changed.

## Failures
- `400 ... not scoped to a workspace`: the key is a user key (`sk-ant-usr-…`); set `ANTHROPIC_WORKSPACE_ID` in `.env` or use a workspace key.
- No key / any error → the scripted letter stays; the HUD shows "Scripted".
- Model: `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`; `claude-haiku-5-5` for speed).
