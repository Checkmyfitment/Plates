// order matters: the fetch stub must be installed before the Supabase client
// is created (it captures `fetch` when it is built)
import './qaFetch.js'
import './helpers.js'
import '../main.jsx'
