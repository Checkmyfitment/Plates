import { useEffect, useRef, useState } from 'react'

const EDGE_PX = 28 // swipe-back has to start this close to the left edge
const BACK_DISTANCE = 90
const REFRESH_DISTANCE = 70 // damped pull distance that arms a refresh
const REFRESH_HOLD = 48
const DISMISS_DISTANCE = 140 // raw finger travel that closes a detail screen
const MAX_PULL = 120

// touches that start on these keep their own behavior (typing, panning the
// map, scrolling a picker) instead of starting a page gesture
const IGNORED = 'input, textarea, select, [contenteditable="true"], .leaflet-container, [data-no-gesture]'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The app's one scrolling region. Adds the three gestures people expect from
// a phone app, without each screen having to know about them:
//   - pull down at the top to refresh (onRefresh)
//   - pull down at the top to close a detail screen (pullToDismiss + onBack)
//   - swipe right from the left edge to go back (onBack)
// The content is nudged with `position: relative` offsets rather than a
// transform, because a transform would also drag the fixed bottom sheet and
// buttons rendered inside it.
export default function GestureLayer({ onBack, onRefresh, pullToDismiss = false, noScroll = false, children }) {
  const scrollRef = useRef(null)
  const contentRef = useRef(null)
  const indicatorRef = useRef(null)
  const [refreshing, setRefreshing] = useState(false)
  const latest = useRef({})
  latest.current = { onBack, onRefresh, pullToDismiss }
  const busyRef = useRef(false)

  useEffect(() => {
    const scroller = scrollRef.current
    const content = contentRef.current
    const indicator = indicatorRef.current
    if (!scroller || !content || !indicator) return undefined
    let g = null

    const setOffset = (x, y, animate) => {
      const t = animate && !prefersReducedMotion() ? 'top 180ms ease, left 180ms ease, opacity 180ms ease' : 'none'
      content.style.transition = t
      indicator.style.transition = animate && !prefersReducedMotion() ? 'top 180ms ease, opacity 180ms ease' : 'none'
      content.style.left = `${x}px`
      content.style.top = `${y}px`
      content.style.opacity = x > 0 ? String(Math.max(0.5, 1 - x / 320)) : '1'
      indicator.style.top = `${y - 40}px`
      indicator.style.opacity = y > 8 ? String(Math.min(1, y / REFRESH_DISTANCE)) : '0'
    }

    // a nested scroller (an expanded sheet, a chat list) that isn't at its top
    // owns the downward drag
    const insideScrolledArea = (node) => {
      for (let n = node; n && n !== content; n = n.parentElement) {
        if (n.scrollTop > 0) return true
      }
      return false
    }

    const onStart = (e) => {
      g = null
      if (busyRef.current || e.touches.length !== 1) return
      if (e.target.closest?.(IGNORED)) return
      const touch = e.touches[0]
      const { onBack: back, onRefresh: refresh, pullToDismiss: dismiss } = latest.current
      const rect = scroller.getBoundingClientRect()
      g = {
        x: touch.clientX,
        y: touch.clientY,
        edge: !!back && touch.clientX - rect.left <= EDGE_PX,
        canPull: (!!refresh || (dismiss && !!back)) && scroller.scrollTop <= 0 && !insideScrolledArea(e.target),
        mode: null,
        dx: 0,
        dy: 0,
      }
    }

    const onMove = (e) => {
      if (!g) return
      const touch = e.touches[0]
      g.dx = touch.clientX - g.x
      g.dy = touch.clientY - g.y
      if (!g.mode) {
        if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) return
        if (g.edge && g.dx > 0 && g.dx > Math.abs(g.dy)) g.mode = 'back'
        else if (g.canPull && g.dy > 0 && g.dy > Math.abs(g.dx)) g.mode = 'pull'
        else {
          g = null
          return
        }
      }
      if (e.cancelable) e.preventDefault()
      if (g.mode === 'back') setOffset(Math.max(0, g.dx * 0.8), 0, false)
      else setOffset(0, Math.min(MAX_PULL, Math.max(0, g.dy) * 0.5), false)
    }

    const onEnd = async () => {
      const gesture = g
      g = null
      if (!gesture || !gesture.mode) return
      const { onBack: back, onRefresh: refresh, pullToDismiss: dismiss } = latest.current
      if (gesture.mode === 'back') {
        setOffset(0, 0, false)
        if (gesture.dx >= BACK_DISTANCE && back) back()
        return
      }
      const damped = Math.min(MAX_PULL, gesture.dy * 0.5)
      if (dismiss && back) {
        setOffset(0, 0, true)
        if (gesture.dy >= DISMISS_DISTANCE) back()
        return
      }
      if (refresh && damped >= REFRESH_DISTANCE) {
        busyRef.current = true
        setRefreshing(true)
        setOffset(0, REFRESH_HOLD, true)
        try {
          // never flash the spinner for less than half a second, so a fast
          // refresh still reads as "something happened"
          await Promise.all([refresh(), new Promise((resolve) => setTimeout(resolve, 500))])
        } catch (err) {
          console.error('Refresh failed', err)
        } finally {
          busyRef.current = false
          setRefreshing(false)
          setOffset(0, 0, true)
        }
        return
      }
      setOffset(0, 0, true)
    }

    scroller.addEventListener('touchstart', onStart, { passive: true })
    scroller.addEventListener('touchmove', onMove, { passive: false })
    scroller.addEventListener('touchend', onEnd)
    scroller.addEventListener('touchcancel', onEnd)
    return () => {
      scroller.removeEventListener('touchstart', onStart)
      scroller.removeEventListener('touchmove', onMove)
      scroller.removeEventListener('touchend', onEnd)
      scroller.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={indicatorRef}
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full border flex items-center justify-center pointer-events-none"
        style={{
          top: -40,
          opacity: 0,
          background: 'var(--card)',
          borderColor: 'var(--rule)',
          boxShadow: 'var(--shadow-float)',
          color: 'var(--forest)',
        }}
      >
        <span className={refreshing ? 'inline-block animate-spin' : 'inline-block'}>{refreshing ? '↻' : '↓'}</span>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {refreshing ? 'Refreshing' : ''}
      </span>
      {/* pb-40 (160px) clears the floating bottom nav on any current device --
          see the note that used to sit on this div in App.jsx */}
      <div
        ref={scrollRef}
        className={`flex-1 min-h-0 overflow-x-hidden overscroll-contain pb-40 ${noScroll ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
      >
        <div ref={contentRef} style={{ position: 'relative' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
