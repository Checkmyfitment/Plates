import { useEffect, useRef } from 'react'
import { TURNSTILE_SITE_KEY } from '../lib/siteInfo'

// Cloudflare Turnstile (a lighter-weight CAPTCHA alternative) — renders the
// widget once the external script (loaded in index.html) is ready, and
// reports the resulting token up via onVerify. Bot protection only actually
// takes effect once Supabase has the matching secret key configured (see
// TURNSTILE_SITE_KEY in lib/siteInfo.js) -- until then this still renders
// and produces a token, it's just not checked server-side yet.
export default function TurnstileWidget({ onVerify, onExpire }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onVerify,
        'expired-callback': onExpire,
      })
    }

    if (window.turnstile) {
      render()
    } else {
      // the script in index.html loads async -- poll briefly until it's ready
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval)
          render()
        }
      }, 100)
      return () => {
        cancelled = true
        clearInterval(interval)
      }
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="mt-1" />
}
