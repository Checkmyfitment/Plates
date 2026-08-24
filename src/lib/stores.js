import { supabase } from './supabaseClient'

const PENDING_CLAIM_KEY = 'plates_pending_claim'

// Persisted separately from the URL because if email confirmation is on, the
// user leaves the app (to click the confirmation link in their inbox) and
// comes back on a bare URL with the original ?claim= param gone.
export function savePendingClaim(code) {
  try {
    localStorage.setItem(PENDING_CLAIM_KEY, code)
  } catch (err) {
    console.error('Failed to save pending claim code', err)
  }
}

export function getPendingClaim() {
  try {
    return localStorage.getItem(PENDING_CLAIM_KEY)
  } catch (err) {
    console.error('Failed to read pending claim code', err)
    return null
  }
}

export function clearPendingClaim() {
  try {
    localStorage.removeItem(PENDING_CLAIM_KEY)
  } catch (err) {
    console.error('Failed to clear pending claim code', err)
  }
}

export async function claimStore(claimCode) {
  const { data, error } = await supabase.rpc('claim_store', { p_claim_code: claimCode })
  if (error) throw error
  return data?.[0] ?? null
}

// Buyer-safe store info only (name/kitchen/neighborhood/contact note) —
// reads from unclaimed_store_public, which deliberately excludes claim_code.
export async function fetchPublicStores(ids) {
  const unique = [...new Set(ids)].filter(Boolean)
  if (unique.length === 0) return {}
  const { data, error } = await supabase
    .from('unclaimed_store_public')
    .select('id, name, kitchen, neighborhood, contact_note, lat, lng')
    .in('id', unique)
  if (error) throw error
  return Object.fromEntries(data.map((s) => [s.id, s]))
}
