import { supabase } from './supabaseClient'

// throttled per exact message+context so a render loop or a repeating
// rejection doesn't flood the table with thousands of identical rows in
// one browser session — one report per distinct error is plenty to know
// something's broken
const loggedThisSession = new Set()

export async function logClientError({ message, stack, context, userId }) {
  if (!message) return
  const key = `${context ?? ''}:${message}`.slice(0, 200)
  if (loggedThisSession.has(key)) return
  loggedThisSession.add(key)

  try {
    let resolvedUserId = userId
    if (resolvedUserId === undefined) {
      const { data } = await supabase.auth.getSession()
      resolvedUserId = data?.session?.user?.id ?? null
    }
    await supabase.from('client_errors').insert({
      user_id: resolvedUserId,
      message: String(message).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 4000) : null,
      context: context ?? null,
      path: typeof window !== 'undefined' ? window.location.pathname + window.location.search : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
    })
  } catch {
    // a failure logging an error would be a little on the nose — just drop it
  }
}

function mapError(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user?.name ?? null,
    message: row.message,
    stack: row.stack,
    context: row.context,
    path: row.path,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }
}

export async function fetchClientErrors(limit = 100) {
  const { data, error } = await supabase
    .from('client_errors')
    .select('id, user_id, message, stack, context, path, user_agent, created_at, user:profiles(name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.map(mapError)
}

export async function deleteClientError(id) {
  const { error } = await supabase.from('client_errors').delete().eq('id', id)
  if (error) throw error
}

export async function clearClientErrors(ids) {
  const { error } = await supabase.from('client_errors').delete().in('id', ids)
  if (error) throw error
}
