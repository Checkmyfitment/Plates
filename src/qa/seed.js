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
