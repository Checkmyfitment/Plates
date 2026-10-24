import { supabase } from './supabaseClient'

// While a signed-in person has the app open and visible, tell the server about
// once a minute. That's what lets admins see who is online right now and how
// often and when people use the app (see supabase/migration_trust_safety.sql).
// Only ever reports the caller's own activity -- the server reads who it is
// from their login, never from anything passed in.
export const HEARTBEAT_MS = 60_000

export function startPresence() {
  const beat = () => {
    if (document.visibilityState !== 'visible') return
    // fire-and-forget: a missed beat (offline, brief outage) is harmless and
    // not worth surfacing
    supabase.rpc('touch_presence').then(
      () => {},
      () => {},
    )
  }

  beat()
  const timer = setInterval(beat, HEARTBEAT_MS)
  document.addEventListener('visibilitychange', beat)

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', beat)
  }
}
