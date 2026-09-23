import { supabase } from './supabaseClient'

export async function updateProfile(
  userId,
  { name, kitchen, avatarUrl, neighborhood, lat, lng, defaultPickupNote, preferredLanguage, bio, socialLink }
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      name,
      kitchen,
      avatar_url: avatarUrl,
      neighborhood,
      lat,
      lng,
      default_pickup_note: defaultPickupNote,
      preferred_language: preferredLanguage,
      bio,
      social_link: socialLink,
    })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// anonymizes the profile and signs the account out for good — see
// migration_account_settings.sql for why this doesn't hard-delete the row
export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function setAreaAlertsEnabled(userId, enabled) {
  const { error } = await supabase.from('profiles').update({ area_alerts_enabled: enabled }).eq('id', userId)
  if (error) throw error
}

export async function setVacationMode(userId, onVacation) {
  const { error } = await supabase.from('profiles').update({ on_vacation: onVacation }).eq('id', userId)
  if (error) throw error
}

export async function setFoodTruckStatus(userId, isFoodTruck) {
  const { error } = await supabase.from('profiles').update({ is_food_truck: isFoodTruck }).eq('id', userId)
  if (error) throw error
}

// manual "I'm here today" check-in -- see migration_food_truck.sql. Not
// live/GPS tracking, just a labeled point + timestamp a truck seller
// updates whenever they move.
export async function updateTruckLocation(userId, { label, lat, lng }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      truck_location_label: label,
      truck_location_lat: lat,
      truck_location_lng: lng,
      truck_location_updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchReferralCount(userId) {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', userId)
  if (error) throw error
  return count ?? 0
}

// how many of the caller's own referrals became an active seller in a
// neighborhood that had real, demonstrated demand (an area waitlist
// signup) but no seller yet — always scoped server-side to auth.uid()
export async function fetchPioneerReferralCount() {
  const { data, error } = await supabase.rpc('get_pioneer_referral_count')
  if (error) throw error
  return data ?? 0
}
