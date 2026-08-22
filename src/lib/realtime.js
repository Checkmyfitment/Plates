import { supabase } from './supabaseClient'

// Subscribes to Postgres changes on a table and returns an unsubscribe
// function. Row-level security still applies on top of this — a broad,
// unfiltered subscription only ever delivers rows the connected user's own
// select policy already allows, same as a normal fetch would.
export function subscribeToTable(table, { event = '*', filter, onChange } = {}) {
  const channel = supabase
    .channel(`${table}:${filter ?? 'all'}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event, schema: 'public', table, ...(filter ? { filter } : {}) }, onChange)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
