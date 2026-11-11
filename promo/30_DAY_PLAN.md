# Pass the Plates: 30-day plan (launch, ads, scale, expand)
Drafted 2026-10-29. Not legal advice; every legal item below needs counsel/county confirmation.

## 1. Where things actually stand

| Area | State today |
|---|---|
| iOS | 1.2.1 live in the US. **1.2.2 / build 22 submitted for review 2026-10-29 (Waiting for Review)** with the new screenshots; release is manual after approval. |
| Android | Production release (build 8) "in review" since Oct 27, US only. New screenshots saved in Play as an unsent change (sending now would restart the release review). Store page not live yet. |
| Marketplace | **0 listings.** 14 real accounts: 7 want to sell, 6 buyers only. 2 on the area waitlist, 0 outreach leads. 2 banned accounts. |
| Product | Works end to end (tests pass, dead-end sweep done). Admin has Trust & Safety tools, scam flags, online/visit tracking. Payments, Pro and sponsors are built but switched OFF. |
| Creative | 10 AI food photos, 12 ad graphics, 4+4 store screenshots, storyboards, AI prompts, ad copy (`promo/`). No video made yet. |
| Business | LLC formed, EIN issued, bank application pending, CA registration on hold, no Stripe, no business email. |
| Legal | Cottage-food / platform-liability review has NOT happened. Privacy Policy updated for visit tracking and message scanning. |

**The central problem is the cold start.** The app is built and nearly everywhere it needs to be, but a new user opens it and sees an empty marketplace. Ads that send people to an empty app waste money and earn one-star reviews. So the plan is: supply first, then demand, then scale.

## 2. The legal gate (do this before you spend on ads)

- California's home-food rules are narrow. As I understand them, the ordinary "cottage food" permit covers low-risk foods like bread, cookies, brownies and jams, and hot or perishable meals (tamales, dumplings, jollof rice, BBQ plates) generally need a different permit (a "microenterprise home kitchen" permit, which depends on the county). **Please confirm with counsel and your county before recruiting or advertising hot meals.**
- Practical effect: **launch with bakers and non-perishable foods** (sourdough, cookies, brownies, granola, jams, candy). Keep tamales/BBQ/rice bowls out of ads and out of outreach until cleared. The AI photos for those dishes are fine as samples but should not be what you promote.
- Do not message the Marketplace food sellers I saw earlier about joining unless counsel is comfortable with it; some may be unpermitted, and you'd be inviting them to sell.
- Book a one-hour call with a food/marketplace attorney in week 1 using `LEGAL_REVIEW_BRIEF.md`. Questions: cottage-food exposure, what ad claims are safe, whether to require a seller's county permit number, and the new message-review procedures.
- Keep ad wording to "homemade", "from home bakers", "from your neighbors". Never "inspected", "certified", "safe" or "licensed".

## 3. Week-by-week plan

### Days 1-3: Clear the launch blockers
- [You] Sign in to App Store Connect. [Claude] create 1.2.2, attach build 22, upload screenshots, submit.
- [Claude] When the Play production review clears, send the saved screenshot change.
- [You] Finish the U.S. Bank account; open Stripe in test mode; set up Namecheap email forwarding so ads and stores can use a business email.
- [You] Pick the launch area: **Oceanside / Vista / Carlsbad (North County San Diego)**, since you're there and can meet cooks in person.
- [You] Book the attorney call. [Claude] tighten the legal brief into one page.
- [You] Create handles (Instagram, TikTok, Facebook page) as "Pass the Plates". Use one link-in-bio page (the `marketing/` page already exists).
- [Claude] Add a "Founding Cook" welcome message and a seller starter checklist inside the app (Admin message/broadcast + the existing getting-started list).

### Days 4-10: Get supply (target: 15 live listings with real photos)
You need real cooks before any buyer ad. Channels, cheapest first:
1. **People you know:** friends, family and neighbors who bake or cook. Ask each for 2-3 introductions. This is your fastest path.
2. **Local Facebook groups** (home bakers, North County foodies, neighborhood groups): post as yourself, read each group's rules, ask permission from admins. Nextdoor "Food & Dining" the same way.
3. **Farmers markets, craft fairs, church and school bake sales:** talk to vendors in person; hand out a card with a QR code.
4. **Instagram:** search local hashtags (#oceansidebakery, #northcountyfood) and DM home bakers a short, friendly invite.
5. **Cottage-food Facebook groups** for San Diego County.

The offer: a free storefront, free "Founding Cook" status for the first 20, you'll help them post their first listing, and you'll share their storefront link. Track every lead in Admin -> Outreach (templates and bulk-add already built).

**Photo rule:** each cook uploads a real photo of their own food. This is what fixes the "emoji instead of food" problem in the live app.
Weekly check: leads contacted, replies, cooks signed up, cooks with a live listing.

### Days 11-17: Soft launch to demand (target: first 20-30 orders)
- Organic first: each cook shares their storefront link with their own followers (the app already creates a share link). Ask for a "grand opening" post.
- Post 3-4 short vertical videos per week on TikTok / Reels / Shorts: real cooks (with written OK) and your real screen recordings, plus labeled AI B-roll. Hooks from `PROMOTION_PLAN.md`.
- Local posts on Nextdoor and neighborhood groups.
- **First paid tests (small):**
  - Meta (Instagram + Facebook): $20-25/day on test days, 10-mile radius around Oceanside, install objective, 2-3 creatives (use the graphics in `promo/graphics-samples/` and the video). Cap total at $300.
  - Apple Search Ads Search Match: about $7/day, cap total at $100; exact-match words like "homemade food", "home bakery", "local bakery".
- [Claude] Record the 3 real screen-recording clips; write final captions; set up UTM links so each channel is measurable.
- Watch Admin -> Stats daily: signups, first orders, repeat rate. Fix whatever blocks the first order (the funnel).

### Days 18-24: Learn, then double down
- Kill any ad below your break-even; give the winners 2x budget. Typical early rule: keep an ad only if cost per install is under ~$4 and at least one in five installs makes an account.
- Add **Google App campaign** and YouTube Shorts once the Android app is live in production, and **TikTok Spark Ads** (paying to boost your best organic video).
- Collect the first real reviews and testimonials (with permission) and add them to ads and store listings.
- Local press pitch: Coast News, Patch Oceanside, San Diego Union-Tribune community, local TV morning shows ("neighbors selling homemade bread").
- Run one in-person pop-up: 3-5 founding cooks at a farmers market with a Pass the Plates sign and QR code.
- Turn on referrals: the invite link exists; reward the first 50 referrers with a Founding Member badge.

### Days 25-30: Decide: scale, hold, or fix
Use these gates before spending more:
| Signal | Go (scale spend) | Hold and fix |
|---|---|---|
| Live cooks | 20+ | under 10 |
| Live listings with real photos | 40+ | under 20 |
| Orders per week | 15+ and rising | under 5 |
| Cost per cook signed | under ~$25 (or free via outreach) | over ~$60 |
| Cost per first order | under ~$12 | over ~$30 |
| Repeat buyers | 1 in 5 or more | almost none |
| Safety/legal | no open complaints | any unresolved report |

If green: double the budget, add the next neighboring cities (Carlsbad -> Encinitas -> San Marcos -> Escondido). If red: do not buy more ads; recruit more cooks or fix the order flow first.

## 4. Budget (first 30 days)

| Item | Amount |
|---|---|
**Hard ceiling: $1,000, Oceanside / Vista / Carlsbad only.** Nothing on the ad lines is spent until 15+ live listings exist (see gates).

| Item | Amount | When |
|---|---|---|
| Attorney consult (1 hour, get a quote first) | $300 | Week 1 |
| Printed cards, QR signs, pop-up table | $50 | Week 1-2 |
| Meta ads (Instagram + Facebook), 10-mile radius | $300 | Days 11-24, about $20-25/day on test days |
| Apple Search Ads (Search Match) | $100 | Days 11-24 |
| TikTok Spark boost of best organic video | $75 | Days 18-24 |
| Google App campaign (only after Android is live) | $75 | Days 18-24 |
| Reserve (re-run winners or fix a leak) | $100 | Days 25-30 |
| Free: CapCut, Canva, Gemini images, organic posting | $0 | |
| **Total** | **$1,000** | |

If the attorney quote is above $300, trim Meta first, not the legal call.

## 5. Scale and expand (after day 30)

1. **Deepen the first metro:** more cooks, more categories, weekly "what's cooking" push, repeat-buyer perks.
2. **More cities in San Diego County, then other California cities** where counsel confirms the permits for your cooks.
3. **New states, picked by law, not by size:** look first at "food freedom" states with the most permissive home-food rules (for example Wyoming, Utah, North Dakota, Oklahoma, Texas) and verify each with counsel before outreach. `cottageFoodStates.js` only tracks "has a program," not details.
4. **Monetize carefully (Phase 1 in `CHECKLIST.md`):** paid Featured listings on the web first (Stripe test mode, then live), later Pro subscriptions and sponsored placements. Only after you have real order volume.
5. **Ops that must grow with you:** the Trust & Safety tools (scam flags, user history) exist; still to build are audited reading of reported chats and alerts for watched accounts. Daily report triage per `TRUST_AND_SAFETY_PROCEDURES.md`.
6. **Native features that need a new app release:** visit tracking ("online now") only reaches app users after 1.2.2 and the next Android build.

## 6. Who does what

- **Claude:** App Store/Play submissions, screen recordings, ad graphics and copy, UTM links, landing page, Admin tooling, weekly metrics summary, legal brief, outreach scripts.
- **You:** sign-ins (Apple, Google), bank/Stripe/email, ad-account setup and payment, talking to cooks, attorney call, in-person events, approving every post and claim before it goes out.

## 7. Risks to watch

- **Empty or thin marketplace** at launch (biggest risk): do not run buyer ads until 15+ live listings exist.
- **Cottage-food compliance:** unresolved with counsel; this limits which foods and which states you can promote.
- **Scams and unsafe sellers:** use the Safety tab and the procedures; ban fast.
- **Ad rejections:** keep claims modest, label AI imagery, show the real app.
- **Store review delays:** Play production and the 1.2.2 iOS review may each take days.
- **Your time:** supply outreach is the bottleneck. Block time daily for it.

## 8. Decisions I need from you this week

1. Confirm the launch area (Oceanside / Vista / Carlsbad) and bakery-first focus.
2. Approve the budget ceiling and which platforms to start with.
3. Pick a date for the attorney call.
4. Choose 5 people you can ask to be the first founding cooks.
