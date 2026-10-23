import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

vi.mock('./supabaseClient', () => ({ supabase: {} }))

const { mapSponsor, eligibleSponsors, pickSponsor } = await import('./sponsors')

const row = (over = {}) => ({
  id: 's1',
  name: 'Bay Packaging',
  tagline: null,
  image_url: null,
  link_url: 'https://example.com',
  cta_label: null,
  placement: 'browse',
  neighborhood: null,
  ...over,
})

describe('mapSponsor', () => {
  it('fills in a default button label', () => {
    expect(mapSponsor(row()).ctaLabel).toBe('Learn more')
    expect(mapSponsor(row({ cta_label: 'Shop' })).ctaLabel).toBe('Shop')
  })
})

describe('eligibleSponsors', () => {
  const all = [mapSponsor(row({ id: 'everyone' })), mapSponsor(row({ id: 'berkeley', neighborhood: 'Berkeley' }))]
  it('shows untargeted sponsors to everyone', () => {
    expect(eligibleSponsors(all, null).map((s) => s.id)).toEqual(['everyone'])
  })
  it('adds neighborhood-targeted sponsors for people in that neighborhood, ignoring case/spacing', () => {
    expect(eligibleSponsors(all, ' berkeley ').map((s) => s.id)).toEqual(['everyone', 'berkeley'])
  })
  it('hides a targeted sponsor from other neighborhoods', () => {
    expect(eligibleSponsors(all, 'Oakland').map((s) => s.id)).toEqual(['everyone'])
  })
})

describe('pickSponsor', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('returns null with nothing to show', () => {
    expect(pickSponsor([], 5)).toBeNull()
  })
  it('rotates by seed', () => {
    expect(pickSponsor(list, 0).id).toBe('a')
    expect(pickSponsor(list, 1).id).toBe('b')
    expect(pickSponsor(list, 5).id).toBe('c')
  })
})
