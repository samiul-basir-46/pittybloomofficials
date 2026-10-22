import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import CartToast from '../ui/CartToast'

export default function Layout() {
  const { pathname } = useLocation()
  const isAccountPage = pathname === '/account'
  const isManualOrderPage = pathname === '/order-form' || pathname === '/custom-order'

  return (
    <div className="flex min-h-screen flex-col">
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
