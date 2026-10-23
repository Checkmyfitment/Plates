import { useEffect, useRef } from 'react'
import { recordSponsorEvent } from '../lib/sponsors'

// A clearly labeled "Sponsored" card that sits in the Browse grid. The label
// is always visible and never styled to look like a normal listing -- both
// app stores (and the FTC) expect ads to be recognizable as ads.
export default function SponsoredCard({ sponsor }) {
  const ref = useRef(null)
  const counted = useRef(false)

  // count one impression the first time at least half the card is on screen
  useEffect(() => {
    const el = ref.current
    if (!el || counted.current) return undefined
    const count = () => {
      if (counted.current) return
      counted.current = true
      recordSponsorEvent(sponsor.id, 'impression')
    }
    if (typeof IntersectionObserver === 'undefined') {
      count()
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          count()
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [sponsor.id])

  const open = () => {
    recordSponsorEvent(sponsor.id, 'click')
    window.open(sponsor.linkUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={open}
      aria-label={`Sponsored: ${sponsor.name}${sponsor.tagline ? `. ${sponsor.tagline}` : ''}. Opens ${sponsor.ctaLabel} in your browser.`}
      className="pressable col-span-2 w-full rounded-2xl border overflow-hidden text-left flex items-stretch"
      style={{ borderColor: 'var(--rule)', background: 'var(--card)', boxShadow: 'var(--shadow-card)' }}
    >
      {sponsor.imageUrl && (
        <img src={sponsor.imageUrl} alt="" className="w-24 shrink-0 object-cover" loading="lazy" />
      )}
      <span className="min-w-0 flex-1 px-3.5 py-3 flex flex-col gap-0.5">
        <span className="text-[10px] font-bold tracking-wide uppercase" style={{ color: 'var(--ink-soft)' }}>
          Sponsored
        </span>
        <span className="text-sm font-bold truncate">{sponsor.name}</span>
        {sponsor.tagline && (
          <span className="text-xs line-clamp-2" style={{ color: 'var(--ink-soft)' }}>
            {sponsor.tagline}
          </span>
        )}
        <span className="text-xs font-bold mt-1" style={{ color: 'var(--forest)' }}>
          {sponsor.ctaLabel} →
        </span>
      </span>
    </button>
  )
}
