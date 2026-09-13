import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TopBar from './TopBar'

describe('TopBar', () => {
  it('shows a Log in button for a guest, with no account menu', () => {
    render(<TopBar title="Plates" isGuest onAvatarClick={vi.fn()} />)
    expect(screen.getByText('Log in')).toBeInTheDocument()
  })

  it("opens straight to profile on tap when there's no onLogout handler", () => {
    const onAvatarClick = vi.fn()
    render(<TopBar title="Plates" avatarUrl={null} initials="M" onAvatarClick={onAvatarClick} />)
    fireEvent.click(screen.getByLabelText('Account menu'))
    expect(onAvatarClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Log out')).not.toBeInTheDocument()
  })

  it('opens a Profile/Log out menu on tap when onLogout is provided, instead of navigating immediately', () => {
    const onAvatarClick = vi.fn()
    const onLogout = vi.fn()
    render(<TopBar title="Plates" avatarUrl={null} initials="M" onAvatarClick={onAvatarClick} onLogout={onLogout} />)

    fireEvent.click(screen.getByLabelText('Account menu'))
    expect(onAvatarClick).not.toHaveBeenCalled()
    expect(screen.getByText('👤 Profile')).toBeInTheDocument()
    expect(screen.getByText('⏻ Log out')).toBeInTheDocument()

    fireEvent.click(screen.getByText('⏻ Log out'))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('lets Profile be reached from within the menu too', () => {
    const onAvatarClick = vi.fn()
    const onLogout = vi.fn()
    render(<TopBar title="Plates" avatarUrl={null} initials="M" onAvatarClick={onAvatarClick} onLogout={onLogout} />)

    fireEvent.click(screen.getByLabelText('Account menu'))
    fireEvent.click(screen.getByText('👤 Profile'))
    expect(onAvatarClick).toHaveBeenCalledTimes(1)
    expect(onLogout).not.toHaveBeenCalled()
  })
})
