import { useRef, useState } from 'react'
import Logo from './Logo'

const screens = [
  {
    icon: '🍽️',
    title: 'Welcome to Plates',
    body: 'Homemade food from home cooks in your own neighborhood — not a restaurant, not a chain, just your neighbors.',
  },
  {
    icon: '🔍',
    title: 'Browse & order',
    body: 'Find something you like, message the seller directly, and arrange pickup (or delivery, if they offer it). No middleman.',
  },
  {
    icon: '👩‍🍳',
    title: 'Got something to sell?',
    body: 'Post a listing in a couple minutes — a photo, a price, a pickup window — and neighbors nearby can find it right away.',
  },
]

// how far (in px) a swipe has to travel horizontally before it counts as a
// page change, rather than an incidental drag/scroll attempt
const SWIPE_THRESHOLD = 50

export default function OnboardingWalkthrough({ onDone }) {
  const [step, setStep] = useState(0)
  const isLast = step === screens.length - 1
  const screen = screens[step]
  const touchStartX = useRef(null)

  const goNext = () => (isLast ? onDone() : setStep((s) => s + 1))
  const goPrev = () => setStep((s) => Math.max(0, s - 1))

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (delta <= -SWIPE_THRESHOLD) goNext()
    else if (delta >= SWIPE_THRESHOLD) goPrev()
  }

  return (
    // h-dvh (not min-h-screen) -- this screen's content is a fixed
    // decorative layout, not a scrolling page, and 100vh on a real device
    // (vs. simulator/desktop browser) measures taller than the actual
    // visible area once the status bar/home indicator safe areas are
    // accounted for, which left the Skip/Next controls requiring a
    // scroll to reach. h-dvh + overflow-hidden here pins the screen to
    // the real visible viewport; the inner content column gets its own
    // overflow-y-auto as a safety net so a smaller device shrinks the
    // decorative content instead of ever pushing Next off-screen.
    <div
      className="max-w-md mx-auto h-dvh overflow-hidden flex flex-col px-6"
      style={{ background: 'var(--paper)' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex justify-end pt-6 shrink-0">
        <button onClick={onDone} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          Skip
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-center gap-4 py-6">
        <Logo size={40} />
        <div className="text-6xl">{screen.icon}</div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--forest-dark)' }}>
          {screen.title}
        </h1>
        <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--ink-soft)' }}>
          {screen.body}
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-6 shrink-0">
        {screens.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            aria-label={`Go to screen ${i + 1}`}
            className="rounded-full transition-all"
            style={{
              width: i === step ? 18 : 6,
              height: 6,
              background: i === step ? 'var(--ink)' : 'var(--rule)',
            }}
          />
        ))}
      </div>

      <button
        onClick={goNext}
        className="pressable w-full mb-8 py-3.5 rounded-2xl font-bold text-sm shrink-0"
        style={{ background: 'var(--forest)', color: 'white' }}
      >
        {isLast ? 'Get started' : 'Next'}
      </button>
    </div>
  )
}
