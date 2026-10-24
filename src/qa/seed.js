export const QA_USER = '00000000-0000-4000-8000-000000000001'
const iso = (daysAgo, hour = 12) => new Date(Date.now() - daysAgo * 86400000 + (hour - 12) * 3600000).toISOString()

export const QA_PROFILE = {
  id: QA_USER,
  name: 'QA Tester',
  kitchen: 'QA Test Kitchen',
  bio: 'Fake account used only for click-through testing.',
  avatar_url: null,
  neighborhood: 'Berkeley',
  lat: 37.8716,
  lng: -122.2727,
  signup_intent: 'both',
  phone_verified: false,
  is_admin: false,
  is_pro: false,
  pro_until: null,
  banned: false,
  deleted_at: null,
  on_vacation: false,
  is_food_truck: false,
  social_link: null,
  created_at: iso(40),
}

const orderRow = (id, status, over = {}) => ({
  id,
  listing_id: 'qa-listing-1',
  buyer_id: QA_USER,
  seller_id: 'qa-seller-1',
  quantity: 2,
  note: null,
  price_at_order: 9,
  status,
  created_at: iso(3),
  cart_id: null,
  fulfillment_method: 'pickup',
  delivery_address: null,
  pickup_code: '4821',
  buyer_marked_paid: false,
  seller_marked_paid: false,
  subscription_id: null,
  listing: { title: 'Classic Sourdough Loaf', photo: '🍞', photo_url: null },
  buyer: { name: 'QA Tester' },
  seller: { name: 'Sam Whitfield' },
  ...over,
})

export const BUYER_ORDERS = [
  orderRow('o1', 'pending', { created_at: iso(0) }),
  orderRow('o2', 'confirmed', { created_at: iso(1) }),
  orderRow('o3', 'ready', { created_at: iso(2), note: 'No rush' }),
  orderRow('o4', 'completed', { created_at: iso(9) }),
  orderRow('o5', 'cancelled', { created_at: iso(12) }),
  orderRow('o6', 'cancel_requested', { created_at: iso(4) }),
]

export const SELLER_ORDERS = [
  orderRow('s1', 'pending', { buyer_id: 'qa-buyer-1', seller_id: QA_USER, buyer: { name: 'Maria Santos' }, seller: { name: 'QA Tester' }, created_at: iso(0) }),
  orderRow('s2', 'preparing', { buyer_id: 'qa-buyer-2', seller_id: QA_USER, buyer: { name: 'Yuki Tanaka' }, seller: { name: 'QA Tester' }, created_at: iso(1) }),
]

export const NOTIFICATIONS = [
  { id: 'n1', user_id: QA_USER, listing_id: null, message: 'Sam Whitfield confirmed your order.', read: false, created_at: iso(0) },
  { id: 'n2', user_id: QA_USER, listing_id: null, message: 'Maria Santos posted new tamales.', read: true, created_at: iso(2) },
]

export const CHATS = [
  {
    id: 'c1',
    listing_id: 'qa-listing-1',
    buyer_id: QA_USER,
    buyer_last_read_at: iso(5),
    seller_last_read_at: iso(5),
    buyer: { name: 'QA Tester' },
    listing: { title: 'Classic Sourdough Loaf', photo: '🍞', photo_url: null, bg: '#e6f5ee', seller_id: 'qa-seller-1', seller: { name: 'Sam Whitfield' } },
    messages: [
      { id: 'm1', sender_id: QA_USER, text: 'Hi! Is the loaf still available for Saturday?', photo_url: null, created_at: iso(1, 10) },
      { id: 'm2', sender_id: 'qa-seller-1', text: 'Yes! Pickup is 9-11am.', photo_url: null, created_at: iso(1, 11) },
    ],
    created_at: iso(1),
  },
]

// ---- trust & safety (admin) fakes -------------------------------------------
const minsAgo = (m) => new Date(Date.now() - m * 60_000).toISOString()
const hrsAgo = (h) => minsAgo(h * 60)

export const ADMIN_USERS = [
  { id: 'u-fresh', name: 'Fresh Account', email: 'fresh.acct99@gmail.com', is_admin: false, banned: false, is_pro: false, created_at: hrsAgo(5) },
  { id: 'u-milli', name: 'mlllicent pottinger', email: 'pottingerrose@yahoo.com', is_admin: false, banned: false, is_pro: false, created_at: hrsAgo(40) },
  { id: 'u-old', name: 'Sam Whitfield', email: 'sam@example.com', is_admin: false, banned: false, is_pro: true, created_at: hrsAgo(24 * 45) },
]

export const PRESENCE = [
  { user_id: 'u-fresh', last_seen_at: minsAgo(0.5) },
  { user_id: 'u-old', last_seen_at: hrsAgo(3) },
]

export const RISK = [
  { user_id: 'u-fresh', name: 'Fresh Account', email: 'fresh.acct99@gmail.com', joined_at: hrsAgo(5), account_age_hours: 5, total_messages: 9, flagged_messages: 6, people_messaged: 5, flags: ['asks to move off-app', 'phone number', 'scam-style payment'], last_flagged_at: minsAgo(20), score: 9, level: 'high' },
  { user_id: 'u-milli', name: 'mlllicent pottinger', email: 'pottingerrose@yahoo.com', joined_at: hrsAgo(40), account_age_hours: 40, total_messages: 3, flagged_messages: 1, people_messaged: 1, flags: ['link'], last_flagged_at: hrsAgo(6), score: 3, level: 'medium' },
]

export function overviewFor(id) {
  const u = ADMIN_USERS.find((x) => x.id === id) ?? ADMIN_USERS[0]
  const fresh = id === 'u-fresh'
  return {
    id: u.id, name: u.name, email: u.email, signup_intent: 'buyer', neighborhood: fresh ? null : 'Berkeley',
    is_admin: false, is_pro: u.is_pro, banned: u.banned, joined_at: u.created_at, last_sign_in_at: hrsAgo(1),
    email_confirmed: true, providers: fresh ? ['email'] : ['google'],
    listings_count: fresh ? 0 : 3, orders_as_buyer: fresh ? 0 : 6, orders_as_seller: fresh ? 0 : 11,
    chats_started: fresh ? 6 : 2, chats_received: fresh ? 0 : 9, messages_sent: fresh ? 9 : 40,
    first_message_at: fresh ? new Date(Date.parse(u.created_at) + 4 * 60_000).toISOString() : hrsAgo(24 * 40),
    reports_against: fresh ? 2 : 0, reports_filed: 0, last_seen_at: fresh ? minsAgo(0.5) : hrsAgo(3),
  }
}

export function sessionsFor() {
  // a plausible month: most days, evenings, a few mornings
  const out = []
  for (let d = 0; d < 30; d++) {
    if (d % 4 === 3) continue
    const evening = new Date(); evening.setDate(evening.getDate() - d); evening.setHours(19 + (d % 3), 10, 0, 0)
    out.push({ started_at: evening.toISOString(), last_seen_at: new Date(evening.getTime() + (6 + (d % 9)) * 60_000).toISOString() })
    if (d % 5 === 0) {
      const morning = new Date(evening); morning.setHours(8, 5, 0, 0)
      out.push({ started_at: morning.toISOString(), last_seen_at: new Date(morning.getTime() + 4 * 60_000).toISOString() })
    }
  }
  return out
}

export const RELATED = [
  { id: 'u-sock', name: 'Fresh Acct', email: 'freshacct99@gmail.com', banned: true, joined_at: hrsAgo(5.1), reasons: ['same email address once dots and + tags are ignored', 'signed up within 15 minutes'] },
]
