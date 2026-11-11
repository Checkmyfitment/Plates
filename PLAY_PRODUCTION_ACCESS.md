# Google Play production-access application — draft answers

Use these when the Play Console "Apply for production" button unlocks (it
needs 12+ opted-in testers for 14 continuous days; the dashboard showed 10
days on 2026-10-22, so roughly **Oct 26–27**). Paste, then edit anything in
**[brackets]** to match what actually happened — Google reads these, and
honest, specific answers go over better than polished vague ones.

> Facts to double-check before submitting: the real tester count on the
> Dashboard, the date the test started, and how many testers actually opened
> the app (Console -> Statistics, and Testing feedback if any came in).

---

## About the app

**What does your app do?**
Pass the Plates is a neighborhood marketplace for homemade food. Home cooks,
bakers, and food trucks post what they're making; neighbors browse by
distance or on a map, message the cook, and arrange pickup. Payment is
arranged directly between the buyer and the cook — the app doesn't take a cut
of the food money.

**Who is it for?**
People who want homemade food from their own neighborhood (tamales, sourdough,
meal prep, baked goods) and home cooks who want a simple way to sell it.

## Your closed test

**How did you recruit your testers?**
I recruited friends, family, and neighbors personally, and added people from
my own network who use Android, including a few testers outside the US
([e.g., Malaysia and Canada — confirm]). I added each person's Google account
to the closed-test email list and sent them the opt-in link. I tracked
opt-ins on the Play Console dashboard until I had more than the required 12.

**How did testers engage with the app?**
[Confirm numbers from Statistics.] Testers installed the app, browsed
listings, opened the map, and created accounts. Several tried the sign-up and
messaging flows. [Add anything specific you remember — e.g., "about N testers
opened the app more than once".]

**Summarize the feedback you received.**
The most important feedback came early: Android testers could not create an
account. I traced it in my server logs to a limit on confirmation emails
(the built-in email service allowed only a couple of emails per hour for the
whole app). Other feedback included [confirm: screen layouts being cut off at
the top on some phones, wanting pull-to-refresh and swipe-to-go-back, a
clearer map].

**What changes did you make based on what you learned?**
- Added Sign in with Google and Sign in with Apple so people can join without
  waiting on a confirmation email, and moved account emails to a dedicated
  sending service with a much higher limit.
- Fixed a layout bug where the page header could slide off the top of the
  screen after scrolling (seen on phones with a notch) and made the app's
  scrolling more robust on every phone.
- Added pull-to-refresh, swipe-back gestures, an Android back-button fix
  (back used to close the whole app), pinned page headers, and a map panel that
  can be swiped between sizes.
- Added swipe actions on orders (message the seller, cancel).
- Renamed the app to "Pass the Plates" and improved store listing text so
  people can find it.

## Production readiness

**How did you decide the app is ready for production?**
Testers can sign up (email, Google, or Apple), browse and search listings,
use the map, message sellers, and place and track orders without crashes.
The sign-up problem found in testing is fixed, I've published a privacy
policy and terms of service, and I use crash and error logging to catch
problems after launch. I plan to roll out gradually and watch Android vitals
before expanding.

**Expected installs / how will you grow?**
Starting locally ([Oceanside / San Diego area — confirm]): word of mouth,
neighborhood groups, and the sellers' own followers. I expect [hundreds] of
installs in the first few months.

**Is the app free? Any in-app purchases?**
Free to download and use. Optional promotion for a listing and a seller
subscription may be added later through Google Play Billing.


---

## Final answers, trimmed to Google's 300-character boxes (drafted 2026-10-26)

Confirm each is true before pasting -- especially recruitment, engagement and feedback.

**1. How did you recruit testers?** (292/300)
I personally invited friends, family and neighbors who use Android, plus a few people from my wider network in other countries. I added each person's Google account to the closed-test email list, sent them the opt-in link, and tracked opt-ins on the dashboard until we passed the required 12.

**3. Engagement from testers** (271/300)
Testers installed the app, created accounts, browsed listings, used the map and search, and messaged a seller. Usage was lighter than real life because no local cooks have launched yet; at release, real listings, orders and repeat visits should look noticeably different.

**4. Feedback summary + how collected** (260/300)
I collected feedback by text and in person. Biggest issue: some testers couldn't create accounts because of a signup confirmation-email limit. Others reported cut-off screen headers and wanted pull-to-refresh and swipe-back. I fixed all of these and re-tested.

**Step 2. What does the app do** (245/300)
Pass the Plates is a neighborhood marketplace for homemade food. Home cooks and bakers post what they're making; neighbors browse by distance or on a map, message the cook, and arrange pickup. Payment is arranged directly between buyer and cook.

**Step 2. Who is it for** (222/300)
Neighbors who want homemade food nearby (tamales, sourdough, meal prep, baked goods) and home cooks who want a simple way to sell it. I'm starting locally in California and growing by word of mouth and neighborhood groups.

**Step 3. Changes made from testing** (237/300)
Added Google and Apple sign-in and a higher-limit email service so signup works; fixed header layout on notched phones; added pull-to-refresh, swipe-back, Android back-button fix, order swipe actions; fixed a Chats crash my own QA found.

**Step 3. Why ready for production** (261/300)
Testers can sign up, browse, search, use the map, message sellers and place orders without crashes. Signup problems are fixed, privacy policy and terms are published, and I log errors to catch problems early and will roll out gradually, watching Android vitals.

