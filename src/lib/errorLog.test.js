import { describe, it, expect, vi } from 'vitest'
import { logClientError } from './errorLog'

// the module-level dedup Set is process-wide, so give every test here its
// own unique message text rather than resetting internal state
describe('logClientError', () => {
  it('does nothing for an empty message', async () => {
    const spy = vi.fn()
    await logClientError({ message: '' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('only reports the same message+context once per session', async () => {
    const insertSpy = vi.fn().mockReturnValue({ error: null })
    const { supabase } = await import('./supabaseClient')
    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({ insert: insertSpy })
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null } })

    const message = `Dedup test error ${Math.random()}`
    await logClientError({ message, context: 'test' })
    await logClientError({ message, context: 'test' })
    await logClientError({ message, context: 'test' })

    expect(insertSpy).toHaveBeenCalledTimes(1)
    fromSpy.mockRestore()
  })

  it('treats the same message under a different context as distinct', async () => {
    const insertSpy = vi.fn().mockReturnValue({ error: null })
    const { supabase } = await import('./supabaseClient')
    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({ insert: insertSpy })
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null } })

    const message = `Context test error ${Math.random()}`
    await logClientError({ message, context: 'react-render' })
    await logClientError({ message, context: 'window-error' })

    expect(insertSpy).toHaveBeenCalledTimes(2)
    fromSpy.mockRestore()
  })
})
