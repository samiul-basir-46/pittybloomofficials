import { Link, NavLink } from 'react-router-dom'
import { LogOut, ShoppingCart, User } from 'lucide-react'
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
  const { count } = useCart()
  const { user, signOut, configured } = useAuth()
  const { settings } = useSettings()
  const nav = useAsync(getNavLinks)

  return (
    <header className="border-b border-sand bg-white">
      <Container className="grid h-20 grid-cols-3 items-center sm:h-[120px]">
        <nav className="flex gap-5 sm:gap-8">
          {(nav.data ?? []).map((l) => (
            <NavLink key={l.id} to={l.to} end className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/"
          aria-label={settings.name}
          className="size-14 justify-self-center overflow-hidden rounded-full bg-brand sm:size-[84px]"
        >
          <SmartImage src={settings.logo} alt={settings.name} />
        </Link>
        <div className="flex items-center justify-end gap-4 sm:gap-5">
          <Link to="/cart" className="relative" aria-label="Cart">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-heart text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <Link to="/account" aria-label="Account">
            <User size={20} />
          </Link>
          {configured && user && <button onClick={signOut} className="hidden items-center gap-2 text-xs uppercase tracking-wide text-ink/70 sm:flex">
            <LogOut size={16} /> Logout
          </button>}
        </div>
      </Container>
    </header>
  )
}
