import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatThread from './ChatThread'

function makeChat(overrides) {
  return {
    id: 'chat-1',
    bg: '#fff',
    photo: '🍽️',
    photoUrl: null,
    seller: 'Test Seller',
    listingTitle: 'Test dish',
    listingId: 'l1',
    counterpartId: 'seller-1',
    messages: [],
    ...overrides,
  }
}

describe('ChatThread', () => {
  it('renders existing messages', () => {
    const chat = makeChat({ messages: [{ id: 'm1', from: 'them', text: 'Hi there' }] })
    render(<ChatThread chat={chat} currentUserId="buyer-1" onSend={vi.fn()} />)
    expect(screen.getByText('Hi there')).toBeInTheDocument()
  })

  // regression test for a real bug found this session: a rapid double-click
  // on Send fired twice before React committed the setText('') from the
  // first click, so both reads saw the same non-empty text and sent it
  // twice. Fixed with a synchronous useRef guard reset via queueMicrotask.
  it('only calls onSend once for two rapid submits of the same message', () => {
    const onSend = vi.fn()
    const chat = makeChat()
    render(<ChatThread chat={chat} currentUserId="buyer-1" onSend={onSend} />)

    fireEvent.change(screen.getByPlaceholderText('Message the seller…'), { target: { value: 'Hello!' } })
    const sendButton = screen.getByText('Send')
    fireEvent.click(sendButton)
    fireEvent.click(sendButton)

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith('Hello!', null)
  })

  it('does not send an empty message', () => {
    const onSend = vi.fn()
    render(<ChatThread chat={makeChat()} currentUserId="buyer-1" onSend={onSend} />)
    fireEvent.click(screen.getByText('Send'))
    expect(onSend).not.toHaveBeenCalled()
  })
})
