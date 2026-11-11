# Facebook Page + Instagram setup (and connecting them for ads)
Drafted 2026-11-10. Do these in order. Steps marked **You** need your own identity, phone, email or payment details; I won't create accounts or enter payment info for you.

Images ready: `promo/social/profile-1080.png` (works as the Page and Instagram profile picture) and `promo/social/facebook-cover-1640x624.png` (Page cover).

## 0. Business email first (10 minutes, saves headaches)
Instagram and Meta both send verification emails and want a business contact. You don't have a business email yet.
- **You:** in Namecheap, set up free email forwarding so `hello@passtheplates.app` forwards to your Gmail. Use `hello@passtheplates.app` when you create the accounts below. (Also fixes the personal Gmail currently shown as support.)

## 1. Facebook Page
Use your existing personal Facebook profile as the admin. Pages don't need a separate account.
1. facebook.com → Menu → **Pages → Create new Page**.
2. **Name:** `Pass the Plates`. **Category:** `Mobile App` (backup: `Community` or `Food & Beverage Company`). Avoid categories that imply delivery or a restaurant.
3. **Bio (255 max):** `Pass the Plates is a free app where neighbors buy homemade food from home cooks and bakers. Opening now in Oceanside, Vista and Carlsbad, CA. Bake or cook at home? Sell with us, free.`
4. Upload the profile picture and cover from `promo/social/`.
5. **Add a button:** `Download app` or `Learn more` → `https://get.passtheplates.app/?utm_source=facebook&utm_medium=organic&utm_campaign=oceanside-launch&utm_content=page-button`
6. Page info: website `https://get.passtheplates.app`, email `hello@passtheplates.app`, service area Oceanside CA (use "service area", do not publish a home address).
7. Set the username (`@passtheplates`, or `@passtheplatesapp` if taken).
8. **Warm up the page before ads** (Meta is stricter with brand-new Pages): post 5-6 times over a few days and invite friends to follow. Ideas: why you built it, a sneak peek of the app (use the screenshots with "sample listings" noted), "Looking for 20 Oceanside bakers", a poll "What homemade food do you wish you could get nearby?".

## 2. Instagram
1. **You:** create the account in the Instagram app with `hello@passtheplates.app`. Handle `@passtheplates` (fallbacks `@passtheplatesapp`, `@pass.the.plates`). Check it's free first.
2. Profile picture: `profile-1080.png`.
3. **Bio (150 max):** `Homemade food from your neighbors 🍞 Free app for home cooks & bakers · Oceanside, CA` and link `https://get.passtheplates.app/?utm_source=instagram&utm_medium=organic&utm_campaign=oceanside-launch&utm_content=bio`
4. Settings → **Account type and tools → Switch to professional account → Business**. Category: `App Page` or `Community`. (Required to run ads.)
5. Post 6-9 things before running ads. Reuse `promo/jpeg/` squares; the first few Reels can be screen recordings (I can record these).

## 3. Connect them (two ways, either works)
- **Instagram app:** Edit profile → **Page** → connect to the Facebook Page you manage, or
- **Facebook Page:** Settings → **Linked accounts → Instagram → Connect**, sign in to the Instagram account.
Check it worked: Page shows an Instagram icon under Linked accounts, and Instagram shows the Page under Edit profile.

## 4. Meta Business Suite and ads
1. **You:** go to business.facebook.com → create a **Business portfolio** named `Pass the Plates LLC` (use the LLC name and your real details; don't use your personal one).
2. Add the Page and the Instagram account to the portfolio (Settings → Accounts).
3. Turn on **two-factor authentication** (Meta requires it for ads managers and flags accounts without it).
4. Settings → Brand safety → **Domains → add `passtheplates.app`** and verify (a DNS TXT record in Namecheap; I can give you the exact record once you have the code). Needed for link tracking.
5. **Ad account:** Business Settings → Ad accounts → Add → **Create a new ad account** (currency USD, time zone Pacific). **You** add a payment method (card). Set an account spending limit of $1,000.
6. Accept Meta's ad terms (you).

## 5. How to run the first ads (don't start yet)
Hold paid buyer ads until there are 15 live listings (see the 30-day plan). **But supply ads are fine now**: use the first $100 of the Meta budget to recruit cooks, because supply gates everything.
- **Campaign A, recruit cooks (start first):** Objective **Traffic** (or Leads) to the landing page. Audience: 10 miles around Oceanside, age 22-65, interests like baking, cottage food, home bakery, farmers markets, sourdough. Message: draft C / "Sell what you bake" from `AD_COPY.md`. $15/day.
- **Campaign B, buyers (after 15 listings):** objective Traffic to the landing page (installs are measured via the tagged link and App Store / Play analytics; the Meta "App promotion" objective needs the Meta SDK inside the app, which we don't have). Copy from `AD_COPY.md`. $20-25/day.
- Creatives: `promo/graphics-samples/` with "Sample listings shown". Swap in real cook photos as soon as you have them.
- Special ad categories: not needed (food is not a restricted category). Don't claim "safe", "inspected" or "certified". If the ad uses AI imagery, Meta may add an "AI info" label; that's fine.

## 6. Checklist
- [ ] hello@passtheplates.app forwarding
- [ ] Facebook Page created, picture and cover set, button added
- [ ] Instagram created and switched to Business
- [ ] Page and Instagram linked
- [ ] Business portfolio + 2FA + domain verified
- [ ] Ad account + payment method + $1,000 limit
- [ ] 5-6 Page posts and 6-9 Instagram posts live
- [ ] First cook-recruit ad launched
