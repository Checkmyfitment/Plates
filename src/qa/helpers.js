// Click-through helpers for the QA harness (attached to window.qa).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const vis = (el) => {
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
}
const label = (e) => (e.getAttribute('aria-label') || e.innerText || e.placeholder || e.value || '').trim().replace(/\s+/g, ' ')

window.__errs = []
const oe = console.error
console.error = (...a) => { window.__errs.push(a.map((x) => (x && x.message) || String(x)).join(' ').slice(0, 220)); oe(...a) }
window.addEventListener('error', (e) => window.__errs.push('ERR ' + e.message))
window.addEventListener('unhandledrejection', (e) => window.__errs.push('REJECT ' + (e.reason?.message || e.reason)))
// never let a test click leave the page or open windows
window.__opened = []
window.open = (...a) => { window.__opened.push(a[0]); return null }
try { Object.defineProperty(window.navigator, 'share', { value: undefined, configurable: true }) } catch { /* ignore */ }

const scroller = () => document.querySelector('.overscroll-contain') || document.body
const sig = () => {
  const h = [...document.querySelectorAll('h1,h2,h3')].filter(vis).slice(0, 2).map((x) => x.innerText.trim().slice(0, 30)).join('/')
  return h || scroller().innerText.replace(/\s+/g, ' ').slice(0, 30)
}

const qa = {
  vis, label, sig,
  buttons: () => [...document.querySelectorAll('button, [role=button]')].filter(vis),
  items: () => [...document.querySelectorAll('button, a[href], [role=button], input, select, textarea')].filter(vis).map((e, i) => `${e.tagName[0].toLowerCase()}:${label(e).slice(0, 40)}`),
  screen: () => ({ h: [...document.querySelectorAll('h1,h2,h3')].filter(vis).slice(0, 3).map((h) => h.innerText.trim().slice(0, 40)), text: scroller().innerText.replace(/\s+/g, ' ').slice(0, 200) }),
  click(text, nth = 0) {
    const els = [...document.querySelectorAll('button, a[href], [role=button]')].filter(vis).filter((e) => label(e).toLowerCase().includes(text.toLowerCase()))
    const el = els[nth]
    if (!el) return 'NOT FOUND: ' + text
    el.click()
    return 'clicked: ' + text
  },
  errs: () => window.__errs.splice(0),
  // tap an exact-named bottom-nav / top-bar button (last match wins)
  async nav(t, wait = 900) {
    const els = qa.buttons().filter((e) => label(e) === t)
    els[els.length - 1]?.click()
    await sleep(wait)
  },
  async run(title, goto, opts = {}) {
    await goto()
    const r = await qa.explore({ homeTab: '🏠 Home', max: 45, ...opts })
    return { title, n: r.total, stuck: r.stuck, errors: r.errors, blank: r.blank, changed: r.results.filter((x) => /changed/.test(x)).length, skipped: r.results.filter((x) => /SKIPPED|gone/.test(x)).length }
  },
  sleep,
  async step(text, wait = 800, nth = 0) {
    const r = qa.click(text, nth)
    await sleep(wait)
    return { r, ...qa.screen(), errs: qa.errs() }
  },
  // try every way out of the current screen until the signature matches `base`
  async restore(base, homeTab) {
    const tries = [
      () => qa.click('Back'),
      () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
      () => qa.click('Never mind'),
      () => qa.click('Cancel'),
      () => qa.click('Close'),
      () => qa.click('Not now'),
      () => qa.click('Skip'),
      () => homeTab && qa.click(homeTab),
    ]
    for (const t of tries) {
      if (sig() === base) return true
      try { t() } catch { /* ignore */ }
      await sleep(450)
    }
    return sig() === base
  },
  // click every button on the current screen one at a time; report errors,
  // blank screens, and anything that can't be backed out of
  async explore({ homeTab, skip = /log ?out|sign ?out|delete my|delete account|^back$|^←|^(🏠 Home|📍 Map|Search|🛒 Cart|Q You|Notifications|Chats|Add listing|Account menu)$/i, wait = 550, max = 60 } = {}) {
    const base = sig()
    const total = qa.buttons().length
    const report = { screen: base, total, results: [], stuck: [], errors: [], blank: [] }
    const names = qa.buttons().map(label)
    for (let i = 0; i < Math.min(names.length, max); i++) {
      // find the i-th button again (DOM may have re-rendered); match by name+index
      const nm = names[i]
      if (skip.test(nm)) { report.results.push(`${i}:${nm.slice(0, 28)} -> SKIPPED`); continue }
      const occurrence = names.slice(0, i).filter((x) => x === nm).length
      const el = qa.buttons().filter((e) => label(e) === nm)[occurrence]
      if (!el) { report.results.push(`${i}:${nm.slice(0, 28)} -> gone`); continue }
      qa.errs()
      el.click()
      await sleep(wait)
      const after = sig()
      const e = qa.errs()
      const blank = scroller().innerText.trim().length < 15
      let status = after === base ? 'same' : 'changed'
      if (e.length) report.errors.push(`${nm.slice(0, 28)}: ${e[0]}`)
      if (blank) report.blank.push(nm)
      if (after !== base) {
        const ok = await qa.restore(base, homeTab)
        if (!ok) { report.stuck.push(`${nm.slice(0, 40)} -> "${after.slice(0, 50)}"`); status += ' STUCK'; break }
      }
      report.results.push(`${i}:${nm.slice(0, 26)} -> ${status}${e.length ? ' ERR' : ''}`)
    }
    return report
  },
}
window.qa = qa
