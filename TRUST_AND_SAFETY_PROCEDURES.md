# Trust & safety procedures — internal, not legal advice

This is a working runbook for you (or whoever handles Admin) when a report comes
in, written so there's a consistent answer to "what do I actually do" instead of
improvising each time. It's not legal advice and hasn't been reviewed by an
attorney — see [LEGAL_REVIEW_BRIEF.md](LEGAL_REVIEW_BRIEF.md) for the broader
legal review this should eventually get folded into.

The short version, if you remember nothing else: **Plates is not law
enforcement, and shouldn't act like it is.** Your job when a serious report
comes in is (1) act on the account — warn, suspend, or ban — and (2) point the
person toward the people who can actually help (police, their bank, a lawyer),
not to try to investigate or resolve the underlying incident yourself.

## Where reports show up

Admin → Reports. As of this pass, reports can come from three places in the
app: a listing ("🚩 Report this listing"), a chat thread ("🚩 Report" in the
header), or a seller's storefront ("🚩 Report" next to Follow). All three write
to the same `reports` table and show up in the same queue. Reports tagged
**"Safety incident (theft, threats, or something happened in person)"** are
sorted to the top of the queue automatically and shown with a 🚨 marker and a
colored border — check those first, every time you open the tab.

## Triage order

When you open Reports, work through them in this priority order, not strictly
by date:

1. **Safety incident** (the 🚨-marked ones) — theft, threats, assault, or
   anything that happened in person. Same-day, ideally same-hour.
2. **Scam / fraud** — no-show after money changed hands, a fake listing, a
   seller who took payment and disappeared. Within a day or two.
3. **Food safety concern** — an allergen wasn't disclosed, someone got sick.
   Same-day if the seller has other active listings (stop new orders from
   reaching them while you look into it).
4. **Inappropriate behavior / spam / inaccurate listing / something else** —
   normal queue, no rush, but don't let it pile up indefinitely.

## What to actually do, by scenario

**Someone reports they were robbed, threatened, or assaulted at a pickup /
delivery.**
- This is now a police matter, not just a Plates matter. If your reply to the
  reporter is the first time anyone's said this to them, say it plainly:
  *"I'm sorry this happened. If you haven't already, please contact local
  police — this is the kind of thing they need to be the ones handling, and a
  police report also helps if you need to file an insurance or bank claim
  later. In the meantime I'm taking action on this account on our end."*
- Don't promise you'll investigate, don't ask the reporter to describe the
  incident in more detail than they've already given you (you're not building
  a case, and asking for more detail can feel like being interrogated) — take
  what they gave you and act.
- Suspend the reported account immediately (Ban user), even before you've
  fully "resolved" the report. A credible safety report justifies acting on
  the account right away — you don't need proof beyond a reasonable doubt to
  suspend someone, only to reinstate them.
- Do not unban without hearing from the reporter that it's resolved, or
  without a real reason to believe the report was mistaken/malicious.
- Preserve the evidence: don't delete the listing, the chat, or the report
  itself while this is open, in case the reporter's police report or an
  insurance claim later needs something from your side (a timestamp, a
  message, who the other account belonged to).

**Someone reports being scammed (paid and got nothing, fake listing, etc.).**
- Same posture: Plates doesn't process payments, so there's no refund to
  issue — but the account is fully within your control, and taking action on
  it is real and valuable to the reporter even without a refund.
- If the pattern looks organized (multiple victims, same account, clearly
  fake photos/listings), ban immediately rather than waiting to gather more
  reports first.
- Tell the reporter plainly that Plates can't refund money that changed hands
  outside the app, and that if the amount is significant, their bank/payment
  app's own fraud/dispute process and, for larger amounts, a police report
  are the actual paths to getting money back — don't leave them thinking a
  report to Plates is a refund request.

**Someone reports a food safety concern (got sick, allergen not disclosed).**
- Ask (once) what happened and when, mainly to judge urgency — but don't turn
  this into a medical intake, you're not qualified to assess it and shouldn't
  try.
- If someone says they're currently having a reaction or feel seriously
  unwell, tell them to seek medical care (call 911 or go to urgent
  care/ER) before anything else — don't let the conversation stay
  Plates-focused if there's an active health situation.
- Consider pausing (not necessarily banning) the seller's other listings
  while you look into it, especially if there's any chance the same batch of
  food is still being sold to others.

**Someone reports harassment or unwanted contact (not a physical incident).**
- Read the actual messages if the report is chat-based before deciding — the
  chat report ties directly to the conversation, so you have real context,
  not just a secondhand description.
- A first-time, lower-severity issue (rude, pushy, one bad message) can be a
  warning rather than an outright ban — but document that you warned them, so
  a second report isn't starting from zero.
- Repeated or escalating behavior, or anything with a threat in it, treat as
  a Safety incident per above, not just "inappropriate behavior."

## What not to do

- Don't tell a reporter Plates will "handle it" in a way that implies more
  than account-level action — you can ban someone, you can't recover their
  money, prosecute anyone, or guarantee their safety.
- Don't admit fault or liability on Plates' behalf in a message to a user —
  that's exactly the kind of thing that undercuts the Terms of Service's
  liability language if it ever matters later. Sympathy is fine and
  appropriate ("I'm sorry this happened"); "this is our fault" or "we should
  have caught this" is not something to say in the moment.
- Don't offer to pay for someone's loss, medical bill, or stolen item, even
  informally — that's a decision with real legal and financial weight that
  shouldn't happen ad hoc in a support reply.
- Don't discuss one user's report with another user, or post about a specific
  incident anywhere public, even to warn others — act on the account instead.

## Record-keeping

There's no dedicated admin action log in the app yet (it's on the list of
possible future admin features) — today, the `reports.status` field and your
own memory are the only record that something happened. Until a real log
exists, for anything above "inaccurate listing" severity, keep your own note
somewhere outside the app (a doc, a spreadsheet, whatever) with: date,
report reason, account(s) involved, what you did, and why. This matters if a
pattern shows up later (same account reported twice), if you're ever asked to
explain a decision, or if a lawyer ever needs the history.

## When to loop in a lawyer

Reach out to an attorney (not just re-read this doc) if: you receive a
subpoena, a demand letter, or any legal-sounding communication about an
incident; a report describes something that sounds like it could be a serious
crime (not just an argument or a no-show); a reporter says they're planning to
sue or go to the press; or you're genuinely unsure whether an account action
you're about to take (or not take) creates risk for you personally. This is
also a good moment to reuse [LEGAL_REVIEW_BRIEF.md](LEGAL_REVIEW_BRIEF.md) —
add the specific incident (with identifying details removed if you're
consulting before you've retained someone) to "specific open questions" before
that conversation.
