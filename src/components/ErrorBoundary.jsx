import { Component } from 'react'
import Logo from './Logo'
import { logClientError } from '../lib/errorLog'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error in app tree', error, info)
    logClientError({ message: error.message, stack: error.stack, context: 'react-render' })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center px-8 text-center gap-3" style={{ background: 'var(--paper)' }}>
        <Logo size={44} />
        <h1 className="font-display text-xl mt-2" style={{ color: 'var(--forest-dark)' }}>
          Something went wrong
        </h1>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Sorry about that — a reload should get you back on track.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity"
          style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
        >
          Reload Plates
        </button>
      </div>
    )
  }
}
