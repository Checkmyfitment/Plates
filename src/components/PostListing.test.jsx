import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PostListing from './PostListing'

vi.mock('../lib/storage', () => ({
  validatePhotoFile: vi.fn(),
  uploadListingPhoto: vi.fn().mockResolvedValue('https://cdn.example/photo.jpg'),
}))
vi.mock('../lib/admin', () => ({ fetchUnclaimedStores: vi.fn().mockResolvedValue([]) }))

const fill = () => {
  fireEvent.change(screen.getByPlaceholderText('e.g. Chicken tamales'), { target: { value: 'Sourdough' } })
  fireEvent.change(screen.getByPlaceholderText('18'), { target: { value: '9' } })
}

describe('PostListing photo requirement', () => {
  it('blocks posting and explains why when no photo was added', () => {
    const onAddListing = vi.fn()
    const { container } = render(<PostListing onAddListing={onAddListing} currentUserId="u1" />)
    fill()
    fireEvent.submit(container.querySelector('form'))
    expect(onAddListing).not.toHaveBeenCalled()
    expect(screen.getByText(/Add a photo of your food/)).toBeInTheDocument()
  })

  it('posts once a photo has been uploaded', async () => {
    const onAddListing = vi.fn().mockResolvedValue({ id: 'l1' })
    const { container } = render(<PostListing onAddListing={onAddListing} currentUserId="u1" />)
    fill()
    const file = new File(['x'], 'bread.jpg', { type: 'image/jpeg' })
    fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByText('Change photo')).toBeInTheDocument())
    fireEvent.submit(container.querySelector('form'))
    await waitFor(() => expect(onAddListing).toHaveBeenCalledTimes(1))
    expect(onAddListing.mock.calls[0][0].photoUrl).toBe('https://cdn.example/photo.jpg')
  })
})
