# App Store & Play Store privacy disclosures

Both stores make you fill out a structured form about what your app collects —
Apple's **App Privacy** ("nutrition label," in App Store Connect → your app →
App Privacy) and Google's **Data Safety** (Play Console → your app → Policy →
App content → Data safety). This document maps Plates' actual, verified data
handling onto each form's exact categories, so filling them out is a lookup,
not a research project.

**Source of truth:** the in-app [Privacy Policy](src/components/LegalScreen.jsx)
(Profile → Settings → Privacy Policy) is written in plain English but already
organized the way these forms ask for it. This document is that same
information translated into each store's specific checkboxes — verified
against the actual code, not just the policy text, as of the date below.

**Before you submit, re-check this against the live forms.** Apple and Google
both tweak these questionnaires' exact categories and wording over time — the
*data Plates collects* below is what matters and is verified against the code;
the *exact checkbox labels* are current as of when this was written and are
the part most likely to have shifted by the time you submit.

**Keep this updated.** Anything that changes what Plates collects — a payment
processor, an SMS provider for phone verification, a new third-party API —
needs a matching update here (and in the Privacy Policy itself) before your
next submission. A mismatch between what you declare and what the shipped app
actually does is itself a common rejection reason, and Apple has explicitly
started spot-checking this.

_Last verified against the codebase: 2026-09-06._

---

## Apple App Privacy

For each category Apple lists, three questions: **Do you collect it? Is it
linked to the user's identity? Is it used to track the user** (meaning: linked
with data from other companies' apps/sites/data brokers for advertising, or
shared with a data broker)?

**Tracking is "No" across every category below.** Plates has no advertising
SDK, no IDFA usage, and doesn't share data with data brokers — nothing here
crosses into Apple's definition of tracking.

| Category | Collected? | Linked to user? | Notes |
|---|---|---|---|
| **Contact Info** — Name | Yes | Yes | Profile name, required at signup |
| **Contact Info** — Email Address | Yes | Yes | Login identity |
| **Contact Info** — Phone Number | Yes | Yes | Optional — only if the user verifies their phone. Not shown to other users (they see a badge, not the number) |
| **Location** — Precise Location | **No** | — | Plates never requests device GPS |
| **Location** — Coarse Location | Yes | Yes | A neighborhood/zip name the user types, geocoded to an approximate point (not derived from the device) |
| **User Content** — Photos or Videos | Yes | Yes | Listing photos, profile photo, chat photos |
| **User Content** — Other User Content | Yes | Yes | Listing text, chat messages, reviews, reports filed |
| **User Content** — Customer Support | Yes | Yes | Reports filed against a listing/user go to admins |
| **Identifiers** — User ID | Yes | Yes | Supabase auth user id |
| **Identifiers** — Device ID | Yes | Yes | Push notification device token (web push subscription or native APNs/FCM token), only if the user enables push |
| **Usage Data** — Product Interaction | Yes | Partially | Page-view analytics (`analytics_events`) — linked to the account when logged in, anonymous for guests |
| **Diagnostics** — Crash Data | Yes | Partially | Client-side error logs (`client_errors`) — linked to the account when logged in, anonymous for guests (errors happen pre-login too) |
| **Diagnostics** — Performance Data | No | — | No performance/timing telemetry collected |
| Financial Info | **No** | — | No payment processing — orders are arranged and paid for outside the app |
| Health & Fitness | **No** | — | Not applicable |
| Sensitive Info | **No** | — | Not applicable |
| Contacts | **No** | — | No address book access |
| Browsing History | **No** | — | Not applicable |
| Search History | **No** | — | Browse search is a local filter, never sent anywhere |
| Purchases | **No** | — | No in-app purchase yet — revisit this row the moment Featured/Pro IAP ships (see "What changes" below) |
| Other Data | **No** | — | Not applicable |

## Google Play Data Safety

Play's form asks, per category: **collected, shared, and why.** "Shared" in
Play's specific sense means transferred to a third party for *that third
party's own purposes* — routing data to a processor that only acts on your
app's behalf (Supabase, Nominatim, MyMemory, Turnstile) generally doesn't
count as "sharing" under Play's own definition, only as "collected." None of
Plates' processors use the data for their own independent purposes, so
nothing below is marked "shared" — but read
[Google's own definition](https://support.google.com/googleplay/android-developer/answer/10787469)
yourself before answering that question, since getting it wrong either
direction is a real rejection/mislabeling risk.

| Category | Collected? | Shared? | Purpose |
|---|---|---|---|
| **Location** — Approximate location | Yes | No | App functionality (nearby listings, map pins) |
| **Location** — Precise location | **No** | — | Never requested |
| **Personal info** — Name | Yes | No | Account functionality |
| **Personal info** — Email address | Yes | No | Account functionality |
| **Personal info** — Phone number | Yes | No | Optional phone verification |
| **Photos and videos** | Yes | No | Listing/profile/chat photos |
| **Messages** — In-app messages | Yes | No | Buyer↔seller chat |
| **App activity** — In-app search history | **No** | — | Search never leaves the device |
| **App activity** — Other user-generated content | Yes | No | Listings, reviews, reports |
| **App activity** — App interactions | Yes | No | First-party page-view analytics, self-hosted (no third-party analytics SDK) |
| **App info and performance** — Crash logs | Yes | No | First-party error logging, self-hosted |
| **Device or other IDs** | Yes | No | Account id, push notification device token |
| Financial info | **No** | — | Not applicable |
| Health and fitness | **No** | — | Not applicable |
| Web browsing | **No** | — | Not applicable |
| Files and docs | **No** | — | Not applicable |

**Data safety practices** (the checklist at the bottom of Play's form):
- Data is encrypted in transit — **Yes** (HTTPS/TLS everywhere, via Supabase)
- Users can request data deletion — **Yes** — in-app (Profile → Settings →
  Account & security → "Delete my account") or by emailing support
- This is a marketplace app — most data is inherently visible to other users
  by design (listings, public profile, reviews); that's disclosed in the
  Privacy Policy itself, not something either store's form has a specific
  checkbox for

---

## Plain-English summary (for the "describe your data collection" free-text
box either console sometimes asks for, or for anyone reviewing this who
doesn't want the tables)

Plates collects account info (name, email, optional phone), user-generated
content (listings, photos, chat messages, reviews), an approximate
neighborhood-level location typed by the user (never device GPS), and basic
usage/error data to run and maintain the app. Nothing is sold, shared with
data brokers, or used for advertising or cross-app tracking. A handful of
narrowly-scoped processors (Supabase for hosting, Nominatim for geocoding
typed location text, MyMemory for on-demand chat translation, Cloudflare
Turnstile for signup bot-detection) each do one specific job and don't use
the data for anything of their own.

## What changes this document (update both this file and the Privacy Policy
when any of these ship)

- **Payments (Stripe Connect or similar)** — adds Financial Info collection/
  processing on both forms; the Terms of Service also needs another pass at
  that point (see CHECKLIST.md)
- **Phone verification going live (Twilio)** — phone number moves from
  "collected, not shared" to "collected, shared with Twilio" for the specific
  purpose of sending the verification code
- **In-app purchases (Featured/Pro via StoreKit/Play Billing)** — adds the
  Purchases category on Apple's form and payment info on Google's, plus
  whatever RevenueCat or the platform's own billing SDK discloses on its own
  privacy label (check its docs when it's integrated)
- **Any new third-party API call** (a new geocoding provider, a different
  translation service, an analytics SDK, a crash-reporting SDK) — add it to
  both this document and the Privacy Policy's "who we share it with" section
  the same day it's wired in, not as a later cleanup pass
