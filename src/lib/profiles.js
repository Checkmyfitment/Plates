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

export async function fetchReferralCount(userId) {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', userId)
  if (error) throw error
  return count ?? 0
}
