import { describe, it, expect } from 'vitest'
import { distanceMiles, formatDistance } from './geo'

describe('distanceMiles', () => {
  it('returns 0 for identical points', () => {
    expect(distanceMiles(37.7749, -122.4194, 37.7749, -122.4194)).toBeCloseTo(0)
  })

  it('roughly matches the known distance between two real cities', () => {
    // San Francisco to Los Angeles is ~347 miles as the crow flies
    const miles = distanceMiles(37.7749, -122.4194, 34.0522, -118.2437)
    expect(miles).toBeGreaterThan(330)
    expect(miles).toBeLessThan(360)
  })
})

describe('formatDistance', () => {
  it('shows "nearby" for very short distances', () => {
    expect(formatDistance(0.05)).toBe('nearby')
  })

  it('shows one decimal place under 10 miles', () => {
    expect(formatDistance(3.456)).toBe('3.5 mi')
  })

  it('rounds to a whole number at 10 miles or more', () => {
    expect(formatDistance(12.4)).toBe('12 mi')
  })
})
