import { supabase } from './supabaseClient'

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

export async function setReportStatus(reportId, status) {
  const { error } = await supabase.from('reports').update({ status }).eq('id', reportId)
  if (error) throw error
}

export async function setUserBanned(userId, banned) {
  const { error } = await supabase.from('profiles').update({ banned }).eq('id', userId)
  if (error) throw error
}

export async function adminDeleteListing(listingId) {
  const { error } = await supabase.from('listings').delete().eq('id', listingId)
  if (error) throw error
}

export async function setListingFeatured(listingId, featured) {
  const { error } = await supabase.from('listings').update({ featured }).eq('id', listingId)
  if (error) throw error
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isAdmin: row.is_admin,
    banned: row.banned,
    createdAt: row.created_at,
  }
}

export async function searchUsers(query) {
  const { data, error } = await supabase.rpc('admin_list_users', { q: query || null })
  if (error) throw error
  return data.map(mapUser)
}

export async function setUserAdmin(userId, isAdmin) {
  const { error } = await supabase.from('profiles').update({ is_admin: isAdmin }).eq('id', userId)
  if (error) throw error
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

export async function createUnclaimedStore({ name, kitchen, neighborhood, contactNote, createdBy }) {
  const { data, error } = await supabase
    .from('unclaimed_stores')
    .insert({
      name,
      kitchen: kitchen || null,
      neighborhood: neighborhood || null,
      contact_note: contactNote || null,
      created_by: createdBy,
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
