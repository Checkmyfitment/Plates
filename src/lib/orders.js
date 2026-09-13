import { supabase } from './supabaseClient'
import { startOrGetChat, sendMessage as sendChatMessage } from './chats'

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
    subscriptionId: row.subscription_id,
  }
}

const ORDER_SELECT = `
  id, listing_id, buyer_id, seller_id, quantity, note, price_at_order, status, created_at, cart_id,
  fulfillment_method, delivery_address, pickup_code, buyer_marked_paid, seller_marked_paid, subscription_id,
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

// any order at all, any seller, any status -- just "have they ever placed
// one" for the buyer getting-started checklist, not a completion count
export async function fetchHasEverOrdered(buyerId) {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', buyerId)
  if (error) throw error
  return (count ?? 0) > 0
}

// how many of a buyer's orders are still "live" right now -- used to give
// the My Orders entry point a badge, since this is the one thing on the
// profile screen that reflects something actively happening, not a static
// setting
export async function fetchOpenOrderCount(buyerId) {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', buyerId)
    .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'cancel_requested'])
  if (error) throw error
  return count ?? 0
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

// posts a short system-style chat message for an order status change the
// other side should see in their inbox, not just the notifications bell —
// mirrors the "🛒 New order: ..." message already sent when an order is
// placed (see placeOrderAndNotify in App.jsx). Best-effort: a chat hiccup
// here shouldn't surface as a failure of the status change itself, which
// has already succeeded in the database by the time this runs.
async function postOrderChatMessage(anchorOrder, actingUserId, text) {
  try {
    const chatId = await startOrGetChat({ id: anchorOrder.listingId }, anchorOrder.buyerId)
    await sendChatMessage(chatId, actingUserId, text)
  } catch (err) {
    console.error('Failed to post order chat message', err)
  }
}

function summarizeItems(orders) {
  return orders.length === 1
    ? `${orders[0].quantity}x ${orders[0].listingTitle}`
    : orders.map((o) => `${o.quantity}x ${o.listingTitle}`).join(', ')
}

export async function updateOrderStatus(orderId, status, reason, actingUserId) {
  const patch = { status }
  if ((status === 'cancelled' || status === 'cancel_requested') && reason) patch.cancellation_reason = reason
  const { data, error } = await supabase.from('orders').update(patch).eq('id', orderId).select(ORDER_SELECT).single()
  if (error) throw error
  const order = mapOrder(data)
  if (actingUserId && (status === 'cancelled' || status === 'cancel_requested')) {
    const who = actingUserId === order.buyerId ? 'Buyer' : 'Seller'
    const reasonSuffix = reason ? ` — "${reason}"` : ''
    const text =
      status === 'cancelled'
        ? `🚫 ${who} cancelled the order (${summarizeItems([order])})${reasonSuffix}`
        : `🚫 Requested to cancel (${summarizeItems([order])})${reasonSuffix}. Waiting on the seller to approve or decline.`
    await postOrderChatMessage(order, actingUserId, text)
  }
  return order
}

export async function updateCartStatus(cartId, status, reason, actingUserId) {
  const patch = { status }
  if ((status === 'cancelled' || status === 'cancel_requested') && reason) patch.cancellation_reason = reason
  const { data, error } = await supabase.from('orders').update(patch).eq('cart_id', cartId).select(ORDER_SELECT)
  if (error) throw error
  const orders = data.map(mapOrder)
  if (actingUserId && orders.length && (status === 'cancelled' || status === 'cancel_requested')) {
    const who = actingUserId === orders[0].buyerId ? 'Buyer' : 'Seller'
    const reasonSuffix = reason ? ` — "${reason}"` : ''
    const text =
      status === 'cancelled'
        ? `🚫 ${who} cancelled the order (${summarizeItems(orders)})${reasonSuffix}`
        : `🚫 Requested to cancel (${summarizeItems(orders)})${reasonSuffix}. Waiting on the seller to approve or decline.`
    await postOrderChatMessage(orders[0], actingUserId, text)
  }
  return orders
}

// seller approving a buyer's cancellation request (order was already
// 'cancel_requested', not a fresh cancel) — separate from updateOrderStatus
// above so its chat message reads correctly rather than colliding with the
// generic "cancelled" phrasing
export async function approveCancellationRequest(groupId, isCart, actingUserId) {
  let query = supabase.from('orders').update({ status: 'cancelled' })
  query = isCart ? query.eq('cart_id', groupId) : query.eq('id', groupId)
  const { data, error } = await query.select(ORDER_SELECT)
  if (error) throw error
  const orders = data.map(mapOrder)
  if (orders.length) {
    await postOrderChatMessage(orders[0], actingUserId, `✅ Approved the cancellation request (${summarizeItems(orders)}).`)
  }
  return orders
}

// seller declining a buyer's cancellation request — order goes back to
// 'confirmed' rather than staying stuck in limbo
export async function declineCancellationRequest(groupId, isCart, actingUserId) {
  let query = supabase.from('orders').update({ status: 'confirmed' })
  query = isCart ? query.eq('cart_id', groupId) : query.eq('id', groupId)
  const { data, error } = await query.select(ORDER_SELECT)
  if (error) throw error
  const orders = data.map(mapOrder)
  if (orders.length) {
    await postOrderChatMessage(
      orders[0],
      actingUserId,
      `❌ Declined the cancellation request (${summarizeItems(orders)}) — order is still confirmed.`,
    )
  }
  return orders
}

// non-binding "I paid" / "I got paid" recordkeeping toggle — no payment
// processing involved, just removes the "did they pay?" ambiguity in chat
export async function markOrderPaid(orderId, paid = true) {
  const { error } = await supabase.rpc('mark_order_paid', { p_order_id: orderId, p_paid: paid })
  if (error) throw error
}

function csvEscape(value) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// a seller's own record of what they've earned, for their own tax/bookkeeping
// purposes — Plates has no payment processing, so this is just a summary of
// completed orders, not a financial statement
export function ordersToIncomeCSV(orders) {
  const rows = orders
    .filter((o) => o.status === 'completed')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((o) => {
      const total = o.priceAtOrder * o.quantity
      return [
        new Date(o.createdAt).toLocaleDateString(),
        o.listingTitle,
        o.buyerName,
        o.quantity,
        o.priceAtOrder.toFixed(2),
        total.toFixed(2),
      ]
    })
  const grandTotal = rows.reduce((sum, r) => sum + Number(r[5]), 0)
  const lines = [
    ['Date', 'Item', 'Buyer', 'Quantity', 'Price', 'Total'],
    ...rows,
    ['', '', '', '', 'Grand total', grandTotal.toFixed(2)],
  ]
  return lines.map((row) => row.map(csvEscape).join(',')).join('\n')
}
