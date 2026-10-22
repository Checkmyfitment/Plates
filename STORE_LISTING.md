# Store listing copy (draft)

> Updated for the rename to **Pass the Plates** (store name + keywords for
> discoverability). The app's home-screen label stays the short "Plates" so it
> isn't cut off under the icon; the in-app Terms/Privacy text still says "Plates"
> and should be updated together with the lawyer review.

Ready-to-paste copy for App Store Connect and Google Play Console. Review
and tweak before submitting — especially the App Store's 30-char subtitle
and keyword list, which are worth iterating once you have real usage data.

---

## App Store Connect

**App name** (30 char max): `Pass the Plates: Homemade Food`

**Subtitle** (30 char max): `Local home cooks & bakers`

**Promotional text** (170 char max, editable anytime without a new build):
> Real dishes from real home cooks near you. Browse, message, and pick up
> homemade food from your own neighborhood — no restaurant, no chain.

**Description** (4000 char max):
> Pass the Plates connects you with home cooks, bakers, and food trucks in your
> own neighborhood — real people making real homemade food, not a restaurant
> chain or delivery app.
>
> **Browse what's cooking nearby**
> See what your neighbors are making this week — tamales, sourdough,
> dumplings, meal prep, baked goods, and more — sorted by distance or shown
> on a map.
>
> **Order directly from the cook**
> Message the seller, place an order, and pick a pickup time. Payment is
> arranged directly between you and the cook — Pass the Plates doesn't take a cut of
> your food money.
>
> **Become a seller yourself**
> Already cooking extra? Post a listing in minutes: a photo, a price, and a
> pickup window. Track orders, message buyers, and build a following of
> repeat customers in your own neighborhood.
>
> **Built for trust between neighbors**
> - Ratings and reviews from real completed orders only
> - Seller badges for reliable, well-reviewed cooks
> - In-app messaging, so you never have to share your phone number
> - Optional phone verification for extra trust
>
> Whether you're looking for something homemade for dinner tonight or you've
> got a knack for cooking and want to share it with your neighbors, Pass the Plates
> is where your neighborhood's home kitchens meet.

**Keywords** (100 char max, comma-separated, no spaces after commas):
`cottage,baker,bakery,tamales,sourdough,meal prep,truck,pickup,desserts,neighbors,marketplace,order`

Apple combines the words in the name, subtitle, and keyword field, so words
already in the name ("homemade", "food") or subtitle ("local", "home", "cooks",
"bakers") are deliberately left out of the keyword list — repeating them wastes
space. Don't use plurals or phrases twice; Apple matches both.

### Spanish (Mexico) localization — extra keyword space
Add Spanish (Mexico) as a second localization in App Store Connect. Apple also
indexes it for US searches, which roughly doubles the keyword space and helps
tamales / comida casera searches.

- **Name** (30): `Pass the Plates: Comida Casera`
- **Subtitle** (30): `Cocineros caseros cerca`
- **Keywords** (100): `tamales,panadería,postres,hecha en casa,vecinos,pedidos,recoger,pan,mexicana,casero,cocina,comida`

**Support URL**: `https://www.passtheplates.app` *(replace once a dedicated support/help page exists — see note below)*

**Marketing URL** (optional): `https://get.passtheplates.app`

**Privacy Policy URL**: `https://www.passtheplates.app` *(in-app at Profile → Settings → Privacy Policy — confirm the exact path resolves before submitting; App Store Connect checks this URL is live)*

**Category**: Primary: `Food & Drink`. Secondary (optional): `Shopping`

**Age rating**: No mature content — should clear as 4+ in the questionnaire

---

## Google Play Console

**App name** (30 char max): `Pass the Plates: Homemade Food`

**Short description** (80 char max):
> Order homemade food from home cooks, bakers & food trucks near you.

Google Play has no keyword field — it reads the title, short description, and
full description. The full description above already uses "homemade food",
"home cooks", "bakers", and "food trucks" naturally; keep those phrases when
editing.

**Full description** (4000 char max): *(same copy as the App Store description above — Play doesn't have a separate char limit that requires trimming it)*

**App category**: `Food & Drink`

**Tags**: Local, Marketplace, Food ordering

**Contact details**:
- Email: `chinmichael705@gmail.com` *(interim — swap to hello@passtheplates.app once business email is set up)*
- Website: `https://www.passtheplates.app`

**Privacy Policy URL**: same as above

---

## Notes / open items

- **Support URL**: both stores want a real, reachable page — right now that's
  just the live app itself. Worth building a real `/support` or `/help` page
  (even a simple one on the marketing site) before submitting, rather than
  pointing straight at the app root.
- **Screenshots**: waiting on demo listing photos — see the screenshot task
  in progress separately.
- **Keywords**: App Store keywords are worth revisiting after a few weeks of
  real search data in App Store Connect's analytics.
