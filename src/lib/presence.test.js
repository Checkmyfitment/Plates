import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const rpc = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('./supabaseClient', () => ({ supabase: { rpc: (...a) => rpc(...a) } }))

const { startPresence, HEARTBEAT_MS } = await import('./presence')

function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
}

describe('startPresence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    rpc.mockClear()
    setVisibility('visible')
  })
  afterEach(() => {
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('reports straight away, then once a minute', () => {
    const stop = startPresence()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('touch_presence')
    vi.advanceTimersByTime(HEARTBEAT_MS * 3)
    expect(rpc).toHaveBeenCalledTimes(4)
    stop()
  })

  it('stays quiet while the app is hidden', () => {
    setVisibility('hidden')
    const stop = startPresence()
    vi.advanceTimersByTime(HEARTBEAT_MS * 2)
    expect(rpc).not.toHaveBeenCalled()
    stop()
  })

  it('reports again when the app comes back to the foreground', () => {
    setVisibility('hidden')
    const stop = startPresence()
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(rpc).toHaveBeenCalledTimes(1)
    stop()
  })

  it('stops completely once cleaned up', () => {
    const stop = startPresence()
    stop()
    rpc.mockClear()
    vi.advanceTimersByTime(HEARTBEAT_MS * 3)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(rpc).not.toHaveBeenCalled()
  })

  it('shrugs off a failed beat', () => {
    rpc.mockImplementationOnce(() => Promise.reject(new Error('offline')))
    const stop = startPresence()
    stop()
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})
