import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Every page change starts from the top instead of keeping the previous scroll position.
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
