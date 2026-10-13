// A sensible scripted player, shared by tests and the balance simulator.
// Strategy: do every ready step, but don't buy points, open the land line only when cash is short before the loan,
// and start paid site work only once the construction loan has funded (what most owner-builders do).
import { send, tick, nextMailDay, questLog, draft, openInvoices, payInvoice, negotiateInvoice, amountDue } from './engine.js';
import { autofill } from './scenarios/king-county-forms.js';
import { questById } from './scenarios/king-county.js';

const STAGE = new Set(['timber', 'stumps', 'grade', 'road']);
export function autoplay(g, { maxTicks = 400, onSend } = {}) {
  let emails = 0, stuck = null;
  for (let n = 0; n < maxTicks && !g.outcome; n++) {
    for (const q of questLog(g)) {
      if (q.status !== 'open' || !q.ready) continue;
      if (q.loan === 'points') continue;
      if (q.loan === 'land' && (g.loan || g.budget > 30000)) continue;
      if (STAGE.has(q.crew) && !g.loan) continue;
      const r = send(g, { npc: q.npc, questId: q.id, form: autofill(g, q.id), attachments: draft(g, q.id).attachments.concat(q.needs.filter(d => g.docs.includes(d))) });
      emails++; onSend?.(q, r);
      if (r.verdict.kind === 'cant-pay') stuck = `can't pay ${questById[q.id].title} (${Math.round(r.verdict.fee)})`;
    }
    for (const inv of openInvoices(g)) { // negotiate once, then pay when the terms are back (or straight away for deposits)
      if (!inv.negotiated && inv.due > g.day) { negotiateInvoice(g, inv.no); continue; }
      if ((inv.terms || inv.due <= g.day) && amountDue(g, inv) <= g.budget) payInvoice(g, inv.no);
    }
    const nd = nextMailDay(g); if (!Number.isFinite(nd)) { if (openInvoices(g).length) { tick(g, g.day + 1); continue; } break; } tick(g, nd);
  }
  return { emails, stuck };
}
