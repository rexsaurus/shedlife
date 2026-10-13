// Scripted NPC replies: used offline and as the factual skeleton Claude must preserve.
const $ = n => '$' + Math.round(n).toLocaleString('en-US');
const list = a => a.map(x => `  • ${x}`).join('\n');

export function factsOf(v) {
  switch (v?.kind) {
    case 'welcome': return ['Explain the goal: a legal, livable home on the RA-5 parcel.', 'Suggest starting by asking what can be built, and drawing a site plan.'];
    case 'accepted': return [`Request "${v.title}" is accepted.`, `Fee charged: ${$(v.fee)}${v.est ? ' (estimate)' : ''}.`, ...(v.extra || []), `Result: ${v.gives.join(', ')}.`, `Basis: ${v.cite}.`];
    case 'have-loan': return [`The player already has a construction loan in progress with ${v.lender}; you cannot open a second one. Wish them well.`];
    case 'no-better': return [`Cannot improve on the current rate of ${v.rate}% (the competing offer is ${v.comp}%).`, 'Explain that we are already at or below the competitor, or at our floor. Suggest buying a discount point instead.'];
    case 'have-crew': return [`The player already hired ${v.crew} for site work, so this bid can't be accepted. Be gracious; invite them to call next time.`];
    case 'not-needed': return [`"${v.title}" is not needed for this parcel.`];
    case 'briefing': return briefingLines(v).concat(['Speak as the foreman giving a status briefing in priority order: first what to do next, then what we are waiting on, then risks. Keep every item; you may group them.']);
    case 'declined': return [`Declined: ${v.reason}.`, 'Suggest another lender or improving credit.'];
    case 'needs-info': return [`Cannot process "${v.title}" yet.`, `Missing: ${v.missing.join('; ')}.`, 'Resubmit with these attached.'];
    case 'too-early': return [`"${v.title}" cannot start yet.`, `Must be completed first: ${v.first.join('; ')}.`];
    case 'corrections': return [`"${v.title}": corrections required on the site plan.`, ...v.violations.map(x => `${x.msg} (${x.ref})`), 'Revise the site plan and resubmit.'];
    case 'cant-pay': return [`Fee for "${v.title}" is ${$(v.fee)}; the account only has ${$(v.budget)}.`];
    case 'duplicate': return [`"${v.title}" is already complete.`];
    case 'pending': return [`"${v.title}" is already under review; no action needed.`];
    case 'chat': return ['This is a conversation with an official, not a permit decision. Respond to what the player just said, in character, at a general level.', 'You cannot approve, deny, speed up or influence any individual permit; say so kindly if asked.'];
    case 'answer': return ['Answer the question from general knowledge of this agency\'s role, briefly. Do not grant approvals or quote fees not listed in the facts.'];
    default: return [];
  }
}

export function scriptedReply(npc, v, m) {
  const sign = `\n\n— ${npc?.name || 'Office'}`;
  switch (v?.kind) {
    case 'welcome': return `Welcome. You own 4.8 vacant acres zoned RA-5 in unincorporated King County.\n\nTo live there legally you need water, septic, power, a building permit and a final inspection. Most people start by asking us what can be built, then drawing a site plan: place your home, well and drainfield on the map.\n\nEvery request in this game is an email. Agencies reply on the clock; use ⏭ to wait for mail.${sign}`;
    case 'accepted': return `Thank you, your request for "${v.title}" is approved.\n\nFee: ${$(v.fee)}${v.est ? ' (estimate)' : ''}\n${(v.extra || []).map(x => x + '\n').join('')}You now have: ${v.gives.join(', ')}\n\nReference: ${v.cite}${sign}`;
    case 'have-loan': return `It looks like you're already working with ${v.lender} on a construction loan, so we can't open a second one. Good luck with the build!${sign}`;
    case 'no-better': return `Thanks for sending the competing Loan Estimate. Our rate is ${v.rate}% and theirs is ${v.comp}%, so we can't go lower right now. If you want a lower rate, you can buy a discount point.${sign}`;
    case 'have-crew': return `Sounds like you went with ${v.crew}. No hard feelings — keep our number for the next project.${sign}`;
    case 'briefing': return `Here's where we stand.\n\n${briefingLines(v).join('\n')}${sign}`;
    case 'not-needed': return `Good news: "${v.title}" isn't needed for your parcel.${sign}`;
    case 'declined': return `We're unable to pre-qualify you: ${v.reason}. Another lender may have different criteria.${sign}`;
    case 'needs-info': return `We can't process "${v.title}" yet. Please send:\n${list(v.missing)}\n\nNo fee has been charged.${sign}`;
    case 'too-early': return `"${v.title}" can't start until these are complete:\n${list(v.first)}${sign}`;
    case 'corrections': return `Review of "${v.title}" found corrections on your site plan:\n${list(v.violations.map(x => `${x.msg} (${x.ref})`))}\n\nPlease revise the site plan and resubmit. No fee has been charged.${sign}`;
    case 'cant-pay': return `The fee for "${v.title}" is ${$(v.fee)}. Your available funds are ${$(v.budget)}.${sign}`;
    case 'duplicate': return `Our records show "${v.title}" is already complete.${sign}`;
    case 'pending': return `"${v.title}" is already in review. We'll write when it's done.${sign}`;
    case 'chat': return npc?.title === 'Hearing Examiner'
      ? `Thank you for writing. I can't discuss the merits of a case outside a hearing, but I'm happy to explain how appeals work: you file within the deadline in the decision, the County and you present evidence at a hearing, and I issue a written decision.${sign}`
      : `Thanks for reaching out. Permit decisions are made by staff, not by the ${npc?.org?.split(' · ')[0] || 'council'}, so I can't weigh in on yours. What I can do is listen — I spend most of my time on ${npc?.priorities?.join(' and ') || 'land use'}. If the code is getting in the way of a home like yours, testify at a hearing or send written comment; that's on the record and it matters.${sign}`;
    case 'answer': return `Thanks for your question. Our general guidance is on our website${npc?.url ? `: ${npc.url}` : ''}. For anything parcel-specific, please submit a request.${sign}`;
    default: return '';
  }
}

export function briefingLines(v) {
  const L = [`Day ${v.day} of ${v.deadline} (${v.daysLeft} left). Cash ${$(v.budget)}${v.loan ? `; construction loan ${$(v.loan.amount)} at ${(v.loan.rate * 100).toFixed(2)}% with ${v.loan.lender}` : '; no construction loan yet'}${v.landLine ? `; land line ${$(v.landLine)} open` : ''}.`,
    `Core steps done: ${v.progress.done} of ${v.progress.total}.${v.home ? ` Home: ${v.home}.` : ''}${v.crew ? ` Site crew: ${v.crew}.` : ''}`];
  if (v.ready.length) L.push('Do next: ' + v.ready.slice(0, 8).join('; ') + (v.ready.length > 8 ? `; +${v.ready.length - 8} more` : '') + '.');
  if (v.pending.length) L.push('Waiting on: ' + v.pending.map(p => `${p.title}${p.day != null ? ` (reply ~day ${p.day})` : ''}`).join('; ') + '.');
  if (v.blocked.length) L.push('Blocked: ' + v.blocked.slice(0, 4).map(b => `${b.title} needs ${b.waitingOn.join(', ')}`).join('; ') + '.');
  for (const w of v.warnings) L.push('Heads up: ' + w);
  return L;
}
