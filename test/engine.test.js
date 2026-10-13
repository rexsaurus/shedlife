import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, send, tick, nextMailDay, draft, questLog } from '../src/engine.js';
import { SCENARIO, QUESTS } from '../src/scenarios/king-county.js';
import { evaluate, footprint } from '../src/rules.js';
import { byId } from '../src/catalog.js';

const LOT = { ring: [[0, 0], [200, 0], [200, 100], [0, 100]], zoning: 'RA-5' }; // ~4.9 acres
const place = (uid, id, x, y, rot = 0, slope = 0) => ({ uid, item: byId[id], corners: footprint(byId[id], x, y, rot), slope });
const goodPlan = () => [place(1, 'tiny', 40, 50), place(2, 'septic', 100, 50), place(3, 'well', 170, 50)];
const withPlan = (g, plan) => { g.plan = { items: plan, eval: evaluate(plan, LOT) }; return g; };
const advance = g => tick(g, nextMailDay(g));

test('good plan passes WA rules', () => {
  const e = evaluate(goodPlan(), LOT);
  assert.deepEqual(e.violations, []); assert.equal(e.flags.home.id, 'tiny');
});
test('setbacks, well-to-drainfield, RV and ADU rules', () => {
  const e = evaluate([place(1, 'tiny', 3, 50), place(2, 'septic', 60, 50), place(3, 'well', 80, 50), place(4, 'adu', 150, 80)], LOT);
  const rules = e.violations.map(v => v.rule);
  assert.ok(rules.includes('setback')); assert.ok(rules.includes('well-septic'));
  const rv = evaluate([place(1, 'rv', 50, 50)], LOT).violations.map(v => v.rule);
  assert.deepEqual(rv, ['rv']);
  const adu = evaluate([place(1, 'adu', 50, 50)], LOT).violations.map(v => v.rule);
  assert.ok(adu.includes('adu-primary'));
  assert.equal(byId.shed10x12.permit, 'exempt'); assert.equal(byId.studio.permit, 'building');
});
test('emails out of order are bounced, no fee', () => {
  const g = withPlan(newGame(SCENARIO), goodPlan());
  const r = send(g, { npc: 'permitting', questId: 'permit', attachments: ['site-plan'] });
  assert.equal(r.verdict.kind, 'too-early'); assert.equal(g.budget, SCENARIO.budget);
  const r2 = send(g, { npc: 'permitting', questId: 'zoning' }); assert.equal(r2.verdict.kind, 'accepted');
  const r3 = send(g, { npc: 'permitting', questId: 'cad', attachments: [] });
  assert.equal(r3.verdict.kind, 'too-early'); // zoning not delivered yet
  tick(g, 3); assert.equal(g.quests.zoning, 'done');
  const r4 = send(g, { npc: 'permitting', questId: 'cad', attachments: [] });
  assert.equal(r4.verdict.kind, 'needs-info'); assert.match(r4.reply.body, /Site plan/);
});
test('site plan violations come back as corrections', () => {
  const g = withPlan(newGame(SCENARIO), [place(1, 'tiny', 3, 50)]);
  send(g, { npc: 'permitting', questId: 'zoning' }); advance(g);
  const r = send(g, { npc: 'permitting', questId: 'cad', attachments: ['site-plan'] });
  assert.equal(r.verdict.kind, 'corrections'); assert.ok(r.verdict.violations.length);
});
test('full playthrough reaches occupancy within budget and deadline', () => {
  const g = withPlan(newGame(SCENARIO), goodPlan());
  let guard = 0;
  while (!g.outcome && guard++ < 200) {
    for (const q of questLog(g)) if (q.status === 'open' && q.ready) {
      const d = draft(g, q.id); const r = send(g, { npc: d.npc, questId: q.id, attachments: [...d.attachments, ...q.needs.filter(n => g.docs.includes(n))] });
      assert.notEqual(r.verdict.kind, 'needs-info', `${q.id}: ${JSON.stringify(r.verdict)}`);
    }
    if (Number.isFinite(nextMailDay(g))) advance(g); else break;
  }
  assert.ok(g.outcome?.won, JSON.stringify({ outcome: g.outcome, quests: g.quests, budget: g.budget }));
  assert.ok(g.budget >= 0); assert.ok(g.outcome.day <= SCENARIO.deadlineDay, `day ${g.outcome.day}`);
  assert.equal(Object.values(g.quests).filter(s => s === 'done').length, QUESTS.length);
});
