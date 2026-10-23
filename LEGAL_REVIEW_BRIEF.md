# Legal review brief — Plates

This is a one-page orientation document to hand to an attorney, not legal
advice itself. It exists to make a first consultation faster and more useful
by pointing straight at what needs a professional opinion, rather than
making the lawyer read the whole app to figure out what questions to ask.

## What Plates is

Plates is a peer-to-peer marketplace app connecting home cooks ("sellers")
with neighbors who want to buy homemade food ("buyers"). Key facts that
shape the legal picture:

- **No in-app payments yet.** Buyers and sellers currently arrange payment
  and pickup entirely outside the app (cash, a payment app, etc.). Plates is
  not a party to that transaction. This will very likely change in the
  future (Stripe or similar), which will need its own review pass — see
  "Known future changes" below.
- **No delivery/logistics operated by Plates.** Some sellers offer their own
  delivery; Plates doesn't provide or coordinate delivery itself.
- **Not a licensed commercial kitchen operation.** Every listing comes from
  someone's home kitchen. Sellers are asked (in the app's Terms and
  Community Guidelines) to comply with their own local cottage food laws,
  but Plates does not inspect kitchens, verify food handler certifications,
  or otherwise confirm compliance.
- **Solo/early-stage operator.** Currently used by the founder and a small
  circle of friends/family for testing, not yet publicly launched.

## Where the current documents live

Four in-app pages, all written by an AI assistant as a reasonable starting
draft — not reviewed by an attorney yet:

- **Terms of Service** — `src/components/LegalScreen.jsx`, the `Terms()`
  component
- **Privacy Policy** — same file, the `Privacy()` component
- **Community Guidelines** — same file, the `Guidelines()` component
- **Cottage Food Laws by State** (new) — same file, the `StateLaws()`
  component. Deliberately does not state any state's specific rules or
  required disclosure wording (that's on the seller to look up — see the
  open question below) — it's a coverage checklist (every state, plus a
  note that New Jersey has no cottage food program) that points to the
  National Agricultural Law Center's compilation as a starting resource.

All four are viewable in the running app via Profile → the links at the
bottom of the page.

## Specific open questions for the attorney

1. **Governing law / jurisdiction.** The Terms of Service currently has a
   placeholder: *"These terms are governed by the laws of your local
   jurisdiction unless stated otherwise"* with an explicit `[Placeholder]`
   note. This needs a real answer — which state's law should govern, and
   does that choice work well given the app is inherently local/hyperlocal
   (buyers and sellers are always in the same area)?

2. **Cottage food law exposure.** The Terms put compliance responsibility on
   the seller, but: does *operating a platform* that facilitates these
   sales create any separate obligation or exposure for Plates itself,
   especially if it expands into multiple states/counties with different
   cottage food rules?

3. **Limitation of liability clause.** Is the current "as is, no warranty,
   Plates is not liable for harm arising from food purchased through the
   app" language actually enforceable, particularly given food safety and
   potential injury are involved? Some states limit how much liability can
   be disclaimed in consumer-facing contracts.

4. **Indemnification clause (new — added this pass).** Terms §12 now asks
   users to indemnify Plates for claims arising from their listings,
   conduct, or violations of cottage food law. This is drafted broadly and
   generically as a starting point — does it hold up, and is it drafted
   correctly for the state(s) you pick in the governing-law question above?
   Standard caveat also applies: an indemnification clause is a promise
   from the user to cover Plates' costs, not a guarantee a court will
   enforce it against an individual with limited assets — worth discussing
   whether that materially changes the real-world risk picture or is more
   of a deterrent/leverage tool.

5. **Arbitration / class-action waiver — deliberately left as a
   placeholder (new — added this pass).** Terms §13 is an empty section
   flagging that many marketplaces add mandatory individual arbitration
   here specifically to reduce litigation exposure, but the app
   intentionally didn't draft that language itself since it needs to be
   state-precise to be enforceable (and a badly-drafted arbitration clause
   can be worse than none). Worth a direct recommendation either way.

6. **Section 230 / "not a seller" positioning.** Worth confirming
   directly: is the current framing — Plates never sets prices, never
   takes possession of food, never processes payment, and is purely a
   listing/discovery service — actually enough to keep Plates outside the
   definition of "seller" under the relevant product-liability case law
   (courts are currently split on this for platforms generally, per
   *Bolger v. Amazon.com* and similar cases), or does anything else need
   to change structurally (not just in the Terms' wording) to preserve
   that position as the app grows?

7. **Cottage food disclosure statement — now placed on the seller, not
   Plates (new — added this pass).** Terms §4 and the Community
   Guidelines now tell sellers they're responsible for using their own
   state's *exact* required disclosure wording (these are usually
   statutory, word-for-word, and vary state to state) — Plates
   deliberately does not attempt to supply or auto-generate that wording
   itself, since getting it wrong for a given state seems worse than not
   trying. Is putting that obligation entirely on the seller (rather than,
   say, surfacing state-specific suggested wording in the app) the right
   call, or does Plates want to do more here later?

8. **Business entity.** Is Plates currently operated by a registered
   business entity (LLC, etc.), or by an individual? This significantly
   changes personal liability exposure and is worth flagging early —
   happy to have the founder answer this directly for the attorney.

9. **Age verification.** The Terms state a user must be 18+, but there's no
   actual verification mechanism beyond that statement. Is that sufficient,
   or is something more needed before real launch?

10. **Clickwrap acceptance.** Signup requires checking a box that now reads
    "I'm 18 or older, and I agree to the Terms of Service and Privacy
    Policy, including that Plates is just a listing platform (not the
    seller of any food) and that I'm buying, selling, and eating homemade
    food at my own risk" before an account is created — every account can
    both buy and sell, there's no separate buyer-only signup, so this one
    checkbox covers both roles. Purchasing itself is also gated behind
    having an account (a logged-out visitor can browse but the order form
    never renders for them — only a "Message seller to order" button
    that itself requires logging in first), specifically so the
    liability-relevant terms are always tied to an identifiable,
    logged-in acceptance rather than anonymous browsing. Is this
    sufficient acceptance under the relevant law, or does anything else
    need to change about how consent is captured?

11. **Privacy / data law applicability.** The Privacy Policy is a general
    draft. Does it need CCPA-specific language (if California users are
    expected), or anything else jurisdiction-specific?

## Known future changes (not needed for this review, but worth mentioning)

- **Payments.** When in-app payments (likely Stripe Connect) are added, the
  Terms' current "Payments & Refunds" section — which explicitly says
  Plates doesn't process payments — will need a full rewrite to reflect a
  real refund/dispute process, and probably a fresh legal review of its own.
- **Insurance.** Not currently addressed anywhere; worth asking the
  attorney whether platform-level or seller-level liability insurance
  should be part of the plan before scaling past friends and family.

## What's *not* being asked here

This brief is scoped to reviewing the existing drafts and flagging the
specific gaps above — it is not asking for a full business/regulatory
setup consultation (e.g., business formation, tax structure), though the
attorney may reasonably suggest those are worth a separate conversation.

---

## Update — October 2026 (read this section first)

Things that changed since the sections above were written. Nothing below has
been reviewed by an attorney yet.

### The business exists now (answers question 8)

- **Operator:** PASS THE PLATES LLC, a **Delaware** limited liability company,
  formed September 21, 2026. Single member (the founder). The founder lives and
  works in **California** (Oceanside), so the company effectively operates in
  California even though it is a Delaware entity.
- **EIN issued** October 22, 2026. A U.S. Bank business account is being opened.

### The name changed

The app is now called **Pass the Plates** in both app stores and across the app
(it was "Plates"). The legal documents still say "Plates" throughout — please
make them consistent and decide how the **operator** is described. Where it
appears in the app today:

- Terms of Service, Privacy Policy, Community Guidelines, Cottage Food Laws
  page: all in `src/components/LegalScreen.jsx` (about 40 mentions of "Plates").
- The signup consent sentence in `src/components/AuthScreen.jsx` and
  `src/components/SocialSetupScreen.jsx` ("I agree ... Plates is just a
  listing platform ...").
- "Plates Pro" (the seller subscription's name) in `ProfileScreen.jsx`,
  `SellerStorefront.jsx`, `SellerDashboard.jsx` / `ProCard.jsx`.
- Website: the privacy page is reachable at `passtheplates.app/?legal=privacy`
  and is the Privacy Policy URL given to Apple and Google.

### New questions

12. **Name and trademark.** Is "Pass the Plates" (and "Plates Pro") clear to
    use and worth registering? Searching the Apple App Store for the exact
    name found nothing, but no trademark search has been done.
13. **Operator disclosure.** Should the Terms and Privacy Policy name PASS THE
    PLATES LLC, with a mailing address and contact email? (A business email
    does not exist yet — the founder's personal email is used.)
14. **Money flowing through the app (new — monetization infrastructure was
    built this month but is switched off).** Planned: paid **featured
    listings** ($4.99 per week; Stripe on the web, in-app purchase on
    iOS/Android), a **Plates Pro seller subscription** (about $9/month,
    auto-renewing), and possibly **sponsored placements** (local-business
    ads clearly labeled "Sponsored"). Questions: (a) does charging sellers
    for promotion change the "just a listing platform" positioning in Terms
    §2? (b) California's **automatic renewal law** — what must the
    subscription terms, disclosures, and cancellation flow say? (c) refund
    policy for promotions; (d) ad-disclosure rules for the sponsored cards.
15. **Per-order fees and payments (not built; being considered).** One option
    is a flat fee charged to the buyer per order via Apple Pay / Google Pay
    while buyer and cook settle the food payment themselves. Does collecting
    any fee tied to individual food sales change the cottage-food exposure
    in question 2 or the Section 230 / "not a seller" analysis in question 6?
16. **Food trucks.** Sellers can now mark themselves as food trucks and post a
    manually updated location. Mobile food facilities usually need permits
    that home cooks do not — should the app require or at least prompt for
    that, and does hosting such listings add exposure?
17. **Account creation with Apple / Google.** Sign in with Apple and Google was
    added in October 2026; those new accounts accept the same 18+ / Terms
    checkbox on a first-run screen (`SocialSetupScreen`). Is that
    acceptance flow still sufficient (see question 10)?
18. **Email.** Account emails are sent from `no-reply@passtheplates.app` via
    Resend. Anything to add for commercial-email rules (CAN-SPAM) or the
    transactional vs. marketing split?

### Updated "future changes"

Payments are no longer hypothetical: the Terms' current "Payments & Refunds"
section (which says the app does not process payments) will need to be
rewritten **before any payment feature is switched on**. The go-live steps and
the switches that keep everything off are in `CHECKLIST.md`
("Payments & sponsors go-live").

