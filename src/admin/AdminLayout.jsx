import { Link, NavLink, Outlet } from 'react-router-dom'
import { ExternalLink, LayoutDashboard, Settings } from 'lucide-react'
import { SECTIONS } from './sections'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  ...SECTIONS.map((s) => ({ to: `/admin/${s.path}`, label: s.title, icon: s.icon })),
  { to: '/admin/settings', label: 'Site Settings', icon: Settings },
]

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand text-white shadow-sm' : 'text-ink/70 hover:bg-sand/70 hover:text-ink'
  }`

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-cream md:flex">
      <aside className="border-b border-sand bg-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-5 md:block md:p-6">
          <div>
            <p className="font-serif text-2xl font-bold">Admin</p>
            <p className="hidden text-xs text-ink/50 md:block">Manage your site content</p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-lg border border-sand px-3 py-1.5 text-sm text-brand hover:bg-sand/60 md:mt-4 md:w-fit"
          >
            <ExternalLink size={14} /> View site
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-6">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}