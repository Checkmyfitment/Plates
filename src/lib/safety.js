import { supabase } from './supabaseClient'

// Trust & safety data for the Admin screens. Every call here goes through an
// admin_* database function that checks is_admin() itself, so a non-admin
// calling any of these just gets an error back. See
// supabase/migration_trust_safety.sql.

// the app reports "I'm open" about once a minute (see lib/presence.js), so
// someone counts as online if we heard from them within a couple of beats
export const ONLINE_WITHIN_MS = 150_000

export function isOnline(lastSeenAt, now = Date.now()) {
  if (!lastSeenAt) return false
  return now - new Date(lastSeenAt).getTime() <= ONLINE_WITHIN_MS
}

export function lastSeenText(lastSeenAt, now = Date.now()) {
  if (!lastSeenAt) return 'No activity recorded yet'
  if (isOnline(lastSeenAt, now)) return 'Online now'
  const minutes = Math.floor((now - new Date(lastSeenAt).getTime()) / 60_000)
  if (minutes < 60) return `Last seen ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Last seen ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Last seen ${days}d ago`
  return `Last seen ${new Date(lastSeenAt).toLocaleDateString()}`
}

// "3 hours", "2 days" -- how long ago something was, for a sentence
export function ageText(fromIso, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60_000))
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// Turns a list of visits into what the activity charts show. Days and hours
// are bucketed in the viewer's own time zone, so "9 PM" means 9 PM for the
// admin looking at it.
export function summarizeSessions(sessions, { days = 30, now = Date.now() } = {}) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const daily = []
  const indexByDay = new Map()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    indexByDay.set(dayKey(date), daily.length)
    daily.push({ date, count: 0 })
  }

  const hours = Array(24).fill(0)
  let totalMinutes = 0
  let counted = 0

  for (const s of sessions) {
    const start = new Date(s.startedAt)
    const slot = indexByDay.get(dayKey(start))
    if (slot !== undefined) daily[slot].count += 1
    hours[start.getHours()] += 1
    const minutes = Math.max(0, (new Date(s.lastSeenAt).getTime() - start.getTime()) / 60_000)
    totalMinutes += minutes
    counted += 1
  }

  const total = sessions.length
  const activeDays = daily.filter((d) => d.count > 0).length
  const peak = Math.max(...hours)

  return {
    daily,
    hours,
    total,
    activeDays,
    avgPerActiveDay: activeDays ? Math.round((total / activeDays) * 10) / 10 : 0,
    avgMinutes: counted ? Math.round(totalMinutes / counted) : 0,
    peakHour: peak > 0 ? hours.indexOf(peak) : null,
  }
}

// 0 -> "12 AM", 13 -> "1 PM"
export function hourLabel(hour) {
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`
}

// Plain-language things worth a second look about one person. Hints only --
// none of these prove anything on their own.
export function userSignals(overview, related = [], now = Date.now()) {
  if (!overview) return []
  const signals = []
  const joinedMs = new Date(overview.joinedAt).getTime()
  const ageHours = (now - joinedMs) / 3_600_000

  if (overview.banned) signals.push({ tone: 'warn', text: 'This account is banned.' })
  if (ageHours < 72) signals.push({ tone: 'warn', text: `New account — joined ${ageText(overview.joinedAt, now)} ago.` })

  if (overview.firstMessageAt) {
    const gapMinutes = (new Date(overview.firstMessageAt).getTime() - joinedMs) / 60_000
    if (gapMinutes >= 0 && gapMinutes < 10) {
      signals.push({
        tone: 'warn',
        text: `Sent a first message ${Math.max(1, Math.round(gapMinutes))} minute${Math.round(gapMinutes) <= 1 ? '' : 's'} after signing up.`,
      })
    }
  }

  if (overview.chatsStarted >= 5 && ageHours < 24 * 7) {
    signals.push({ tone: 'warn', text: `Started ${overview.chatsStarted} conversations in its first week.` })
  }

  if (overview.reportsAgainst > 0) {
    signals.push({
      tone: 'warn',
      text: `${overview.reportsAgainst} report${overview.reportsAgainst === 1 ? '' : 's'} filed against this person.`,
    })
  }

  if (related.some((r) => r.banned)) {
    signals.push({ tone: 'warn', text: 'Possibly linked to a banned account.' })
  }
  if (related.length > 0) {
    signals.push({
      tone: 'info',
      text: `${related.length} possibly related account${related.length === 1 ? '' : 's'} (see below).`,
    })
  }

  return signals
}

function mapOverview(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    signupIntent: row.signup_intent,
    neighborhood: row.neighborhood,
    isAdmin: row.is_admin,
    isPro: row.is_pro,
    banned: row.banned,
    joinedAt: row.joined_at,
    lastSignInAt: row.last_sign_in_at,
    emailConfirmed: row.email_confirmed,
    providers: row.providers ?? [],
    listingsCount: Number(row.listings_count ?? 0),
    ordersAsBuyer: Number(row.orders_as_buyer ?? 0),
    ordersAsSeller: Number(row.orders_as_seller ?? 0),
    chatsStarted: Number(row.chats_started ?? 0),
    chatsReceived: Number(row.chats_received ?? 0),
    messagesSent: Number(row.messages_sent ?? 0),
    firstMessageAt: row.first_message_at,
    reportsAgainst: Number(row.reports_against ?? 0),
    reportsFiled: Number(row.reports_filed ?? 0),
    lastSeenAt: row.last_seen_at,
  }
}

export async function fetchPresenceSnapshot() {
  const { data, error } = await supabase.rpc('admin_presence_snapshot')
  if (error) throw error
  return (data ?? []).map((r) => ({ userId: r.user_id, lastSeenAt: r.last_seen_at }))
}

export async function fetchUserOverview(userId) {
  const { data, error } = await supabase.rpc('admin_user_overview', { p_user_id: userId })
  if (error) throw error
  return data?.[0] ? mapOverview(data[0]) : null
}

export async function fetchUserSessions(userId, days = 30) {
  const { data, error } = await supabase.rpc('admin_user_sessions', { p_user_id: userId, p_days: days })
  if (error) throw error
  return (data ?? []).map((r) => ({ startedAt: r.started_at, lastSeenAt: r.last_seen_at }))
}

export async function fetchRelatedAccounts(userId) {
  const { data, error } = await supabase.rpc('admin_related_accounts', { p_user_id: userId })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    banned: r.banned,
    joinedAt: r.joined_at,
    reasons: r.reasons ?? [],
  }))
}

export async function fetchRiskSenders(days = 14) {
  const { data, error } = await supabase.rpc('admin_risk_senders', { p_days: days })
  if (error) throw error
  return (data ?? []).map((r) => ({
    userId: r.user_id,
    name: r.name,
    email: r.email,
    joinedAt: r.joined_at,
    accountAgeHours: Number(r.account_age_hours ?? 0),
    totalMessages: Number(r.total_messages ?? 0),
    flaggedMessages: Number(r.flagged_messages ?? 0),
    peopleMessaged: Number(r.people_messaged ?? 0),
    flags: r.flags ?? [],
    lastFlaggedAt: r.last_flagged_at,
    score: r.score,
    level: r.level,
  }))
}
