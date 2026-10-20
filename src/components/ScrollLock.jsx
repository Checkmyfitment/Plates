import { useEffect } from 'react'

// Renders nothing. While mounted, the page itself can't scroll (see
// html.scroll-locked in index.css) -- only regions inside the app shell can.
export default function ScrollLock() {
  useEffect(() => {
    document.documentElement.classList.add('scroll-locked')
    return () => document.documentElement.classList.remove('scroll-locked')
  }, [])
  return null
}
