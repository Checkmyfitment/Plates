import { supabase } from './supabaseClient'

// records an admin action for the Activity log -- never blocks or throws
// into the caller, since a logging failure shouldn't undo a real action
// that already succeeded. admin_id is never passed here; it defaults to
// auth.uid() on the server and is pinned there by RLS.
export async function logAdminAction(action, targetType, targetId, detail) {
  const { error } = await supabase
    .from('admin_actions')
    .insert({ action, target_type: targetType, target_id: targetId ?? null, detail: detail || null })
  if (error) console.error('Failed to log admin action', error)
}

function mapAdminAction(row) {
  return {
    id: row.id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    detail: row.detail,
    adminName: row.admin?.name ?? 'An admin',
    createdAt: row.created_at,
  }
}

export async function fetchAdminActions() {
  const { data, error } = await supabase
    .from('admin_actions')
    .select('id, action, target_type, target_id, detail, created_at, admin:profiles!admin_actions_admin_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data.map(mapAdminAction)
}

// counts for the "needs attention" badges on the Reports/Promotions/Errors
// tabs -- three cheap head-only count queries, no new schema needed
export async function fetchAdminPendingCounts() {
  const [reports, promotions, errors] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('promotion_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('client_errors').select('id', { count: 'exact', head: true }),
  ])
  if (reports.error) throw reports.error
  if (promotions.error) throw promotions.error
  if (errors.error) throw errors.error
  return {
    reports: reports.count ?? 0,
    promotions: promotions.count ?? 0,
    errors: errors.count ?? 0,
  }
}

function mapReport(row) {
  return {
    id: row.id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
    reporterId: row.reporter_id,
    reporterName: row.reporter?.name ?? 'Someone',
    listingId: row.listing_id,
    listingTitle: row.listing?.title ?? null,
    reportedUserId: row.reported_user_id,
    reportedUserName: row.reported?.name ?? null,
    reportedUserBanned: row.reported?.banned ?? false,
  }
}

export async function fetchReports() {
  const { data, error } = await supabase
    .from('reports')
    .select(
      `id, reason, details, status, created_at, reporter_id, listing_id, reported_user_id,
       reporter:profiles!reports_reporter_id_fkey(name),
       listing:listings(title),
       reported:profiles!reports_reported_user_id_fkey(name, banned)`,
    )
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapReport)
}

export async function setReportStatus(reportId, status, detail) {
  const { error } = await supabase.from('reports').update({ status }).eq('id', reportId)
  if (error) throw error
  await logAdminAction(`report_${status}`, 'report', reportId, detail)
}

export async function setUserBanned(userId, banned, detail) {
  const { error } = await supabase.from('profiles').update({ banned }).eq('id', userId)
  if (error) throw error
  await logAdminAction(banned ? 'user_banned' : 'user_unbanned', 'profile', userId, detail)
}

export async function adminDeleteListing(listingId, detail) {
  const { error } = await supabase.from('listings').delete().eq('id', listingId)
  if (error) throw error
  await logAdminAction('listing_deleted', 'listing', listingId, detail)
}

// `until` is only set for a paid promotion (auto-expires via the
// expire_featured_listings() cron job); omit it for an admin's own manual
// feature toggle, which is meant to stay on until turned off by hand.
// `reason` is just the audit-log detail text (e.g. "paid promotion
// approved" vs left blank for a manual toggle).
export async function setListingFeatured(listingId, featured, until, reason) {
  const { error } = await supabase
    .from('listings')
    .update({ featured, featured_until: featured ? (until ?? null) : null })
    .eq('id', listingId)
  if (error) throw error
  await logAdminAction(featured ? 'listing_featured' : 'listing_unfeatured', 'listing', listingId, reason)
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isAdmin: row.is_admin,
    banned: row.banned,
    isPro: row.is_pro,
    createdAt: row.created_at,
  }
}

export async function searchUsers(query) {
  const { data, error } = await supabase.rpc('admin_list_users', { q: query || null })
  if (error) throw error
  return data.map(mapUser)
}

export async function setUserAdmin(userId, isAdmin, detail) {
  const { error } = await supabase.from('profiles').update({ is_admin: isAdmin }).eq('id', userId)
  if (error) throw error
  await logAdminAction(isAdmin ? 'admin_granted' : 'admin_removed', 'profile', userId, detail)
}

// pro_since records when they went Pro (for future record-keeping /
// "member since" display); cleared when Pro is turned off
export async function setUserPro(userId, isPro, detail) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_pro: isPro, pro_since: isPro ? new Date().toISOString() : null })
    .eq('id', userId)
  if (error) throw error
  await logAdminAction(isPro ? 'pro_granted' : 'pro_removed', 'profile', userId, detail)
}

function mapStore(row) {
  return {
    id: row.id,
    name: row.name,
    kitchen: row.kitchen,
    neighborhood: row.neighborhood,
    contactNote: row.contact_note,
    claimCode: row.claim_code,
    claimedBy: row.claimed_by,
    claimedAt: row.claimed_at,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    createdAt: row.created_at,
  }
}

export async function fetchUnclaimedStores() {
  const { data, error } = await supabase
    .from('unclaimed_stores')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapStore)
}

export async function createUnclaimedStore({ name, kitchen, neighborhood, contactNote, createdBy, lat, lng }) {
  const { data, error } = await supabase
    .from('unclaimed_stores')
    .insert({
      name,
      kitchen: kitchen || null,
      neighborhood: neighborhood || null,
      contact_note: contactNote || null,
      created_by: createdBy,
      lat: lat ?? null,
      lng: lng ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return mapStore(data)
}

export async function deleteUnclaimedStore(id) {
  const { error } = await supabase.from('unclaimed_stores').delete().eq('id', id)
  if (error) throw error
}

// resolves a broadcast audience choice down to a list of profile ids —
// deliberately client-side (rather than baked into the RPC) so the admin
// panel can show "this will reach N people" before actually sending
export async function resolveBroadcastAudience(audience, neighborhood) {
  if (audience === 'sellers') {
    const { data, error } = await supabase.from('listings').select('seller_id')
    if (error) throw error
    return [...new Set(data.map((r) => r.seller_id))]
  }
  if (audience === 'buyers') {
    const { data, error } = await supabase.from('orders').select('buyer_id')
    if (error) throw error
    return [...new Set(data.map((r) => r.buyer_id))]
  }
  if (audience === 'neighborhood') {
    if (!neighborhood?.trim()) return []
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('neighborhood', `%${neighborhood.trim()}%`)
    if (error) throw error
    return data.map((r) => r.id)
  }
  const { data, error } = await supabase.from('profiles').select('id')
  if (error) throw error
  return data.map((r) => r.id)
}

// delivers via the in-app notification bell only (no email/push) — those
// use a separate, event-triggered edge-function pathway that an arbitrary
// admin message shouldn't hook into
export async function sendBroadcast(userIds, message) {
  const { data, error } = await supabase.rpc('admin_broadcast', { p_user_ids: userIds, p_message: message })
  if (error) throw error
  return data
}
