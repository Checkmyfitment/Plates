// SAMPLE listings for making app previews/ads. Used only by the QA harness
// (open qa.html?samples=1), which never talks to the real database for these
// rows and blocks every write. The cooks are fictional and the photos are
// AI-generated (promo/photos) -- never present them as real people or real
// listings, and label ads "sample listings" where a platform asks.
const hrs = (h) => new Date(Date.now() - h * 3_600_000).toISOString()

const cook = (name, kitchen, neighborhood, lat, lng) => ({
  name, kitchen, avatar_url: null, neighborhood, lat, lng,
  on_vacation: false, phone_verified: true, is_pro: false,
  is_food_truck: false, truck_location_label: null, truck_location_lat: null,
  truck_location_lng: null, truck_location_updated_at: null,
})

const base = {
  tag: null, tag_type: null, diet: [], photo: null, bg: null, photo_urls: [],
  allergens_confirmed: true, min_order_amount: null, cottage_law_confirmed: true,
  pickup_date: null, pickup_start: null, pickup_end: null, quantity_available: null,
  order_cutoff_hours: null, available: true, delivery_available: false,
  delivery_notes: null, featured: false, featured_until: null, unclaimed_store_id: null,
}

const L = (n, title, price, unit, cuisine, photo, seller, sellerId, description, pickup, allergens, hoursAgo, views) => ({
  ...base,
  id: `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`,
  seller_id: sellerId, seller, title, price, unit, cuisine,
  photo_url: `/promo/photos/${photo}.jpg`,
  description, pickup, allergens, made: 'Today', views,
  created_at: hrs(hoursAgo),
})

export const SAMPLE_LISTINGS = [
  L(1, 'Classic Sourdough Loaf', 9, 'loaf', 'Bakery', 'sourdough',
    cook('Hannah B.', "Hannah's Hearth", 'Oceanside, CA', 33.1959, -117.3795), 's-1',
    '72-hour cold ferment, baked in a Dutch oven for a crackly crust and open crumb. Flour, water, salt, and starter. Nothing else.',
    'Wednesday & Saturday mornings · Oceanside', ['Wheat'], 3, 41),
  L(2, 'Jollof Rice with Chicken', 16, 'bowl', 'Caribbean', 'jollof-chicken',
    cook('Abena O.', "Abena's Kitchen", 'Vista, CA', 33.2, -117.2425), 's-2',
    'Smoky party-style jollof with grilled chicken thighs and fried plantain. Mild spice, easy to make hotter.',
    'Friday evenings · Vista', [], 5, 58),
  L(3, 'Pork & Chive Dumplings (24ct)', 18, 'tray', 'Chinese', 'dumplings',
    cook('Mei L.', 'Mei Makes Dumplings', 'Carlsbad, CA', 33.1581, -117.3506), 's-3',
    'Hand-folded, pan-fried until crisp on the bottom. Comes with house chili-soy dipping sauce.',
    'Thursday & Sunday · Carlsbad', ['Wheat', 'Soy'], 8, 73),
  L(4, 'Pork Tamales (dozen)', 22, 'dozen', 'Mexican', 'tamales',
    cook('Lupe R.', "Lupe's Tamales", 'Oceanside, CA', 33.2036, -117.3617), 's-4',
    'Slow-braised pork in red chile, wrapped in fresh masa. Salsa verde on the side.',
    'Saturday mornings · Oceanside', [], 10, 96),
  L(5, 'Beef Empanadas (4)', 14, 'box', 'Other', 'empanadas',
    cook('Camila S.', 'Empanadas de Camila', 'Vista, CA', 33.1928, -117.2277), 's-5',
    'Flaky fried empanadas filled with seasoned beef, olives, and egg. Chimichurri included.',
    'Tuesday & Friday · Vista', ['Wheat', 'Egg'], 14, 37),
  L(6, 'Curry Chicken Meal-Prep Bowl', 12, 'bowl', 'Meal Prep', 'meal-prep',
    cook('Jordan K.', 'Sunday Prep Co.', 'Encinitas, CA', 33.037, -117.2919), 's-6',
    'Coconut curry chicken, jasmine rice, and fresh mango salsa. Packed in glass, ready for the work week.',
    'Sunday afternoons · Encinitas', [], 20, 29),
  L(7, 'BBQ Plate: Sausage & Fried Chicken', 15, 'plate', 'Southern / Soul food', 'bbq-plate',
    cook('Marcus T.', "Marcus's Smokehouse", 'Oceanside, CA', 33.1869, -117.3231), 's-7',
    'Glazed smoked sausage, crispy fried chicken, mac and cheese, and baked beans. A real Sunday plate.',
    'Sunday 12-3 · Oceanside', ['Dairy', 'Wheat'], 26, 112),
  L(8, 'Fudgy Brownies (6)', 12, 'box', 'Desserts', 'brownies',
    cook('Dani V.', 'Dani Bakes', 'Carlsbad, CA', 33.1317, -117.3162), 's-8',
    'Dense, fudgy, crackly-top brownies made with real dark chocolate. Sea salt on top.',
    'Daily after 4pm · Carlsbad', ['Dairy', 'Wheat', 'Egg'], 30, 64),
  L(9, 'Chocolate Chip Cookies (half dozen)', 10, 'half dozen', 'Desserts', 'cookies',
    cook('Priya N.', 'Cookie Counter', 'San Marcos, CA', 33.1434, -117.1661), 's-9',
    'Big, thick, slightly underbaked cookies with dark chocolate chunks and flaky salt.',
    'Wednesday & Friday · San Marcos', ['Dairy', 'Wheat', 'Egg'], 40, 51),
  L(10, 'Pupusas with Curtido (3)', 13, 'plate', 'Other', 'pupusas',
    cook('Rosa M.', "Rosa's Pupusas", 'Escondido, CA', 33.1192, -117.0864), 's-10',
    'Griddled cheese pupusas with crunchy curtido slaw and salsa roja.',
    'Saturday & Sunday · Escondido', ['Dairy'], 48, 45),
]
