import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import Placeholder from './Placeholder'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// CARTO's free "basemaps.cartocdn.com" tiles (used here previously) started
// requiring an API key partway through this project's life — every tile
// came back as a watermarked "API KEY REQUIRED" placeholder instead of an
// actual map. Standard OpenStreetMap tiles are the genuinely free,
// no-signup fallback (the same tile server Leaflet's own docs default to),
// so that's what actually renders now. OSM only ships one light-toned
// tileset — there's no separate "dark" set the way CARTO offered — so dark
// mode fakes it with a CSS filter on the tile images instead (a standard,
// widely-used Leaflet trick), rather than dropping the auto-switching
// dark map entirely.
const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Tracks the app's resolved light/dark mode (system preference, overridden
// by the in-app toggle's data-theme attribute) so the tile layer — the one
// thing here CSS variables can't reach — swaps with everything else.
function useIsDarkMode() {
  const [isDark, setIsDark] = useState(() => resolveIsDark())

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const recompute = () => setIsDark(resolveIsDark())
    media.addEventListener('change', recompute)
    const observer = new MutationObserver(recompute)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      media.removeEventListener('change', recompute)
      observer.disconnect()
    }
  }, [])

  return isDark
}

function resolveIsDark() {
  const explicit = document.documentElement.getAttribute('data-theme')
  if (explicit === 'dark') return true
  if (explicit === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function sellerIcon(seller) {
  const initial = (seller.name || '?').charAt(0).toUpperCase()
  const soldOutClass = seller.allSoldOut ? ' plates-map-pin--sold-out' : ''
  const badgeContent = seller.avatar
    ? `<img src="${seller.avatar}" alt="" />`
    : initial
  return L.divIcon({
    className: 'plates-map-pin-wrapper',
    html: `<div class="plates-map-pin${soldOutClass}"><div class="plates-map-pin__badge">${badgeContent}</div><div class="plates-map-pin__tail"></div></div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -44],
  })
}

export default function KitchensMap({ listings, onSelect }) {
  const isDark = useIsDarkMode()

  const sellers = useMemo(() => {
    const map = new Map()
    listings.forEach((l) => {
      if (l.sellerLat == null || l.sellerLng == null) return
      if (!map.has(l.sellerId)) {
        map.set(l.sellerId, {
          sellerId: l.sellerId,
          name: l.seller,
          avatar: l.sellerAvatar,
          neighborhood: l.sellerNeighborhood,
          lat: l.sellerLat,
          lng: l.sellerLng,
          listings: [],
        })
      }
      map.get(l.sellerId).listings.push(l)
    })
    return Array.from(map.values()).map((s) => ({
      ...s,
      allSoldOut: s.listings.every((l) => l.available === false),
    }))
  }, [listings])

  if (sellers.length === 0) {
    return (
      <Placeholder
        compact
        icon="📍"
        title="No sellers nearby yet"
        body="Once sellers add a neighborhood to their profile, they'll show up here."
      />
    )
  }

  const bounds = sellers.map((s) => [s.lat, s.lng])

  return (
    <MapContainer
      key={sellers.map((s) => s.sellerId).join(',')}
      bounds={bounds}
      boundsOptions={{ padding: [30, 30], maxZoom: 13 }}
      style={{ height: '420px', width: '100%', borderRadius: '16px' }}
      scrollWheelZoom={false}
    >
      {/* Keyed on isDark so toggling Appearance while the map is already open
          fully recreates the tile layer — Leaflet only applies a changed
          className to newly-created tile images, not ones already sitting
          in the DOM, so without this the filter would only "catch up" once
          panning/zooming happened to load fresh tiles. */}
      <TileLayer
        key={isDark ? 'dark' : 'light'}
        attribution={TILE_ATTRIBUTION}
        url={TILES}
        className={isDark ? 'plates-map-tiles-dark' : ''}
      />
      {sellers.map((s) => (
        <Marker key={s.sellerId} position={[s.lat, s.lng]} icon={sellerIcon(s)}>
          <Popup>
            <div className="min-w-[160px]">
              <p className="text-sm font-medium">{s.name}</p>
              {s.neighborhood && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                  {s.neighborhood}
                </p>
              )}
              <div className="flex flex-col gap-1 mt-1.5">
                {s.listings.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onSelect(l)}
                    className="text-xs text-left underline"
                    style={{ color: 'var(--forest-dark)' }}
                  >
                    {l.title} — ${l.price}
                    {l.available === false && ' (Sold)'}
                  </button>
                ))}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
