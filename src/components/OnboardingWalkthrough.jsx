import { useState } from 'react'
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

export default function OnboardingWalkthrough({ onDone }) {
  const [step, setStep] = useState(0)
  const isLast = step === screens.length - 1
  const screen = screens[step]

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col px-6" style={{ background: 'var(--paper)' }}>
      <div className="flex justify-end pt-6">
        <button onClick={onDone} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 pb-16">
        <Logo size={40} />
        <div className="text-6xl">{screen.icon}</div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--forest-dark)' }}>
          {screen.title}
        </h1>
        <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--ink-soft)' }}>
          {screen.body}
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-6">
        {screens.map((_, i) => (
          <span
            key={i}
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
        onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}
        className="pressable w-full mb-8 py-3.5 rounded-2xl font-bold text-sm"
        style={{ background: 'var(--forest)', color: 'white' }}
      >
        {isLast ? 'Get started' : 'Next'}
      </button>
    </div>
  )
}
