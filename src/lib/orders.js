import { supabase } from './supabaseClient'

// 4-digit code the buyer shows and the seller enters at pickup to confirm
// the right person is collecting the order — not a security boundary
// (the seller can always mark picked up without it), just an in-person
// trust check. Only generated for pickup orders, not delivery.
function generatePickupCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function mapOrder(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing?.title ?? 'A listing',
    listingPhoto: row.listing?.photo ?? '🍽️',
    listingPhotoUrl: row.listing?.photo_url ?? null,
    buyerId: row.buyer_id,
    buyerName: row.buyer?.name ?? 'A neighbor',
    sellerId: row.seller_id,
    sellerName: row.seller?.name ?? 'A neighbor',
    quantity: row.quantity,
    note: row.note,
    priceAtOrder: row.price_at_order,
    status: row.status,
    createdAt: row.created_at,
    cartId: row.cart_id,
    fulfillmentMethod: row.fulfillment_method,
    deliveryAddress: row.delivery_address,
    pickupCode: row.pickup_code,
    buyerMarkedPaid: row.buyer_marked_paid,
    sellerMarkedPaid: row.seller_marked_paid,
  }
}

const ORDER_SELECT = `
  id, listing_id, buyer_id, seller_id, quantity, note, price_at_order, status, created_at, cart_id,
  fulfillment_method, delivery_address, pickup_code, buyer_marked_paid, seller_marked_paid,
  listing:listings(title, photo, photo_url),
  buyer:profiles!orders_buyer_id_fkey(name),
  seller:profiles!orders_seller_id_fkey(name)
`

// collapses order rows that share a cart_id into a single display group;
// every other row (cart_id null — the common case) is its own group of one
export function groupOrders(orders) {
  const groups = new Map()
  for (const order of orders) {
    const key = order.cartId ?? order.id
    if (!groups.has(key)) groups.set(key, { groupId: key, cartId: order.cartId, orders: [] })
    groups.get(key).orders.push(order)
  }
  return [...groups.values()].sort(
    (a, b) => new Date(b.orders[0].createdAt).getTime() - new Date(a.orders[0].createdAt).getTime(),
  )
}

export async function placeOrder({
  listingId,
  buyerId,
  sellerId,
  quantity,
  note,
  priceAtOrder,
  fulfillmentMethod,
  deliveryAddress,
}) {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      quantity,
      note: note || null,
      price_at_order: priceAtOrder,
      fulfillment_method: fulfillmentMethod || 'pickup',
      delivery_address: fulfillmentMethod === 'delivery' ? deliveryAddress || null : null,
      pickup_code: fulfillmentMethod !== 'delivery' ? generatePickupCode() : null,
    })
    .select(ORDER_SELECT)
    .single()
  if (error) throw error
  return mapOrder(data)
}

// places multiple line items from the same seller as one grouped checkout —
// each item is still its own row (so per-item price/quantity/status all
// keep working normally), just tagged with a shared cart_id
export async function placeCartOrder({ items, buyerId, sellerId, note, fulfillmentMethod, deliveryAddress }) {
  const cartId = crypto.randomUUID()
  // one shared code for the whole cart, not one per line item — the buyer
  // only has a single code to show at pickup for a multi-item order
  const pickupCode = fulfillmentMethod !== 'delivery' ? generatePickupCode() : null
  const rows = items.map((item) => ({
    listing_id: item.listingId,
    buyer_id: buyerId,
    seller_id: sellerId,
    quantity: item.quantity,
    note: note || null,
    price_at_order: item.priceAtOrder,
    cart_id: cartId,
    fulfillment_method: fulfillmentMethod || 'pickup',
    delivery_address: fulfillmentMethod === 'delivery' ? deliveryAddress || null : null,
    pickup_code: pickupCode,
  }))
  const { data, error } = await supabase.from('orders').insert(rows).select(ORDER_SELECT)
  if (error) throw error
  return data.map(mapOrder)
}

export async function fetchBuyerOrders(buyerId) {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapOrder)
}

export async function fetchSellerOrders(sellerId) {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapOrder)
}

export async function fetchCompletedOrderCount(buyerId, sellerId) {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', buyerId)
    .eq('seller_id', sellerId)
    .eq('status', 'completed')
  if (error) throw error
  return count ?? 0
}

export async function updateOrderStatus(orderId, status, reason) {
  const patch = { status }
  if (status === 'cancelled' && reason) patch.cancellation_reason = reason
  const { data, error } = await supabase.from('orders').update(patch).eq('id', orderId).select(ORDER_SELECT).single()
  if (error) throw error
  return mapOrder(data)
}

export async function updateCartStatus(cartId, status, reason) {
  const patch = { status }
  if (status === 'cancelled' && reason) patch.cancellation_reason = reason
  const { data, error } = await supabase.from('orders').update(patch).eq('cart_id', cartId).select(ORDER_SELECT)
  if (error) throw error
  return data.map(mapOrder)
}

// non-binding "I paid" / "I got paid" recordkeeping toggle — no payment
// processing involved, just removes the "did they pay?" ambiguity in chat
export async function markOrderPaid(orderId, paid = true) {
  const { error } = await supabase.rpc('mark_order_paid', { p_order_id: orderId, p_paid: paid })
  if (error) throw error
}
