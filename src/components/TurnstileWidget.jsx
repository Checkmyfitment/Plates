import { useEffect, useRef, useState } from 'react'
import { TURNSTILE_SITE_KEY } from '../lib/siteInfo'

// Cloudflare Turnstile (a lighter-weight CAPTCHA alternative) — renders the
// widget once the external script (loaded in index.html) is ready, and
// reports the resulting token up via onVerify. Bot protection only actually
// takes effect once Supabase has the matching secret key configured (see
// TURNSTILE_SITE_KEY in lib/siteInfo.js) -- until then this still renders
// and produces a token, it's just not checked server-side yet.
//
// error-callback + the try/catch below exist because of a real bug this
// silently caused once: the native iOS app used Capacitor's default
// "capacitor://localhost" WebView origin, which Turnstile's challenge
// doesn't handle the same way it does a real http(s) origin -- render()
// failed, nothing appeared, and login was simply impossible with no
// visible error anywhere (see capacitor.config.json's iosScheme fix).
// Surfacing a real error message here means that class of failure is
// visible and recoverable (a Retry button) instead of a silent dead end.
export default function TurnstileWidget({ onVerify, onExpire }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setFailed(false)

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': () => {
            if (!cancelled) setFailed(true)
          },
        })
      } catch (err) {
        console.error('Turnstile render failed', err)
        if (!cancelled) setFailed(true)
      }
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
      // give up after 8s rather than polling forever if the script never
      // loads at all (e.g. no network reaching challenges.cloudflare.com)
      const timeout = setTimeout(() => {
        clearInterval(interval)
        if (!cancelled && !window.turnstile) setFailed(true)
      }, 8000)
      return () => {
        cancelled = true
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey])

  if (failed) {
    return (
      <div
        className="mt-1 text-xs rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
        style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}
      >
        <span>Verification didn't load — check your connection.</span>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          className="pressable font-medium underline shrink-0"
        >
          Retry
        </button>
      </div>
    )
  }

  return <div ref={containerRef} className="mt-1" />
}
