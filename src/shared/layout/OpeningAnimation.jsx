import { useEffect, useState } from 'react'

export default function OpeningAnimation() {
  // Play the intro once per browser session, not on every page load.
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    try {
      if (window.sessionStorage.getItem('pb-intro')) return false
      window.sessionStorage.setItem('pb-intro', '1')
    } catch { /* storage blocked: just play it */ }
    return true
  })

  useEffect(() => {
    if (!visible) return undefined
    const timer = window.setTimeout(() => setVisible(false), 2200)
    return () => window.clearTimeout(timer)
  }, [visible])

  if (!visible) return null

  return (
    <div className="opening-intro" aria-hidden="true">
      <div className="opening-content">
        <div className="opening-flower">
          <span />
          <span />
          <span />
          <span />
          <i />
        </div>
        <p className="opening-name">Pitty<span>Bloom</span></p>
        <p className="opening-tagline">Gifts that hold your favourite moments</p>
      </div>
      <div className="opening-progress"><span /></div>
    </div>
  )
}
