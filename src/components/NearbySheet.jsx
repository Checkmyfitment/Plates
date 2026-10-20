import { useEffect, useRef, useState } from 'react'
import { distanceMiles, formatDistance } from '../lib/geo'

// Bottom sheet for the Map tab, in three heights. Peeking, it shows a
// horizontally-scrolling carousel of big photo preview cards -- a taste of
// what's actually nearby, not just a count. Expanded, it's a full scrollable
// list and the map above shrinks to a strip (see onLevelChange). Minimized,
// it's just the handle row, so the whole map is visible.
// Swipe the sheet up/down (or tap the handle) to step between heights; tapping
// the map or empty space outside the sheet, or pressing Escape, steps it down
// one level. The sheet swallows vertical drags itself -- otherwise they chain
// through to the page behind it, which on an iPhone scrolls the whole page
// (and the header with it).
const LEVELS = ['min', 'peek', 'expanded']
const HEIGHTS = { min: '64px', peek: '224px', expanded: 'min(64vh, 460px)' }
const SWIPE_PX = 30

export default function NearbySheet({ listings, userLocation, onSelect, onLevelChange }) {
  const [level, setLevel] = useState('peek')
  const expanded = level === 'expanded'
  const sheetRef = useRef(null)
  const listRef = useRef(null)
  const levelRef = useRef(level)
  levelRef.current = level
  const swiped = useRef(false)
  const hasItems = listings.length > 0

  const step = (dir) => {
    setLevel((cur) => LEVELS[Math.min(LEVELS.length - 1, Math.max(0, LEVELS.indexOf(cur) + dir))])
  }

  useEffect(() => {
    onLevelChange?.(level)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level])

  useEffect(() => {
    if (level === 'min') return undefined
    const onClick = (e) => {
      if (sheetRef.current?.contains(e.target)) return
      // buttons, links and form controls elsewhere on the page do their own
      // thing -- only the map itself and blank space count as "outside"
      if (e.target.closest('button, a, select, input, label') && !e.target.closest('.leaflet-container')) return
      step(-1)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') step(-1)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [level])

  // vertical swipes anywhere on the sheet move it between heights
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return undefined
    let start = null
    const onStart = (e) => {
      start = { y: e.touches[0].clientY, x: e.touches[0].clientX, done: false }
      swiped.current = false
    }
    const onMove = (e) => {
      if (!start) return
      const dy = e.touches[0].clientY - start.y
      const dx = e.touches[0].clientX - start.x
      // sideways drags belong to the carousel
      if (Math.abs(dx) > Math.abs(dy)) return
      const cur = levelRef.current
      const listAtTop = !listRef.current || listRef.current.scrollTop <= 0
      // an expanded list scrolls normally; only a downward drag from its top
      // (or from the handle) collapses the sheet
      const ownsDrag = cur !== 'expanded' || (dy > 0 && listAtTop)
      if (!ownsDrag) return
      if (e.cancelable) e.preventDefault()
      if (start.done || Math.abs(dy) < SWIPE_PX) return
      start.done = true
      swiped.current = true
      setTimeout(() => {
        swiped.current = false
      }, 400)
      step(dy < 0 ? 1 : -1)
    }
    const onEnd = () => {
      start = null
    }
    sheet.addEventListener('touchstart', onStart, { passive: true })
    sheet.addEventListener('touchmove', onMove, { passive: false })
    sheet.addEventListener('touchend', onEnd)
    sheet.addEventListener('touchcancel', onEnd)
    return () => {
      sheet.removeEventListener('touchstart', onStart)
      sheet.removeEventListener('touchmove', onMove)
      sheet.removeEventListener('touchend', onEnd)
      sheet.removeEventListener('touchcancel', onEnd)
    }
  }, [hasItems])

  const withDistance = listings
    .map((l) => ({
      ...l,
      distance: userLocation && l.sellerLat != null && l.sellerLng != null
        ? distanceMiles(userLocation.lat, userLocation.lng, l.sellerLat, l.sellerLng)
        : null,
    }))
    .sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0
      if (a.distance == null) return 1
      if (b.distance == null) return -1
      return a.distance - b.distance
    })

  if (withDistance.length === 0) return null

  return (
    <div
      ref={sheetRef}
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[416px] rounded-2xl border bg-[var(--card)] z-20 overflow-hidden transition-[height] duration-300 ease-out flex flex-col"
      style={{
        borderColor: 'var(--rule)',
        boxShadow: 'var(--shadow-float)',
        bottom: 'calc(5.75rem + env(safe-area-inset-bottom))',
        height: HEIGHTS[level],
        overscrollBehavior: 'contain',
      }}
    >
      <button
        type="button"
        onClick={() => {
          // a swipe also ends in a click -- don't double-handle it
          if (swiped.current) {
            swiped.current = false
            return
          }
          setLevel((cur) => (cur === 'peek' ? 'expanded' : 'peek'))
        }}
        aria-expanded={expanded}
        aria-label={`${withDistance.length} dish${withDistance.length === 1 ? '' : 'es'} nearby. ${expanded ? 'Collapse' : 'Expand'} list`}
        className="pressable shrink-0 w-full flex flex-col items-center pt-2 pb-2 px-4"
      >
        <span className="w-9 h-1 rounded-full mb-2.5" style={{ background: 'var(--rule)' }} />
        <span className="w-full flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: 'var(--forest-dark)' }}>
            📍 {withDistance.length} dish{withDistance.length === 1 ? '' : 'es'} nearby
          </span>
          <span
            className="text-xs transition-transform duration-300"
            style={{ color: 'var(--ink-soft)', transform: expanded ? 'rotate(180deg)' : 'none' }}
          >
            ▲
          </span>
        </span>
      </button>

      {level === 'min' ? null : expanded ? (
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">
          {withDistance.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelect(l)}
              className="pressable w-full flex items-center gap-3 py-2.5 text-left border-t first:border-t-0"
              style={{ borderColor: 'var(--rule)' }}
            >
              <div
                className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-xl overflow-hidden"
                style={{ background: l.bg }}
              >
                {l.photoUrl ? <img src={l.photoUrl} alt="" className="w-full h-full object-cover" /> : l.photo}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{l.title}</p>
                <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
                  {l.sellerIsFoodTruck && '🚚 '}
                  {l.seller}
                  {l.distance != null && ` · ${formatDistance(l.distance)}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-bold" style={{ color: 'var(--forest-dark)' }}>
                  ${l.price}
                </span>
                {l.openNow && (
                  <p className="text-[10px] font-bold flex items-center justify-end gap-1" style={{ color: 'var(--forest)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--forest)' }} />
                    Open
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 flex gap-3 overflow-x-auto overscroll-contain px-4 pb-4"
          style={{ scrollSnapType: 'x proximity', touchAction: 'pan-x' }}
        >
          {withDistance.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelect(l)}
              className="pressable shrink-0 w-[132px] rounded-2xl border overflow-hidden text-left"
              style={{ borderColor: 'var(--rule)', background: 'var(--card)', scrollSnapAlign: 'start' }}
            >
              <div className="w-full h-[100px] relative flex items-center justify-center text-4xl overflow-hidden" style={{ background: l.bg }}>
                {l.photoUrl ? <img src={l.photoUrl} alt="" className="w-full h-full object-cover" /> : l.photo}
                {l.sellerIsFoodTruck && (
                  <span
                    className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                    style={{ background: 'rgba(27,24,21,0.82)', color: 'white' }}
                  >
                    🚚
                  </span>
                )}
                {l.openNow && (
                  <span
                    className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1"
                    style={{ background: 'rgba(27,24,21,0.82)', color: 'var(--forest)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--forest)' }} />
                    Open
                  </span>
                )}
              </div>
              <div className="px-2 py-1.5">
                <p className="text-xs font-bold leading-tight line-clamp-2">{l.title}</p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--ink-soft)' }}>
                  {l.distance != null ? formatDistance(l.distance) : l.seller}
                </p>
                <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--forest-dark)' }}>
                  ${l.price}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
