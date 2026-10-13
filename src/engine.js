// ShedLife inbox engine. Pure game state: every move is an email to an NPC; replies arrive on the clock.
// The engine decides every outcome deterministically. Claude (server/npc.mjs) only writes the words.
import { NPCS, QUESTS, DOCS, questById, homePermitFee, LENDERS, SITE_BUDGET, RATE_FLOOR, crewQuote, CREWS, LAND_LINE, BILL_TERMS } from './scenarios/king-county.js';
import { FORMS, checkForm, issueRef, REF_PREFIX } from './scenarios/king-county-forms.js';
import { rng } from './officials.js';
import { scriptedReply } from './letters.js';

export function newGame(scenario) {
  const quests = Object.fromEntries(QUESTS.map(q => [q.id, 'open']));
  const g = { scenario, day: 0, budget: scenario.budget, spent: 0, docs: [], quests, threads: {}, seq: 0, outcome: null,
    plan: { items: [], eval: { ok: false, violations: [], flags: {} } }, events: [], loan: null, landValue: scenario.landValue, player: { ...scenario.player },
    rates: Object.fromEntries(Object.entries(LENDERS).map(([b, L]) => [b, L.rate])), site: null, parcelId: 'DEMO-0001', acres: 5, invoices: [], refs: {} };
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
// What's on the parcel (revealed by the CAD). Deterministic per parcel; tests may set g.site directly.
export function siteFindings(g) {
  if (!g.site) { const r = rng('site:' + (g.parcelId || 'demo')); g.site = { stream: r() < 0.4, trees: 20 + Math.floor(r() * 120) }; }
  return g.site;
}
export const applies = (g, q) => !q.when || q.when(g);
export const questsFor = (g, npc) => QUESTS.filter(q => q.npc === npc);

// ---- loans (pure math, game estimates)
export const monthlyPayment = (P, rate, years = 30) => { const r = rate / 12, n = years * 12; return P * r / (1 - (1 + r) ** -n); };
export function prequalMax(g, bank) { // 43% DTI incl. ~$500/mo taxes+insurance, 30-year amortization at the lender's rate
  const pmt = 0.43 * g.player.income / 12 - g.player.debtsMonthly - 500, r = (g.rates?.[bank] ?? LENDERS[bank].rate) / 12, n = 360;
  return Math.max(0, Math.floor(pmt * (1 - (1 + r) ** -n) / r / 1000) * 1000);
}
export function loanAmountFor(g, bank) {
  const home = g.plan.eval.flags.home, adu = g.plan.eval.flags.adu; if (!home) return 0;
  const build = home.cost + (adu?.cost || 0) + SITE_BUDGET, L = LENDERS[bank];
  return Math.min(build, Math.floor(L.maxLtv * ((g.landValue || 0) + build) / 1000) * 1000, prequalMax(g, bank));
}

export function feeFor(g, q) {
  const home = g.plan.eval.flags.home;
  if (typeof q.fee === 'function') return q.fee(g);
  if (q.fee === 'loanClosing') return LENDERS[q.npc].closingPct * loanAmountFor(g, q.npc);
  if (q.fee === 'points') return 0.01 * loanAmountFor(g, q.npc);
  if (q.fee === 'homePermit') return homePermitFee(home) + (g.plan.eval.flags.adu ? 4556 + 3618 + 2.46 * g.plan.eval.flags.adu.sqft : 0);
  if (q.fee === 'homeCost') return (home?.cost || 0) + (g.plan.eval.flags.adu?.cost || 0);
  return q.fee + (q.slopeFee && g.plan.eval.flags.steepSlope ? q.slopeFee : 0);
}
export const daysFor = (g, q) => typeof q.days === 'function' ? q.days(g) : q.days === 'homeDays' ? (g.plan.eval.flags.home?.buildDays || 30) : q.days;

/** Suggested outgoing draft for a quest (player can edit body and attachments). */
export function draft(g, questId) {
  const q = questById[questId], npc = NPCS[q.npc];
  const home = g.plan.eval.flags.home;
  return { npc: q.npc, questId, subject: q.title + (g.scenario ? ` — Parcel ${g.parcelId || ''}`.trimEnd() : ''),
    attachments: q.needs.filter(d => d === 'site-plan' || g.docs.includes(d)),
    body: `Hello ${npc.name},\n\n${q.ask}${home ? ` The plan is a ${home.name} (${home.sqft} sq ft).` : ''}\n\nParcel: ${g.parcelId || 'see attached site plan'}, ${g.scenario.county} County, zoned ${g.zoning || 'RA-5'}.\n\nThanks,\n${g.playerName || 'Owner'}` };
}

/** Player sends an email. Returns { out, reply }. The reply is scheduled; tick() delivers it. */
export const payMode = q => (NPCS[q.npc]?.gov || q.npc.startsWith('bank-')) ? 'now' : 'invoice';
export function send(g, { npc, questId = null, body = '', subject, attachments = [], form = null }) {
  if (g.outcome) throw new Error('game over');
  const q = questId ? questById[questId] : null;
  const out = { id: ++g.seq, from: 'me', to: npc, subject: subject || (q ? q.title : 'Question'), body, attachments, day: g.day, delivered: true, read: true };
  thread(g, npc).push(out);
  if (form) out.form = form;
  g._to = npc; g._form = form; const v = verdict(g, q, attachments, body);
  if (v.kind === 'accepted') { if (!v.invoice) { g.budget -= v.fee; g.spent += v.fee; } g.quests[q.id] = 'pending'; }
  const reply = deliver(g, npc, { subject: 'Re: ' + out.subject, verdict: v, day: g.day + v.days });
  g.events.push({ day: g.day, type: 'sent', npc, quest: q?.id, verdict: v.kind });
  return { out, reply, verdict: v };
}

function verdict(g, q, attachments, body) {
  if (!q && g._to === 'foreman') return { kind: 'briefing', days: 0, ...summary(g) };
  if (!q) return NPCS[g._to]?.official ? { kind: 'chat', days: 0, question: body } : { kind: 'answer', days: 2, question: body };
  const base = { quest: q.id, title: q.title, cite: q.cite };
  if (g.quests[q.id] === 'done') return { ...base, kind: 'duplicate', days: 1 };
  if (q.exclusive === 'loan' && (g.loan || QUESTS.some(o => o.loan === 'close' && o.npc !== q.npc && g.quests[o.id] !== 'open')))
    return { ...base, kind: 'have-loan', days: 1, lender: NPCS[g.loan?.bank || QUESTS.find(o => o.loan === 'close' && g.quests[o.id] !== 'open').npc].name };
  if (q.exclusive === 'landline' && (g.landLine || QUESTS.some(o => o.loan === 'land' && o.npc !== q.npc && g.quests[o.id] !== 'open'))) return { ...base, kind: 'duplicate', days: 1 };
  if (q.loan === 'land' && (g.loan || QUESTS.some(o => o.loan === 'close' && g.quests[o.id] !== 'open'))) return { ...base, kind: 'not-needed', days: 1 };
  if (q.exclusive === 'crew' && (g.crew || QUESTS.some(o => o.crew === 'hire' && o.npc !== q.npc && g.quests[o.id] !== 'open')))
    return { ...base, kind: 'have-crew', days: 1, crew: NPCS[g.crew || QUESTS.find(o => o.crew === 'hire' && g.quests[o.id] !== 'open').npc].name };
  if (q.loan === 'prequal' && g.player.credit < LENDERS[q.npc].minCredit) return { ...base, kind: 'declined', days: 2, reason: `credit score ${g.player.credit} is below our ${LENDERS[q.npc].minCredit} minimum` };
  if (g.quests[q.id] === 'pending') return { ...base, kind: 'pending', days: 1 };
  if (q.requiresHome && !g.plan.eval.flags.home) return { ...base, kind: 'needs-info', days: 2, missing: ['a home on your site plan'] };
  if (!applies(g, q)) return { ...base, kind: 'not-needed', days: 1 };
  const early = q.after.filter(a => g.quests[a] !== 'done' && applies(g, questById[a])).map(a => questById[a].title).concat((q.requiresDocs || []).filter(d => !g.docs.includes(d)).map(docName));
  if (early.length) return { ...base, kind: 'too-early', days: 2, first: early };
  const missing = q.needs.filter(d => !attachments.includes(d) || (d !== 'site-plan' && !g.docs.includes(d)));
  if (missing.length) return { ...base, kind: 'needs-info', days: 3, missing: missing.map(docName) };
  if (q.needs.includes('site-plan') && !g.plan.eval.ok) {
    if (!g.plan.items.length) return { ...base, kind: 'needs-info', days: 3, missing: ['a site plan with your structures placed'] };
    return { ...base, kind: 'corrections', days: 7, violations: g.plan.eval.violations.slice(0, 6) };
  }
  if (FORMS[q.id] && NPCS[q.npc].gov) { const errors = checkForm(g, q.id, g._form || {}); if (errors.length) return { ...base, kind: 'form-errors', days: 3, form: FORMS[q.id].name, errors }; }
  const overdue = openInvoices(g).filter(i => i.npc === q.npc && g.day > i.due);
  if (overdue.length) return { ...base, kind: 'on-hold', days: 2, owed: overdue.reduce((a, i) => a + i.amount, 0), nos: overdue.map(i => i.no) };
  if (q.loan === 'close' && openInvoices(g).some(i => i.lien)) return { ...base, kind: 'needs-info', days: 3, missing: ['clear title — a contractor filed a lien over an unpaid invoice; pay it first (RCW 60.04)'] };
  const fee = Math.round(feeFor(g, q)), invoice = payMode(q) === 'invoice' && fee > 0;
  if (!invoice && fee > g.budget) return { ...base, kind: 'cant-pay', days: 1, fee, budget: g.budget };
  const extra = []; let v_newRate = null;
  if (q.crew === 'bid') { const Q = crewQuote(g, q.npc), $$ = fmt$; extra.push(`Bid: trees ${$$(Q.cost.timber)} (${Q.dur.timber} days), stumps + erosion control ${$$(Q.cost.stumps)} (${Q.dur.stumps} days), pad grading ${$$(Q.cost.grade)} (${Q.dur.grade} days${CREWS[q.npc].rainDays ? `, includes ${CREWS[q.npc].rainDays} rain days` : ''}), driveway ${$$(Q.cost.road)} (${Q.dur.road} days).`, `Total ${$$(Q.total)} over about ${Q.totalDays} working days; ${$$(Q.deposit)} deposit to book. ${CREWS[q.npc].pitch}`); }
  if (q.id === 'cad') { const st = siteFindings(g); extra.push(st.stream ? 'Finding: a seasonal (Type N) stream crosses the parcel. You will need a stream study + buffer plan and a WDFW Hydraulic Project Approval before clearing.' : 'Finding: no streams, wetlands or steep slopes mapped on the parcel.', `About ${st.trees} trees stand in the build area.`); }
  if (q.loan) {
    const L = LENDERS[q.npc], amt = loanAmountFor(g, q.npc), pct = (g.rates[q.npc] * 100).toFixed(3);
    const rate = g.rates[q.npc]; const pctNow = (rate * 100).toFixed(3).replace(/0$/, '');
    if (q.loan === 'negotiate') {
      const other = Object.keys(LENDERS).find(o => o !== q.npc), comp = g.rates[other], floor = L.rate - RATE_FLOOR;
      const offer = Math.max(floor, +(comp - 0.00125).toFixed(5));
      if (offer >= rate) return { ...base, kind: 'no-better', days: 2, rate: pctNow, comp: (comp * 100).toFixed(3), floor: offer >= rate && comp > rate };
      v_newRate = offer; extra.push(`Rate lowered from ${pctNow}% to ${(offer * 100).toFixed(3)}% to beat the competing Loan Estimate (${(comp * 100).toFixed(3)}%).`);
    }
    if (q.loan === 'points') { if (g.pointsBought?.[q.npc]) return { ...base, kind: 'duplicate', days: 1 }; v_newRate = +(rate - 0.0025).toFixed(5); extra.push(`One discount point bought: rate ${pctNow}% → ${(v_newRate * 100).toFixed(3)}%.`); }
    if (q.loan === 'prequal') extra.push(`Pre-qualified for up to ${fmt$(prequalMax(g, q.npc))} at ${pct}% (construction-to-permanent, 30-year fixed after completion; game estimate).`, `Underwriting basis: income ${fmt$(g.player.income)}/yr, debts ${fmt$(g.player.debtsMonthly)}/mo, credit ${g.player.credit}, 43% debt-to-income.`);
    if (q.loan === 'apply') { if (!amt) return { ...base, kind: 'needs-info', days: 2, missing: ['a home on your site plan'] };
      extra.push(`Approved loan amount: ${fmt$(amt)} (capped at ${L.maxLtv * 100}% of the as-completed value, the build budget, and your pre-qualification).`, 'We fund after the building permit is issued.'); }
    if (q.loan === 'land') extra.push(`Line of credit: ${fmt$(LAND_LINE.amount)} at ${(LAND_LINE.rate * 100).toFixed(1)}%, secured by your land (appraised ${fmt$(g.landValue)}). Interest-only monthly; paid off when the construction loan closes.`);
    if (q.loan === 'close') extra.push(`Funding ${fmt$(amt)} into your construction account at ${pct}%.`, `Interest-only payments of ${fmt$(amt * g.rates[q.npc] / 12)}/month start now; after final inspection it converts to ${fmt$(monthlyPayment(amt, g.rates[q.npc]))}/month for 30 years.`);
  }
  const refNo = issueRef(g, q.id);
  if (refNo) extra.push(['designer', 'driller'].includes(q.id) ? `Our ${REF_PREFIX[q.id][1]}: ${refNo} (you'll need it on county and state forms).` : `Your ${REF_PREFIX[q.id][1]}: ${refNo} (keep it; later forms ask for it).`);
  if (q.id === 'drill') extra.push(`Pump test yield: ${g.refs.yield} gpm. Water samples sent to the lab.`);
  if (q.id === 'survey') extra.push(`Clearing limits staked: ${g.refs.clearing.toLocaleString('en-US')} sq ft.`);
  if (invoice) extra.push(`We'll send an invoice for ${fmt$(fee)} when the work is done${q.crew === 'hire' ? ' (deposit due on booking)' : ' (net 30)'}.`);
  return { ...base, kind: 'accepted', days: daysFor(g, q), fee, invoice, gives: q.gives.map(docName), est: !!q.est, extra, newRate: v_newRate, ref: refNo };
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
      if (q.crew === 'hire') g.crew = q.crewId;
      if (q.loan === 'land' && !g.landLine) { g.landLine = { amount: LAND_LINE.amount, rate: LAND_LINE.rate, fundedDay: m.deliverDay, months: 0, open: true }; g.budget += LAND_LINE.amount; }
      if (q.loan === 'close' && g.landLine?.open) { g.landLine.open = false; g.budget -= g.landLine.amount; g.events.push({ day: m.deliverDay, type: 'landline-payoff' }); }
      if (v.newRate != null) { g.rates[q.npc] = v.newRate; if (q.loan === 'points') (g.pointsBought ||= {})[q.npc] = true; }
      if (q.loan === 'close' && !g.loan) { const amt = loanAmountFor(g, q.npc); g.loan = { bank: q.npc, amount: amt, rate: g.rates[q.npc], fundedDay: m.deliverDay, months: 0, interest: 0 }; g.budget += amt; }
      g.events.push({ day: m.deliverDay, type: 'done', npc, quest: q.id });
      if (v.invoice) newInvoice(g, npc, q, v.fee, m.deliverDay, q.crew === 'hire' ? 0 : 30);
    }
    if (v?.kind === 'negotiated') applyTerms(g, v);
  }
  if (g.landLine?.open) { const due = Math.floor((g.day - g.landLine.fundedDay) / 30); while (g.landLine.months < due) { const i = g.landLine.amount * g.landLine.rate / 12; g.landLine.months++; g.budget -= i; g.spent += i; } }
  if (g.loan) { // interest-only payments every 30 days until occupancy
    const due = Math.floor((g.day - g.loan.fundedDay) / 30);
    while (g.loan.months < due && !g.docs.includes('occupancy')) { const i = g.loan.amount * g.loan.rate / 12; g.loan.months++; g.loan.interest += i; g.budget -= i; g.spent += i; g.events.push({ day: g.loan.fundedDay + g.loan.months * 30, type: 'interest', amount: i }); }
  }
  if (g.landLine?.open && g.docs.includes('occupancy')) { g.landLine.open = false; g.budget -= g.landLine.amount; }
  if (g.loan && g.docs.includes('occupancy') && !g.loan.settled) { // prorated interest for the final partial month
    const frac = (g.day - g.loan.fundedDay - g.loan.months * 30) / 30, i = Math.max(0, frac) * g.loan.amount * g.loan.rate / 12;
    g.loan.interest += i; g.budget -= i; g.spent += i; g.loan.settled = true;
  }
  for (const inv of openInvoices(g)) { // late fees (1.5% per 30 days overdue) and liens after 30 days overdue
    const late = Math.floor((g.day - inv.due) / 30);
    while ((inv.lateCount || 0) < late) { inv.lateCount = (inv.lateCount || 0) + 1; const f = Math.round(inv.amount * 0.015); inv.amount += f; inv.lateFees = (inv.lateFees || 0) + f; }
    if (!inv.lien && g.day - inv.due > 30) { inv.lien = true; deliver(g, inv.npc, { subject: `Notice of lien — Invoice #${inv.no}`, verdict: { kind: 'lien', no: inv.no, title: inv.title, amount: inv.amount }, day: g.day }).delivered = true; }
  }
  if (!g.outcome && g.budget < 0) g.outcome = { won: false, day: g.day, reason: 'Out of money — the construction loan interest ate your cash' };
  if (!g.outcome && g.docs.includes('occupancy') && g.docs.includes('homeowners') && !openInvoices(g).length) g.outcome = { won: true, day: g.day, spent: g.spent, budget: g.budget, mortgage: g.loan ? monthlyPayment(g.loan.amount, g.loan.rate) : 0 };
  else if (!g.outcome && g.day > g.scenario.deadlineDay) g.outcome = { won: false, day: g.day, reason: `Deadline: day ${g.scenario.deadlineDay}` };
  return out.sort((a, b) => a.deliverDay - b.deliverDay);
}

export const nextMailDay = g => Math.min(...Object.values(g.threads).flat().filter(m => !m.delivered).map(m => m.deliverDay));
export const unread = g => Object.values(g.threads).flat().filter(m => m.delivered && !m.read && m.from !== 'me').length;

/** Quest log rows for the UI. */
export function questLog(g) {
  return QUESTS.filter(q => applies(g, q)).map(q => {
    const early = q.after.filter(a => g.quests[a] !== 'done' && applies(g, questById[a])).map(a => questById[a].id).concat((q.requiresDocs || []).filter(d => !g.docs.includes(d)).map(d => '#' + d));
    return { ...q, status: g.quests[q.id], ready: !early.length, waitingOn: early.map(a => a[0] === '#' ? docName(a.slice(1)) : questById[a].title), feeNow: typeof q.fee === 'string' || typeof q.fee === 'function' ? (q.fee === 'homeCost' || q.fee === 'homePermit' || q.fee === 'loanClosing' || q.fee === 'points' || g.site || !q.crew ? feeFor(g, q) : null) : q.fee };
  });
}
export { fmt$ };

/** Whole-game status: used by the Summary button and the foreman's briefings. Pure. */
export function summary(g) {
  const log = questLog(g), title = q => `${q.title} (${NPCS[q.npc].name.split(' —')[0]})`;
  const ready = log.filter(q => q.status === 'open' && q.ready && q.loan !== 'points');
  const pendingMail = Object.entries(g.threads).flatMap(([npc, ms]) => ms.filter(m => !m.delivered).map(m => ({ npc, m })));
  const pending = log.filter(q => q.status === 'pending').map(q => {
    const pm = pendingMail.find(x => x.m.verdict?.quest === q.id); return { title: title(q), day: pm?.m.deliverDay ?? null };
  });
  const blocked = log.filter(q => q.status === 'open' && !q.ready).slice(0, 6).map(q => ({ title: title(q), waitingOn: q.waitingOn }));
  const core = log.filter(q => !q.loan && !q.crew);
  const warnings = [];
  if (!g.plan.items.length) warnings.push('No site plan yet: shop for a home and place it with a well and a septic drainfield.');
  else if (!g.plan.eval.ok) warnings.push(`Site plan has ${g.plan.eval.violations.length} problem(s): ${g.plan.eval.violations[0].msg}`);
  if (!g.loan && g.budget < 40000) warnings.push(`Cash is down to ${fmt$(g.budget)} and the construction loan hasn't funded. Hold paid site work until it does, or open the $40k land equity line.`);
  if (!Object.values(g.quests).some((s, i) => s !== 'open' && QUESTS[i]?.loan === 'prequal')) warnings.push('No lender yet: get pre-qualified at a bank early; you need a construction loan for the home.');
  if (g.quests.cad === 'done' && !g.crew) warnings.push('No site-work crew hired yet: get bids from the three crews and hire one.');
  if (g.docs.includes('home-set') && !g.docs.includes('homeowners')) warnings.push('You need homeowners insurance before you can move in.');
  const bills = openInvoices(g), overdueB = bills.filter(i => g.day > i.due);
  if (overdueB.length) warnings.push(`${overdueB.length} bill(s) overdue (${fmt$(overdueB.reduce((a, i) => a + i.amount, 0))}). Overdue contractors stop work; after 30 days they file a lien that blocks your loan.`);
  if (g.docs.includes('occupancy') && bills.length) warnings.push('Final inspection passed — pay every open bill to move in.');
  const left = g.scenario.deadlineDay - g.day;
  if (left < 45 && !g.outcome) warnings.push(`Only ${left} days left before the deadline.`);
  const nd = nextMailDay(g);
  return {
    day: g.day, deadline: g.scenario.deadlineDay, daysLeft: left, budget: g.budget, spent: g.spent,
    loan: g.loan ? { lender: NPCS[g.loan.bank].name, amount: g.loan.amount, rate: g.loan.rate, interest: g.loan.interest } : null,
    landLine: g.landLine?.open ? g.landLine.amount : 0, crew: g.crew ? NPCS[g.crew].name : null, site: g.site,
    progress: { done: core.filter(q => q.status === 'done').length, total: core.length },
    ready: ready.map(title), pending, blocked, nextMailDay: Number.isFinite(nd) ? nd : null, docs: g.docs.map(docName), warnings,
    home: g.plan.eval.flags.home?.name || null,
    bills: bills.map(i => ({ no: i.no, from: NPCS[i.npc].name.split(' —')[0], title: i.title, amount: i.amount, due: i.due, overdue: g.day > i.due, lien: !!i.lien })),
    billsTotal: bills.reduce((a, i) => a + i.amount, 0),
  };
}

// ---- Bills: invoices, payment, negotiation
export const openInvoices = g => (g.invoices || []).filter(i => i.status === 'open');
function newInvoice(g, npc, q, amount, day, net) {
  g.invoices ||= []; const inv = { no: 1001 + g.invoices.length, npc, quest: q.id, title: q.title, amount: Math.round(amount), issued: day, due: day + net, status: 'open' };
  g.invoices.push(inv);
  const m = deliver(g, npc, { subject: `Invoice #${inv.no} — ${q.title}`, verdict: { kind: 'invoice', no: inv.no, title: q.title, amount: inv.amount, due: inv.due, net }, day });
  m.delivered = m.deliverDay <= g.day; m.invoice = inv.no; return inv;
}
export const amountDue = (g, inv) => inv.discount && g.day <= inv.discountUntil ? Math.round(inv.amount * (1 - inv.discount)) : inv.amount;
export function payInvoice(g, no) {
  const inv = (g.invoices || []).find(i => i.no === no); if (!inv || inv.status !== 'open') return { ok: false, error: 'No open invoice' };
  const amt = amountDue(g, inv); if (amt > g.budget) return { ok: false, error: `Not enough cash: ${fmt$(amt)} due, ${fmt$(g.budget)} available` };
  g.budget -= amt; g.spent += amt; inv.status = 'paid'; inv.paid = amt; inv.paidDay = g.day;
  thread(g, inv.npc).push({ id: ++g.seq, from: 'me', to: inv.npc, subject: `Payment — Invoice #${no}`, body: `Paid ${fmt$(amt)} for "${inv.title}".`, day: g.day, delivered: true, read: true });
  const m = deliver(g, inv.npc, { subject: `Receipt — Invoice #${no}`, verdict: { kind: 'receipt', no, amount: amt, title: inv.title, saved: inv.amount - amt, lien: inv.lien }, day: g.day });
  m.delivered = true; return { ok: true, amount: amt, reply: m };
}
export function negotiateInvoice(g, no, body = '') {
  const inv = (g.invoices || []).find(i => i.no === no); if (!inv || inv.status !== 'open') return { ok: false, error: 'No open invoice' };
  if (inv.negotiated) return { ok: false, error: 'You already negotiated this bill' };
  inv.negotiated = true;
  thread(g, inv.npc).push({ id: ++g.seq, from: 'me', to: inv.npc, subject: `Re: Invoice #${no}`, body: body || `Is there any flexibility on Invoice #${no} (${fmt$(inv.amount)})?`, day: g.day, delivered: true, read: true });
  const T = g.soured?.[inv.npc] ? { none: 'After your legal threat, we only discuss billing in writing through counsel. The invoice stands.' } : BILL_TERMS[inv.npc] || { discount: 0.03 };
  const v = T.none ? { kind: 'negotiated', no, outcome: 'none', reason: T.none, title: inv.title }
    : T.plan ? { kind: 'negotiated', no, outcome: 'plan', half: Math.round(inv.amount / 2), title: inv.title }
    : { kind: 'negotiated', no, outcome: 'discount', pct: T.discount, amount: inv.amount, title: inv.title };
  const reply = deliver(g, inv.npc, { subject: `Re: Invoice #${no}`, verdict: v, day: g.day + 2 });
  return { ok: true, reply };
}
function applyTerms(g, v) {
  const inv = g.invoices.find(i => i.no === v.no); if (!inv || inv.status !== 'open' || inv.terms) return; inv.terms = v.outcome;
  if (v.outcome === 'discount') { inv.discount = v.pct; inv.discountUntil = g.day + 7; v.until = inv.discountUntil; v.price = Math.round(inv.amount * (1 - v.pct)); }
  if (v.outcome === 'plan') { const rest = inv.amount - v.half; inv.amount = v.half; inv.due = Math.max(inv.due, g.day + 7);
    const q = questById[inv.quest]; const b = newInvoice(g, inv.npc, q, rest, g.day, 45); b.title = inv.title + ' (2nd installment)'; b.terms = 'plan'; b.negotiated = true; }
}

/** Poke an NPC about replies you're waiting on: the first follow-up per message cuts the remaining wait ~30%. */
export function followUp(g, npc) {
  const waiting = (g.threads[npc] || []).filter(m => !m.delivered && m.from !== 'me'); if (!waiting.length) return { ok: false, error: 'Nothing pending with them' };
  const fresh = waiting.filter(m => !m.poked);
  for (const m of fresh) { const left = m.deliverDay - g.day; m.deliverDay = g.day + Math.max(1, Math.ceil(left * 0.7)); m.poked = true; }
  thread(g, npc).push({ id: ++g.seq, from: 'me', to: npc, subject: 'Following up', body: `Just following up on my earlier message${waiting[0].verdict?.title ? ` about "${waiting[0].verdict.title}"` : ''}. Any update?`, day: g.day, delivered: true, read: true });
  return { ok: true, sped: fresh.length > 0, day: Math.min(...waiting.map(m => m.deliverDay)) };
}

export const LEGAL_FEE = 750; // attorney-drafted demand letter (game estimate)
/** "Threaten legal action." Costs an attorney letter. Deterministic, and teaches what actually works. */
export function threaten(g, npc) {
  const n = NPCS[npc]; if (!n || n.official) return { ok: false, error: 'You can\'t sue an official over their views — testify or comment instead.' };
  if (g.budget < LEGAL_FEE) return { ok: false, error: `An attorney demand letter costs ${fmt$(LEGAL_FEE)}; you have ${fmt$(g.budget)}.` };
  g.budget -= LEGAL_FEE; g.spent += LEGAL_FEE; g.legalSpent = (g.legalSpent || 0) + LEGAL_FEE;
  const t = g.threads[npc] || [], waiting = t.filter(m => !m.delivered && m.from !== 'me');
  const owed = openInvoices(g).filter(i => i.npc === npc && g.day > i.due);
  thread(g, npc).push({ id: ++g.seq, from: 'me', to: npc, subject: 'Formal notice', body: n.gov ? `[Attorney letter, ${fmt$(LEGAL_FEE)}] If I do not get a response on my application, I will pursue legal action.` : `[Attorney letter, ${fmt$(LEGAL_FEE)}] This is a formal demand. If the work is not completed promptly I will pursue my legal remedies, including a claim against your contractor bond.`, day: g.day, delivered: true, read: true });
  let v;
  if (n.gov) v = { kind: 'legal', outcome: 'gov', title: waiting[0]?.verdict?.title || null };
  else if (owed.length) {
    v = { kind: 'legal', outcome: 'backfire', owed: owed.reduce((a, i) => a + i.amount, 0), nos: owed.map(i => i.no) };
    for (const i of owed) { i.lien = true; i.due = Math.min(i.due, g.day - 31); }
  } else {
    const fresh = waiting.filter(m => !m.lawyered);
    for (const m of fresh) { m.deliverDay = g.day + Math.max(1, Math.ceil((m.deliverDay - g.day) * 0.5)); m.lawyered = true; }
    (g.soured ||= {})[npc] = true;
    v = { kind: 'legal', outcome: fresh.length ? 'sped' : 'nothing-pending', day: fresh.length ? Math.min(...fresh.map(m => m.deliverDay)) : null };
  }
  const reply = deliver(g, npc, { subject: 'Re: Formal notice', verdict: v, day: g.day + 1 });
  return { ok: true, outcome: v.outcome, reply, fee: LEGAL_FEE };
}
