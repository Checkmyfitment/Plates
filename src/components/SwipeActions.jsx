import { useEffect, useRef, useState } from 'react'

const ACTION_WIDTH = 84
const LOCK_PX = 8 // movement before we decide it's a sideways swipe
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Wraps a card so a swipe to the left reveals action buttons behind it, the
// way Mail and Messages do. `actions` is [{ key, label, icon, tone, onClick }]
// with tone 'primary' | 'danger'. Vertical drags still scroll the page, and
// the buttons are hidden from screen readers while closed -- anything offered
// here must also exist as a normal button elsewhere on the card.
export default function SwipeActions({ actions, disabled = false, onOpened, children }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const cardRef = useRef(null)
  const actionsRef = useRef(null)
  const drag = useRef(null)
  const justDragged = useRef(false)
  const width = actions.length * ACTION_WIDTH
  const enabled = !disabled && actions.length > 0

  const place = (offset, animate) => {
    const card = cardRef.current
    const bar = actionsRef.current
    if (!card || !bar) return
    card.style.transition = animate && !prefersReducedMotion() ? 'transform 200ms ease' : 'none'
    card.style.transform = offset ? `translateX(${offset}px)` : ''
    bar.style.opacity = offset < -4 ? '1' : '0'
  }

  const setOpenState = (next) => {
    setOpen(next)
    place(next ? -width : 0, true)
    if (next) onOpened?.()
  }

  // a card that can't be swiped any more (confirming a cancel, status moved
  // on) must not stay stuck open
  useEffect(() => {
    if (!enabled) {
      setOpen(false)
      place(0, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // tap anywhere else, or press Escape, to close
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpenState(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenState(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onPointerDown = (e) => {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    drag.current = { x: e.clientX, y: e.clientY, base: open ? -width : 0, locked: null, offset: open ? -width : 0, t: Date.now() }
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.locked) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return
      if (Math.abs(dx) > Math.abs(dy)) {
        d.locked = 'h'
        e.currentTarget.setPointerCapture?.(e.pointerId)
        cardRef.current.style.userSelect = 'none'
      } else {
        drag.current = null
        return
      }
    }
    // drag past the buttons a little, with resistance, then stop
    const raw = d.base + dx
    d.offset = raw < -width ? -width + (raw + width) * 0.25 : Math.min(0, raw)
    place(d.offset, false)
  }

  const finish = () => {
    const d = drag.current
    drag.current = null
    if (cardRef.current) cardRef.current.style.userSelect = ''
    if (!d || d.locked !== 'h') return
    // swallow the click this drag would otherwise end in
    justDragged.current = true
    setTimeout(() => {
      justDragged.current = false
    }, 0)
    const fastFlick = Math.abs(d.offset - d.base) > 44 && Date.now() - d.t < 250
    const shouldOpen = fastFlick ? d.offset < d.base : d.offset < -width / 2
    setOpenState(shouldOpen)
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        ref={actionsRef}
        aria-hidden={!open}
        className="absolute inset-y-0 right-0 flex"
        style={{ width, opacity: 0 }}
      >
        {actions.map((a, i) => (
          <button
            key={a.key}
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              setOpenState(false)
              a.onClick()
            }}
            className="pressable flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-bold"
            style={{
              background: a.tone === 'danger' ? 'var(--plum)' : 'var(--forest)',
              color: 'var(--paper)',
              borderRadius: i === actions.length - 1 ? '0 16px 16px 0' : 0,
            }}
          >
            <span aria-hidden="true" className="text-base leading-none">
              {a.icon}
            </span>
            {a.label}
          </button>
        ))}
      </div>
      <div
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
        onClickCapture={(e) => {
          if (justDragged.current) {
            e.preventDefault()
            e.stopPropagation()
          } else if (open) {
            // a tap on the card itself just closes it
            e.preventDefault()
            e.stopPropagation()
            setOpenState(false)
          }
        }}
        className="relative"
        style={{ touchAction: enabled ? 'pan-y' : undefined }}
      >
        {children}
      </div>
    </div>
  )
}
