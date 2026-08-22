import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AreaWaitlistCard from './AreaWaitlistCard'
import { ToastProvider } from '../context/ToastContext'
import * as waitlist from '../lib/waitlist'

function renderCard(props) {
  return render(
    <ToastProvider>
      <AreaWaitlistCard {...props} />
    </ToastProvider>,
  )
}

describe('AreaWaitlistCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('pre-fills the neighborhood field when given a default', () => {
    renderCard({ defaultNeighborhood: 'Nowhereville' })
    expect(screen.getByPlaceholderText('Your neighborhood or zip code')).toHaveValue('Nowhereville')
  })

  it('submits email + neighborhood and shows a confirmation', async () => {
    const spy = vi.spyOn(waitlist, 'joinAreaWaitlist').mockResolvedValue(undefined)
    renderCard({ defaultNeighborhood: 'Nowhereville' })

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByText('Notify me'))

    await waitFor(() => expect(screen.getByText("✓ You're on the list!")).toBeInTheDocument())
    expect(spy).toHaveBeenCalledWith({ email: 'test@example.com', neighborhood: 'Nowhereville' })
  })

  it('does not submit with an empty email', () => {
    const spy = vi.spyOn(waitlist, 'joinAreaWaitlist').mockResolvedValue(undefined)
    renderCard({})
    fireEvent.click(screen.getByText('Notify me'))
    expect(spy).not.toHaveBeenCalled()
  })
})
