// Claude voices the NPCs. The engine already decided the outcome; Claude writes the email around those facts.
// Without ANTHROPIC_API_KEY (or on any error) the caller keeps the scripted reply.
import { NPCS } from '../src/scenarios/king-county.js';
import { factsOf } from '../src/letters.js';
import { KNOWLEDGE } from '../src/scenarios/king-county-knowledge.js';
import { OFFICIAL_KNOWLEDGE, bodyById } from '../src/officials.js';

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export function buildPrompt(args) {
  const n = NPCS[args.npc];
  return n.official ? officialPrompt(n, args) : agencyPrompt(n, args);
}

function history(n, thread) {
  return thread.slice(-6).map(m => `${m.from === 'me' ? 'PLAYER' : n.name.toUpperCase()} (day ${m.day}): ${String(m.body || '').slice(0, 900)}`).join('\n\n');
}

function officialPrompt(n, { verdict, thread = [], parcel = {}, day = 0 }) {
  const b = bodyById[n.body];
  const system = [
    `You are role-playing ${n.name}, a FICTIONAL ${n.title.toLowerCase()} (${n.seat}) on the real ${b.name}, in ShedLife — a game about getting a home permitted on a vacant parcel in Washington State.`,
    `Persona: ${n.persona}`,
    `About the real body: ${b.role}`,
    'You are an invented character. Never claim to be, name, quote or describe any real current or former officeholder, and never attribute positions to real people or parties. No campaigning or partisan talk; your views are your fictional character\'s own and you respect people who disagree.',
    'You may explain real public processes in general terms using only the knowledge below. Never invent ordinances, votes, dates, fees, or outcomes. You cannot approve, deny, expedite or influence an individual permit (appearance-of-fairness rules); point the player to staff, public comment, or a hearing instead.',
    'Write ONLY your reply, 40–120 words, plain text, conversational, in your style. Sign with your name.',
    `What you know:\n${OFFICIAL_KNOWLEDGE.map(([f, src]) => `- ${f} [${src}]`).join('\n')}`,
  ].join('\n');
  const user = `Player's parcel: ${parcel.county || 'King'} County, ${parcel.zoning || 'zoning unknown'}, ${parcel.jurisdiction || ''}. Game day ${day}.\n\nConversation so far:\n${history(n, thread) || '(none)'}\n\nFACTS for your reply:\n- ${factsOf(verdict).join('\n- ')}`;
  return { system, user };
}

function agencyPrompt(n, { npc, verdict, thread = [], parcel = {}, day = 0 }) {
  const system = [
    `You are role-playing "${n.name}" (${n.org}) in ShedLife, a game about getting a real home permitted on a real vacant parcel in ${parcel.county || 'King'} County, Washington.`,
    `Persona: ${n.persona}`,
    n.real ? 'This is a real public agency. Be accurate and professional; never invent fees, dates, approvals, staff names, statutes, or requirements beyond the FACTS.' : 'This is a fictional company. You can have personality, but never contradict the FACTS.',
    'Write ONLY the email body (no subject line), 60–160 words, plain text. Every FACT must appear, with numbers exactly as given. Do not add any approval, denial, fee or requirement that is not in the FACTS.',
    'If the player asked a question, answer it in character at a general level and point them to what they would actually submit; you cannot approve anything in an answer.',
    `What you know (use only if relevant; paraphrase; mention the source for fees or rules):\n${(KNOWLEDGE[npc] || []).map(([f, src]) => `- ${f} [${src}]`).join('\n')}`,
    `Sign off as ${n.real ? n.name : 'a named person at ' + n.name}.`,
  ].join('\n');
  const user = `Parcel: PIN ${parcel.apn || '?'}, zoned ${parcel.zoning || 'RA-5'}, ${parcel.acres ? parcel.acres.toFixed(1) + ' acres' : ''}, ${parcel.jurisdiction || 'unincorporated King County'}. Game day ${day}.\n\nRecent thread:\n${history(n, thread) || '(none)'}\n\nFACTS for your reply:\n- ${factsOf(verdict).join('\n- ')}`;
  return { system, user };
}

export async function voiceReply(args, { key = process.env.ANTHROPIC_API_KEY, workspace = process.env.ANTHROPIC_WORKSPACE_ID, fetchImpl = fetch } = {}) {
  if (!key) return { ok: false, error: 'ANTHROPIC_API_KEY not set — using scripted replies' };
  const { system, user } = buildPrompt(args);
  const r = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(workspace ? { 'anthropic-workspace-id': workspace } : {}) }, // user-scoped sk-ant-usr keys need a workspace id
    body: JSON.stringify({ model: MODEL, max_tokens: 500, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!r.ok) return { ok: false, error: `Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}` };
  const j = await r.json();
  const body = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
  return body ? { ok: true, body, model: j.model } : { ok: false, error: 'empty reply' };
}
