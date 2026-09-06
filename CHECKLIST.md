# Plates — setup & testing checklist

Check things off as you go. If something's already done, just leave it checked.

## Setup (run once)

- [x] `npm install` — picks up the map packages (leaflet, react-leaflet).
      Confirmed done — the map and every other feature have been running all
      session
- [x] Run `supabase/migration_chat_trigger.sql` in Supabase SQL Editor.
      Confirmed live earlier this session — a brand-new chat showed the
      canned "Hi! Thanks for your interest in the..." welcome message
- [x] Run `supabase/migration_location.sql` in Supabase SQL Editor. Confirmed
      via schema check — `profiles.neighborhood`/`lat`/`lng` all exist
- [x] Run `supabase/migration_available.sql` in Supabase SQL Editor.
      Confirmed via schema check — `listings.available` exists
- [x] Run `supabase/migration_restock.sql` in Supabase SQL Editor. Confirmed
      via schema check — `restock_alerts` table and `restock_counts` view
      both exist
- [x] Run `supabase/migration_unread.sql` in Supabase SQL Editor. Confirmed
      via schema check — `chats.buyer_last_read_at`/`seller_last_read_at`
      both exist
- [x] Run `supabase/migration_reports.sql` in Supabase SQL Editor. Confirmed
      via schema check — `reports` table exists
- [x] Run `supabase/migration_response_time.sql` in Supabase SQL Editor.
      Confirmed via schema check — `seller_response_stats` view exists and
      returns real rows
- [x] Run `supabase/migration_delivery.sql` in Supabase SQL Editor. Confirmed
      via schema check — `listings.delivery_available`/`delivery_notes`
      both exist
- [x] Run `supabase/migration_review_dimensions.sql` in Supabase SQL Editor.
      Confirmed via schema check — `reviews.taste_rating`/`portion_rating`/
      `value_rating` and the updated `seller_ratings` view all exist
- [x] Run `supabase/migration_pickup_slots.sql` in Supabase SQL Editor.
      Confirmed via schema check — `pickup_slots`, `pickup_reservations`,
      and `pickup_slot_counts` all exist
- [x] Run `supabase/migration_alerts.sql` in Supabase SQL Editor. Confirmed
      via schema check — `listing_alerts` and `notifications` tables exist
- [x] Run `supabase/migration_admin.sql` in Supabase SQL Editor. Confirmed
      via schema check — `profiles.is_admin`/`banned` exist (also implied
      by every later migration's `is_banned()` calls working all session)
- [x] Run `supabase/migration_growth.sql` in Supabase SQL Editor. Confirmed
      via schema check and live use — `listings.views`/`featured` and
      `profiles.referred_by` all exist, and referral tracking was just
      exercised live (3 real invited signups counted correctly)
- [x] Run `supabase/migration_unclaimed_stores.sql` in Supabase SQL Editor.
      Confirmed via schema check — `unclaimed_store_public` view and
      `listings.unclaimed_store_id` both exist
- [x] Run `supabase/migration_security_fixes.sql` in Supabase SQL Editor — closes 5
      gaps found in a full backend audit (self-promotion to admin/featured on
      signup, a banned account still being able to claim a store, self-reviewing by
      editing an existing review, and a store being deleted if its creator's account
      is deleted). None of these change how the app behaves normally — this is
      purely hardening, run it even on a database you've already set up. Re-run
      done — trigger/function logic isn't schema-verifiable, but it's idempotent
      and ran with no errors
- [x] Run `supabase/migration_photo_storage.sql` in Supabase SQL Editor — sets up
      real photo storage (two Storage buckets: `listing-photos` and `avatars`) so
      new photo uploads stop being saved as giant base64 text blobs in the
      database. Existing photos you've already uploaded keep working exactly as
      before — this only changes where *new* uploads go. This one was a genuine
      gap (a real upload attempt failed live with "Bucket not found" before this
      ran) — now confirmed fixed: re-tested both an avatar upload and a listing
      photo upload live, both succeeded with real `storage/v1/object/public/...`
      URLs
- [x] Run `supabase/migration_push_notifications.sql` in Supabase SQL Editor —
      adds the `push_subscriptions` table. On its own this just stores which
      devices have opted in; see "Push notifications setup" further down for
      the extra (non-SQL) steps needed to actually send pushes
- [x] Run `supabase/migration_push_webhook.sql` in Supabase SQL Editor — the
      SQL-only equivalent of a Database Webhook: fires the deployed
      `send-push` function every time a new row lands in `notifications`.
      See "Push notifications setup" further down for the rest of that setup
- [x] Run `supabase/migration_listing_schedules.sql` in Supabase SQL Editor — adds
      the recurring "Cook schedule" feature (Edit listing → Cook schedule /
      Listing page → 📅 Order ahead)
- [ ] Run `supabase/migration_area_alerts.sql` in Supabase SQL Editor — adds
      "📍 New listings near you" (Profile → below Push notifications), a
      location-based alert separate from the existing cuisine-follow alerts
- [x] Run `supabase/migration_seller_follows.sql` in Supabase SQL Editor — adds
      the ability to follow a specific seller/kitchen (Follow button on a
      storefront, "Kitchens you follow" list in Profile) and makes sure a
      buyer only gets one notification for a new listing even if they'd
      match through more than one path (seller-follow, cuisine, and area
      alert all at once)
- [x] Run `supabase/migration_orders.sql` in Supabase SQL Editor — adds the
      `orders` table (quantity, note, status) behind the new "Place an order"
      checkout flow and the "📦 My Orders" order-history screen
- [x] Re-run `supabase/migration_trending.sql` in Supabase SQL Editor — you've
      already run this once, but it's been updated to widen the view from top-5
      to top-20 and include each seller's lat/lng, behind the new "🔥 Trending
      near you" re-ranking (falls back to plain "This week's trending kitchens"
      when the viewer has no location set). Safe to re-run — just replaces the
      view definition
- [x] Run `supabase/migration_promotions.sql` in Supabase SQL Editor — adds
      the `promotion_requests` table behind the new seller "Request to be
      featured" flow and the admin "Promotions" review queue. Payment is
      still arranged manually off-platform for now (no Stripe charge yet) —
      approving a request just flips the listing's existing `featured` flag
- [x] Run `supabase/migration_order_notifications.sql` in Supabase SQL Editor —
      adds a trigger that nudges a buyer to rate the seller when their order
      is marked completed (reuses the existing in-app notifications, no new
      screen needed)
- [x] Run `supabase/migration_admin_stats.sql` in Supabase SQL Editor — adds
      an admin-only `get_platform_stats()` function behind the new "Stats" tab
      in Admin (total users/sellers/listings/orders, GMV, orders in the last
      7 days)
- [x] Run `supabase/migration_order_lifecycle.sql` in Supabase SQL Editor —
      adds a "ready for pickup" step to orders (pending → confirmed → ready →
      completed, or cancelled), a notification to the seller as soon as a
      buyer places an order, and a notification to the buyer every time the
      seller confirms, marks ready, marks completed, or cancels their order.
      Supersedes `migration_order_notifications.sql`'s trigger — safe to run
      even if you skipped that one
- [x] Run `supabase/migration_verified_reviews.sql` in Supabase SQL Editor —
      restricts leaving a new review to buyers who've actually completed an
      order with that seller, to prevent review-bombing or drive-by reviews.
      Existing reviews from before this migration are untouched
- [x] Run `supabase/migration_order_noshow.sql` in Supabase SQL Editor — adds
      a "no-show" status for pickups that never happened (a "No-show" button
      next to "Mark picked up" on orders that are "Ready for pickup"), sends
      the buyer a notification, and excludes no-shows from trending/GMV the
      same way cancelled orders already are
- [x] Run `supabase/migration_order_cart.sql` in Supabase SQL Editor — adds a
      `cart_id` column so one checkout can bundle multiple listings from the
      same seller into a single grouped order (paired with the new
      multi-item cart checkout on a seller's storefront)
- [x] Re-run `supabase/migration_trending.sql` in Supabase SQL Editor again —
      you've run this twice already; this update just excludes no-show
      orders from the trending score, matching how cancelled orders are
      already excluded. Safe to re-run
- [x] Run `supabase/migration_seller_extras.sql` in Supabase SQL Editor — adds
      a `profiles.on_vacation` flag behind the new "🏖️ Pause all listings"
      button on the Seller Dashboard, and updates the order-status trigger
      + RLS policy so a buyer can now cancel an order the seller already
      confirmed (not just while still pending) — the seller gets notified
      when that happens. This file includes a fix that was needed after the
      first version shipped (the old RLS policy only allowed cancelling
      "pending" orders, which silently blocked the new "cancel confirmed"
      button) — if you ran an earlier version of this file, just re-run it,
      it's idempotent
- [x] Run `supabase/migration_listing_enhancements.sql` in Supabase SQL
      Editor — three independent, optional additions to listings: extra
      gallery photos beyond the cover photo, a structured pickup date/time
      (alongside the existing free-text pickup note, not replacing it), and
      an optional stock count that auto-flips a listing to sold out at
      zero. None of them change how an existing listing behaves unless a
      seller actually uses the new field
- [x] Run `supabase/migration_email_notifications.sql` in Supabase SQL
      Editor — adds an email fallback for order-lifecycle notifications
      (new order, confirmed, ready, completed, cancelled, no-show) so
      buyers/sellers who haven't turned on push notifications still hear
      about it. Safe to run even before you've set up the email service —
      see "Email notifications setup" further down; without that, the
      email call just silently no-ops and the in-app notification still
      works as always
- [x] Run `supabase/migration_realtime.sql` in Supabase SQL Editor — turns
      on live updates (no manual reload needed) for chat messages, the
      notification bell, and order status on My Orders / Seller Dashboard.
      Uses the same row-level security policies that already control who
      can see what, so this doesn't expose anything new
- [x] Run `supabase/migration_broadcast.sql` in Supabase SQL Editor — adds
      a `broadcast_to_buyers` function behind the new "📢 Message your
      buyers" card on the Seller Dashboard, letting a seller send one
      message to everyone who's completed an order with them. This file
      includes a fix that was needed after the first version shipped (a
      bare `null` in the insert confused Postgres about which column type
      it was for) — if you ran an earlier version, just re-run it, it's
      idempotent
- [x] Run `supabase/migration_area_waitlist.sql` in Supabase SQL Editor —
      adds a `join_area_waitlist` function behind the new "📍 Not in your
      neighborhood yet?" card on Browse, letting a visitor (guest or
      logged in) leave an email to be notified once a cook joins their
      area. Went through a few iterations before landing — an early
      version used a direct table insert/upsert, which ran into a real
      Supabase gotcha (anonymous writes need a `security definer` function
      rather than relying on anon-role table grants + RLS lining up
      correctly, especially for upserts, which also need SELECT access
      just to check for a conflicting row). If you ran an earlier version
      of this file, just re-run the current one — it cleans up after
      itself
- [x] Run `supabase/migration_quantity_check.sql` in Supabase SQL Editor — a
      defense-in-depth trigger that rejects an order exceeding a listing's
      remaining stock, so two buyers racing for the last item can't both
      succeed (the checkout UI already caps the quantity stepper — this is
      the server-side backstop for that same limit)
- [x] Run `supabase/migration_order_fulfillment.sql` in Supabase SQL Editor —
      adds `fulfillment_method`/`delivery_address` columns to `orders`,
      behind the new Pickup/Delivery toggle at checkout (only shown when a
      listing has delivery enabled)
- [x] Run `supabase/migration_order_cutoff.sql` in Supabase SQL Editor — adds
      an optional `order_cutoff_hours` setting (Post/Edit listing, only shown
      once you've set a pickup date & time) letting a seller stop taking new
      orders some number of hours before pickup, enforced both in the
      checkout UI and as a database trigger
- [x] Run `supabase/migration_pickup_reminders.sql` in Supabase SQL Editor —
      schedules a `pg_cron` job (every 15 minutes) that notifies a buyer as
      their pickup window opens up within the next hour, for orders on
      listings with a structured pickup date/time. Reuses the existing push
      notification pipeline (inserting into `notifications` already fires a
      real push via `migration_push_webhook.sql`), so no separate deploy is
      needed. If the `create extension pg_cron` line errors, enable it first
      via Supabase Dashboard → Database → Extensions → search "pg_cron" →
      Enable, then re-run this file
- [ ] Run `supabase/migration_fulfillment_status_copy.sql` in Supabase SQL
      Editor — the "ready" order-status notification used to always say
      "is ready for pickup!" even for a delivery order; this makes that one
      line fulfillment-aware ("is out for delivery!" instead)
- [x] Run `supabase/migration_analytics.sql`, then `supabase/migration_analytics_rpc.sql`,
      in Supabase SQL Editor — replaces the old handful of lifetime totals on
      the admin Stats tab with a real KPI dashboard: growth charts,
      order-health breakdown, top sellers/listings, and
      waitlist-neighborhood growth opportunities. Adds one new table
      (`analytics_events`, a lightweight page-view log — the only genuinely
      new data collected; everything else is computed from data you already
      have) and six admin-only functions. Safe to run even though it
      replaces `get_platform_stats` — nothing in the app besides the admin
      Stats tab used it. (There's also a `migration_analytics_grant.sql` —
      skip it; it was a debugging step superseded by the RPC file, kept only
      for the record. Went through the same anon-write RLS/grant gotcha as
      the waitlist feature — page-view logging goes through a
      `security definer` function, same pattern as `join_area_waitlist`)
- [x] Run `supabase/migration_outreach.sql` in Supabase SQL Editor — adds a
      new "Outreach" tab in Admin for tracking manual seller recruiting:
      you find a home cook selling food on Facebook Marketplace/Nextdoor/
      Craigslist/etc., message them yourself from your own account (there's
      a copyable message template right there), and log the lead so you're
      not losing track across dozens of manual DMs. Nothing here sends
      anything automatically or scrapes any other site — it's purely a
      tracker for outreach you do by hand. Admin-only table, same
      direct-CRUD RLS pattern as `unclaimed_stores` (not the anon-write
      pattern that needed the RPC workaround above)
- [x] Run `supabase/migration_pickup_code.sql` in Supabase SQL Editor — adds
      a 4-digit pickup code to each order (one shared code per cart
      checkout). Buyers see it on their order once it's confirmed/ready;
      sellers enter it before marking a pickup order picked up, with a
      "mark picked up anyway" fallback for when a buyer can't produce it.
      Pickup orders only — delivery orders don't get a code. This is a
      soft in-person trust check, not a real security gate (a seller can
      always skip it), so it needs nothing beyond this one column
- [x] Run `supabase/migration_phone_verification.sql` in Supabase SQL
      Editor — adds a `phone_verified` boolean to profiles and a trigger
      that flips it on whenever someone completes phone verification. Safe
      to run now even before you set up an SMS provider (see "Phone
      verification setup" below) — the "Verify your phone" card in Profile
      will just show an error toast when someone tries to send a code
      until that's done
- [ ] In Supabase Dashboard → Authentication → URL Configuration, set **Site URL**
      to `http://localhost:5173` (your dev server address) — needed for the
      forgot-password email link to redirect back into the app correctly
- [x] Run `supabase/migration_broadcast_followers.sql` in Supabase SQL
      Editor — widens a seller's "Message your buyers" broadcast to also
      reach people who follow their kitchen, not just people with a
      completed order. Replaces the `broadcast_to_buyers` function; nothing
      else changes
- [x] Run `supabase/migration_cancellation_reason.sql` in Supabase SQL
      Editor — adds an optional `cancellation_reason` column to orders and
      updates the order-status trigger so that reason (when someone types
      one) shows up in the other side's cancellation notification/email
- [x] Run `supabase/migration_default_pickup_note.sql` in Supabase SQL
      Editor — adds an optional `default_pickup_note` column to profiles
      behind a "Usual pickup note" field in Edit profile, which pre-fills
      the pickup note every time that seller posts a new listing
- [x] Run `supabase/migration_seller_weekly_earnings.sql` in Supabase SQL
      Editor — adds a `get_seller_weekly_earnings()` function behind a new
      "Your earnings (last 8 weeks)" bar chart on the Seller Dashboard
- [x] Run `supabase/migration_review_replies.sql` in Supabase SQL Editor —
      adds `seller_reply`/`seller_reply_at` columns to reviews and a
      `reply_to_review` function, behind a "+ Reply" button a seller sees
      on their own reviews (public, shown to everyone who sees the review)
- [x] Run `supabase/migration_chat_photos.sql` in Supabase SQL Editor — adds
      a `photo_url` column to messages (a `chat-photos` Storage bucket,
      public like the existing listing-photos/avatars ones) behind a 📷
      button in chat that lets a buyer/seller attach a photo to a message
- [x] Run `supabase/migration_fix_admin_list_users.sql` in Supabase SQL
      Editor — fixes a real bug found live during this sweep: Admin → Users
      search failed on every single search with "structure of query does not
      match function result type" (Postgres error 42804). `auth.users.email`
      is `varchar(255)`, not `text`, and `admin_list_users()`'s declared
      return type didn't match — Postgres enforces an exact type match for
      `RETURNS TABLE` columns, so this failed on every call since the
      function was first created, not just after some recent change. Fix is
      a `u.email::text` cast. Confirmed fixed live — search now returns
      results instead of erroring
- [x] Run `supabase/migration_seller_trust_stats.sql` in Supabase SQL Editor —
      adds a `seller_trust_stats` view combining order completion rate,
      no-shows, and ratings into one "🏆 Top rated" badge (in the spirit of
      Etsy's Star Seller), shown on a seller's storefront/listing/profile once
      they've completed 5+ orders at a 90%+ completion rate, 4.5+ average
      rating from 3+ reviews, and zero no-shows. Purely additive — doesn't
      change the existing "🌱 New neighbor" / "🌟 Community favorite" badges,
      just adds a higher tier above them. Confirmed live — view returns
      correct computed rows via direct query and via the app's own client
      call
- [x] Run `supabase/migration_listing_subscriptions.sql` in Supabase SQL
      Editor — adds a `listing_subscriptions` table and a daily `pg_cron` job
      behind a new "🔁 Make this a recurring order" option at checkout (weekly
      or every 2 weeks). No in-app payment involved — the buyer still pays the
      seller directly each time, this just auto-places the repeat order and
      notifies both sides; a sold-out/vacationing/deleted listing gets skipped
      with a notification instead of erroring. If the `create extension
      pg_cron` line errors, enable it first via Supabase Dashboard → Database
      → Extensions → search "pg_cron" → Enable, then re-run this file.
      Confirmed live — placed a real recurring order end-to-end (checkbox →
      Weekly → order placed with correct "repeats every week" toast → shows
      up in Profile under "🔁 Your recurring orders" with the right next-date
      → Cancel button removes it)
- [x] Run `supabase/migration_input_limits.sql` in Supabase SQL Editor — found
      during a stress-test pass: nothing in the app enforced a max length on
      any free-text field (listing title/description, chat messages, review
      comments, order notes, profile bio), and `listings.price` had no floor
      at all — a crafted request could set a negative price. This adds
      server-side length/range checks matching the new client-side limits so
      the constraint holds even for someone bypassing the UI and calling the
      API directly. Confirmed live — ran clean against existing data
- [x] Run `supabase/migration_feature_batch.sql` in Supabase SQL Editor —
      adds: `listings.allergens_confirmed` (seller-confirmed allergen info),
      `listings.min_order_amount` (optional seller minimum), `orders.buyer_marked_paid`/
      `seller_marked_paid` + `mark_order_paid()` RPC ("Mark as paid" recordkeeping,
      no real payment processing), a `neighborhood_leaderboard` view (top
      kitchens by completed orders in the last 30 days), and an
      `admin_broadcast()` RPC (admin → all/sellers/buyers/one-neighborhood
      in-app notification blast). Confirmed live — all new columns/objects
      exist and every feature built on top of them works end-to-end (see
      "Things to check" below)
- [ ] Make yourself the first admin — in the SQL Editor, run (with your real login
      email):
      ```sql
      update public.profiles set is_admin = true
      where id = (select id from auth.users where email = 'you@example.com');
      ```
      Nobody can grant admin through the app itself (there's no admin yet to grant
      it), so this one has to be done by hand, once, in the SQL Editor.
- [ ] Open [src/lib/siteInfo.js](src/lib/siteInfo.js) and replace the placeholder
      `SUPPORT_EMAIL` with a real inbox you check — it's shown on the suspended-account
      screen and both legal pages
- [ ] Re-enable email confirmation — this is a toggle in the Supabase dashboard, not
      something I can flip from code. In your project: **Authentication → Providers →
      Email**, turn on **"Confirm email"** (some dashboard versions call this
      **Authentication → Sign In / Providers → Email OTP/Confirm email**; look for a
      toggle literally named "Confirm email"). With it on, a brand-new signup won't
      get a session until they click the link in their confirmation email — the app
      already shows "Check your email for a confirmation link, then log in." in that
      case, so no other setup is needed. Double-check the **Site URL** step above is
      still set correctly, since that's where the confirmation link sends people back to.

Each migration file is standalone and safe to run — none of them touch or delete
existing data. Do **not** re-run `schema.sql` on your live database, only use
that one for a brand-new/empty Supabase project. Paste each file into
Supabase → SQL Editor → New query → Run.

## Automated tests (new — run these instead of clicking through everything by hand)

A starter test suite now exists, using [Vitest](https://vitest.dev) (a fast
test runner built for Vite projects) and React Testing Library. It's not
full coverage of the app — nothing here touches Supabase or the browser —
just a first layer that checks the pure logic and a couple of components
directly, so regressions in that logic get caught automatically instead of
only during manual click-through testing.

- [x] `npm test` — runs the suite once and exits (20 tests across 5 files,
      all passing as of this batch)
- [x] `npm run test:watch` — re-runs tests as you edit files, useful while
      actively working on something covered by a test
- [x] Covers: `groupOrders` (cart grouping logic), `getSellerBadge`
      (New neighbor / Community favorite thresholds), `distanceMiles` /
      `formatDistance` (nearest-sort math), `OrderCard` (renders the
      right buttons for each role/status combination, including the
      cancel-a-confirmed-order and reorder additions from recent batches),
      and `AreaWaitlistCard` (pre-fills neighborhood, submits, shows the
      confirmation state, refuses an empty email)
- Nothing to run in Supabase for this — `.env.test` holds harmless
  placeholder Supabase credentials just so importing a file that happens
  to touch the Supabase client doesn't crash during tests; it's not a real
  project and nothing in the test suite talks to a network

## Push notifications setup (bigger lift — do this separately, whenever you're ready)

Everything above is a SQL paste. This one's different: real push notifications
need a small server-side function running outside the app (nothing in this
project can send a push directly from the browser — that's how push
notifications work everywhere, not a Plates-specific limitation). The
function code is already written (`supabase/functions/send-push/index.ts`)
and the Supabase CLI is already installed in this project (`npx supabase`).

- [x] `npx supabase login` — done
- [x] `npx supabase link --project-ref pexmyasywfqkswpblmrq` — done
- [x] VAPID push encryption keys generated and set as Supabase secrets
      (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). The public
      key in `src/lib/push.js` matches what's on the server. The private key
      only lives in Supabase's secret store, never in a file in this project
- [x] Function deployed: `npx supabase functions deploy send-push --no-verify-jwt`
      — live at `https://pexmyasywfqkswpblmrq.supabase.co/functions/v1/send-push`
- [x] Wired up via `supabase/migration_push_webhook.sql` (a SQL-only stand-in
      for a Database Webhook — fires automatically on every new row in
      `notifications`, no dashboard menu-hunting needed)
- [x] Confirmed the full pipeline server-side: placed a real order (which
      inserts a notification), then checked
      `select * from net._http_response order by id desc limit 3;` in the
      SQL Editor — showed `status_code 200`, `content ok`, proving the
      trigger fired and the function ran successfully end-to-end
- [ ] Last step — actually receive a push on a real device (this can't be
      done from an automated test browser; browsers permanently remember a
      "block" decision per site, and the way I tested above already forced
      that in this project's dev-testing browser). On your **own** phone or
      laptop, in a normal browser tab: open the app, go to your profile, tap
      "Turn on" under "🔔 Push notifications", and allow the permission
      prompt. Then, from a second account, follow a cuisine you're not
      already following, and post a listing in that cuisine from a third
      account (or have someone else do it) — confirm a real OS-level
      notification pops up, not just the in-app bell badge

## Mobile app store setup (bigger lift — multi-week project, not a single sitting)

Plates was a pure web app with no native wrapper at all until this point.
Getting it onto the Apple App Store and Google Play — plus real in-app
purchases for Featured/Pro — is a genuinely large, multi-part project with
real-world prerequisites (developer accounts, paid enrollment, installed
tooling) that can't be shortcut. Laying out exactly where things stand so
nothing gets lost.

**Important distinction, easy to get wrong:** food orders do NOT need Apple/
Google in-app purchase — Apple and Google both explicitly exempt real-world
physical goods/services from their IAP requirement (the same exemption Uber
Eats, DoorDash, and Etsy rely on), so food payment stays exactly as it is
today (arranged outside the app). Featured listings and Plates Pro are
different — those are digital platform perks, and Apple/Google **do**
require those to go through their own in-app purchase systems (StoreKit /
Google Play Billing) if sold from inside the native app. Shipping a digital
purchase via Stripe/manual billing inside a native app instead of IAP is one
of the most commonly enforced app store rejection reasons there is.

- [x] Capacitor wrapper scaffolded — `@capacitor/core`, `@capacitor/cli`,
      `@capacitor/ios`, `@capacitor/android` installed; `capacitor.config.
      json` created (`appId: com.yourplatesapp.app` — a placeholder, same
      convention as the `SUPPORT_EMAIL`/`SITE_URL` placeholders already in
      `lib/siteInfo.js`; this needs to be a real bundle ID/package name you
      pick once you're registering the app in each console, and it has to
      match exactly in both consoles and this config). `ios/` and
      `android/` native project folders generated via `npx cap add ios` /
      `npx cap add android` and committed (their build artifacts — Pods,
      Gradle caches, the synced web-asset copies — are gitignored, not the
      project files themselves). New npm scripts: `npm run cap:sync`
      (rebuilds the web app and copies it into both native projects),
      `npm run cap:ios` / `npm run cap:android` (sync + open in Xcode /
      Android Studio). Confirmed working as far as this machine allows:
      `npx cap add ios`, `npx cap add android`, and `npx cap sync` all ran
      clean with no errors
- [x] Both platforms now genuinely proven end-to-end, not just scaffolded —
      Xcode 26.6 and Android Studio 2026.1 installed (you did the Xcode
      part yourself — Mac App Store sign-in and the `sudo xcode-select`/
      license steps both need your own credentials, which I never touch).
      **iOS:** iOS 26.5 Simulator runtime installed, the real Plates
      project built clean (`xcodebuild ... BUILD SUCCEEDED`), installed
      and launched on a simulated iPhone 17 Pro — a screenshot confirmed
      the actual onboarding screen rendering correctly, not a blank
      WebView. **Android:** this one hit a real compatibility snag worth
      knowing about — Android Studio's bundled JDK is Java 25, which the
      Capacitor-generated project's Gradle version (8.14.3) doesn't
      support yet (`Unsupported class file major version 69`). Fixed by
      installing Eclipse Temurin JDK 21 (LTS) alongside it — if you ever
      open this project directly in Android Studio's own UI instead of
      the command line and hit the same error, point its Gradle JDK
      setting (Settings → Build Tools → Gradle) at a JDK 21, not the
      bundled one. Also installed the Android SDK command-line tools,
      platform 36 (matching `android/variables.gradle`), build-tools,
      and an emulator system image (none of this ships with a fresh
      Android Studio install — its own first-run setup wizard would
      normally fetch it, but doing it via `sdkmanager` sidestepped that
      GUI flow entirely). Built the real APK (`./gradlew assembleDebug`
      — `BUILD SUCCESSFUL`), booted a Pixel 7 emulator (`Plates_Test`
      AVD, API 36), installed and launched it — a screenshot confirmed
      the same onboarding screen rendering correctly there too
- [ ] Apple Developer Program enrollment ($99/yr, developer.apple.com) —
      your identity/payment, has to be you
- [ ] Google Play Console account ($25 one-time, play.google.com/console)
      — same, has to be you
- [ ] Once both exist: create the app record in App Store Connect and Play
      Console (this is where the real, final bundle ID/package name gets
      locked in — update `capacitor.config.json`'s `appId` to match before
      building for real)
- [ ] Configure the actual IAP products: Featured listing as a consumable
      (repurchased each time), Plates Pro as an auto-renewing subscription
      — in both App Store Connect and Play Console, with matching
      product IDs
- [ ] Integrate a purchase SDK against those products (RevenueCat is worth
      seriously considering over raw StoreKit2 + Play Billing — it wraps
      both platforms in one API and handles receipt validation, which is
      genuinely fiddly to build correctly from scratch) and wire its
      server-side webhook to flip `profiles.is_pro` / `listings.featured`
      the same way the manual admin toggle does today, so both paths
      (manual billing on web, IAP on mobile) land in the same place
- [ ] App Store Review Guideline 4.2 risk: Apple has gotten stricter about
      rejecting apps that are "just a wrapped website" with nothing native
      about them. Worth leaning on native-feeling things Plates already
      has the plumbing for — real push notifications, camera-based photo
      upload, the native share sheet (`lib/share.js`) — once this is
      actually running in Xcode/Android Studio
- [ ] Guideline 5.1.1(v) (Apple requires in-app account deletion, not just
      an email request) — already satisfied, "Delete my account" already
      exists in Profile → Account & security

## Phone verification setup (optional — do this whenever you're ready)

The "Verify your phone" card already shows up in everyone's Profile and the
`phone_verified` column/trigger are already in place. What's missing is an
SMS provider — Supabase doesn't send texts itself, it needs a provider
plugged in, and that provider charges a small amount per text (a few cents
each, roughly). Skip this section for now if you'd rather come back to it —
nothing else depends on it, sending a code will just show a "could not send
a code" error until it's configured, and the rest of the app works fine.

- [ ] Sign up for a [Twilio](https://www.twilio.com/try-twilio) account
      (free trial credit is enough to test with) and grab a phone number to
      send from
- [ ] From your Twilio Console, note your **Account SID**, **Auth Token**,
      and the **Messaging Service SID** (or the phone number itself)
- [ ] In Supabase Dashboard → Authentication → Providers → Phone, turn on
      the Phone provider and select **Twilio**, then paste in those three
      values
- [ ] Test it: in the app, go to Profile → "Verify your phone", enter your
      own real cell number, tap "Send code," confirm a real text arrives,
      and enter the code to confirm the "✓ Phone verified" state shows up
      and a "📱 Phone verified" badge appears on your public profile /
      seller card

## Social share previews setup (optional — only matters once you've deployed)

Tapping "Share" on a listing always copies a working link. Whether that
link unfurls into a rich card (photo/title/price) when pasted into
Messages/Slack/social, or just shows as a bare URL, depends on the two
things below. Nothing breaks if you skip this — it just falls back to a
plain link.

- [x] Edge function deployed: `npx supabase functions deploy share-listing
      --no-verify-jwt` — live at
      `https://pexmyasywfqkswpblmrq.supabase.co/functions/v1/share-listing`
- [x] `SITE_URL` secret set on the function (currently the placeholder
      `https://yourplatesapp.com`)
- [ ] Once you've actually deployed the app somewhere public (see "Deploy
      live" under Not built yet), update **both** of these to your real
      domain — they have to match:
      - [src/lib/siteInfo.js](src/lib/siteInfo.js)'s `SITE_URL` constant
      - the `SITE_URL` secret: `npx supabase secrets set
        SITE_URL=https://your-real-domain.com`, then re-deploy the function
        so it picks up the new value
      Until you do this, the Share button copies a plain in-app link
      instead (still works for anyone who already has the app open or
      installed — it just won't show a preview photo/price card when
      pasted elsewhere)

## Email notifications setup (optional — do this whenever you're ready)

Order updates already work in-app and via push. This adds email as a third
channel, for buyers/sellers who won't turn on push — most people. Skip this
section entirely for now if you'd rather come back to it later; nothing
else in the app depends on it, and the database triggers already call the
email function safely either way (it just no-ops until this is set up).

- [x] `send-email` edge function deployed — live at
      `https://pexmyasywfqkswpblmrq.supabase.co/functions/v1/send-email`
- [x] Wired into the order triggers via `migration_email_notifications.sql`
      — fires on new order, confirmed, ready, completed, cancelled, and
      no-show, the same events that already trigger a push notification
- [ ] Sign up for a free [Resend](https://resend.com) account (no credit
      card needed for the free tier — 100 emails/day, 3,000/month) and
      create an API key from their dashboard
- [ ] Set it as a secret: `npx supabase secrets set
      RESEND_API_KEY=re_your_key_here`
- [ ] (Optional, but recommended) Verify your own domain in Resend so
      emails come from your address instead of Resend's shared sandbox
      one. Until you do, emails send from `onboarding@resend.dev`, which
      works but looks less trustworthy to recipients and Resend's sandbox
      domain has stricter sending limits. Once verified, set: `npx
      supabase secrets set "FROM_EMAIL=Plates <orders@your-domain.com>"`
- [ ] Test it: place a real order between two test accounts and confirm an
      actual email arrives (not just the in-app notification)
- [ ] Run `supabase/migration_winback.sql` in Supabase SQL Editor. Sets up a
      daily pg_cron job that nudges buyers who've gone quiet for 21+ days
- [ ] Run `supabase/migration_cottage_law.sql` in Supabase SQL Editor. Adds
      `listings.cottage_law_confirmed`

## Things to check

Use two accounts (a "buyer" and a "seller") for anything involving messaging.

- [ ] Post a new listing and see it show up in Browse
- [ ] Favorite / unfavorite a listing
- [ ] Message a seller from a different account (should be blocked on your own listings)
- [ ] Leave a star rating for a seller
- [ ] Edit one of your own listings
- [ ] Delete one of your own listings
- [ ] Edit profile — add a name, bio, and photo
- [ ] Edit profile — set a neighborhood/zip, confirm it saves without errors
- [ ] Browse tab → Map view shows a pin for any account with a neighborhood set
- [ ] Mark one of your own listings as sold — confirm buyers see "sold out"
- [ ] From a buyer account, tap "Notify me when back in stock" on a sold listing
- [ ] Mark that listing available again (seller account) — buyer should get an automatic message
- [ ] Unread badge appears on the Messages tab + chat row when a new message arrives
- [ ] Opening a chat clears its unread badge
- [ ] On the login screen, tap "Forgot password?", enter your email, and confirm you get a reset email
- [ ] Click the reset link in that email — should land you on a "Set a new password" screen
- [ ] Set a new password and confirm you're logged in with it afterward
- [ ] Browse tab → with your profile location set, tap "📍 Nearest" — listings should
      re-sort closest-first (only shows up once your own profile has a saved location)
- [ ] Check the browser tab shows the new plate icon (favicon) instead of the old
      purple default one, and the tab title reads "Plates — homemade food nearby"
- [ ] Log out and confirm the login screen shows the new plate logo above "Plates"
- [ ] Open any listing that isn't yours and tap "🚩 Report this listing" — fill out
      a reason and submit, confirm you see the "Thanks for letting us know" screen
- [ ] Browse tab → with your profile neighborhood set, confirm the small
      "🏘️ X neighbors sharing food in [neighborhood]" line appears above the search bar
- [ ] Send a handful of back-and-forth messages between a buyer and seller account,
      then check a listing from that seller — after ~3+ replies you should see an
      "⚡ Usually replies within..." badge next to their name
- [ ] A brand-new seller with zero reviews should show a "🌱 New neighbor" badge on
      their listings; a seller with 5+ reviews averaging 4.8★+ should show
      "🌟 Community favorite" instead
- [ ] Post a new listing — pick a cuisine and a couple of diet tags, confirm they save
- [ ] Browse tab → "Vegan" and "Baked goods" filter pills now actually work (they
      match the cuisine/diet you set on a listing)
- [ ] Post/edit a listing — check "I can also deliver this" and add a delivery note,
      confirm a listing page shows "🚗 Delivery available" with your note
- [ ] Open a listing that isn't yours and rate the seller — you should see three
      separate pickers (Taste, Portion size, Value for price) instead of one star row;
      confirm an overall star average still shows up on their profile/listing
- [ ] Edit one of your own listings → add a pickup slot (date, start/end time, optional
      max spots)
- [ ] From a buyer account, open that listing → under "📅 Reserve a pickup time" tap
      "I'm coming" on the slot, confirm it flips to a confirmed state; if you set a
      max spots number, confirm it shows spots remaining and goes to "Full" once maxed out
- [ ] From your profile, tap a cuisine under "🔔 Get notified about new listings" to
      follow it
- [ ] From a different account, post a new listing in that same cuisine — the
      following account should see a 🔔 badge appear on the bell icon in the top bar;
      opening it shows a "New [cuisine] listing near you" notification that jumps to
      the listing when tapped
- [ ] Make sure two accounts both have a neighborhood/location set (Edit profile),
      close enough that they'd show up as "Nearest" to each other. From one, turn on
      "📍 New listings near you" in Profile. From the other account, post a new
      listing in a cuisine the first account is *not* already following — confirm
      the first account still gets a "New listing near you" notification (this is
      the location-based path, separate from the cuisine-follow one above)
- [ ] Confirm you don't get *two* notifications for the same listing if you're both
      following its cuisine and have area alerts on — should just be one
- [ ] Turn off wifi/data briefly and try loading the app — you should see a small
      toast pop up near the bottom ("Could not load listings…") instead of a silent
      failure
- [ ] Favorite a listing, edit a listing, mark one sold/available, and delete a
      listing — each should show a brief confirmation toast ("Listing updated.",
      "Marked as sold out.", "Listing deleted.", etc.)
- [ ] Reload the Browse or Chats tab on a slow connection — you should briefly see
      shimmering placeholder cards/rows instead of a flash of "No listings yet" /
      "No messages yet" before the real content loads
- [ ] Tap between tabs and open a listing — screens should gently fade/rise in
      instead of popping in instantly; buttons and cards should visibly "press down"
      slightly when tapped
- [ ] On a phone, open the site in the browser and check for an "Add to Home Screen"
      option (iOS Safari: Share → Add to Home Screen; Android Chrome: menu → Install
      app) — it should use the Plates icon and open full-screen without browser
      chrome, confirming the new PWA manifest is working
- [ ] Force an error (e.g. temporarily break something) to confirm the app shows the
      friendly "Something went wrong" screen with a reload button instead of a blank
      white page — optional/dev-only check, safe to skip if unsure how
- [ ] Sign up with a brand-new account and confirm you can't submit without checking
      "I agree to the Terms of Service and Privacy Policy" — tap those links and
      confirm the actual pages open (readable before you even have an account)
- [ ] From your profile, confirm "Terms of Service", "Privacy Policy", and "Community
      Guidelines" links at the bottom all open and show real content
- [ ] Once you've made yourself an admin (see Setup above), confirm a "🛡️ Admin"
      button appears next to "Log out" on your profile — on a normal (non-admin)
      account it should not appear at all
- [ ] From a second (non-admin) account, report a listing — switch to your admin
      account, open Admin from your profile, and confirm the report shows up under
      "open" with the reporter's name, the listing title, and the reported seller's
      name
- [x] From the admin panel, tap "Ban user" on that report — confirm it shows
      "(banned)" next to their name; switch to that banned account and confirm you're
      immediately shown a "Account suspended" screen with just a log-out button
      instead of the normal app. Confirmed live
- [x] While still logged in as that banned account (if you can get back into it
      before banning, or by checking a different unbanned account trying the same
      thing), confirm a banned account can't post a new listing, start a new chat, or
      leave a review — trying should fail. Confirmed live — the suspended screen has
      no navigation off it at all (just Log out), so every in-app action is blocked
      by construction, not just these three
- [x] From the admin panel, tap "Unban user" — confirm that account can use the app
      normally again. Confirmed live
- [x] From the admin panel, tap "Remove listing" on a reported listing — confirm it
      disappears from Browse. Confirmed live — listing count dropped and the title
      no longer appeared anywhere after a reload
- [x] From the admin panel, tap "Mark resolved" / "Dismiss" on a report and confirm
      it moves out of the "open" filter tab into "resolved" / "dismissed". Confirmed
      live for both actions and all four filter tabs (open/resolved/dismissed/all)
- [ ] Open a listing that isn't yours, go back, then reopen it from your own profile
      as the seller — confirm the "👁️ X views" line under "Edit listing" went up (it
      only counts views from people other than the seller)
- [ ] From your profile, check "👁️ X total views across your listings" appears once
      you have at least one listing
- [ ] As an admin, open a listing that isn't yours and tap "⭐ Feature this listing
      (admin)" — confirm it now shows a "✨ Featured" badge on its card in Browse and
      sorts to the top (unless "📍 Nearest" is on); tap it again to unfeature. A
      non-admin viewing the same listing should not see this button at all
- [x] From the admin panel → Users tab, search for a user by (part of) their name or
      email, then Ban/Unban and Make admin/Remove admin from there directly — this
      should work even for a user nobody has reported yet. This uncovered a real bug
      (see `migration_fix_admin_list_users.sql` in Setup) — search failed on every
      call before the fix. Confirmed fixed and fully working live: search returns
      the right user, and Ban/Unban/Make admin/Remove admin all work directly from
      the search result row
- [ ] From your profile, tap "Copy invite link" under "🎉 Invite your neighbors" —
      open that link in a private/incognito window and confirm it goes straight to
      the sign-up form with a "You were invited by a neighbor" note; after that
      account signs up, your profile should show "1 neighbor has joined from your
      invite so far"
- [x] As an admin, open Admin → Stores and create a new store (a name is enough,
      but try adding a kitchen description, neighborhood, and a contact note like
      "Message via Facebook: fb.com/example") — confirm it shows up in the list as
      "Unclaimed". Confirmed live
- [x] From the Sell tab (as that same admin), confirm a "Posting for (admin)"
      dropdown appears above the photo field with "Myself" plus the store you just
      created — pick the store and post a listing. Confirmed live
- [x] Back in Admin → Stores, tap "Copy claim link" on that store, then open the link
      in a private/incognito window — confirm it lands on sign-up with a "Sign up or
      log in to claim your store" note. Confirmed the link format and copy action
      live; opened it while already logged in (rather than a fresh private window),
      which exercised the "existing account clicks a claim link" path instead —
      see the claim-flow note below
- [x] Finish signing up on that claim link — confirm a toast says you've claimed the
      store, and that the listing you posted earlier now shows under that new
      account's own profile/listings, with "Message seller to order" now working
      normally (no more "Not yet on Plates" badge). Confirmed live, but via an
      already-logged-in account clicking the link (not a brand-new signup) — the
      claim succeeded, the store flipped to "Claimed," and the listing moved into
      that account's own "Your listings" / stats immediately. The brand-new-signup
      path through this same code was already proven earlier this project (Setup
      section, claim-link resilience work) — not re-tested end-to-end this pass
- [x] Try opening the same claim link a second time (or from a third account) —
      confirm it fails with a clear "already been claimed" style error instead of
      silently doing something wrong. Confirmed live — "This store has already been
      claimed." toast, no partial/broken state
- [x] From Admin → Stores, confirm "Delete store" is only offered for stores that
      haven't been claimed yet (claimed ones don't need it — they're just a normal
      seller from that point on). Confirmed live — the "Delete store" button is
      simply absent from a claimed store's admin row
- [ ] Once you've turned on "Confirm email" (see Setup above), sign up a brand-new
      account and confirm you see "Check your email for a confirmation link, then log
      in." instead of being dropped straight into the app; confirm the email arrives,
      and clicking its link lands you back in the app logged in
- [ ] With email confirmation on, repeat the "Copy claim link" test above but this
      time actually click the link in the confirmation email (rather than just
      logging in): confirm the store still gets claimed correctly even though the
      `?claim=` link took you through your inbox and back
- [ ] From your profile, open "Terms of Service" and confirm there's now a
      "Payments & refunds" section explaining Plates doesn't process payments yet and
      how to report a problem
- [ ] As an admin, post a listing for an unclaimed store (Sell tab → "Posting for"),
      then check your own profile — confirm that listing does NOT show up under
      "Your listings" or count toward your "Listings posted" / total-views stats
      (it belongs to the store, not to you)
- [ ] With that same unclaimed-store listing posted, check the Browse tab's
      "🏘️ N home cooks on Plates" line — confirm it counts the store as its own
      entry rather than folding it into your own seller count
- [ ] From Admin → Users, ban or unban your own admin account — confirm the app
      reacts immediately (shows the "Account suspended" screen if you banned
      yourself, or the "🛡️ Admin" button disappears if you removed your own admin)
      rather than requiring a reload to notice
- [x] Post a new listing with a photo — confirm it uploads (button says
      "Uploading…" briefly), the preview shows up, and posting works. Open your
      Supabase project → Storage → `listing-photos` bucket and confirm a new file
      shows up under a folder named with your user id. This uncovered a real bug:
      the `listing-photos`/`avatars` buckets didn't actually exist yet (upload
      failed live with "Bucket not found") — `migration_photo_storage.sql` had
      never been run. Fixed by running it, then re-confirmed live: a real listing
      photo upload succeeded with a `storage/v1/object/public/listing-photos/...` URL
- [x] Edit an existing listing's photo the same way — confirm "Change photo" works.
      Confirmed live as part of the fix above — "Add a photo" correctly switched
      to "Change photo" after a successful upload
- [x] From Edit profile, upload an avatar photo — confirm it uploads and shows up
      in the `avatars` Storage bucket the same way. Confirmed live as part of the
      fix above — real `storage/v1/object/public/avatars/...` URL, image rendered
- [ ] Edit one of your own listings → under "Cook schedule", add a standing day
      (e.g. "Every Tuesday", a time window, optional max orders per week) — confirm
      it shows up in the list with "+ Add to schedule"
- [ ] Open that listing from a different (buyer) account — confirm a
      "📅 Order ahead" section appears showing the next few upcoming dates for that
      weekday (not just today), tap "Order this date" on one, confirm it flips to
      "✓ Ordered"; if you set a max-orders cap, confirm it shows spots left and
      goes to "Full" once maxed out for that specific date
- [ ] Confirm ordering ahead into *next* Tuesday and *this* Tuesday (if applicable)
      are tracked as separate reservations — canceling one shouldn't affect the other
- [x] Open a listing that isn't yours and tap the seller's name — confirm it opens
      their public storefront (avatar, badge, rating, all their listings, and any
      reviews people have left them). Tap "Share profile", confirm the link copies.
      Confirmed live
- [ ] From your own profile, tap "View public profile" — confirm it's the same
      storefront but shows "Copy profile link" instead of "Share profile"
- [x] From a storefront, tap into one of the listings, then tap back — confirm it
      returns you to the storefront, not straight to Browse. Confirmed live
- [x] Log out, then open your app's URL with `?seller=<any-seller's-user-id>`
      appended — after logging back in, confirm it opens that seller's storefront
      directly (their user id is visible in the Supabase `profiles` table, or just
      use a link copied from the app itself). Confirmed live — a fresh page load
      with `?seller=<id>` in the URL opens straight to that storefront; the "Share"
      button on a storefront produces exactly this link format
- [ ] Clear your browser's local storage for the app (or just open it in a fresh
      private/incognito window and sign in) — confirm you see the 3-screen welcome
      walkthrough before the normal app appears; confirm "Skip" and "Get started"
      both dismiss it and it doesn't show again on reload
- [x] Open a seller's storefront (tap their name from a listing) and tap "+ Follow"
      — confirm it switches to "✓ Following"; tap it again to confirm it unfollows.
      Own storefront ("View public profile" from your own Profile) should not show
      a Follow button at all
- [x] From your profile, confirm a "👩‍🍳 Kitchens you follow" section appears once
      you've followed at least one seller, listing their name/neighborhood; tap a
      kitchen to confirm it opens their storefront, and tap "Unfollow" to confirm
      it disappears from the list
- [x] From a followed seller's account, post a new listing — confirm the following
      account gets a notification naming that seller directly (not the generic
      cuisine/area wording). Confirmed via the trigger SQL
      (`handle_new_listing_alert_matches` in schema.sql) rather than a fresh live
      click-through this pass: a seller-follow match produces
      `"{seller name} just posted: {title}"`, distinct from the cuisine wording
      (`"New {cuisine} listing near you: ..."`) and the area wording
      (`"New listing near you: ..."`)
- [x] If that same buyer also follows the seller's cuisine and/or has area alerts on
      and would match all three ways, confirm they still only get one notification
      for that listing, not two or three. Confirmed via the same trigger — it
      unions all three match paths (seller-follow priority 1, cuisine priority 2,
      area priority 3) then picks exactly one row per user with
      `distinct on (user_id) ... order by user_id, priority`, so a triple-match
      always collapses to the seller-follow wording, never a duplicate
- [x] Browse tab → search for something that only appears in a listing's
      description or diet tags (not its title/seller/cuisine) — confirm it now
      shows up in results. Confirmed live for both description-only and
      diet-tag-only search terms
- [x] Browse tab → search two words that only both appear together in one listing
      (e.g. a dish name plus a seller's first name) — confirm only that listing
      matches, not every listing that matches just one of the words
- [x] Browse tab → with a search term active, confirm results are ordered with the
      closest/strongest text matches first rather than in random order. Confirmed
      via code (not a fresh live ranking test this pass) — `relevanceScore()` in
      BrowseScreen.jsx weights a title match at 3, cuisine at 2, and
      seller/description/diet at 1 per matching word, and results are sorted by
      that score whenever a search term is active
- [x] Open a listing that isn't yours — confirm you see the seller's avatar, name,
      neighborhood, badge, and kitchen bio right on the listing page (no need to
      navigate away), with a "+ Follow" button and a "See reviews" link
- [x] Tap "See reviews" on that card — confirm it expands to show their reviews (or
      "No reviews yet.") in place, and tapping it again collapses it
- [x] Tap the seller's avatar/name within that card — confirm it still opens their
      full storefront page (for browsing all their listings or sharing the link)
- [x] Open one of your own listings — confirm there's no Follow button or seller
      card shown (you can't follow yourself)
- [x] Log out (or open the app in a private/incognito window) — confirm Browse,
      listing pages, and seller storefronts all still work without logging in,
      and the top bar shows a "Log in" pill instead of your avatar
- [x] As a guest, tap the heart on a listing, tap Follow, tap "Message seller to
      order", or tap the Saved/Sell/Chats/You tabs — confirm each one opens the
      login screen (with a "← Continue browsing" link back) instead of erroring
      or silently doing nothing
- [x] Log in from that prompted login screen (or tap "← Continue browsing" to
      back out) — confirm either way lands you back where you were, not on a
      broken screen
- [x] As a guest, open `?seller=<id>` or a listing link — confirm it opens
      directly without requiring login first
- [x] Open a listing that isn't yours (while logged in) — confirm a "Place an
      order" card appears with a quantity stepper and an optional note, instead
      of a plain "Message seller to order" button
- [x] Place an order — confirm it jumps you into a chat with the seller showing
      an auto-generated "🛒 New order" message with the quantity/price/note, and
      a "Order placed!" toast appears
- [x] From your profile, tap "📦 My Orders" — confirm the order you just placed
      shows up under "Orders you placed" with the right quantity, note, total,
      and a "Pending" badge
- [x] Tap "Cancel order" on a pending order you placed — confirm it flips to a
      "Cancelled" badge and the action buttons disappear
- [ ] From the seller's account, open "📦 My Orders" — confirm the same order
      shows up under "Orders to fulfill" with "Confirm" and "Cancel" buttons;
      tap "Confirm" and confirm it flips to "Confirmed" with a "Mark completed"
      button in its place
- [ ] Tap "Mark completed" — confirm it flips to a "Completed" badge; switch back
      to the buyer account and confirm their copy of the same order also shows
      "Completed"
- [ ] On a listing that isn't yours, tap "Just have a question? Message the
      seller" (below the order form) — confirm it opens a normal chat without
      creating an order
- [x] Have at least one recent order, favorite, or review (within the last 7
      days) on a couple of different sellers, then check Browse (as a guest
      too) — confirm "🔥 This week's trending kitchens" shows up with rank
      badges 1-5 in a horizontally scrollable row, and tapping a card opens
      that seller's storefront
- [x] With no recent activity on any seller, confirm the trending row simply
      doesn't appear (no empty/broken section)
- [x] Open one of your own listings that isn't already featured — confirm a
      "🌟 Get more eyes on this listing" card appears with a "Request to be
      featured" button; tap it and confirm it flips to a "⏳ Promotion request
      sent" state
- [x] As an admin, open Admin → Promotions — confirm the request you just sent
      shows up with the seller's name and listing title; tap "Approve" and
      confirm it disappears from the queue. Confirmed live
- [x] Back on that listing (as the seller), confirm it now shows "✨ This
      listing is currently featured" instead of the request button, and that
      it shows up featured/sorted-to-top in Browse like an admin-featured
      listing does. Confirmed live — showed a stale "not featured" state until
      a page reload, then correctly showed the "✨ Featured" badge and sorted to
      the top of Browse (the listings list in the browser tab just hadn't been
      refetched since the admin action — not a bug, same pattern as any other
      admin action taken from a different screen)
- [ ] Submit another promotion request from a different listing, then as admin
      tap "Reject" instead — confirm it disappears from the queue without
      featuring the listing (not re-tested this pass — `rejectPromotionRequest`
      in lib/promotions.js is a simpler subset of the same approve code path,
      just a status update with no `setListingFeatured` call, so it's lower-risk
      than approve, which was tested)
- [x] Try requesting a promotion twice in a row on the same still-pending
      listing — confirm the button is already gone/replaced by the "pending"
      state, so a duplicate request can't be sent
- [x] Open a listing, go back to Browse — confirm a "👀 Recently viewed" row
      appears above the main grid with that listing in it; open a couple more
      to confirm it fills in (newest first, capped at 6) and never includes
      whichever listing you're currently viewing
- [x] Complete (not just place) orders from the same seller 2+ times — confirm
      a "🔁 Ordered N times" badge appears on their seller card / storefront
      once you have 2+ *completed* orders with them (pending/cancelled ones
      don't count); confirm it does NOT appear after only 1, and never
      appears on your own listings
- [x] Mark an order "Completed" (seller side) — confirm the buyer gets a new
      notification ("...is complete — leave a rating?") that jumps to the
      listing when tapped, same as any other notification
- [ ] With your profile location set, check Browse — confirm the trending row
      now reads "🔥 Trending near you" (not "This week's...") when at least
      one trending seller is within ~25 miles, and that nearby sellers are
      listed before farther-away ones
- [ ] Clear your profile location (or use an account with none set) — confirm
      the row falls back to the plain "🔥 This week's trending kitchens"
      wording and ranking
- [x] From Profile, confirm "📊 Seller Dashboard" only appears once you have at
      least one listing posted; open it and confirm the stat cards (listings,
      views, rating), the "orders needing attention" list, and the per-listing
      featured/pending badges all match what you'd expect
- [x] From the dashboard's order list, confirm Confirm/Cancel/Mark
      ready/Mark picked up buttons work the same as they do in "My Orders"
      (it's the same component) and reflect immediately without needing a
      reload
- [x] As an admin, open Admin → Stats — confirm total users/sellers/listings/
      orders, GMV (completed orders only), and last-7-days order count all
      show up and look plausible; confirm a non-admin account gets an error
      if you try calling this directly (it's not exposed in their UI at all)
- [x] As a seller, confirm you get a notification the moment a buyer places a
      new order ("[buyer] ordered Nx [listing]") — not just the auto-message
      in Chats
- [x] Walk an order through pending → Confirm → Mark ready → Mark picked up
      (seller side) — confirm the buyer gets a distinct notification at each
      step ("...has been confirmed", "...is ready for pickup!", "...is
      complete — leave a rating?"), and confirm there's no Cancel option once
      an order is marked ready
- [x] As a seller, Cancel an order while it's pending or confirmed — confirm
      the buyer gets a "...was cancelled" notification
- [x] As a buyer, cancel your own pending order — confirm you do NOT get a
      "was cancelled" notification for your own action (you already know).
      Confirmed via the trigger SQL rather than a fresh live click-through this
      pass — the buyer-facing "was cancelled" branch explicitly requires
      `auth.uid() <> new.buyer_id`, so it never fires when the buyer is the one
      cancelling; a separate branch notifies the *seller* instead, but only if
      the order had already reached "confirmed" (a still-pending cancel notifies
      no one, since nothing was in motion yet)
- [x] Open a listing from a seller you've never ordered from — confirm you see
      "Complete an order from this seller to leave a rating." instead of the
      rating form
- [x] Open a listing from a seller you have a *completed* order with —
      confirm the rating form shows and actually saves successfully
- [ ] If you already had reviews in the database from before this migration,
      confirm they're still visible and still editable (grandfathered), even
      if that reviewer has no completed order on record
- [x] Add 2+ different listings from the same seller to your cart via "+ Add"
      buttons on their storefront, confirm the floating cart bar shows the
      item count and running total, then tap "Place order" — confirm one
      combined chat message is sent listing every item ("🛒 New order:"
      followed by one line per item)
- [x] From the seller's account (Seller Dashboard or My Orders), confirm that
      multi-item order shows as ONE card listing every line item with a
      combined total, not as separate orders
- [x] Walk that grouped cart order through Confirm → Mark ready → Mark picked
      up — confirm every line item moves together each time (there's no way
      to move one item without the others)
- [x] Check the buyer's notifications after that walk — you'll get one
      notification per line item at each step (e.g. two "...has been
      confirmed" for a 2-item cart) rather than one combined notification;
      this is a known simplification, not a bug
- [x] On a "Ready for pickup" order, tap "No-show" instead of "Mark picked
      up" — confirm it flips to a "No-show" badge and the buyer gets a
      "...was marked as a no-show" notification
- [x] Confirm a no-show order does not count toward "🔥 Trending near you" /
      "This week's trending kitchens" the same way a cancelled order doesn't.
      Confirmed via the `trending_sellers` view definition — its order-scoring
      CTE has `where status not in ('cancelled', 'no_show')`
- [x] Open a listing, tap "Share" — confirm a "Link copied!" toast appears.
      Paste the link in a new tab: confirm it opens straight to that
      listing's detail page (works logged out too)
- [x] As a seller with 2+ listings, open Seller Dashboard — confirm a
      "💰 $X · This week · N orders" line appears showing your actual
      completed-order total and count from the last 7 days
- [x] From the Seller Dashboard, tap "🏖️ Pause all listings" — confirm it
      flips to "🏖️ On vacation — tap to resume", and a toast confirms it.
      Check Browse (as a buyer or guest) — every listing from that seller
      now shows a "🏖️ Away" badge instead of its usual tag, and opening one
      shows "This kitchen is away right now" instead of the order form.
      Tap the button again — confirm it flips back to "🏖️ Pause all
      listings" with a "Welcome back" toast
- [x] After resuming from vacation, confirm listings go back to normal in
      Browse (badge disappears) — and if a listing had separately been
      marked sold out before you went on vacation, confirm it still shows
      "Sold" after resuming, not "Away" (the two states are tracked
      separately on purpose). Confirmed via code rather than a fresh live
      click-through this pass — ListingCard.jsx computes
      `sold = manuallySold || sellerOnVacation` and
      `away = sellerOnVacation && !manuallySold`, so a manual sold-out flag is
      completely independent of the vacation flag and always wins the display
      priority when both are true
- [x] With 2+ pending orders on the Seller Dashboard, confirm a "Confirm all
      pending" button appears next to "Orders needing attention"; tap it and
      confirm every pending order flips to "Confirmed" at once
- [x] As a buyer, open an order that's "Confirmed" (not just "Pending") in
      My Orders — confirm a "Cancel order" button now appears; tap it and
      confirm it flips to "Cancelled" and the seller gets a notification
      ("[buyer] cancelled their order for [listing]") — cancelling a still-
      "Pending" order should NOT notify the seller (same as before)
- [x] As a buyer, open a "Completed" order in My Orders — confirm an "Order
      again" button appears; tap it and confirm it re-places the same
      item(s) at the listing's current price and drops you into the chat
      with the seller, same as a normal checkout
- [x] Tap "Order again" on an order where the listing has since sold out or
      the seller has gone on vacation — confirm you get an error toast
      instead of a broken/incomplete order. Confirmed via code rather than a
      fresh live click-through this pass — `reorderGroup` in App.jsx explicitly
      checks `i.listing.available === false || i.listing.sellerOnVacation`
      before placing anything and shows "This seller has sold out or is away
      right now." if either is true, before any order is created
- [x] Post a new listing — set a pickup date and start/end time in the new
      "Pickup time" fields, plus a quantity in "How many available?" —
      confirm it posts successfully, the listing card shows "Only N left"
      (or "None left" at zero), and the detail page shows a formatted
      "Thu, Aug 20 · 4 PM–6:30 PM" style pickup window instead of raw text
- [x] With quantity tracking on, place an order for exactly the remaining
      count — confirm the listing automatically flips to "Sold" (no manual
      toggle needed), and re-check the listing card/detail page reflect it
- [x] Add 2-3 "More photos" on a listing (Post or Edit) — confirm you can
      remove one before posting, and once posted, the listing detail page
      shows a swipeable photo strip instead of a single static photo. Confirmed
      via code rather than a fresh live file-upload test this pass —
      `PhotoGalleryPicker.jsx`'s `removePhoto()` filters the removed URL out of
      the array before posting (each thumbnail has its own "✕" button), and
      `ListingDetail.jsx` renders the cover photo plus every extra photo in a
      `overflow-x-auto snap-x snap-mandatory` strip with `snap-center` images —
      a standard, correctly-built CSS scroll-snap gallery
- [x] Edit an existing listing and clear the quantity field back to blank —
      confirm it goes back to manual sold-out toggle behavior. Confirmed via
      code — the field's own label says "leave blank to toggle sold out
      manually," and EditListing.jsx converts a blank string to `null` on save
      (`form.quantityAvailable === '' ? null : Number(...)`), at which point the
      "Mark as sold / Mark as available" toggle is the only thing controlling
      availability again
- [x] Open a chat and leave it on screen. Have the other person (or a
      second account) send a message — confirm it appears immediately
      without reloading or leaving/reopening the chat
- [x] With the notification bell showing some count, have an order you're
      involved in change status (confirmed, ready, etc.) from the other
      side — confirm the bell badge count updates on its own, without a
      reload
- [x] With My Orders or the Seller Dashboard open, have an order's status
      change from the other side — confirm the card's status badge (and
      button row) updates live in place, without a reload
- [ ] Open the same account in two tabs/devices at once and confirm actions
      in one (e.g. sending a message) show up in the other without
      reloading either — the two-account tests above prove the underlying
      mechanism works, but this specific same-account-two-tabs case hasn't
      been clicked through
- [x] Open one of your own listings → Edit listing → tap "🔁 Repost" —
      confirm a fresh copy is posted (same title/price/photo/etc, 0 views)
      and it shows up alongside the original under "Your listings" /
      "More from [seller]"
- [x] From the Seller Dashboard, tap "📢 Message your buyers", write
      something, and send — confirm a "Sent to N past buyer(s)" toast
      appears (or "You don't have any past buyers yet" if you have none),
      and that buyer gets a notification reading "[your name]: [message]"
- [x] On Browse, pick a filter chip (e.g. "Vegan") and switch to Map view,
      then reload the page — confirm both choices are still selected
      afterward instead of resetting to "All" / List
- [x] As a guest or with no neighborhood set, confirm the stat line above
      search now reads "🏘️ N home cooks · M dishes up for grabs" instead
      of just the cook count
- [x] From Profile, tap "🌓 Appearance" → Dark — confirm the whole app
      (cards, search bar, nav bar, filter chips, chat bubbles) switches to
      a dark palette, not just the background. Tap Light to switch back,
      and System to follow your OS setting. Reload the page — confirm your
      choice persists
- [ ] On your phone (real device, not this checklist's usual desktop
      testing), tap "Share" on a listing or a seller's storefront — confirm
      your phone's native share sheet opens (Messages, WhatsApp, Mail,
      etc.) instead of just copying a link. On a desktop browser without
      share-sheet support (most of them), confirm it still falls back to
      copying the link with a "Link copied!" toast, exactly like before —
      the desktop fallback path is confirmed working already; the native
      share sheet itself hasn't been tested on a real phone yet
- [x] Set your profile's neighborhood to somewhere with zero listings
      (e.g. a made-up name) — confirm a "📍 No cooks in [neighborhood] yet"
      card appears on Browse with the neighborhood pre-filled, submit an
      email, and confirm it flips to "✓ You're on the list!"
- [ ] As a guest (logged out) on a fresh browser with literally zero
      listings on the whole platform, confirm the "No listings yet — be
      the first to post one!" empty state also shows a (blank, no
      pre-fill) waitlist card underneath — not yet clicked through, since
      this project's test database always has listings in it
- [x] As an admin, confirm you can see submitted waitlist emails by
      querying the table directly in the SQL Editor (`select * from
      area_waitlist order by created_at desc;`) — there's no dedicated
      admin UI screen for this yet, intentionally kept out of scope
- [x] On a listing with "How many available?" set to e.g. 2, try to order 3
      — confirm the quantity stepper won't go past 2 and shows "2
      available". Verified both the UI cap and the database trigger
      directly (placed a real order to zero out the stock, then confirmed
      a follow-up order attempt gets rejected with "Only 0 left — someone
      may have just ordered ahead of you.")
- [x] Post a listing with "I can also deliver this" checked — as a buyer,
      open it and confirm a Pickup/Delivery toggle appears above the note
      field, with an address box that shows up (and is required) once
      Delivery is selected. Confirm the seller's chat summary and the
      order card both show "🚗 Delivery to: [address]". Verified on the
      single-item checkout flow; the seller storefront's multi-item cart
      has the identical toggle but wasn't separately clicked through
- [x] Post a listing with a pickup date/time set today, and set "Stop
      taking orders __ hours before pickup" to a large number (e.g. 999) so
      it's already past cutoff — confirm the listing page shows "Orders
      have closed for this pickup window." instead of the order form.
      Also confirmed the database rejects a direct order attempt on such a
      listing with the same message
- [x] Confirm an order on a listing with a pickup date set for today shows
      up in "🍳 Today's prep list" on the Seller Dashboard once you (as the
      seller) confirm it — quantities should sum per listing title
- [ ] Pickup reminders run on a 15-minute timer server-side, so there's
      nothing to click through live — confirm the job is scheduled by
      running `select * from cron.job where jobname = 'pickup-reminders';`
      in the SQL Editor and checking `select * from cron.job_run_details
      order by start_time desc limit 5;` after it's had a chance to fire
      once
- [x] Order flow cleanup pass (a UX audit found delivery orders were
      inheriting pickup-only language, two screens both let a seller act on
      the same order, and Cancel/No-show had no confirm step). Verified live:
      a delivery order at the "ready" stage shows an "Out for delivery" badge
      and a single "Mark delivered" button (no "No-show", which doesn't apply
      to delivery); a same-stage pickup order still correctly shows "Ready
      for pickup" / "Mark picked up" / "No-show" side by side. In My Orders,
      "Orders to fulfill" is now read-only history with a "Manage in Seller
      Dashboard →" link — all seller actions (Confirm/Cancel/Mark ready/etc.)
      now live only in Seller Dashboard. Tapping "No-show" or "Cancel"
      shows an inline "This can't be undone" confirm step before it commits.
      Not separately re-tested: "Order again" reusing the original delivery
      address (code path is the same as normal checkout, just fed different
      inputs — low risk, trust the code)
- [ ] Visual pass: flat bordered boxes across the whole app were replaced
      with a shared elevated-card style (soft shadow instead of a flat
      outline, via new `--shadow-card`/`--shadow-float` tokens in
      index.css), plus bigger stat numbers and small colored icon badges on
      Seller Dashboard and Profile. Confirmed live in dark mode (Seller
      Dashboard, Browse). Also confirmed live in light mode (Browse, Profile,
      Seller Dashboard, listing detail) — shadows, icon badges, and stat
      hierarchy all render correctly with no dark-mode-only artifacts
- [x] PWA installability — new `public/icon-180.png` / `icon-192.png` /
      `icon-512.png` (generated from the existing plate favicon), wired into
      `manifest.json` and `index.html`'s apple-touch-icon. The service
      worker now registers on every page load instead of only when someone
      opts into push, which most browsers require for the "Add to Home
      Screen" prompt to show up. Confirmed live: manifest serves the new
      icons, the SW registration is active. Not tested: the actual install
      prompt/home-screen icon on a real phone — try "Add to Home Screen"
      from your phone's browser menu next time you're on the deployed site
- [x] Bundle size: the map (Leaflet) and the admin screen now load on
      demand instead of shipping in everyone's first page load — confirmed
      via `npm run build`, main JS chunk dropped from ~760KB to ~585KB
      (map is a separate ~161KB chunk, admin a separate ~16KB chunk)
- [x] New sellers see a "🚀 Getting started" checklist on Profile (add a
      photo, set your neighborhood, post your first listing) that
      disappears once all three are done. Confirmed live — showed 1/3 done
      on a test account with listings but no photo/neighborhood, and
      tapping an unchecked item correctly opened Edit profile
- [x] As an admin, open Admin → Stats — confirm you see an Overview grid
      (total/active users, GMV, avg order value, completion rate, repeat
      buyer rate, signup conversion), three "Growth (last 12 weeks)" bar
      charts (new users / new listings / GMV — hover a bar for the exact
      week and value), an "Order health" bar (completed / open / cancelled
      &no-show), and — once there's enough data — Top sellers, Top listings,
      and 📍 Growth opportunities (waitlist neighborhoods with no seller
      yet) sections. The last three sections just don't render when there's
      nothing to show yet, which is expected on a fresh/test database
- [x] Page views are logged automatically as you use the app (every tab
      switch, plus opening the login/signup screen) — after clicking around
      for a bit, confirm the Overview's "Signup conversion" sub-line shows a
      non-zero "N signup views," and check `select event_type, metadata,
      created_at from analytics_events order by created_at desc limit 20;`
      in the SQL Editor to see raw events coming in
- [x] As an admin, open Admin → Outreach — confirm you see the copyable
      message template, a form to log a lead (name, how to reach them,
      what they're selling, platform), and status filter chips (Not
      Contacted / Contacted / Interested / Declined / Joined! / All).
      Confirmed live: adding a lead shows it under "Not Contacted";
      changing its status via the dropdown moves it to the right filter
      tab; typing in Notes and clicking "Save notes" shows a confirmation
      toast and keeps the text; "Remove" deletes it with a confirmation
      toast. This tab is purely a manual tracker — nothing sends messages
      or scrapes any other site, you do the outreach yourself and log it here
- [x] Place a pickup order (not delivery) between two test accounts, confirm
      it as the seller, then mark it ready — the buyer's order card should
      show a highlighted 4-digit "Show this code at pickup" code. As the
      seller, tap "Mark picked up" — confirm it opens a code-entry panel
      instead of completing immediately; typing the wrong code shows "That
      code doesn't match"; typing the right code (from the buyer's card)
      marks the order completed. Also confirm "Can't get the code? Mark
      picked up anyway" completes the order without a code. Delivery
      orders should skip all of this and go straight to "Mark delivered"
- [x] In Profile, confirm the "📱 Verify your phone" card shows up (until
      phone verification is set up per the section above, expect "Send
      code" to fail with an error toast rather than crash anything — that's
      expected). Once Twilio's configured, verifying a real number should
      flip the card to "✓ Phone verified" and show a "📱 Phone verified"
      badge on that seller's listing pages and public profile
- [ ] As a seller with at least one follower (not just a past buyer), open
      Seller Dashboard → "Message your buyers" and send a test message —
      confirm the follower gets a notification too, not just people who've
      ordered before. A repeat customer who also follows should only get
      one notification, not two. Confirmed live with a follower-only test
      account (never ordered) — they received the broadcast, and the
      recipient count correctly deduped a repeat customer who also follows
- [x] On Browse, confirm the filter row now has a chip for every cuisine
      (Homemade, Bakery, Mexican, Italian, Indian, Chinese, Middle Eastern,
      Caribbean, Southern / Soul food, Desserts, Other) plus Vegan and
      Under $15 — tapping a cuisine chip should show only listings tagged
      with that cuisine. Confirmed live: "Homemade" correctly matched
      every test listing (they all default to that cuisine), "Mexican"
      correctly showed "No listings match your search"
- [x] Place an order, then cancel it (as either the buyer or the seller)
      and type a short reason before confirming — the other side's
      notification should include that reason after an em dash. Cancelling
      with the reason field left blank should still work and just show the
      plain "was cancelled" message like before. Confirmed live both
      directions: a buyer's blank-reason cancel still completed cleanly,
      and a seller's "Sold out — ran out of ingredients" reason showed up
      verbatim in the buyer's notification
- [x] Notifications now use the same soft-shadow card look as every other
      list in the app (was the one place still using the old flat-border
      style). Confirmed live — no unread dot/bold treatment was added
      alongside it, since opening the Notifications screen already marks
      everything read immediately (existing behavior) before the list
      renders, so a per-row unread indicator would never actually be
      visible; the bell icon's unread count badge is still the real signal
- [x] Post a listing, then on the "Listing posted" confirmation screen
      confirm a "Make something on a schedule?" card appears with an "Add
      pickup times or a schedule" button — tapping it should open that
      exact listing's Edit page (not some other listing), and "Back" from
      there returns to a blank Sell form (same as tapping the Sell tab
      normally — expected, not a bug). Confirmed live with a real new
      listing
- [x] On Seller Dashboard, confirm each listing under "Your listings" has
      a small ✏️ edit icon — tapping it should open that listing's Edit
      page directly, and "Back" from there returns to the Dashboard (not
      a blank Sell form). Confirmed live
- [x] As a guest, confirm the login wall's message changes based on what
      you tapped — Saved tab says "Log in to see what you've saved.", Sell
      tab says "Log in to start selling.", saving a listing's heart says
      "Log in to save this listing.", and the profile avatar says "Log in
      to view your profile." — instead of the same generic line everywhere.
      Confirmed live for all three
- [x] As a seller with 2+ listings and some completed orders in the last 8
      weeks, open Seller Dashboard — confirm a "Your earnings (last 8
      weeks)" bar chart appears below the "This week" summary card; with no
      completed orders in that window, confirm the chart just doesn't render.
      Confirmed live: chart was absent while GMV was $0.00, then appeared
      with a bar for the current week right after completing a real order
- [x] Leave a review for a seller, then log in as that seller and open their
      storefront/listing — confirm a "+ Reply" button appears under your own
      review; tap it, type a reply, and save — confirm it shows as "Seller
      reply" under the review for anyone viewing it (including the reviewer
      and other buyers), and "Edit reply" lets you change or clear it.
      Confirm a *different* seller viewing that same review does not see a
      Reply button. Confirmed live on both the storefront and the inline
      listing-page seller card: reply posted and showed on both surfaces,
      and the reviewing buyer's own view showed the reply read-only with no
      Reply/Edit button
- [x] From Edit profile, set a "Usual pickup note" and save — post a new
      listing and confirm the pickup note field is pre-filled with it (still
      editable per-listing); clear the profile field and confirm new
      listings go back to a blank pickup note. Confirmed live on two
      separate seller accounts — the pickup note field read back the exact
      saved value on the Sell form before any edits
- [x] Open a chat and tap the 📷 button — pick a photo, confirm a small
      preview appears above the input with a "Remove" option, then send it
      — confirm the photo shows inline in the chat bubble (with or without
      accompanying text). Confirm the other person sees it appear live
      without reloading. Confirmed live: preview + Remove worked, sent photo
      rendered inline in its own bubble with the caption below it — reuses
      the same realtime INSERT listener already proven for text messages,
      not separately re-verified for the live cross-account push
- [x] Get 3 neighbors to join from your invite link — confirm a
      "🎉 Community Builder" badge pill appears next to the referral count
      on your profile (not before 3). This is a non-monetary milestone
      badge, not a credit or discount — no payment infrastructure involved.
      Confirmed live: badge was absent at 0 referrals, appeared immediately
      after the 3rd invited signup alongside "3 neighbors have joined from
      your invite so far"
- [x] Complete 5+ orders from the same test seller account at a 90%+
      completion rate (no no-shows), with 3+ reviews averaging 4.5+ — confirm
      a "🏆 Top rated" badge appears on their storefront, listing page, and
      profile, above the existing "🌱 New neighbor" / "🌟 Community favorite"
      badges, along with a "X% completion · N orders" line on the storefront.
      Confirmed live: seeded "Batch5 Seller" with 5 completed orders (0
      no-shows) and 3 reviews averaging 4.7, which correctly rendered the
      badge on the listing page ("🏆 Top rated" next to "★ 4.7 · 3") and on
      the storefront ("🏆 Top rated", "★ 4.7 (3)", "100% completion ·
      5 orders"). An account below the thresholds (4 completed/1 no-show)
      was already confirmed to correctly NOT show it. That seeded test data
      has since been deleted
- [x] From Profile, open Terms of Service and Community Guidelines — confirm
      both now mention carrying liability insurance as a seller, and that
      "Meeting up safely" / the indemnification section still read correctly
      alongside the new text. Confirmed live: Terms §4 recommends general
      liability insurance and notes some cottage-food/homeowners policies can
      be extended to cover home food sales; §11 (liability) and §12
      (indemnification) both read correctly around it
- [x] Open a listing without a structured pickup date/time, tap into the
      order form, check "🔁 Make this a recurring order," pick Weekly, and
      place the order — confirm the toast mentions the weekly repeat, and
      that a "🔁 Your recurring orders" section appears in Profile showing
      that listing, the seller's name, and a "next" date about a week out.
      Tap "Cancel" on the subscription from Profile and confirm it
      disappears. Confirmed live: checkbox + interval picker rendered on
      "Cuisine tag test tacos" (no pickup date), order placed with toast
      "Order placed! It'll repeat every week until you cancel it from your
      profile.", Profile showed "Cuisine tag test tacos · Referral Test One
      · 1x every week · next Aug 27" (7 days out), and Cancel removed the row
      immediately
- [ ] Once a subscription exists, confirm `select * from cron.job where
      jobname = 'listing-subscriptions';` in the SQL Editor shows the daily
      job scheduled — the actual auto-placement can't be watched live without
      waiting for `next_order_date` to arrive, so this just confirms the job
      exists rather than exercising a real automatic order
- [x] Stress-test pass: rapid-clicked "Place order" 3x in the same instant —
      found a real bug (2 duplicate orders from 3 clicks) caused by React
      state not updating synchronously between clicks, so the
      `if (submitting) return` guard didn't catch the second click before the
      first one's state change landed. Fixed with a `useRef` guard in
      [PlaceOrderForm.jsx](src/components/PlaceOrderForm.jsx) (refs update
      immediately, state doesn't), and applied the same fix to chat message
      sending in [ChatThread.jsx](src/components/ChatThread.jsx) since it had
      the identical gap. Confirmed live — re-ran the same 3x rapid-click test
      after the fix and got exactly 1 order, not 2
- [x] Stress-test pass: rapid-clicked the quantity "+" stepper 150x on an
      unlimited-stock listing — confirmed it correctly caps at 99 (new hard
      ceiling added in this pass) instead of climbing indefinitely
- [x] Stress-test pass: typed a 130-character listing title and an
      out-of-range price (-50 and 999999) — confirmed the browser's native
      form validation correctly blocks submission on both (100-char cap,
      $0–$10,000 range)
- [x] Load test: seeded 200 extra listings (214 total) and confirmed Browse
      still loads fast, search stays instant, and scrolling has no visible
      jank. Noted for later (not fixed — not needed at today's ~14 real
      listings): `fetchListings()` has no pagination, so the full listings
      table gets fetched and rendered unbounded on every Browse load. Revisit
      this once real listing count climbs into the hundreds+
- [x] Map redesign — the Browse "Map" view used Leaflet's stock OpenStreetMap
      tiles and default blue teardrop pins, which looked like a bolted-on
      third-party widget next to the rest of the app's custom design. Swapped
      to CARTO's light/dark basemap tiles (auto-switches with the app's own
      dark mode), replaced the default pins with circular seller-photo (or
      initial-letter) medallions in the app's forest-green, and restyled the
      zoom controls to match the rounded, elevated-card look used everywhere
      else. Confirmed live in both light and dark mode, including the popup
      styling and a sold-out-seller pin state
- [x] Feature-batch pass ("lets do them all" — admin mass-message, restock
      nudge, seasonal collections, allergen confirmation, mark-as-paid,
      seller minimum order, recommendations, neighborhood leaderboard).
      Confirmed live:
      - Posted a real listing with the allergen checkbox ticked and a $20
        minimum — both persisted correctly, and the listing page shows
        "✓ Confirmed by seller" next to the allergen tags
      - "🎒 Back to school" seasonal strip rendered automatically (today's
        date falls in its Aug 1–Sep 15 window) showing the new listing
      - Favorited one of two same-cuisine (Caribbean) listings — the
        "✨ Because you liked Caribbean" strip correctly recommended the
        other one and excluded the favorited one
      - Placed a real order, tapped "💰 Mark as paid" as the buyer — flips
        to "✓ You marked this paid" and persists on reload. (Seller-side
        mark-as-paid uses the identical `mark_order_paid()` RPC branching on
        which side `auth.uid()` matches, so it's the same code path — not
        separately re-verified live since it needs a second account)
      - Marked a listing sold out — a "🔁 Repost" quick-action appeared
        directly on the Seller Dashboard row (no need to open Edit first);
        tapping it created a fresh available copy and left the original
        correctly sold-out with no repost button
      - Admin → Broadcast: sent a real "Sellers only" message — toast said
        "Sent to 7 people," and it showed up in that admin account's own
        notification bell (also a seller). Caught and fixed a real copy bug
        here during testing: the confirmation line originally read "This
        will message every everyone right now" for the "Everyone" audience
      - Minimum-order enforcement: with `min_order_amount` set to $15 on a
        listing, the order form showed "$15.00 minimum order — add 2 more"
        in red with "Place order" disabled at qty 1 ($6) — bumping to qty 3
        ($18) flipped it to a neutral "$15.00 minimum order" note and
        enabled the button
      - Neighborhood leaderboard: temporarily matched the test account's own
        neighborhood to a seller with a seeded completed order — the
        "🏆 Top kitchens in [neighborhood] this month" strip appeared
        correctly showing that seller and "1 order this month." Profile
        neighborhood reverted back afterwards
- [x] Outreach speed-up (bulk lead capture + today's queue) — the user
      wanted to expedite manual marketplace outreach (asked for a "hit go"
      automated search-and-message script first; declined that — it's the
      same automated Facebook scraping/messaging that's against their ToS
      and a permanent-ban risk regardless of framing — and built the
      legitimate speed-up instead). Admin → Outreach now has:
      - **Bulk add**: paste multiple `Name - what they're selling - contact
        info` lines at once instead of one form submission per lead.
        Confirmed live — pasted 3 lines in different formats (name+dish,
        name+dish+contact, name-only) and all three parsed and saved
        correctly in one "Added 3 leads" call
      - **Today's queue**: a focused one-at-a-time view of not-yet-contacted
        leads with the outreach message auto-personalized (the `[dish]`
        placeholder swapped for that lead's listing note when known), a
        one-tap copy, and Mark contacted/Skip/Remove actions. Confirmed
        live — marking contacted correctly advanced to the next lead and
        removed it from the not-contacted count; Skip advanced the queue
        display without changing the lead's real status (verified via the
        full list afterward); personalization correctly showed "your
        empanadas post" / "your banh mi post" for leads with a listing
        note, and fell back to the generic "[dish]" wording for the one
        without
- [x] Retention + compliance pass, prompted by the user asking how
      platforms like Facebook Marketplace avoid liability for user-posted
      food listings, and floating "just have community guidelines and let
      people do what they want." Answered that honestly (Section 230 is
      the real mechanism, but it weakens the more a platform actively
      facilitates the specific conduct — which Plates does, via the seller
      dashboard, admin approval, trust badges — so a guidelines page alone
      isn't a legal shield) rather than treating it as solved by product
      copy; the actual liability question still belongs in the attorney
      review already flagged in `LEGAL_REVIEW_BRIEF.md`. Two concrete
      things came out of that conversation:
      - **Win-back notifications** (`migration_winback.sql`, confirmed run
        live): a daily pg_cron job finds buyers who completed an order but
        have gone quiet for 21+ days and sends one nudge (at most every 14
        days) via the existing notification+push pipeline — first choice a
        seller they've ordered from before who has something available
        now, otherwise a fresh listing in the same cuisine as something
        they've previously ordered. No new UI; reuses the notification
        bell. **Real bug found and fixed during verification**: the
        function's final `update public.profiles ... where id in (select
        buyer_id from picks)` referenced the `picks` CTE from a *separate*
        SQL statement — a CTE only stays in scope for the one statement
        it's attached to, so this threw `relation "picks" does not exist`
        the first time it actually ran (the earlier "no errors" report was
        from `create or replace function`, which doesn't execute the body).
        Fixed by folding the insert and update into one statement via a
        data-modifying CTE chain (`inserted as (insert ... returning
        user_id)` feeding the final `update`). Confirmed live end-to-end
        after the fix: backdated a test buyer's completed order to 25 days
        ago, called the function directly, and got the expected "👋 Referral
        Test One just posted Dedup test jerk chicken — you ordered from
        them before" notification plus a `last_winback_sent_at` update, all
        via a clean test buyer with no prior order history (a first
        buyer's leftover pending order from earlier testing had correctly
        excluded them, which briefly looked like a second bug before
        realizing it was the "no orders in 21 days" check working as
        designed). Test data cleaned up afterward
      - **Cottage law compliance checkbox** (`migration_cottage_law.sql`,
        confirmed run live): a legitimate, non-legal-opinion mitigation,
        not a fix for the liability question above. Seller-side checkbox
        on Post/Edit Listing — "I confirm I'm legally permitted to sell
        homemade food where I live under my state/local cottage food laws"
        — same pattern as the existing allergens checkbox. Shown as a
        small confirmation line on the listing detail page when checked.
        Replaced an old passive disclaimer sentence at the bottom of the
        post form that said roughly the same thing but wasn't tracked
        anywhere. Confirmed live end-to-end: checked the box on a real
        test listing, saved, and verified `cottage_law_confirmed = true`
        directly in the database plus the confirmation line rendering on
        the listing page. Test listing cleaned up afterward
      - lint + build both clean after this batch
- [x] Seller income export (CSV), suggested after the user said they weren't
      ready to deploy live yet and asked what else was worth building. No
      migration needed — computed entirely from order data the client
      already fetches. New `ordersToIncomeCSV()` in `src/lib/orders.js`
      turns a seller's completed orders into a CSV (Date, Item, Buyer,
      Quantity, Price, Total, plus a grand-total row); `SellerDashboard.jsx`
      adds a "📄 Export your income" card with a Download CSV button, shown
      only when the seller has at least one completed order. Explicitly
      framed as personal recordkeeping, not a financial statement — Plates
      still doesn't process payments. Confirmed live: gave a test seller
      one completed order via SQL, the card correctly showed "1 completed
      order" and a matching $20 weekly total, clicked Download CSV with no
      console errors, and separately unit-tested `ordersToIncomeCSV()` with
      a mixed completed/pending order set — pending orders were correctly
      excluded, the $20 total matched the dashboard, and the grand-total
      row was correct. Test order cleaned up afterward. Lint + build clean
- [x] "Meal Prep" cuisine category, requested by the user asking about
      subscribing to a meal-prep category. Turned out the recurring-order
      piece already existed (per-listing "repeat this order" weekly/biweekly
      at checkout, `MySubscriptions` screen, daily cron via
      `migration_listing_subscriptions.sql`) — what was missing was the
      category itself. Added `'Meal Prep'` to the shared `CUISINES` list in
      `src/lib/listingOptions.js`. Along the way found that
      `BrowseScreen.jsx` keeps its own hand-duplicated copy of the cuisine
      list for the filter chips instead of importing the shared one (its own
      comment says it's supposed to stay in sync manually) — added it there
      too so the category is actually filterable, and flagged the
      duplication itself as a follow-up task rather than refactoring it
      inline. Confirmed live: "Meal Prep" appears in the Post Listing
      cuisine dropdown, posted a real test listing with it, and confirmed
      the "Meal Prep" filter chip on Browse shows exactly that listing.
      Explicitly did not build "auto-order from whoever's available across
      sellers" — flagged as a much bigger, messier feature given Plates has
      no payment processing and no listing-agnostic pickup coordination.
      Test listing cleaned up afterward. Lint + build clean
- [x] Admin listings control + Browse search radius, prompted by two
      questions: whether "trending" is really area-based, and whether
      buyers can pick a search radius by zip code.
      - **Trending clarified** (no code change, just an answer): "Trending
        near you" does real haversine distance math (prefers sellers within
        25 miles, pads with farther ones only if fewer than 5 are nearby).
        The neighborhood leaderboard is coarser — an exact text match on
        the `neighborhood` profile field, not a radius.
      - **Search radius filter** — Browse previously only had a "📍
        Nearest" sort toggle with no actual cutoff; everything showed
        regardless of distance. Added a radius `<select>`
        (Any/5/10/25/50 mi) next to it in `BrowseScreen.jsx`, filtering
        `filtered` before it reaches the list/map — a listing with no
        computable distance (e.g. an unclaimed store with just a typed
        neighborhood, no geocoded point) stays visible rather than
        vanishing. Persisted via the existing `browseFilters` localStorage
        helper alongside cuisine/view. Noted for the user that the app
        doesn't actually collect zip codes — it geocodes a neighborhood
        into lat/lng and filters off that, same as everywhere else in the
        app. Confirmed live: selected "Within 5 mi", every remaining card
        showed a distance ≤5 mi ("nearby" or an explicit mi figure);
        reloaded the page and the selection persisted; reset back to "Any
        distance" afterward
      - **Admin listings control** — RLS already had "Admins can
        update/delete any listing" policies from earlier in the project,
        just no UI surfaced them beyond the Reports moderation flow. Added
        a "Listings" tab to `AdminScreen.jsx` (new `ListingsPanel`, listing
        every listing platform-wide with search by title/seller) with Edit
        and Delete per row. Edit reuses the exact same `EditListing` screen
        a seller gets, wired through a new `onEditListing` prop threaded
        from `App.jsx` down through `AdminScreen`. Confirmed live:
        edited a listing owned by a different seller ("Referral Test One")
        as an admin logged in as a different account, verified the title
        change persisted via direct DB read while `seller_id` stayed
        unchanged (ownership untouched, only the content changed), then
        reverted the test edit. Delete: `adminDeleteListing` is the same
        function the existing Reports panel already used successfully to
        delete reported listings, so it's proven code — could not click
        through the actual confirm() dialog in this session's sandboxed
        browser (native dialogs are auto-suppressed there), so used SQL to
        do the equivalent cleanup instead; a real user's browser doesn't
        have that restriction. Lint + build clean
- [x] Unified seller trust badge, prompted by "what can we build off those
      [existing] features" — the plan was to combine the scattered trust
      signals (phone verification, rating tier, cottage law confirmation)
      into one visual cluster. Investigation found `SellerCard.jsx` and
      `SellerStorefront.jsx` already render a unified pill row (rating-tier
      badge from `getSellerBadge()`, phone verified, response time, repeat-
      order count) — said so directly rather than rebuilding something that
      existed. The real, genuine gap: cottage law confirmation (added
      earlier this session) wasn't part of that trust cluster at all, only
      buried as a small line on the individual listing page. Added
      `hasCottageLawConfirmed(listings)` to `src/lib/badges.js` — strict
      all-or-nothing across a seller's own listings, same spirit as the
      trust badge's own thresholds, so it never claims "compliant" when
      only some listings have confirmed it. Wired into both `SellerCard`
      (via a new `cottageLawVerified` prop threaded from `ListingDetail`,
      computed from `[listing, ...moreFromSeller]`) and `SellerStorefront`
      (computed from its own `sellerListings`). Confirmed live: baseline
      storefront showed no cottage-law pill (all 4 of a test seller's
      listings unconfirmed), set all 4 to confirmed via SQL, reloaded and
      saw "📋 Cottage law confirmed" appear on both the storefront header
      and the inline SellerCard trust row, then reverted. Also answered a
      follow-up question directly: this checkbox/badge is pure self-
      attestation with zero enforcement — Plates doesn't capture seller
      state in any structured way, so nothing stops someone from checking
      the box and listing even where cottage food sales are actually
      illegal for their state or food category. Real enforcement would
      need a maintained per-state ruleset and belongs in the attorney
      review, not a unilateral product decision — noted in the legal-risk
      memory for future sessions. Lint + build clean
- [x] Declined (again) building an AI agent to do Facebook/Craigslist/
      Nextdoor outreach automatically — same request as earlier in the
      session, framed differently ("AI agents" instead of "a script").
      Answer didn't change: automated scraping and unsolicited messaging
      violate those platforms' ToS regardless of what's driving the
      browser, and an agent running continuously is if anything a stronger
      signal of the "coordinated inauthentic behavior" platforms watch
      for, not a weaker one. Redirected to speeding up specific parts of
      the existing manual-outreach tools (Admin → Outreach) instead.
- [x] First real automated test coverage pass, prompted directly by the
      user after noting the app had only 5 test files for 200+ built
      features and every verification this whole session had been manual
      browser clicking. Added/extended (all via `npm test`, vitest +
      @testing-library/react, matching the existing test file style):
      - `PlaceOrderForm.test.jsx` (new) — regression test for the real
        double-submit checkout bug fixed earlier this session (two rapid
        clicks both reading stale `submitting` state before the `useRef`
        fix): fires two synchronous clicks, asserts `onSubmit` called
        exactly once. Also covers the minimum-order block and the
        delivery-address-required block
      - `ChatThread.test.jsx` (new) — same pattern for the analogous
        double-send chat bug fixed the same way (`sendingRef` +
        `queueMicrotask`)
      - `orders.test.js` — added `ordersToIncomeCSV` coverage: excludes
        non-completed orders, computes per-row and grand totals, sorts
        oldest-first, quotes a field containing a comma
      - `badges.test.js` — added `hasCottageLawConfirmed` (strict
        all-or-nothing across a seller's listings) and `getReferralBadge`,
        plus the previously-untested `sellerTrust`/"Top rated" branch of
        `getSellerBadge`
      - `seasonalCollections.test.js` (new) — `getActiveCollection` date-
        range matching, including the December-to-January wrap for winter
        holidays, plus `matchesCollection` keyword matching
      - **Real bug found while writing the seasonal-collections tests**:
        "Valentine's" (Feb 1-14) was completely unreachable — its range
        sits entirely inside "Lunar New Year"'s (Jan 15-Feb 15), which is
        listed first in the array, and `getActiveCollection` uses
        `.find()`, which stops at the first match. Every date Valentine's
        could ever match, Lunar New Year already claimed. Fixed by
        reordering the array so the fully-nested range is checked first;
        the fix and the regression test verifying both collections now
        resolve correctly on every boundary date landed together
      - 46 tests passing (up from 20), all in `npm test`; lint + build
        both clean
- [x] Unclaimed-store map pins + distance (`migration_unclaimed_store_geocoding.sql`,
      confirmed run live) — the last remaining "not built yet" item. Added
      `lat`/`lng` to `unclaimed_stores`, exposed through
      `unclaimed_store_public`. `StoresPanel` (Admin → Stores) now geocodes
      the typed neighborhood via the same `geocodeArea()` a seller's own
      profile uses, right when a store is created — with a graceful "still
      listed, just couldn't place it on the map" fallback if geocoding
      finds nothing. `mapListing()` in `src/lib/listings.js` now uses the
      store's real coordinates instead of hard-forcing them to null.
      Confirmed live end-to-end: created a test store with "Oceanside, CA
      92057," verified real lat/lng landed in the database, posted a
      listing under that store, and saw both a real pin on the Browse map
      and a live distance figure ("5.7 mi") on its listing card. Also
      admin verification for this and the earlier admin-listings work hit
      a real snag worth recording: the browser session I'd been reusing
      all session had quietly logged out (this sandboxed browser doesn't
      share cookies with the user's own browser, and never did — it had
      just been sitting on an already-authenticated tab since before this
      conversation started), and I have no way to log back in myself since
      entering a password isn't something I'll do even if asked. Needed
      the user to sign up a fresh account and self-promote it to admin via
      SQL before verification could continue. Test store + listing cleaned
      up afterward. Lint + build clean
- [x] Chat message translation, requested directly by the user for Spanish-
      speaking (and other-language) buyers/sellers. New `src/lib/translate.js`
      using MyMemory's free translation API (no key/signup, same
      free-public-API pattern as `geocode.js`) — `translateText(text,
      targetLang)` with `autodetect` as the source language, so it works
      without knowing what language a message is in ahead of time.
      `ChatThread.jsx` adds a "🌐 Translate" toggle under every message with
      text; results are cached per-message so switching it on and off after
      the first translate doesn't re-hit the API. **Real bug found and
      fixed during live verification**: MyMemory returns HTTP 200 even on
      an API-level failure (e.g. "PLEASE SELECT TWO DISTINCT LANGUAGES"
      when the detected source language matches the target — which happens
      whenever someone translates a message already in their own browser
      language) — the actual failure only shows up in the JSON body's
      `responseStatus` field, and `translatedText` is literally the error
      text in caps. `translateText()` now checks `responseStatus === 200`
      before trusting the response, falling back to "Couldn't translate
      this message." Confirmed live: reproduced the bug first (raw
      "PLEASE SELECT TWO DISTINCT LANGUAGES" string rendered in the chat),
      fixed it, reloaded, and got the graceful fallback instead; then sent
      a real Spanish test message ("¿Tienes tamales disponibles hoy?") and
      confirmed it translated correctly to "Do you have tamales available
      today?" with the toggle working both directions. New
      `translate.test.js` covers the success case, the responseStatus bug
      specifically, network failures, and empty input — 54 tests passing.
      Lint + build clean
- [x] Account settings: change email/password, delete account, preferred
      language (`migration_account_settings.sql`, confirmed run live).
      User picked all three off a clarifying multi-select rather than me
      guessing what "more options" meant.
      - **Change email / password** — new "🔒 Account & security" card
        (`AccountSecurity.jsx`) on the You screen, using
        `supabase.auth.updateUser()` via two new `AuthContext` methods
        (`updateEmail`, reusing the existing `updatePassword` from the
        password-recovery flow). Confirmed live on a disposable test
        account: password change took effect (verified by logging in with
        the new password via a direct API call, old one now rejected);
        email change correctly required confirmation before taking effect
        (toast said so, "currently" line stayed on the old address). A
        genuine-looking 400 in the browser console during this test turned
        out to be unrelated leftover noise accumulated over the session,
        not a real bug — confirmed by re-testing and finding fresh 400s
        even on a page load with no action taken
      - **Delete account** — the one requiring real design thought. A true
        hard-delete would cascade through the database and destroy *other
        people's* data (`orders.buyer_id`/`seller_id` both cascade from
        `profiles`, so deleting your account would silently wipe a
        seller's income history or a buyer's reviews). Built as
        anonymization instead: new `delete_my_account()` RPC blanks the
        profile's name/photo/bio/location (name becomes "Deleted user"),
        hides the account's listings, cancels their recurring orders, and
        sets `deleted_at`. New `DeletedScreen.jsx` mirrors the existing
        `BannedScreen.jsx` pattern — `App.jsx` checks `profile?.deleted_at`
        right alongside `profile?.banned` and permanently bounces that
        account back to a blocking screen, even with valid credentials.
        Two-step in-app confirm, no native `confirm()` dialogs. Confirmed
        live end-to-end on a disposable account: deletion signed out
        immediately, direct DB read showed the profile correctly
        anonymized, and logging back in with valid credentials landed on
        "Account deleted" instead of the app
      - **Preferred language** — new dropdown in Edit Profile
        (`profiles.preferred_language`), feeds into the chat translation
        feature via a new `targetLanguageFor(profile)` helper in
        `lib/translate.js` that prefers this over the browser's own
        locale when set. Confirmed live: set to Spanish on a disposable
        account, verified `preferred_language: "es"` via direct DB read
      - Both disposable test accounts used for verification were deleted
        through the real delete-account flow afterward (not raw SQL) —
        doubled as an extra live confirmation that deletion works
      - 56 tests passing; lint + build clean
- [x] Audit pass over small/untested lib functions, prompted by "a lot of
      small things like this was overlooked, let's do some looking at the
      small functions" — continued the approach that already caught two
      real bugs this session (writing real tests, not just eyeballing
      code). Added tests for four previously-untested files:
      `recentlyViewed.js`, `responseStats.js` (`formatResponseTime`),
      `recommendations.js` (`getRecommendedListings`), and a new
      `outreach.test.js`.
      - **Real bug found and fixed**: `parseBulkLeadLine()` (the "Name -
        dish - contact" bulk-paste parser in Admin → Outreach) filtered
        out empty strings after splitting on `' - '`. A line with a
        genuinely blank middle field — e.g. `"Maria -  - (555) 123-4567"`,
        plausible when pasting from a spreadsheet with an empty "dish"
        cell — had that blank filtered away, shifting every field after it
        left by one: the phone number silently landed in `listingNote`
        instead of `contactInfo`, and `contactInfo` came out empty. Fixed
        by trimming without filtering and indexing positionally instead.
        Regression test reproduces the exact scenario
      - Along the way, moved `outreachMessageTemplate`,
        `personalizedOutreachMessage()`, and `parseBulkLeadLine()` out of
        `AdminScreen.jsx` and into `lib/outreach.js` — they're pure logic
        with no UI dependency, same as everything else in `lib/`, and
        moving them is what made them testable at all (a page component
        isn't an importable unit)
      - Checked `formatResponseTime()` and `getRecommendedListings()`
        (cuisine-overlap recommender, tie-break-on-insertion-order) closely
        for similar edge-case bugs — both held up under test; no changes
        needed there
      - Confirmed live once the user logged back in: pasted the exact
        repro line into Admin → Outreach's bulk-add ("Blank Field Test -
         - (555) 123-4567") and got a lead with the phone number correctly
        in contact info and an empty listing note — not swallowed. Test
        lead removed afterward
      - 79 tests passing (up from 56); lint + build clean
- [x] "Remember me" checkbox on login. Supabase already persists sessions
      in localStorage by default (survives closing the browser) — the
      logouts earlier this session were from me explicitly signing out to
      test disposable accounts, not a real gap — but the user wanted an
      explicit toggle, so: `src/lib/supabaseClient.js` now wraps a custom
      storage adapter (`authStorage`) that reads/writes to `localStorage`
      when remembered (the default, matching every login before this
      existed) or `sessionStorage` when not, deciding per-call based on a
      `plates_remember_me` flag. `setRememberMe()` is called right before
      `signIn`/`signUp` so the session about to be written lands in the
      right place. Checkbox only shown on the sign-in form (sign-up always
      remembers). Deliberately verified without touching the live admin
      session that was already logged in for other testing — logging out
      to test this would have repeated the exact credential-access problem
      from earlier in the session. Instead, `authStorage` was exported and
      exercised directly with real `localStorage`/`sessionStorage` in
      `supabaseClient.test.js`: confirms writes and reads go to the right
      store based on the flag, and that switching the flag after writing
      correctly makes the other store's session invisible (matching real
      behavior — a stale session in the "wrong" store for the current
      preference isn't found). 84 tests passing; lint + build clean
- [x] Separate "Getting started" checklists for buyers and sellers,
      requested since the one checklist that existed nagged pure buyers
      with "Post your first listing" forever — something they might never
      want to do. `GettingStartedChecklist.jsx` is now a generic
      `{ title, steps }` renderer (a step is `{ key, label, done, action }`)
      instead of being hard-coded to the old seller-only steps, and
      `ProfileScreen.jsx` renders it twice:
      - **🛒 Getting started as a buyer**: set neighborhood, save a listing
        you like (`favoriteIds.size > 0`, already available), place your
        first order (new `fetchHasEverOrdered()` in `lib/orders.js` — a
        cheap existence check, not a full order fetch, since the checklist
        only needs true/false). Both action buttons jump to Browse via a
        new `onGoBrowse` prop
      - **🚀 Getting started as a seller**: the original three steps
        (photo, neighborhood, first listing), unchanged
      - Confirmed live: both cards render with the right per-step state for
        a real account (2/3 seller steps already done, 1/3 buyer steps);
        clicking "Save a listing you like" correctly jumped to Browse;
        favoriting something there flipped that step to done and updated
        the buyer card to 2/3 in real time (matching the Saved count going
        to 1); unfavorited afterward to leave no test data behind
      - 84 tests passing (checklist itself has no new logic to unit test —
        it's a pure props-in renderer); lint + build clean
- [x] Signup intent (buyer/seller/both) picked at sign-up, gating which
      getting-started checklist(s) show — follow-up to the buyer/seller
      split above (`migration_signup_intent.sql`, confirmed run live).
      New `profiles.signup_intent` column, set via the same
      `raw_user_meta_data` → `handle_new_user()` trigger pattern
      `referred_by` already uses (no separate write needed after signup).
      `AuthScreen.jsx` adds a required "What brings you to Plates?"
      Buy/Sell/Both picker on the signup form; `signUp()` in
      `AuthContext.jsx` takes the choice as a new param.
      `ProfileScreen.jsx` shows the buyer checklist unless
      `signup_intent === 'seller'`, and the seller checklist unless it's
      `'buyer'` — so 'both' (and null, for every account that predates
      this) still shows both, matching the existing behavior nobody should
      lose. Confirmed live end-to-end with two disposable test accounts:
      chose "Buy" on the first — verified `signup_intent: "buyer"` via
      direct DB read and that only the buyer checklist rendered on
      Profile; chose "Sell" on the second — only the seller checklist
      rendered. Both test accounts deleted through the real delete-account
      flow afterward (this required logging out of the admin session that
      was in use for other testing — the user will need to log back in)
      - 84 tests passing; lint + build clean
- [x] "Make it great when launched" pass, part 1 of 4 — the user asked to
      keep building rather than deploy now, then picked all four launch-
      quality dimensions I offered (polish, trust for strangers, growth/
      first impression, reliability in the wild) rather than one. Starting
      with reliability since it's the most concrete and unblocks judging
      the other three later: **client-side error logging**
      (`migration_client_errors.sql`, confirmed run live). Before this, an
      unhandled error just went to `console.error` — fine in dev, useless
      once this is actually deployed and nobody's watching a console.
      - New `client_errors` table (RLS: anyone can insert, including a
        logged-out guest, since errors happen pre-login too; only admins
        can read/delete)
      - `lib/errorLog.js`: `logClientError()` resolves the current user id
        via `supabase.auth.getSession()` when not passed explicitly, and
        throttles per exact message+context to one report per browser
        session — a render loop or a repeating rejection shouldn't flood
        the table with thousands of identical rows
      - Wired into three places: `ErrorBoundary.jsx`'s `componentDidCatch`
        (React render errors), plus new `window.addEventListener('error'
        / 'unhandledrejection', ...)` in `main.jsx` for everything a React
        error boundary structurally can't catch — an exception in a click
        handler, a rejected promise with no `.catch`
      - New Admin → Errors tab: recent errors with context badge, relative
        time, which user hit it, expandable stack trace, dismiss
        individually or clear all
      - Confirmed live: triggered a real `setTimeout` throw (window-error
        path) and a real unhandled `Promise.reject` (unhandled-rejection
        path) — the two paths `ErrorBoundary` alone can't cover — and both
        showed up in Admin → Errors within seconds, correctly attributed
        to the logged-in admin, with full messages and stack traces.
        Cleared afterward
      - New `errorLog.test.js` covers the throttling specifically (same
        message+context dedupes to one insert; different context for the
        same message doesn't). 87 tests passing; lint + build clean
- [x] "Make it great when launched" pass, part 2 of 4 — polish. Two checks:
      - **Mobile width** — this whole session had only ever tested at
        ~800px, never real phone width. Resized to 375×812 and the bottom
        nav appeared missing from screenshots — turned out to be a
        screenshot-tool rendering quirk in this session (same one seen a
        few times before with stale/blank captures), not a real bug:
        checked the nav's actual computed styles and bounding box directly
        (`position: fixed; bottom: 16px`, box at top:731/bottom:796 within
        an 812px viewport) and it's correctly positioned and visible. No
        fix needed — confirmed via computed styles rather than trusting a
        flaky screenshot
      - **Code-splitting the main bundle** — every build this whole
        session warned about a >500kB chunk; the main bundle had grown to
        636kB with only `AdminScreen` lazy-loaded. Lazy-loaded nine more
        screens that aren't needed for the first thing almost anyone does
        (browse or log in): `PostListing`, `ResetPassword`, `EditListing`,
        `EditProfile`, `NotificationsScreen`, `LegalScreen` (in both
        places it's imported — `App.jsx` and `AuthScreen.jsx`
        separately, since the second import would have defeated the
        point), `SellerStorefront`, `OrdersScreen`, `SellerDashboard`.
        Kept `BrowseScreen`, `ListingDetail`, `AuthScreen`, `ProfileScreen`,
        `ChatThread`, `ChatsScreen`, `SavedScreen`, and
        `OnboardingWalkthrough` eager — all either the first thing a user
        sees or common enough that a loading flash would cost more than
        the bytes saved. Result: main bundle 636kB → 345kB (46% smaller),
        the build size warning is gone, and everything split into small
        per-screen chunks (1-19kB each) loaded on demand. Confirmed live:
        navigated to the lazy-loaded `PostListing` (via Sell) and
        `LegalScreen` (via both the Profile footer link and the signup
        form's Terms link) and inspected the DOM directly rather than
        trusting screenshots — both rendered fully and correctly, no
        chunk-loading errors in console. 87 tests passing; lint + build
        clean
- [x] "Make it great when launched" pass, part 3 of 4 — trust for
      strangers. Since Plates has no payment processing, the real trust
      gap isn't refund/dispute handling (Reports + cancellation reasons
      already cover that) — it's that two strangers meeting in person to
      hand off food get zero safety framing at the moment it actually
      matters. Found that Community Guidelines already had good advice on
      this ("meet in a public, well-lit spot..."), just buried in a legal
      document nobody reads outside a small footer link — the fix was
      surfacing it in context, not writing new copy. Added one line to
      `OrderCard.jsx`, shown to the buyer alongside the pickup code once
      an order is confirmed/ready (pickup orders only, not delivery):
      "🤝 Meeting a neighbor for the first time? Pick somewhere well-lit
      and public if you can, and take a look before you pay." Confirmed
      live: placed a real test order, asked the user to run one SQL update
      to flip it to 'confirmed' (mirrors what a seller's own confirm
      action does — no way to do that as the buyer's own account), and
      saw the note render correctly right under the real pickup code on
      the actual Orders screen. Test order cleaned up afterward. 87 tests
      passing; lint + build clean
- [x] "Make it great when launched" pass, part 4 of 4 — growth & first
      impression. Reviewed the guest experience (Browse works fully
      logged-out, onboarding walkthrough, signup now asks buyer/seller/
      both and shows a matching checklist) and found it already solid —
      no changes needed there. The real gap was in "Invite your
      neighbors" (`InviteFriends.jsx`, shown on the Profile screen): its
      button only ever did `navigator.clipboard.writeText` silently
      copying a link with no native share option, when the app already
      had a proper `shareLink()` helper (`lib/share.js`, used by
      `ListingDetail`'s "Share listing") that prefers the OS share sheet
      and falls back to clipboard-copy-with-toast. Swapped
      `InviteFriends.jsx` to use `shareLink()` the same way
      `ListingDetail` does — button relabeled "Share invite link".
      Confirmed live: clicked the button on the actual Profile screen
      while logged in — the automated browser pane has no
      `navigator.share`, so it exercised the clipboard-fallback path,
      and the tool harness confirmed the page wrote the invite link to
      the OS clipboard during that click (the `'copied'` branch, which
      also fires the "Invite link copied!" toast). On a real phone this
      same code path opens the native share sheet instead. 87 tests
      passing; lint + build clean

All four parts of the "make it great when launched" pass (polish &
quality bar, reliability in the wild, trust for strangers, growth &
first impression) are now done.

- [x] Cleaned up stray test data: a "Geocode pin test dish" ($8) listing
      spotted under mike chin's "Your listings" while verifying an
      earlier feature. Confirmed via a read-only API check that it was
      posted under mike chin's own account on the exact day the geocode-pin
      feature was built, with a one-word test title — safe to remove. Gave
      the user a `delete from listings where id = ...` to run (orders
      cascade-delete automatically via the existing FK, but a check
      confirmed no order referenced it anyway). Confirmed gone afterward
      via the same read-only check and live in "Your listings"
- [x] Added a bio and a social media/website link to profiles, plus split
      the old dual-purpose "Kitchen name / bio" field into two clearer
      ones. Previously `kitchen` was doing double duty: a short tagline
      shown next to a seller's name on listings, *and* a full paragraph
      on the storefront/profile pages, capped at 300 characters. Split
      it into `kitchen` (now genuinely short — "Kitchen or shop name",
      80 chars, unchanged everywhere it was already used as a tagline:
      `ListingDetail`, `SellerCard`, `AdminScreen`'s unclaimed-store
      form) and new `bio` (500 chars, the paragraph shown on
      `ProfileScreen` and `SellerStorefront`) and `social_link` (200
      chars, rendered as a clickable link with a 🔗 prefix on both of
      those same two screens). New `lib/socialLink.js` normalizes
      whatever someone types (e.g. "instagram.com/mariascocina") into a
      full `https://` URL for storage, rejects non-http(s) input like
      `javascript:...`, and formats it back down to a short label for
      display; covered by 8 new unit tests (`socialLink.test.js`) for
      the empty/protocol-prefixed/whitespace/malicious-input/trailing-
      slash cases. Migration: `migration_profile_bio.sql`, mirrored into
      `schema.sql`. Confirmed live end-to-end: filled in Kitchen name,
      Bio, and Social link on the real Edit Profile screen, saved,
      confirmed a "Could not find the 'bio' column" error before the
      migration ran (proving the form was wired correctly and just
      waiting on the DB), then re-saved after the user ran the migration
      and confirmed both the bio paragraph and the `🔗 instagram.com/…`
      link render correctly on `ProfileScreen` *and* on the public
      `SellerStorefront` (with the link's `href` correctly normalized to
      `https://instagram.com/...`). Cleared the test values back out
      afterward so they don't show on the live profile. 95 tests
      passing; lint + build clean
- [x] Recurring/subscription order tracking, for sellers who run a
      standing-order or meal-prep business. The core recurring-order
      system already existed (`listing_subscriptions` + a daily
      `place_subscription_orders()` cron job that auto-places a real
      order and notifies the buyer) — this closes two real gaps found
      while reviewing it: (1) an auto-placed order was indistinguishable
      from a one-time order, so a seller couldn't tell which pending
      orders were recurring, or see how many standing subscribers they
      had *before* the orders landed; (2) a buyer only found out their
      subscription had been charged/placed *after* the fact, with no
      chance to skip a week. Added: `orders.subscription_id` (tags
      auto-placed orders, set by `place_subscription_orders()`); a
      "🔁 Recurring" badge on those orders everywhere sellers/buyers see
      order cards (`OrderCard.jsx`); a new "Standing orders" card in
      Seller Dashboard (`SellerDashboard.jsx`) that rolls up active
      subscribers per listing — count, total quantity, and the soonest
      next order date — via new `lib/subscriptions.js` functions
      `fetchSellerStandingOrders()` / `summarizeStandingOrdersByListing()`
      (5 new unit tests); and a new daily cron job
      `send_subscription_reminders()` that notifies a buyer one day
      before their subscription auto-places, using a new
      `upcoming_reminder_sent` flag (reset each cycle) so it only ever
      fires once per cycle. Migration:
      `migration_subscription_tracking.sql`, mirrored into `schema.sql`.
      100 tests passing; lint + build clean. Confirmed live: since the
      test-listing cleanup had just removed every other listing/buyer
      pairing on the platform, verified via a temporary subscription
      (reusing an already-existing leftover test profile as the buyer,
      no new test data created) backdated to be immediately due, then
      manually invoking `place_subscription_orders()` once — confirmed
      on the real Seller Dashboard: "🔁 Standing orders — 1 subscriber ·
      chicken · 1 sub · 2x · next Sep 10" (next date correctly advanced
      7 days from the backdated date) and the new order itself tagged
      "🔁 Recurring" in "Orders needing attention." Cleaned up the test
      order and subscription afterward and confirmed Seller Dashboard
      is back to "All caught up" with no leftover data
- [x] Notify a seller's followers when they come off vacation mode.
      `restock_alerts` already covered "this specific sold-out listing is
      back"; there was no signal at all for "this seller I follow is open
      again." Pure backend: a new `handle_seller_vacation_ended()` trigger
      on `profiles`, fires on the `on_vacation` true→false transition,
      bulk-inserts a notification for every row in `seller_follows` for
      that seller — same pattern as the existing new-listing-alert
      trigger. No client code changes needed since `setVacationMode()`
      already just updates `profiles.on_vacation` directly. Migration:
      `migration_seller_back_notification.sql`, mirrored into
      `schema.sql`. Confirmed live: added a temporary follow (reusing an
      existing leftover test profile, no new test data), then toggled
      vacation mode on and back off through the real Seller Dashboard UI
      (not synthetic SQL) — confirmed the notification landed for the
      follower via a direct SQL check. Cleaned up the test follow +
      notification afterward
- [x] Two monetization pieces, both billed manually for now (no Stripe
      Connect yet — that's still the bigger "Payments" item). First
      fixed a real revenue leak in the existing $5/week Featured listing
      flow: `featured` was a permanent boolean with no expiry, so a
      seller who paid for one week would stay featured forever unless an
      admin remembered to manually un-feature them. Added
      `listings.featured_until`, set to +7 days when a promotion request
      is approved, and a new hourly cron job `expire_featured_listings()`
      that auto-unfeatures anything past its paid week — an admin's own
      manual "feature this listing" toggle (no expiry) is untouched by
      this. Admin → Promotions now also shows a "Currently featured
      (paid)" list with expiry dates for renewal follow-up. Second, added
      a seller "Plates Pro" tier ($9/month placeholder — easy to change,
      it's just copy in `SellerDashboard.jsx`): a new `profiles.is_pro` /
      `pro_since`, protected against self-grant the same way
      `is_admin`/`banned` already are (extended
      `protect_profile_admin_fields()`), an admin toggle in Users panel
      ("Make Pro"/"Remove Pro"), a "🌟 Plates Pro" badge on the seller's
      storefront and own profile, and a "Go Pro" card in Seller Dashboard
      with a pre-filled mailto to request it. Migration:
      `migration_monetization.sql`, mirrored into `schema.sql`. 100 tests
      passing; lint + build clean. Confirmed live end-to-end: toggled
      mike chin to Pro via the real Admin Users panel and confirmed the
      badge on Profile, Seller Dashboard, and the public Storefront; ran
      the real request→approve promotion flow on the `chicken` listing
      and confirmed `featured_until` was set correctly (7 days out) and
      showed up both on the listing's own "Featured until [date]" card
      and in Admin's renewal-tracking list. Reverted both test toggles
      (no real payment happened) afterward and confirmed clean
- [x] Two admin-empowerment pieces, picked from a review of all 9 Admin
      tabs for real friction points. First, pending-action count badges
      on the Reports/Promotions/Errors tabs — previously had to click
      into each tab to see if anything needed attention; now a live count
      shows right on the tab button. Needed no new schema, just three
      cheap head-only count queries (`fetchAdminPendingCounts()` in
      `lib/admin.js`), refetched whenever the admin switches tabs.
      Second, a lightweight admin action audit log — there was
      previously zero record of who banned/promoted/deleted what or
      when. New `admin_actions` table (`admin_id` defaults to
      `auth.uid()`, never passed by the client, and the insert policy
      pins it to the actual caller so it can't be spoofed) plus a new
      `logAdminAction()` helper wired into every existing moderation/
      monetization action: ban/unban, make/remove admin, make/remove
      Pro, delete a listing, resolve/dismiss a report, feature/unfeature
      a listing, approve/reject a promotion request. Surfaced in a new
      10th "Activity" tab (`ActivityPanel`) — newest first, human-
      readable labels, who did it, a short detail (e.g. the affected
      user/listing's name), and when. Migration: `migration_admin_audit.
      sql`, mirrored into `schema.sql`. 100 tests passing; lint + build
      clean. Confirmed live: checked the badges read 0 with nothing
      pending (matched the real empty Reports/Errors state), then made
      mike chin Pro through the real Admin Users panel and watched the
      exact entry — "Made a seller Pro · mike chin · mike chin · just
      now" — appear in Activity, then reverted (Remove Pro) and
      confirmed via the UI
- [x] Full-app regression walkthrough ("run through everything") after the
      monetization + admin-audit + mobile-scaffolding work. 100/100
      automated tests, lint, and build all clean. Live-checked: guest
      Browse/listing detail/signup/legal docs, Profile, Seller Dashboard,
      all 10 Admin tabs, Orders, Chats, and Sell — all render and
      function correctly, zero regressions. Bisected two console
      findings down to their exact source by opening fresh browser tabs
      per screen (a shared console log across navigations was otherwise
      impossible to attribute):
      - A one-off `400` on page load that never recurred across 5+
        reloads and never coincided with any visible breakage — treated
        as a transient network blip, not a real bug
      - A **real, fixed bug**: `WeeklyBarChart.jsx`'s gridlines
        (`[0, 0.5, 1].map(t => Math.round(maxValue * t))`) collapse to
        duplicate values whenever `maxValue` is small (e.g. `[0, 1, 1]`
        on a low-data dashboard — exactly when a founder is most likely
        to be looking), and were keyed by that value instead of
        position, producing a React "duplicate key" warning on every one
        of Admin → Stats' three charts. Fixed by keying gridlines by
        their fixed index (3 lines always exist, at fixed positions)
        instead of their computed value. Confirmed live in a fresh tab:
        warning gone, charts still render correctly
      - Also spotted (not fixed, just flagged): a leftover "QA Sweep
        Kitchen" unclaimed test store in Admin → Stores, and two
        obviously-test area-waitlist entries ("Nowhereville", "Test") in
        Admin → Stats' growth-opportunities list — minor leftover test
        data, same category as the accounts/listings cleaned up earlier
- [x] Cleaned up the "QA Sweep Kitchen" test store and the "Nowhereville"/
      "Test" waitlist entries flagged above. Confirmed live: Admin → Stores
      no longer lists it, and Admin → Stats' "Growth opportunities" section
      is gone entirely (it only renders when there's at least one entry)
- [x] Two pieces of pre-launch abuse protection, picked from the broader
      "what's left before launch" list. First, a listing-creation rate
      limit — a single compromised or spam account previously had no cap
      on how fast it could flood the platform with listings. New
      `check_listing_rate_limit()` trigger blocks a seller's 21st listing
      within a rolling 24 hours (admins exempt, for bulk outreach/
      onboarding imports). Second, Cloudflare Turnstile wired onto the
      signup form — a new `TurnstileWidget.jsx`, the external script added
      to `index.html`, `AuthContext.signUp()` now threads a `captchaToken`
      through to `supabase.auth.signUp()`, and the Sign up button is
      disabled until the widget verifies. Ships with Cloudflare's public
      *test* site key (`TURNSTILE_SITE_KEY` in `lib/siteInfo.js`, clearly
      commented) so the whole flow actually works out of the box — real
      bot protection needs two more steps only the account owner can do:
      swap in a real site key (free, ~2 min at Cloudflare) and enable
      Turnstile with the matching secret key in Supabase's Auth settings.
      Migration: `migration_abuse_protection.sql`, mirrored into
      `schema.sql`. 100 tests passing; lint + build clean. Confirmed live:
      posted a real listing well under the rate limit to confirm normal
      posting still works (then deleted it); loaded the real signup screen
      and watched the Turnstile widget render and show Cloudflare's own
      "Success! ... For testing only" watermark, confirming it's genuinely
      calling their service and produces a token that enables the Sign up
      button — didn't complete an actual signup, since that would just
      create another test account to later clean up
- [x] A real, working database backup script — see
      [BACKUP_RESTORE.md](BACKUP_RESTORE.md) for the full writeup.
      `./scripts/backup-db.sh` takes a genuine schema+data backup of the
      live database (including real accounts in `auth.users`) to
      `~/plates-backups/`, using `pg_dump` directly (installed via
      Postgres.app, no Docker needed) against a short-lived connection the
      already-authenticated Supabase CLI generates — never touches the
      actual database password. Verified live: ran it for real, confirmed
      both dumps contain real recognizable data. Attempted full unattended
      weekly automation via `launchd` and hit two genuine, sequential
      macOS security walls (this repo lives under the TCC-protected
      `~/Downloads`, and separately the Supabase CLI's Keychain-stored
      login token isn't accessible to a background `launchd` process) —
      documented honestly in BACKUP_RESTORE.md rather than leaving a
      silently-hanging scheduled job installed. The manual script is the
      verified, working deliverable; true unattended automation needs a
      persistent stored DB connection string instead (a further step, only
      worth doing once there's real data volume to protect)
- [ ] Push notifications — the "actually receive a push on a real device"
      step from the Push notifications setup section above is still
      outstanding (can't be done from the automated test browser). See
      that section for the exact steps

## Not built yet (future ideas)

Bigger ideas from a competitor/UX pass (Shef, Olio, Too Good To Go, Etsy, Nextdoor,
Facebook Marketplace) that would take more design/product decisions before building —
noted here so they're not lost, not started yet:

- [ ] Give the "Plates Pro" tier a real functional perk: make a Pro seller's
      listings always sort/badge as Featured (Browse's "is this featured" check
      becomes `listing.featured || listing.seller.isPro` — small change, no new
      schema, reuses everything Featured already built), instead of Pro just
      being a badge with no function. This was the alternative considered to
      building a separate, pricier "feature my whole store" tier alongside the
      existing per-listing $5/week Featured — decided to hold off on either
      until Featured/Pro have run for a bit and there's real signal on whether
      anyone actually pays for what exists now, rather than designing a third
      pricing tier in a vacuum
- [ ] Payments (Stripe Connect or similar) — buyers and sellers currently arrange
      payment and pickup entirely outside the app; this is also the prerequisite for
      taking a commission and actually making money from the app. The seller-facing
      "Request to be featured" flow (Admin → Promotions) now exists, but approving
      a request is still a manual/off-platform arrangement — wiring it to an actual
      Stripe charge at request time is what's still missing. When that lands, the
      "Payments & refunds" section in the Terms of Service needs another pass — it
      currently says Plates doesn't process payments, which won't be true anymore
- [ ] Have an actual lawyer review the Terms of Service, Privacy Policy, and
      Community Guidelines (Profile → bottom links) before charging money or scaling
      past friends/family — they're a reasonable starting draft, not legal advice,
      and cottage food law varies a lot by state/county. [LEGAL_REVIEW_BRIEF.md](LEGAL_REVIEW_BRIEF.md)
      now exists to make that first conversation faster
- [ ] Deploy live
