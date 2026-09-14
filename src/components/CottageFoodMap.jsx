import { useState } from 'react'
import USAMapImport from 'react-usa-map'
import { ABBR_BY_STATE, hasCottageFoodProgram } from '../lib/cottageFoodStates'

// react-usa-map is a CJS package with a UMD-wrapped default export. This
// project's build (rolldown-vite) interops that as a *node-mode* require,
// which unconditionally sets `.default` to the whole CJS exports object
// instead of unwrapping it -- so a plain `import USAMap from 'react-usa-map'`
// silently became the exports object itself in production (never in dev,
// which is what let this ship: React then threw "invalid element type" the
// moment CottageFoodMap rendered <USAMap>, since an object isn't a valid
// component type). Unwrapping defensively here handles either shape.
const USAMap = USAMapImport.default ?? USAMapImport

// customize() is computed once per render, keyed by the two-letter
// abbreviations react-usa-map's own geometry uses -- every state gets a
// fill and a click handler that just records which one was clicked (no
// navigation, nothing blocking; see the caption below the legend).
function buildCustomize(onPick) {
  const config = {}
  for (const [name, abbr] of Object.entries(ABBR_BY_STATE)) {
    const hasProgram = hasCottageFoodProgram(name)
    config[abbr] = {
      fill: hasProgram ? 'var(--forest)' : 'var(--plum)',
      clickHandler: () => onPick(name),
    }
  }
  return config
}

// Purely a visual, at-a-glance reference — never a gate. Nothing here
// stops anyone from posting or browsing in any state; it exists so a
// prospective seller can see, before they invest any time, whether their
// state currently has a cottage food program at all. See "Cottage Food
// Laws by State" (the text list this map sits above) for the same fact in
// an accessible, searchable form, and the National Ag Law Center link for
// the real, current source.
export default function CottageFoodMap() {
  const [picked, setPicked] = useState(null)
  const pickedHasProgram = picked ? hasCottageFoodProgram(picked) : null

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'var(--forest)' }} />
          Program exists — rules still apply
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'var(--plum)' }} />
          No program currently
        </span>
      </div>
      {/* Green covers most of the country here (49 of 50 states), which
          reads at a glance like "no restrictions apply" -- exactly
          backwards from what this map means. Having a program is the
          minimum bar to sell home-kitchen food *at all*; every green
          state still has its own permit rules, sales caps, and allowed-
          food lists on top of that. This line has to sit right next to
          the map itself, not just in the surrounding page copy or the
          tap-a-state caption below -- most people will see the map
          without reading either. */}
      <p className="text-xs text-center mb-2 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
        Green means home-kitchen sales are possible there, not unrestricted — every state still
        limits what and how much you can sell.
      </p>
      <div
        role="img"
        aria-label="Map of the United States color-coded by whether each state currently has a cottage food program. New Jersey is the only state without one — every other state still sets its own permit, sales-cap, and allowed-food rules on top of having a program. See the text list below for every state by name."
        style={{ maxWidth: 480, margin: '0 auto' }}
      >
        <USAMap customize={buildCustomize(setPicked)} onClick={() => {}} />
      </div>
      <div
        data-testid="cottage-food-map-caption"
        className="mt-2 rounded-xl p-2.5 text-xs leading-relaxed text-center"
        style={{
          background: picked ? (pickedHasProgram ? 'var(--forest-soft)' : 'var(--plum-soft)') : 'var(--paper-dim)',
          color: picked ? (pickedHasProgram ? 'var(--forest-dark)' : 'var(--plum)') : 'var(--ink-soft)',
        }}
      >
        {picked ? (
          pickedHasProgram ? (
            <>
              <strong>{picked}</strong> has a cottage food program — confirm your specific city/county
              rules and required disclosure wording before listing.
            </>
          ) : (
            <>
              <strong>{picked}</strong> does not currently have a cottage food program — home-kitchen
              food sales generally aren't legal there outside a licensed commercial kitchen. Confirm
              this directly before listing if you're located here.
            </>
          )
        ) : (
          'Tap a state for a quick reference — this is a starting point, not a legal opinion.'
        )}
      </div>
    </div>
  )
}
