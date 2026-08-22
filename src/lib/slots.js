import { supabase } from './supabaseClient'

function mapSlot(row, reservedCount) {
  return {
    id: row.id,
    listingId: row.listing_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    reservedCount: reservedCount ?? 0,
  }
}

export async function fetchSlots(listingId) {
  const { data: slots, error } = await supabase
    .from('pickup_slots')
    .select('*')
    .eq('listing_id', listingId)
    .order('starts_at', { ascending: true })
  if (error) throw error
  if (slots.length === 0) return []

  const ids = slots.map((s) => s.id)
  const { data: counts, error: countsError } = await supabase
    .from('pickup_slot_counts')
    .select('*')
    .in('slot_id', ids)
  if (countsError) throw countsError
  const countMap = new Map(counts.map((c) => [c.slot_id, c.reserved_count]))

  return slots.map((s) => mapSlot(s, countMap.get(s.id)))
}

export async function fetchMyReservedSlotIds(buyerId, slotIds) {
  if (!slotIds.length) return new Set()
  const { data, error } = await supabase
    .from('pickup_reservations')
    .select('slot_id')
    .eq('buyer_id', buyerId)
    .in('slot_id', slotIds)
  if (error) throw error
  return new Set(data.map((r) => r.slot_id))
}

export async function createSlot({ listingId, startsAt, endsAt, capacity }) {
  const { data, error } = await supabase
    .from('pickup_slots')
    .insert({ listing_id: listingId, starts_at: startsAt, ends_at: endsAt, capacity: capacity || null })
    .select()
    .single()
  if (error) throw error
  return mapSlot(data, 0)
}

export async function deleteSlot(id) {
  const { error } = await supabase.from('pickup_slots').delete().eq('id', id)
  if (error) throw error
}

export async function reserveSlot(slotId, buyerId) {
  const { error } = await supabase.from('pickup_reservations').insert({ slot_id: slotId, buyer_id: buyerId })
  if (error) throw error
}

export async function cancelReservation(slotId, buyerId) {
  const { error } = await supabase.from('pickup_reservations').delete().eq('slot_id', slotId).eq('buyer_id', buyerId)
  if (error) throw error
}

export function formatSlotRange(startsAt, endsAt) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const dateLabel = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${dateLabel} · ${startTime}–${endTime}`
}
