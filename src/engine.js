// ShedLife inbox engine. Pure game state: every move is an email to an NPC; replies arrive on the clock.
// The engine decides every outcome deterministically. Claude (server/npc.mjs) only writes the words.
import { NPCS, QUESTS, DOCS, questById, homePermitFee } from './scenarios/king-county.js';
import { scriptedReply } from './letters.js';

export function newGame(scenario) {
  const quests = Object.fromEntries(QUESTS.map(q => [q.id, 'open']));
  const g = { scenario, day: 0, budget: scenario.budget, spent: 0, docs: [], quests, threads: {}, seq: 0, outcome: null,
    plan: { items: [], eval: { ok: false, violations: [], flags: {} } }, events: [] };
  deliver(g, 'permitting', { subject: 'Welcome to King County Permitting', verdict: { kind: 'welcome' }, day: 0 });
  return g;
}

const fmt$ = n => '$' + Math.round(n).toLocaleString('en-US');
const thread = (g, npc) => (g.threads[npc] ||= []);
function deliver(g, npc, { subject, verdict, day, body }) {
  const m = { id: ++g.seq, from: npc, to: 'me', subject, verdict, day: day ?? g.day, deliverDay: day ?? g.day, delivered: (day ?? g.day) <= g.day, read: false };
  m.body = body || scriptedReply(NPCS[npc], verdict, m);
  thread(g, npc).push(m); return m;
}

export const docName = id => DOCS[id] || id;
export const questsFor = (g, npc) => QUESTS.filter(q => q.npc === npc);

export function feeFor(g, q) {
  const home = g.plan.eval.flags.home;
  if (q.fee === 'homePermit') return homePermitFee(home) + (g.plan.eval.flags.adu ? 4556 + 3618 + 2.46 * g.plan.eval.flags.adu.sqft : 0);
  if (q.fee === 'homeCost') return (home?.cost || 0) + (g.plan.eval.flags.adu?.cost || 0);
  return q.fee + (q.slopeFee && g.plan.eval.flags.steepSlope ? q.slopeFee : 0);
}
export const daysFor = (g, q) => q.days === 'homeDays' ? (g.plan.eval.flags.home?.buildDays || 30) : q.days;

/** Suggested outgoing draft for a quest (player can edit body and attachments). */
export function draft(g, questId) {
  const q = questById[questId], npc = NPCS[q.npc];
  const home = g.plan.eval.flags.home;
  return { npc: q.npc, questId, subject: q.title + (g.scenario ? ` — Parcel ${g.parcelId || ''}`.trimEnd() : ''),
    attachments: q.needs.filter(d => d === 'site-plan' || g.docs.includes(d)),
    body: `Hello ${npc.name},\n\n${q.ask}${home ? ` The plan is a ${home.name} (${home.sqft} sq ft).` : ''}\n\nParcel: ${g.parcelId || 'see attached site plan'}, ${g.scenario.county} County, zoned ${g.zoning || 'RA-5'}.\n\nThanks,\n${g.playerName || 'Owner'}` };
}

/** Player sends an email. Returns { out, reply }. The reply is scheduled; tick() delivers it. */
export function send(g, { npc, questId = null, body = '', subject, attachments = [] }) {
  if (g.outcome) throw new Error('game over');
  const q = questId ? questById[questId] : null;
  const out = { id: ++g.seq, from: 'me', to: npc, subject: subject || (q ? q.title : 'Question'), body, attachments, day: g.day, delivered: true, read: true };
  thread(g, npc).push(out);
  g._to = npc; const v = verdict(g, q, attachments, body);
  if (v.kind === 'accepted') { g.budget -= v.fee; g.spent += v.fee; g.quests[q.id] = 'pending'; }
  const reply = deliver(g, npc, { subject: 'Re: ' + out.subject, verdict: v, day: g.day + v.days });
  g.events.push({ day: g.day, type: 'sent', npc, quest: q?.id, verdict: v.kind });
  return { out, reply, verdict: v };
}

function verdict(g, q, attachments, body) {
  if (!q) return NPCS[g._to]?.official ? { kind: 'chat', days: 0, question: body } : { kind: 'answer', days: 2, question: body };
  const base = { quest: q.id, title: q.title, cite: q.cite };
  if (g.quests[q.id] === 'done') return { ...base, kind: 'duplicate', days: 1 };
  if (g.quests[q.id] === 'pending') return { ...base, kind: 'pending', days: 1 };
  if (q.requiresHome && !g.plan.eval.flags.home) return { ...base, kind: 'needs-info', days: 2, missing: ['a home on your site plan'] };
  const early = q.after.filter(a => g.quests[a] !== 'done');
  if (early.length) return { ...base, kind: 'too-early', days: 2, first: early.map(a => questById[a].title) };
  const missing = q.needs.filter(d => !attachments.includes(d) || (d !== 'site-plan' && !g.docs.includes(d)));
  if (missing.length) return { ...base, kind: 'needs-info', days: 3, missing: missing.map(docName) };
  if (q.needs.includes('site-plan') && !g.plan.eval.ok) {
    if (!g.plan.items.length) return { ...base, kind: 'needs-info', days: 3, missing: ['a site plan with your structures placed'] };
    return { ...base, kind: 'corrections', days: 7, violations: g.plan.eval.violations.slice(0, 6) };
  }
  const fee = Math.round(feeFor(g, q));
  if (fee > g.budget) return { ...base, kind: 'cant-pay', days: 1, fee, budget: g.budget };
  return { ...base, kind: 'accepted', days: daysFor(g, q), fee, gives: q.gives.map(docName), est: !!q.est };
}

/** Advance to `day`; deliver due mail and apply its effects. Returns newly delivered messages. */
export function tick(g, day) {
  g.day = Math.max(g.day, day);
  const out = [];
  for (const [npc, msgs] of Object.entries(g.threads)) for (const m of msgs) {
    if (m.delivered || m.deliverDay > g.day) continue;
    m.delivered = true; out.push(m);
    const v = m.verdict;
    if (v?.kind === 'accepted') {
      const q = questById[v.quest];
      g.quests[q.id] = 'done';
      for (const d of q.gives) if (!g.docs.includes(d)) g.docs.push(d);
      g.events.push({ day: m.deliverDay, type: 'done', npc, quest: q.id });
    }
  }
  if (!g.outcome && g.docs.includes('occupancy')) g.outcome = { won: true, day: g.day, spent: g.spent, budget: g.budget };
  else if (!g.outcome && g.day > g.scenario.deadlineDay) g.outcome = { won: false, day: g.day, reason: `Deadline: day ${g.scenario.deadlineDay}` };
  return out.sort((a, b) => a.deliverDay - b.deliverDay);
}

export const nextMailDay = g => Math.min(...Object.values(g.threads).flat().filter(m => !m.delivered).map(m => m.deliverDay));
export const unread = g => Object.values(g.threads).flat().filter(m => m.delivered && !m.read && m.from !== 'me').length;

/** Quest log rows for the UI. */
export function questLog(g) {
  return QUESTS.map(q => {
    const early = q.after.filter(a => g.quests[a] !== 'done');
    return { ...q, status: g.quests[q.id], ready: !early.length, waitingOn: early.map(a => questById[a].title), feeNow: q.fee === 'homeCost' || q.fee === 'homePermit' ? feeFor(g, q) : q.fee };
  });
}
export { fmt$ };
