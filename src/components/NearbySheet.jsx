import { useState } from 'react'
import { distanceMiles, formatDistance } from '../lib/geo'

// Draggable-feeling bottom sheet for the Map tab. Collapsed, it peeks up
// just enough to show a horizontally-scrolling carousel of big photo
// preview cards -- a taste of what's actually nearby, not just a count --
// and expands to a full scrollable list on tap. A true physics-based drag
// was more risk than this screen needs; a tap-to-toggle sheet gives the
// same "slide up to see more" feel with far less to get wrong.
export default function NearbySheet({ listings, userLocation, onSelect }) {
  const [expanded, setExpanded] = useState(false)

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
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[416px] rounded-2xl border bg-[var(--card)] z-20 overflow-hidden transition-[height] duration-300 ease-out flex flex-col"
      style={{
        borderColor: 'var(--rule)',
        boxShadow: 'var(--shadow-float)',
        bottom: 'calc(5.75rem + env(safe-area-inset-bottom))',
        height: expanded ? 'min(64vh, 460px)' : '224px',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
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

      {expanded ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
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
        <div className="flex-1 min-h-0 flex gap-3 overflow-x-auto px-4 pb-4" style={{ scrollSnapType: 'x proximity' }}>
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
