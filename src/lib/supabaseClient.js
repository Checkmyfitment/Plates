import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const REMEMBER_KEY = 'plates_remember_me'

// "Remember me" unchecked -> session lives in sessionStorage, so closing
// the tab/browser logs you out. Checked (the default, matching the
// behavior every login had before this existed) -> localStorage, which
// survives closing and reopening the browser. supabase-js only takes one
// storage adapter at client-creation time, so this wraps both and decides
// which one to actually use on every read/write based on the stored flag.
function preferredStorage() {
  let remember = true
  try {
    remember = localStorage.getItem(REMEMBER_KEY) !== 'false'
  } catch {
    // ignore — default to remembered
  }
  return remember ? window.localStorage : window.sessionStorage
}

// exported for tests — the actual storage-picking logic that matters here
export const authStorage = {
  getItem: (key) => preferredStorage().getItem(key),
  setItem: (key, value) => preferredStorage().setItem(key, value),
  removeItem: (key) => preferredStorage().removeItem(key),
}

// call before signIn/signUp so the session about to be written lands in
// the right storage
export function setRememberMe(remember) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false')
  } catch {
    // ignore — worst case this login always stays remembered
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: authStorage },
})
export const SUPABASE_URL = supabaseUrl
