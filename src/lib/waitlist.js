import { supabase } from './supabaseClient'

// Routed through an RPC (security definer) rather than a direct table
// insert — the function runs with elevated privileges internally, so it
// only needs an EXECUTE grant instead of relying on anon-role table
// grants/RLS lining up for a true anonymous write. No account required,
// works for guests.
export async function joinAreaWaitlist({ email, neighborhood }) {
  const { error } = await supabase.rpc('join_area_waitlist', { p_email: email, p_neighborhood: neighborhood })
  if (error) throw error
}
