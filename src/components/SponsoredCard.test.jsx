import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const record = vi.fn()
vi.mock('../lib/sponsors', () => ({ recordSponsorEvent: (...a) => record(...a) }))

import SponsoredCard from './SponsoredCard'

const sponsor = { id: 's1', name: 'Bay Packaging', tagline: 'Boxes for bakers', imageUrl: null, linkUrl: 'https://example.com/x', ctaLabel: 'Shop' }

beforeEach(() => {
  record.mockClear()
  window.open = vi.fn()
})

describe('SponsoredCard', () => {
  it('always labels itself as sponsored', () => {
    render(<SponsoredCard sponsor={sponsor} />)
    expect(screen.getByText('Sponsored')).toBeInTheDocument()
    expect(screen.getByText('Bay Packaging')).toBeInTheDocument()
    expect(screen.getByText('Boxes for bakers')).toBeInTheDocument()
  })
  it('counts one impression when shown (no IntersectionObserver in tests)', () => {
    render(<SponsoredCard sponsor={sponsor} />)
    expect(record).toHaveBeenCalledWith('s1', 'impression')
    expect(record).toHaveBeenCalledTimes(1)
  })
  it('counts a click and opens the sponsor link in a new, isolated window', () => {
    render(<SponsoredCard sponsor={sponsor} />)
    fireEvent.click(screen.getByRole('button'))
    expect(record).toHaveBeenCalledWith('s1', 'click')
    expect(window.open).toHaveBeenCalledWith('https://example.com/x', '_blank', 'noopener,noreferrer')
  })
  it('gives screen readers the full context in its label', () => {
    render(<SponsoredCard sponsor={sponsor} />)
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/^Sponsored: Bay Packaging/)
  })
})
