import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

export default function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* key={pathname} remounts the wrapper on every page change, so each new page slides up and fades in */}
      <main className="flex-1 overflow-x-clip">
        <div key={pathname} className="motion-safe:animate-page-in">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}