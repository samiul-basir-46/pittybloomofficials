import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import CartToast from '../ui/CartToast'
import OpeningAnimation from './OpeningAnimation'

export default function Layout() {
  const { pathname } = useLocation()
  const isAccountPage = pathname === '/account'
  const isManualOrderPage = pathname === '/order-form' || pathname === '/custom-order'

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return undefined

    const targets = ':scope > div > section, [data-motion-item]'
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || !('IntersectionObserver' in window)) {
      main.querySelectorAll(targets).forEach((element) => element.classList.add('motion-visible'))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('motion-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' })

    const isRevealTarget = (element) =>
      element.matches('[data-motion-item]') || (element.tagName === 'SECTION' && element.parentElement?.parentElement === main)
    const observeTargets = (root) => {
      if (root instanceof Element && isRevealTarget(root)) observer.observe(root)
      root.querySelectorAll?.(targets).forEach((element) => observer.observe(element))
    }
    observeTargets(main)

    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof Element) observeTargets(node)
      }))
    })
    mutations.observe(main, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <OpeningAnimation />
      {!isAccountPage && !isManualOrderPage && <Header />}
      {/* key={pathname} remounts the wrapper on every page change, so each new page slides up and fades in */}
      <main className="flex-1 overflow-x-clip">
        <div key={pathname} className="motion-safe:animate-page-in">
          <Outlet />
        </div>
      </main>
      {!isAccountPage && <Footer />}
      <CartToast />
    </div>
  )
}
