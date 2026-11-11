# Pass the Plates -- promotion & ads plan (drafted 2026-10-27)

## What exists / what is still needed

| Piece | Who makes it | Status |
|---|---|---|
| Real app captures (home, map, listing) | Claude, from the iOS simulator | Done: `promo/raw/` |
| Ad graphics in 4 formats x 3 screens | Claude, `scripts/make-ad-graphics.py` | Done: `promo/graphics/` (12 files) |
| Real screen-recording clips of the app | Claude, `xcrun simctl io recordVideo` while driving the simulator | Ready to do once listings have photos (see below) |
| AI food photos and lifestyle video | **You**, in an AI tool (Claude cannot generate images or video) | Prompts below |
| Final video edit (cuts, captions, music) | **You** in CapCut / Canva (free); no video editor is installed on this Mac | Storyboards below |
| Ad accounts + budget | **You** | Not started |

## The one thing that most limits the ads: listings show emoji, not food

Every listing card in the app shows an emoji (bread, plate, taco) where a food photo
goes. That is fine for a beta, but it is the weakest part of every ad, because the
app screen is the thing people look at. Fix this before recording video:

1. Best: ask 3-5 of your real beta cooks for a good photo of their dish (with their OK
   to use it in ads), and have them add it to their listing.
2. Fallback for video only: make a clearly separate **demo account** with a few listings
   using AI-generated or stock food photos, and record the app using that account.
   Do not put made-up cooks into the live marketplace, and do not present demo cooks
   as real people in an ad.

## Concept: "Your neighbor is a great cook."

- **Audience A (buyers, 70% of spend):** adults 25-54 near the launch area who like
  local food, farmers markets, "support local"; parents wanting meal prep.
- **Audience B (cooks, 30%):** home bakers/cooks who already sell via Facebook groups,
  Instagram DMs, or word of mouth. Pitch: your own storefront, orders and chat, free.
- **Launch area first:** run every ad inside one metro (the current listings are Bay
  Area) so a viewer who installs actually finds food nearby. An empty map is the
  fastest way to lose an install.
- **Tone:** warm, specific, un-corporate. Real dishes, real hands, kitchen light.
  Brand colors: deep green `#1D3128` to green `#0F8A5F`, cream `#FBF8EF`, mustard `#E3A72B`.

## Video 1 (hero, 15 s, 9:16): "From a kitchen near you"

| Time | Visual | Made by |
|---|---|---|
| 0-2 s | Close-up: knife splits a sourdough loaf, steam, crackly crust | AI video |
| 2-4 s | Neighbor hands a paper bag over a porch rail, smiling | AI video |
| 4-8 s | **Real screen recording:** open app -> map -> tap a pin -> listing | Claude (simulator) |
| 8-11 s | **Real screen recording:** message the cook -> place order | Claude (simulator) |
| 11-13 s | Table spread: tamales, dumplings, bread, a family eating | AI video |
| 13-15 s | Logo + "Pass the Plates. Homemade food from your neighbors." + store badges | You (editor) |

On-screen text, in order: "Hungry for homemade?" / "Find cooks on your block" / "Order straight from the cook" / "Download free".

## Video 2 (6 s bumper, 9:16): hook only
Loaf is torn open, steam rises. Text: "The best food in town is in your neighbor's kitchen." Logo end card.

## Video 3 (cooks, 15 s, 9:16): "Cooking extra? Sell it."
0-3 s: baker pulls trays from oven. 3-9 s: **real screen recording** of posting a
listing (photo, price, pickup time) in under a minute. 9-12 s: an order notification
arrives. 12-15 s: "Post free. Keep every dollar of the food money." (matches the app:
no cut taken from food sales.)

## AI image prompts (use in Midjourney, Ideogram, Adobe Firefly, or ChatGPT images)

Use 4:5 and 9:16 ratios. Keep every image free of text; the graphics script adds text.

1. "Overhead photo of a rustic wooden table with a golden sourdough loaf, a dozen tamales
   in corn husks, pork and chive dumplings in a bamboo steamer, warm window light,
   natural imperfections, shallow depth of field, editorial food photography"
2. "A smiling woman in her 30s hands a paper bag of fresh bread to a neighbor over a
   front porch rail, golden hour, candid, documentary style, residential street"
3. "Close-up of hands dusting flour over dough in a small home kitchen, morning light,
   cluttered countertop, authentic, not a restaurant"
4. "Open-air porch pickup table with labeled boxes of baked goods and a handwritten
   price sign (no readable text), neighbors chatting, warm evening light"
5. "Single plate of pork tamales unwrapped, steam rising, cilantro and salsa verde,
   dark moody wood background, macro shot"
6. "Family dinner table with several different homemade dishes shared in the middle,
   hands passing plates, joyful, warm tungsten light"

For the in-app photos: "square photo, [dish], on a plain ceramic plate, natural window
light, top-down, no text, no hands" -- generate one per demo listing.

## AI video prompts (Veo, Sora, Runway Gen-4, Kling): 5-8 s clips, vertical 9:16

1. "Slow-motion macro: a bread knife saws through a crusty sourdough loaf, crumbs fall,
   steam rises, warm kitchen light, shallow depth of field, 24fps, no text"
2. "Handheld shot: a neighbor passes a paper bag of baked goods across a porch railing,
   both smile, golden hour, gentle camera movement"
3. "Top-down time-lapse style: hands arrange dumplings, tamales and bread on a wooden
   table until it looks like a feast, soft natural light"
4. "A woman checks her phone in a home kitchen, smiles, then packs a box of cookies"

AI tips: generate 4-6 takes per prompt and keep the best; avoid prompts with readable
text, brand logos, or faces in close-up for long shots (AI faces drift); never use AI to
show the app UI -- that always comes from the real screen recordings.

## Platforms: sizes, copy, and starting budget

Start small and learn: about $10-15/day per platform for 7-10 days, one metro, then
keep only the best creative.

| Platform | Format | Headline / copy to start with |
|---|---|---|
| Instagram + Facebook (Meta) | 9:16 Stories/Reels, 4:5 feed | "Homemade food from your neighbors." / "Find home cooks, bakers & food trucks near you. Message the cook, order, pick up. Free." CTA: Install now |
| TikTok | 9:16 video, 9-15 s, native feel | Hook in first 2 s; "POV: the best bread in town is made two streets over." |
| YouTube Shorts / Google App campaign | 9:16 + 16:9 + 1:1 | Headlines (30 chars): "Homemade food near you" / "Order from local cooks" / "Home cooks & bakers" / "Pass the Plates" / "Fresh from a neighbor". Descriptions (90): "Browse home cooks and bakers nearby. Message, order, and pick up." |
| Apple Search Ads | App Store screenshots (6.9", already made in `store-screenshots/ios-v2`) | Bid on "homemade food", "local food", "home bakery"; keep it exact-match first |
| Nextdoor / local Facebook groups | 1:1 and 4:5 | "A new way to find (and sell) homemade food on your block." Organic posts by you plus cooks beat paid here |

Track every ad with a link tag (UTM) and add Meta/TikTok pixels or the app-install SDK
only after the privacy policy is updated (see below).


## Our own food photos: house style + one prompt per dish

Goal: photos that feel like a real neighbor made and shot them -- the look of good
Marketplace/Instagram home-cook posts -- without copying anyone's picture.

**House style (put this at the end of every prompt):**
"overhead or 45-degree phone-camera photo, natural window light, kitchen counter or
wooden table, takeout container or plain ceramic plate, generous home portion, slightly
imperfect styling, vivid but realistic color, no text, no logos, no hands unless stated,
square 1:1, high detail"

Avoid: restaurant plating, studio backdrops, perfect symmetry, readable text on
anything (AI mangles text), brand packaging, and people's faces.

| File name (save in `promo/photos/`) | Prompt (add the house style after it) |
|---|---|
| `sourdough.jpg` | "Golden sourdough loaf with a crackly, flour-dusted crust, one thick slice cut to show the open crumb, on a linen towel" |
| `jollof-chicken.jpg` | "Smoky orange jollof rice with grilled chicken thighs and fried plantain in a kraft takeout bowl" |
| `dumplings.jpg` | "Two dozen pan-fried pork and chive dumplings with browned bottoms in a foil tray, small cup of dipping sauce" |
| `tamales.jpg` | "A dozen pork tamales, a few unwrapped from corn husks, steaming, salsa verde on the side, in a foil pan" |
| `empanadas.jpg` | "Stack of golden fried empanadas, some bubbly crust, on parchment paper in a takeout box" |
| `meal-prep.jpg` | "Meal-prep bowl: rice, curry chicken with mango salsa, on a banana leaf, held over a counter" |
| `bbq-plate.jpg` | "Takeout plate of glazed smoked sausage, fried chicken, mac and cheese and baked beans in a white clamshell container" |
| `brownies.jpg` | "Fudgy brownies cut into squares with a cracked top, stacked on a cooling rack, a few crumbs on the counter" |
| `cookies.jpg` | "Thick chocolate chip cookies, still slightly gooey, stacked in a brown paper bag on a kitchen counter" |
| `pupusas.jpg` | "Griddled pupusas with a little melted cheese at the edges, curtido slaw on the side, on a paper-lined tray" |

Make 3-4 variations of each and keep the most believable. Each listing photo should
look different from the next: vary the angle, container, and background.

### How the photos get into the ads without touching the live marketplace

The live app is the real marketplace, so demo listings must not go in there. Instead
Claude will use the existing click-through test harness (it uses a fake database and
blocks all saves), put your photos on fake listings, and run the real app screens
against it inside the phone simulator. The screens, buttons and layout are the real
app; only the listing contents are sample data. That is the standard way to make app
previews, and no real cook or customer is shown. Mark ads that use sample listings as
"sample listings" in the fine print if the platform asks.

Next: generate the photos above, drop them in `promo/photos/`, and tell Claude.

## Guardrails (so ads don't get rejected or create legal exposure)

- **Show the real app.** Apple, Google, and Meta all reject ads whose UI doesn't match
  the product. All app screens must come from real captures.
- **AI disclosure.** Meta, TikTok, and YouTube require or add an "AI-generated" label to
  realistic AI video/images; turn the label on rather than hiding it.
- **Food-safety wording.** Cottage-food laws vary by state. Don't claim "inspected",
  "certified", "safe", "health-approved", or "licensed kitchens". Say "homemade",
  "from home cooks", "from your neighbors". This is also the open legal item.
- **No fake people as real.** Don't present AI faces or demo cooks as real customers or
  testimonials (FTC rules on endorsements). Use real beta testers with written OK.
- **Don't promise fees you may change.** "No cut from food sales" is true today; if
  paid promotions or a seller subscription launch, keep the wording accurate.
- **Music:** use the platform's licensed library only.
- **Targeting:** keep 18+. Tracking pixels or an ads SDK would change the Apple
  privacy label and Google Data Safety form and need a Privacy Policy update first.

## Order of work

1. Get real food photos onto 3-5 listings (cooks) or set up the demo account.
2. Claude: re-capture clean screens + record the 3 screen-recording clips.
3. You: generate AI photos/clips from the prompts above; send the files to Claude.
4. Claude: rebuild the graphics with real food photos; write final per-platform copy.
5. You: edit video 1-3 in CapCut using the storyboards; create ad accounts.
6. Launch Meta + TikTok in one metro, $10-15/day each, check results after a week.
