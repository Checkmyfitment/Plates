import { describe, it, expect } from 'vitest'
import { getActiveCollection, matchesCollection } from './seasonalCollections'

describe('getActiveCollection', () => {
  it('finds the collection for a date safely inside one range', () => {
    expect(getActiveCollection(new Date(2026, 10, 20))?.id).toBe('fall-harvest') // Nov 20
  })

  // winter-holidays wraps from December into January (startMonth 12 >
  // endMonth 1) — the one range that can't just check start <= date <= end
  it('matches winter holidays on both sides of the December-to-January wrap', () => {
    expect(getActiveCollection(new Date(2026, 11, 25))?.id).toBe('winter-holidays') // Dec 25
    expect(getActiveCollection(new Date(2026, 0, 3))?.id).toBe('winter-holidays') // Jan 3
  })

  it('returns null in a gap between collections', () => {
    expect(getActiveCollection(new Date(2026, 0, 10))).toBeNull() // Jan 10, after winter holidays ends (Jan 5), before Lunar New Year starts (Jan 15)
  })

  it('is inclusive of both boundary dates', () => {
    expect(getActiveCollection(new Date(2026, 1, 1))?.id).toBe('valentines') // Feb 1, range start
    expect(getActiveCollection(new Date(2026, 1, 14))?.id).toBe('valentines') // Feb 14, range end
  })

  // regression test for a real bug found while writing these tests:
  // valentines (Feb 1-14) sits entirely inside lunar-new-year's range
  // (Jan 15-Feb 15), so whichever one is listed first always wins every
  // date the other could ever match. valentines must come first, or it's
  // permanently unreachable.
  it('resolves the Lunar New Year / Valentine\'s overlap correctly on every day it matters', () => {
    expect(getActiveCollection(new Date(2026, 0, 20))?.id).toBe('lunar-new-year') // Jan 20 — only lunar-new-year covers this
    expect(getActiveCollection(new Date(2026, 1, 1))?.id).toBe('valentines') // Feb 1 — both ranges cover this; valentines should win
    expect(getActiveCollection(new Date(2026, 1, 14))?.id).toBe('valentines') // Feb 14 — both ranges cover this; valentines should win
    expect(getActiveCollection(new Date(2026, 1, 15))?.id).toBe('lunar-new-year') // Feb 15 — only lunar-new-year covers this
  })
})

describe('matchesCollection', () => {
  const fallHarvest = { id: 'fall-harvest', keywords: ['pie', 'pumpkin', 'turkey', 'stuffing', 'thanksgiving', 'cranberry', 'harvest', 'squash'] }

  it('matches a keyword in the title', () => {
    expect(matchesCollection({ title: 'Pumpkin pie', description: '', cuisine: '' }, fallHarvest)).toBe(true)
  })

  it('matches a keyword in the description when the title has none', () => {
    expect(matchesCollection({ title: 'Dessert box', description: 'Made with real pumpkin', cuisine: '' }, fallHarvest)).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(matchesCollection({ title: 'THANKSGIVING feast', description: '', cuisine: '' }, fallHarvest)).toBe(true)
  })

  it('does not match when nothing overlaps', () => {
    expect(matchesCollection({ title: 'Tacos', description: 'Fresh salsa', cuisine: 'Mexican' }, fallHarvest)).toBe(false)
  })
})
