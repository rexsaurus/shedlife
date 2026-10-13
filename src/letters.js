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
    case 'form-errors': return [`The ${v.form} for "${v.title}" was returned unprocessed. No fee charged.`, ...v.errors.map(e => `Error: ${e}`), 'Correct the form and resubmit.'];
    case 'on-hold': return [`Work on "${v.title}" is on hold: invoice(s) #${v.nos.join(', #')} totaling ${$(v.owed)} are past due.`, 'Pay the overdue invoice and we will schedule you.'];
    case 'invoice': return [`Invoice #${v.no} for "${v.title}": ${$(v.amount)}.`, v.net ? `Due by day ${v.due} (net ${v.net}).` : 'Due on receipt (booking deposit).', 'Ask the player to pay; mention they can reply if they want to discuss terms.'];
    case 'receipt': return [`Payment of ${$(v.amount)} received for Invoice #${v.no} ("${v.title}"). Thank them.`, ...(v.saved > 0 ? [`They saved ${$(v.saved)} with the agreed terms.`] : []), ...(v.lien ? ['The lien will be released.'] : [])];
    case 'negotiated': return v.outcome === 'none' ? [`Cannot change Invoice #${v.no}: ${v.reason}`] : v.outcome === 'plan' ? [`Agree to split Invoice #${v.no} into two payments of about ${$(v.half)}: the first due within 7 days, the second in 45 days.`] : [`Offer ${Math.round(v.pct * 100)}% off Invoice #${v.no} (${$(v.amount)} → ${$(Math.round(v.amount * (1 - v.pct)))}) if paid within 7 days of this email.`];
    case 'legal': return v.outcome === 'gov' ? ['Respond professionally to a threat of legal action. Do not change any review timeline because of it.', 'Explain the real options: ask for a status update or a meeting with the assigned reviewer; local permit review timelines are set under RCW 36.70B; a final land-use decision can be appealed under the Land Use Petition Act (RCW 36.70C) within 21 days.']
      : v.outcome === 'backfire' ? [`Reply firmly: the player owes ${$(v.owed)} on overdue invoice(s) #${v.nos.join(', #')}.`, 'Because of the threat, the account goes to collections and a construction lien is being recorded now (RCW 60.04).']
      : v.outcome === 'sped' ? [`Reply defensively but cooperatively: you will complete the pending work sooner, by day ${v.day}.`, 'Say that from now on you only discuss billing in writing (no more discounts).', 'Mention that contractor disputes in Washington can go to a claim against the contractor\'s L&I registration bond (RCW 18.27.040) or small claims.']
      : ['Reply that nothing is pending with you right now, so there is nothing to escalate; you are puzzled by the tone. Say you will communicate in writing from now on.'];
    case 'lien': return [`Invoice #${v.no} ("${v.title}", ${$(v.amount)}) is more than 30 days past due.`, 'Formal notice: we are recording a construction lien against the property under RCW 60.04. It will be released when paid in full.', 'Be firm but not hostile.'];
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
    case 'form-errors': return `Your ${v.form} was returned without processing. Please correct:\n${list(v.errors)}\n\nNo fee has been charged.${sign}`;
    case 'on-hold': return `We'd love to get going on "${v.title}", but invoice #${v.nos.join(', #')} (${$(v.owed)}) is past due. Once it's paid we'll put you back on the schedule.${sign}`;
    case 'invoice': return `Invoice #${v.no}\n\n${v.title}: ${$(v.amount)}\n${v.net ? `Terms: net ${v.net} — due by day ${v.due}.` : 'Booking deposit — due on receipt.'}\n\nThanks for the business. Reply if you want to talk about terms.${sign}`;
    case 'receipt': return `Received ${$(v.amount)} for Invoice #${v.no} — thank you!${v.saved > 0 ? ` (You saved ${$(v.saved)}.)` : ''}${v.lien ? ' We are releasing the lien.' : ''}${sign}`;
    case 'negotiated': return v.outcome === 'none' ? `Sorry, we can't adjust Invoice #${v.no}: ${v.reason}${sign}` : v.outcome === 'plan' ? `We can split Invoice #${v.no}: about ${$(v.half)} within 7 days and the rest in 45 days. I've sent a second invoice for the balance.${sign}` : `Pay within 7 days and take ${Math.round(v.pct * 100)}% off Invoice #${v.no}: ${$(Math.round(v.amount * (1 - v.pct)))} instead of ${$(v.amount)}.${sign}`;
    case 'legal': return v.outcome === 'gov' ? `We received your message. Threats don't change review order or timelines, but here's what actually helps: ask us for a status update or a meeting with your reviewer; permit review timelines are set under RCW 36.70B; and once there's a final land-use decision you can appeal it under the Land Use Petition Act (RCW 36.70C) within 21 days.${sign}`
      : v.outcome === 'backfire' ? `You owe us ${$(v.owed)} on invoice #${v.nos.join(', #')}, which is overdue. Given your letter, we've sent the account to collections and are recording a construction lien (RCW 60.04).${sign}`
      : v.outcome === 'sped' ? `Understood. We'll have your work done by day ${v.day}. Going forward, billing questions in writing only. (For the record: contractor disputes in Washington go to a claim on the contractor's L&I bond, RCW 18.27.040, or small claims.)${sign}`
      : `There's nothing pending between us right now, so we're not sure what this is about. We'll keep things in writing from here.${sign}`;
    case 'lien': return `Invoice #${v.no} (${$(v.amount)}) is more than 30 days past due. We are recording a construction lien against the property (RCW 60.04). It will be released as soon as it's paid.${sign}`;
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
  if (v.bills?.length) L.push(`Bills open: ${v.bills.length} totaling ${$(v.billsTotal)} — ` + v.bills.slice(0, 4).map(b => `#${b.no} ${b.from} ${$(b.amount)} due day ${b.due}${b.overdue ? ' (OVERDUE)' : ''}`).join('; ') + '.');
  for (const w of v.warnings) L.push('Heads up: ' + w);
  return L;
}
