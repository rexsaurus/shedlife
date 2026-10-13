// Balance check: play the optimal strategy for each home type on a clean test lot and report the result.
import { newGame, send, tick, nextMailDay, draft, questLog } from '../src/engine.js';
import { SCENARIO } from '../src/scenarios/king-county.js';
import { evaluate, footprint } from '../src/rules.js';
import { byId, CATALOG } from '../src/catalog.js';

const LOT = { ring: [[0, 0], [200, 0], [200, 100], [0, 100]], zoning: 'RA-5' };
for (const home of CATALOG.filter(i => i.kind === 'dwelling')) {
  const plan = [[home.id, 45, 50], ['septic', 110, 50], ['well', 180, 50]].map(([id, x, y], i) => ({ uid: i, item: byId[id], corners: footprint(byId[id], x, y), slope: 0 }));
  const g = newGame(SCENARIO); g.plan = { items: plan, eval: evaluate(plan, LOT) };
  let emails = 0, stuck = null;
  for (let n = 0; n < 300 && !g.outcome; n++) {
    for (const q of questLog(g)) if (q.status === 'open' && q.ready) { const r = send(g, { npc: q.npc, questId: q.id, attachments: draft(g, q.id).attachments.concat(q.needs) }); emails++; if (r.verdict.kind === 'cant-pay') stuck = `can't pay ${q.title} (${r.verdict.fee})`; }
    const nd = nextMailDay(g); if (!Number.isFinite(nd)) break; tick(g, nd);
  }
  const res = g.outcome?.won ? `WON day ${g.outcome.day}/${SCENARIO.deadlineDay}, $${g.budget.toLocaleString()} left` : `LOST (${stuck || g.outcome?.reason || 'stuck'})`;
  console.log(`${home.name.padEnd(32)} ${res} · ${emails} emails`);
}
