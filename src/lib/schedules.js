import { supabase } from './supabaseClient'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function mapSchedule(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    weekday: row.weekday,
    pickupStart: row.pickup_start,
    pickupEnd: row.pickup_end,
    capacity: row.capacity,
  }
}

export async function fetchSchedules(listingId) {
  const { data, error } = await supabase
    .from('listing_schedules')
    .select('*')
    .eq('listing_id', listingId)
    .order('weekday', { ascending: true })
  if (error) throw error
  return data.map(mapSchedule)
}

export async function createSchedule({ listingId, weekday, pickupStart, pickupEnd, capacity }) {
  const { data, error } = await supabase
    .from('listing_schedules')
    .insert({
      listing_id: listingId,
      weekday,
      pickup_start: pickupStart,
      pickup_end: pickupEnd,
      capacity: capacity || null,
    })
    .select()
    .single()
  if (error) throw error
  return mapSchedule(data)
}

export async function deleteSchedule(id) {
  const { error } = await supabase.from('listing_schedules').delete().eq('id', id)
  if (error) throw error
}

// key used to look up counts/reservations for a specific (schedule, date) pair
export function occurrenceKey(scheduleId, occurrenceDate) {
  return `${scheduleId}|${occurrenceDate}`
}

export async function fetchOccurrenceCounts(scheduleIds) {
  if (!scheduleIds.length) return new Map()
  const { data, error } = await supabase
    .from('schedule_reservation_counts')
    .select('*')
    .in('schedule_id', scheduleIds)
  if (error) throw error
  return new Map(data.map((c) => [occurrenceKey(c.schedule_id, c.occurrence_date), c.reserved_count]))
}

export async function fetchMyOccurrenceReservations(buyerId, scheduleIds) {
  if (!scheduleIds.length) return new Set()
  const { data, error } = await supabase
    .from('schedule_reservations')
    .select('schedule_id, occurrence_date')
    .eq('buyer_id', buyerId)
    .in('schedule_id', scheduleIds)
  if (error) throw error
  return new Set(data.map((r) => occurrenceKey(r.schedule_id, r.occurrence_date)))
}

export async function reserveOccurrence(scheduleId, occurrenceDate, buyerId) {
  const { error } = await supabase
    .from('schedule_reservations')
    .insert({ schedule_id: scheduleId, occurrence_date: occurrenceDate, buyer_id: buyerId })
  if (error) throw error
}

export async function cancelOccurrenceReservation(scheduleId, occurrenceDate, buyerId) {
  const { error } = await supabase
    .from('schedule_reservations')
    .delete()
    .eq('schedule_id', scheduleId)
    .eq('occurrence_date', occurrenceDate)
    .eq('buyer_id', buyerId)
  if (error) throw error
}

// the next `count` upcoming calendar dates matching `weekday` (0=Sun..6=Sat),
// starting today if today itself matches
export function computeUpcomingOccurrences(weekday, count = 4) {
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  while (cursor.getDay() !== weekday) {
    cursor.setDate(cursor.getDate() + 1)
  }
  const occurrences = []
  for (let i = 0; i < count; i++) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    occurrences.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 7)
  }
  return occurrences
}

export function formatWeekday(weekday) {
  return WEEKDAY_NAMES[weekday] ?? ''
}

export function formatOccurrenceDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatTimeRange(pickupStart, pickupEnd) {
  const toLabel = (time) => {
    const [h, m] = time.split(':').map(Number)
    const date = new Date(2000, 0, 1, h, m)
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return `${toLabel(pickupStart)}–${toLabel(pickupEnd)}`
}
