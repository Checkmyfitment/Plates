import { useEffect, useState } from 'react'
import { fetchTrendingSellers } from '../lib/trending'

const RANK_STYLES = {
  1: { background: 'var(--mustard)', color: 'var(--forest-dark)' },
  2: { background: 'var(--paper-dim)', color: 'var(--ink)' },
  3: { background: 'var(--paper-dim)', color: 'var(--ink)' },
}

export default function TrendingKitchens({ onOpenSeller, userLocation }) {
  const [sellers, setSellers] = useState([])
  const [nearby, setNearby] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrendingSellers(userLocation)
      .then(({ sellers, nearby }) => {
        setSellers(sellers)
        setNearby(nearby)
      })
      .catch((err) => console.error('Failed to load trending kitchens', err))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation?.lat, userLocation?.lng])

  if (loading || sellers.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>
        {nearby ? '🔥 Trending near you' : "🔥 This week's trending kitchens"}
      </h3>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {sellers.map((s) => (
          <button
            key={s.sellerId}
            onClick={() => onOpenSeller(s.sellerId)}
            className="pressable shrink-0 flex items-center gap-2 rounded-2xl bg-[var(--card)] px-3 py-2 text-left"
            style={{ minWidth: 160, boxShadow: 'var(--shadow-card)' }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={RANK_STYLES[s.rank] ?? { background: 'var(--paper-dim)', color: 'var(--ink-soft)' }}
            >
              {s.rank}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium overflow-hidden shrink-0"
              style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
            >
              {s.avatarUrl ? (
                <img src={s.avatarUrl} alt={s.name} className="w-full h-full object-cover" />
              ) : (
                s.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{s.name}</p>
              {s.neighborhood && (
                <p className="text-[10px] truncate" style={{ color: 'var(--ink-soft)' }}>
                  {s.neighborhood}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
