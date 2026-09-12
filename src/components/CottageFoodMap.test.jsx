import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CottageFoodMap from './CottageFoodMap'
import { ABBR_BY_STATE } from '../lib/cottageFoodStates'

describe('CottageFoodMap', () => {
  it('renders all 50 states as SVG paths', () => {
    const { container } = render(<CottageFoodMap />)
    expect(container.querySelectorAll('path.state')).toHaveLength(Object.keys(ABBR_BY_STATE).length)
  })

  it('colors New Jersey (no program) differently from a state with a program', () => {
    const { container } = render(<CottageFoodMap />)
    const nj = container.querySelector('path[data-name="NJ"]')
    const ca = container.querySelector('path[data-name="CA"]')
    expect(nj.getAttribute('fill')).toBe('var(--plum)')
    expect(ca.getAttribute('fill')).toBe('var(--forest)')
  })

  it('shows a status caption for the clicked state', () => {
    const { container } = render(<CottageFoodMap />)
    const caption = screen.getByTestId('cottage-food-map-caption')
    expect(caption).not.toHaveTextContent('New Jersey')
    fireEvent.click(container.querySelector('path[data-name="NJ"]'))
    expect(caption).toHaveTextContent('New Jersey')
    expect(caption).toHaveTextContent('does not currently have a cottage food program')
  })

  it('shows an affirmative caption for a state with a program', () => {
    const { container } = render(<CottageFoodMap />)
    const caption = screen.getByTestId('cottage-food-map-caption')
    fireEvent.click(container.querySelector('path[data-name="CA"]'))
    expect(caption).toHaveTextContent('California')
    expect(caption).toHaveTextContent('has a cottage food program')
  })
})
