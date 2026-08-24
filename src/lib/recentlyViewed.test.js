import { describe, it, expect, beforeEach } from 'vitest'
import { addRecentlyViewed, getRecentlyViewedIds } from './recentlyViewed'

describe('recentlyViewed', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns an empty list when nothing has been viewed', () => {
    expect(getRecentlyViewedIds()).toEqual([])
  })

  it('adds the most recently viewed listing to the front', () => {
    addRecentlyViewed('a')
    addRecentlyViewed('b')
    expect(getRecentlyViewedIds()).toEqual(['b', 'a'])
  })

  it('moves an already-viewed listing back to the front instead of duplicating it', () => {
    addRecentlyViewed('a')
    addRecentlyViewed('b')
    addRecentlyViewed('a')
    expect(getRecentlyViewedIds()).toEqual(['a', 'b'])
  })

  it('caps the list at 10 entries, dropping the oldest', () => {
    for (let i = 0; i < 12; i++) addRecentlyViewed(`id-${i}`)
    const ids = getRecentlyViewedIds()
    expect(ids).toHaveLength(10)
    expect(ids[0]).toBe('id-11')
    expect(ids).not.toContain('id-0')
    expect(ids).not.toContain('id-1')
  })
})
