import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatThread from './ChatThread'
import * as translate from '../lib/translate'

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
  beforeEach(() => {
    vi.restoreAllMocks()
  })

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

  it('translates a message on demand and lets you toggle it back off', async () => {
    const spy = vi.spyOn(translate, 'translateText').mockResolvedValue('¿Tienes tamales hoy?')
    const chat = makeChat({ messages: [{ id: 'm1', from: 'them', text: 'Do you have tamales today?' }] })
    render(<ChatThread chat={chat} currentUserId="buyer-1" onSend={vi.fn()} />)

    fireEvent.click(screen.getByText('🌐 Translate'))
    await waitFor(() => expect(screen.getByText('¿Tienes tamales hoy?')).toBeInTheDocument())
    expect(spy).toHaveBeenCalledWith('Do you have tamales today?', expect.any(String))

    fireEvent.click(screen.getByText('Hide translation'))
    expect(screen.queryByText('¿Tienes tamales hoy?')).not.toBeInTheDocument()

    // toggling back on reuses the cached result instead of translating again
    fireEvent.click(screen.getByText('🌐 Translate'))
    expect(screen.getByText('¿Tienes tamales hoy?')).toBeInTheDocument()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('shows a fallback message when translation is unavailable', async () => {
    vi.spyOn(translate, 'translateText').mockResolvedValue(null)
    const chat = makeChat({ messages: [{ id: 'm1', from: 'them', text: 'Hello' }] })
    render(<ChatThread chat={chat} currentUserId="buyer-1" onSend={vi.fn()} />)

    fireEvent.click(screen.getByText('🌐 Translate'))
    await waitFor(() => expect(screen.getByText("Couldn't translate this message.")).toBeInTheDocument())
  })
})
