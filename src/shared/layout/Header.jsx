import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LogOut, Menu, ShoppingCart, User, X } from 'lucide-react'
import Container from '../ui/Container'
import SmartImage from '../ui/SmartImage'
import useAsync from '../hooks/useAsync'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { getNavLinks } from '../services/contentService'

const linkClass = ({ isActive }) =>
  `text-sm font-medium uppercase tracking-wide transition-colors hover:text-brand ${isActive ? 'text-brand' : ''}`

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { count } = useCart()
  const { user, signOut, configured } = useAuth()
  const { settings } = useSettings()
  const nav = useAsync(getNavLinks)
  const isManualOrderPage = location.pathname === '/order-form' || location.pathname === '/custom-order'

  useEffect(() => setMenuOpen(false), [location.pathname])
  useEffect(() => {
    if (!menuOpen) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <header className="relative z-50 border-b border-sand bg-white">
      <Container className="grid h-16 grid-cols-3 items-center sm:h-[120px]">
        {!isManualOrderPage && <nav className="hidden gap-5 sm:flex sm:gap-8">
          {(nav.data ?? []).map((l) => (
            <NavLink key={l.id} to={l.to} end className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>}
        <Link
          to="/"
          aria-label={settings.name}
          className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-[#FFF0F0] sm:static sm:size-12 sm:translate-x-0 sm:translate-y-0 sm:justify-self-center"
        >
          <SmartImage src={settings.logo} alt={settings.name} className="scale-125 rounded-full object-contain" />
        </Link>
        {!isManualOrderPage && <div className="col-start-3 flex items-center justify-end gap-4 sm:gap-5">
          <Link to="/cart" className="relative" aria-label="Cart">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-heart text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <Link to="/account" aria-label="Account" className="hidden sm:block">
            <User size={20} />
          </Link>
          {configured && user && <button onClick={signOut} className="hidden items-center gap-2 text-xs uppercase tracking-wide text-ink/70 sm:flex">
            <LogOut size={16} /> Logout
          </button>}
        </div>}
        {!isManualOrderPage && <button type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="mobile-site-navigation" onClick={() => setMenuOpen((open) => !open)} className="absolute left-4 top-1/2 inline-grid size-10 -translate-y-1/2 place-items-center rounded-lg text-ink sm:hidden">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>}
      </Container>
      {!isManualOrderPage && menuOpen && <div id="mobile-site-navigation" className="absolute inset-x-0 top-full border-t border-sand bg-white px-4 py-3 shadow-lg sm:hidden">
        <nav aria-label="Main navigation" className="space-y-1">
          {(nav.data ?? []).map((link) => <NavLink key={link.id} to={link.to} end onClick={() => setMenuOpen(false)} className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm font-medium uppercase tracking-wide ${isActive ? 'bg-cream text-brand' : 'text-ink hover:bg-cream'}`}>{link.label}</NavLink>)}
          <Link to="/account" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-cream">My account</Link>
        </nav>
      </div>}
    </header>
  )
}
