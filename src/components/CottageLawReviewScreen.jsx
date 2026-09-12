import CottageFoodMap from './CottageFoodMap'

// Shown exactly once, right after a seller (or "both") signs up — before
// they've posted anything, not gating whether they can. Purely a
// reference: nothing here blocks or restricts posting in any state; see
// the caption below. Kept as its own screen (not folded into
// OnboardingWalkthrough) since it's only relevant to prospective sellers,
// not every visitor.
export default function CottageLawReviewScreen({ onDone }) {
  return (
    <div
      className="max-w-md mx-auto min-h-screen flex flex-col px-6 pt-8 pb-6"
      style={{ background: 'var(--paper)' }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="text-4xl mb-3 text-center">🗺️</div>
        <h1 className="font-display text-xl text-center" style={{ color: 'var(--forest-dark)' }}>
          Before you post — a quick reference
        </h1>
        <p className="text-sm mt-2 text-center leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          Every state (except one) has its own cottage food / home-kitchen law that lets you sell
          food you make at home — but the specifics vary, and it's on you to know your own state's
          rules. This is just a starting reference, not legal advice.
        </p>
        <div className="mt-5">
          <CottageFoodMap />
        </div>
        <p className="text-xs mt-4 text-center leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          This doesn't restrict what you can post on Plates — you can browse, list, and sell
          anywhere. It's here so you can check your own state before you invest time in a listing,
          not to gate you out of anything. Full details are always in Community Guidelines → "Cottage
          Food Laws by State," from your profile.
        </p>
      </div>
      <button
        onClick={onDone}
        className="pressable w-full mt-4 py-3.5 rounded-2xl font-bold text-sm shrink-0"
        style={{ background: 'var(--forest)', color: 'white' }}
      >
        Got it
      </button>
    </div>
  )
}
