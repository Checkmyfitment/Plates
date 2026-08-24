import { supabase, SUPABASE_URL } from './supabaseClient'
import { fetchPublicStores } from './stores'
import { SITE_URL } from './siteInfo'

function mapListing(row, store) {
  return {
    id: row.id,
    title: row.title,
    seller: store ? store.name : (row.seller?.name ?? 'Unknown seller'),
    sellerId: row.seller_id,
    sellerKitchen: store ? store.kitchen : (row.seller?.kitchen ?? null),
    sellerAvatar: store ? null : (row.seller?.avatar_url ?? null),
    sellerNeighborhood: store ? store.neighborhood : (row.seller?.neighborhood ?? null),
    // geocoded from the admin-typed neighborhood text when the store was
    // created (see migration_unclaimed_store_geocoding.sql) — null until an
    // admin re-saves an older store that predates geocoding
    sellerLat: store ? (store.lat ?? null) : (row.seller?.lat ?? null),
    sellerLng: store ? (store.lng ?? null) : (row.seller?.lng ?? null),
    price: row.price,
    unit: row.unit,
    tag: row.tag,
    tagType: row.tag_type,
    cuisine: row.cuisine ?? '',
    diet: row.diet ?? [],
    photo: row.photo ?? '🍽️',
    photoUrl: row.photo_url,
    photoUrls: row.photo_urls ?? [],
    bg: row.bg ?? 'var(--paper-dim)',
    allergens: row.allergens ?? [],
    allergensConfirmed: row.allergens_confirmed ?? false,
    minOrderAmount: row.min_order_amount != null ? Number(row.min_order_amount) : null,
    cottageLawConfirmed: row.cottage_law_confirmed ?? false,
    made: row.made,
    pickup: row.pickup,
    pickupDate: row.pickup_date,
    pickupStart: row.pickup_start,
    pickupEnd: row.pickup_end,
    quantityAvailable: row.quantity_available,
    orderCutoffHours: row.order_cutoff_hours,
    description: row.description,
    available: row.available ?? true,
    // separate from `available` on purpose — a seller's own per-listing
    // sold-out toggle should stay untouched while they're on vacation, so
    // it's still correct the moment they come back
    sellerOnVacation: store ? false : (row.seller?.on_vacation ?? false),
    sellerPhoneVerified: store ? false : (row.seller?.phone_verified ?? false),
    deliveryAvailable: row.delivery_available ?? false,
    deliveryNotes: row.delivery_notes,
    views: row.views ?? 0,
    featured: row.featured ?? false,
    unclaimedStoreId: row.unclaimed_store_id ?? null,
    unclaimedContactNote: store?.contact_note ?? null,
  }
}

const SELLER_JOIN =
  'seller:profiles!listings_seller_id_fkey(name, kitchen, avatar_url, neighborhood, lat, lng, on_vacation, phone_verified)'

export async function fetchListings() {
  const { data, error } = await supabase
    .from('listings')
    .select(`*, ${SELLER_JOIN}`)
    .order('created_at', { ascending: false })
  if (error) throw error

  const storesById = await fetchPublicStores(data.map((row) => row.unclaimed_store_id))
  return data.map((row) => mapListing(row, storesById[row.unclaimed_store_id]))
}

async function resolveStoreFor(row) {
  if (!row.unclaimed_store_id) return null
  const storesById = await fetchPublicStores([row.unclaimed_store_id])
  return storesById[row.unclaimed_store_id] ?? null
}

export async function insertListing({
  sellerId,
  title,
  price,
  unit,
  description,
  allergens,
  allergensConfirmed,
  minOrderAmount,
  cottageLawConfirmed,
  pickup,
  pickupDate,
  pickupStart,
  pickupEnd,
  quantityAvailable,
  orderCutoffHours,
  photoUrl,
  photoUrls,
  deliveryAvailable,
  deliveryNotes,
  cuisine,
  diet,
  unclaimedStoreId,
}) {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: sellerId,
      title,
      price,
      unit,
      description,
      allergens,
      allergens_confirmed: allergensConfirmed ?? false,
      min_order_amount: minOrderAmount || null,
      cottage_law_confirmed: cottageLawConfirmed ?? false,
      pickup,
      pickup_date: pickupDate || null,
      pickup_start: pickupStart || null,
      pickup_end: pickupEnd || null,
      quantity_available: quantityAvailable ?? null,
      order_cutoff_hours: orderCutoffHours ?? null,
      photo_url: photoUrl,
      photo_urls: photoUrls ?? [],
      photo: '🍽️',
      bg: 'var(--paper-dim)',
      tag: 'New',
      tag_type: 'fresh',
      cuisine: cuisine || 'Homemade',
      diet: diet ?? [],
      made: 'Just now',
      delivery_available: deliveryAvailable ?? false,
      delivery_notes: deliveryNotes || null,
      unclaimed_store_id: unclaimedStoreId || null,
    })
    .select(`*, ${SELLER_JOIN}`)
    .single()
  if (error) throw error
  return mapListing(data, await resolveStoreFor(data))
}

export async function updateListing(
  id,
  {
    title,
    price,
    unit,
    description,
    allergens,
    allergensConfirmed,
    minOrderAmount,
    cottageLawConfirmed,
    pickup,
    pickupDate,
    pickupStart,
    pickupEnd,
    quantityAvailable,
    orderCutoffHours,
    photoUrl,
    photoUrls,
    deliveryAvailable,
    deliveryNotes,
    cuisine,
    diet,
  },
) {
  const { data, error } = await supabase
    .from('listings')
    .update({
      title,
      price,
      unit,
      description,
      allergens,
      allergens_confirmed: allergensConfirmed ?? false,
      min_order_amount: minOrderAmount || null,
      cottage_law_confirmed: cottageLawConfirmed ?? false,
      pickup,
      pickup_date: pickupDate || null,
      pickup_start: pickupStart || null,
      pickup_end: pickupEnd || null,
      quantity_available: quantityAvailable ?? null,
      order_cutoff_hours: orderCutoffHours ?? null,
      photo_url: photoUrl,
      photo_urls: photoUrls ?? [],
      delivery_available: deliveryAvailable ?? false,
      delivery_notes: deliveryNotes || null,
      cuisine: cuisine || 'Homemade',
      diet: diet ?? [],
    })
    .eq('id', id)
    .select(`*, ${SELLER_JOIN}`)
    .single()
  if (error) throw error
  return mapListing(data, await resolveStoreFor(data))
}

function formatTime(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: m ? '2-digit' : undefined })
}

// null when the listing hasn't set a structured pickup time — the caller
// should fall back to the free-text `pickup` field in that case
export function formatPickupTime(listing) {
  if (!listing.pickupDate) return null
  const date = new Date(`${listing.pickupDate}T00:00:00`)
  const dateStr = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const start = formatTime(listing.pickupStart)
  const end = formatTime(listing.pickupEnd)
  if (start && end) return `${dateStr} · ${start}–${end}`
  if (start) return `${dateStr} · ${start}`
  return dateStr
}

// mirrors the DB-side check in handle_order_check_cutoff — only meaningful
// (and enforced) when a listing has both a structured pickup date/time and
// a cutoff set; this client-side copy just lets the UI close ordering
// early instead of waiting for the server to reject it
export function isOrderingClosed(listing) {
  if (listing.orderCutoffHours == null || !listing.pickupDate || !listing.pickupStart) return false
  const pickupAt = new Date(`${listing.pickupDate}T${listing.pickupStart}`)
  const cutoffAt = new Date(pickupAt.getTime() - listing.orderCutoffHours * 60 * 60 * 1000)
  return Date.now() > cutoffAt.getTime()
}

export async function deleteListing(id) {
  const { error } = await supabase.from('listings').delete().eq('id', id)
  if (error) throw error
}

export async function incrementListingViews(id) {
  const { error } = await supabase.rpc('increment_listing_views', { p_listing_id: id })
  if (error) throw error
}

export async function setListingAvailability(id, available) {
  const { data, error } = await supabase
    .from('listings')
    .update({ available })
    .eq('id', id)
    .select(`*, ${SELLER_JOIN}`)
    .single()
  if (error) throw error
  return mapListing(data, await resolveStoreFor(data))
}

// Once SITE_URL (src/lib/siteInfo.js) has been set to the app's real
// deployed URL, shared links route through the share-listing edge function
// so they unfurl into a rich preview card (photo/title/price) in
// Messages/Slack/social. Until then, sharing falls back to a plain in-app
// deep link — still works, just no preview card, since a card pointing at
// a placeholder domain wouldn't be useful.
export function getListingShareLink(id) {
  const isPlaceholderSite = SITE_URL.includes('yourplatesapp.com')
  if (isPlaceholderSite) {
    return `${window.location.origin}${window.location.pathname}?listing=${id}`
  }
  return `${SUPABASE_URL}/functions/v1/share-listing?id=${id}`
}
