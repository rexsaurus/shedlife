// Balance check: play the scripted strategy for each home on a clean test lot, with and without a stream.
import { newGame } from '../src/engine.js';
import { autoplay } from '../src/autoplay.js';
import { SCENARIO } from '../src/scenarios/king-county.js';
import { evaluate, footprint } from '../src/rules.js';
import { byId, CATALOG } from '../src/catalog.js';

const LOT = { ring: [[0, 0], [200, 0], [200, 100], [0, 100]], zoning: 'RA-5' };
for (const stream of [false, true]) for (const home of CATALOG.filter(i => i.kind === 'dwelling')) {
  const plan = [[home.id, 45, 50], ['septic', 110, 50], ['well', 180, 50]].map(([id, x, y], i) => ({ uid: i, item: byId[id], corners: footprint(byId[id], x, y), slope: 0 }));
  const g = newGame(SCENARIO); g.plan = { items: plan, eval: evaluate(plan, LOT) }; g.site = { stream, trees: 80 };
  const { emails, stuck } = autoplay(g);
  const res = g.outcome?.won ? `WON day ${g.outcome.day}/${SCENARIO.deadlineDay}, $${Math.round(g.budget).toLocaleString()} left, mortgage $${Math.round(g.outcome.mortgage)}/mo` : `LOST (${g.outcome?.reason || stuck || 'stuck'})`;
  console.log(`${stream ? '🌊' : '  '} ${home.name.padEnd(32)} ${res} · ${emails} emails${g.landLine ? ' · used land line' : ''}`);
}
