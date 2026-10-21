import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useMatch } from 'react-router-dom'
import { Check, CircleCheck, CircleX, ClipboardList, ExternalLink, LayoutDashboard, LogOut, Menu, PackagePlus, Settings, SlidersHorizontal, Upload, X } from 'lucide-react'
import { SECTIONS } from './sections'
import { dismissBookUpload, getBookUploads, subscribeBookUploads } from '../shared/services/bookUploadQueue'
import { useAuth } from '../shared/context/AuthContext'

const NAV_GROUPS = [
  { links: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
    { to: '/admin/manual-order', label: 'Manual order', icon: PackagePlus },
    { to: '/admin/completed-orders', label: 'Completed orders', icon: CircleCheck },
    { to: '/admin/cancelled-orders', label: 'Cancelled orders', icon: CircleX },
  ] },
  { title: 'Catalog', links: SECTIONS.filter((s) => ['best-selling', 'more-products', 'magazines', 'products', 'addons'].includes(s.path)).map((s) => ({ to: `/admin/${s.path}`, label: s.title, icon: s.icon })) },
  { title: 'Store setup', links: [
    { to: '/admin/order-settings', label: 'Order Settings', icon: SlidersHorizontal },
    ...SECTIONS.filter((s) => ['sizes', 'occasions'].includes(s.path)).map((s) => ({ to: `/admin/${s.path}`, label: s.title, icon: s.icon })),
  ] },
  { title: 'Content', links: [
    ...SECTIONS.filter((s) => ['faq', 'policies', 'menu'].includes(s.path)).map((s) => ({ to: `/admin/${s.path}`, label: s.title, icon: s.icon })),
    { to: '/admin/settings', label: 'Site Settings', icon: Settings },
  ] },
]

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand text-white shadow-sm' : 'text-ink/80 hover:bg-sand/70 hover:text-ink'
  }`

function UploadActivity() {
  const jobs = useSyncExternalStore(subscribeBookUploads, getBookUploads, getBookUploads)
  const visible = jobs.filter((job) => job.status === 'uploading' || job.status === 'error' || job.status === 'complete').slice(0, 3)
  if (!visible.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[min(24rem,calc(100vw-2rem))] space-y-2">
      {visible.map((job) => {
        const percent = job.total ? Math.round((job.done / job.total) * 100) : 0
        return (
          <div key={job.id} className="rounded-xl border border-sand bg-white p-3 shadow-xl">
            <div className="flex items-start gap-2">
              {job.status === 'complete' ? <Check size={17} className="mt-0.5 text-green-600" /> : <Upload size={17} className="mt-0.5 text-brand" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{job.name}</p>
                <p className={`text-xs ${job.status === 'error' ? 'text-red-600' : 'text-ink/60'}`}>
                  {job.status === 'uploading' ? `${job.phase}${job.total ? ` · ${percent}%` : '…'}` : job.status === 'complete' ? 'Uploaded to Cloudflare. Edit a magazine to attach it.' : job.error}
                </p>
              </div>
              {job.status !== 'uploading' && (
                <button type="button" aria-label="Dismiss upload status" onClick={() => dismissBookUpload(job.id)} className="rounded p-1 text-ink/50 hover:bg-sand">
                  <X size={15} />
                </button>
              )}
            </div>
            {job.status === 'uploading' && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full bg-brand transition-[width]" style={{ width: `${percent}%` }} /></div>}
          </div>
        )
      })}
    </div>
  )
}

export default function AdminLayout() {
  // An order's own page has room for two columns
  const wide = useMatch('/admin/orders/:id')
  const dashboard = useMatch({ path: '/admin', end: true })
  const ordersList = useMatch({ path: '/admin/orders', end: true })
  const completedOrdersList = useMatch('/admin/completed-orders')
  const cancelledOrdersList = useMatch('/admin/cancelled-orders')
  const wideList = ordersList || completedOrdersList || cancelledOrdersList
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { user, loading, configured, isAdmin, signOut } = useAuth()

  useEffect(() => setMenuOpen(false), [location.pathname])
  useEffect(() => {
    if (!menuOpen) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-ink/60">Checking admin access…</div>
  if (!configured) return <div className="grid min-h-screen place-items-center p-6 text-center text-sm text-red-700">Admin sign-in is unavailable because Firebase is not configured.</div>
  if (!user || !isAdmin) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />

  return (
    <div className="min-h-screen bg-cream md:flex">
      <header className="sticky top-0 z-30 flex items-center justify-start gap-3 border-b border-sand bg-white px-4 py-3 md:hidden">
        <button type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen(!menuOpen)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-sand text-brand transition hover:bg-sand/60">
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <div>
          <p className="font-serif text-xl font-bold leading-tight">Admin</p>
          <p className="text-xs text-ink/55">Manage your site content</p>
        </div>
      </header>

      {menuOpen && <button type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-ink/35 md:hidden" />}
      <aside id="admin-navigation" className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col overflow-y-auto border-r border-sand bg-white shadow-2xl transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:w-64 md:shrink-0 md:translate-x-0 md:border-r md:shadow-none ${menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 md:px-6 md:pb-5 md:pt-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-serif text-2xl font-bold">Admin</p>
              <p className="text-xs text-ink/55">Manage your site content</p>
            </div>
            <button type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} className="-mr-2 -mt-1 inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-ink/60 hover:bg-sand md:hidden"><X size={19} /></button>
          </div>
          <div className="mt-4">
          <Link
            to="/"
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-sand px-3.5 text-sm font-medium text-brand transition hover:bg-sand/60 md:w-auto"
          >
            <ExternalLink size={15} /> View site
          </Link>
          </div>
        </div>
        <nav className="flex-1 px-3 pb-5 md:px-3 md:pb-6" aria-label="Admin navigation">
          {NAV_GROUPS.map((group, index) => (
            <div key={group.title ?? 'primary'} className={index ? 'mt-5' : ''}>
              {group.title && <p className="mb-2 px-3 text-xs font-medium tracking-wide text-ink/55">{group.title}</p>}
              <div className="space-y-1">
                {group.links.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={linkClass}>
                    <Icon size={17} strokeWidth={1.8} className="shrink-0" /> <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-sand p-3">
          <div className="mb-2 truncate px-3 text-xs text-ink/55" title={user.email}>{user.email}</div>
          <button type="button" onClick={() => signOut()} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-ink/80 transition hover:bg-sand/70 hover:text-ink">
            <LogOut size={17} strokeWidth={1.8} /> Sign out
          </button>
        </div>
      </aside>
      <main className={`min-w-0 flex-1 p-4 sm:p-8 ${ordersList ? 'lg:px-6 lg:py-8' : 'lg:p-10'}`}>
        <div className={`mx-auto ${wide ? 'max-w-6xl' : wideList || dashboard ? 'max-w-none' : 'max-w-4xl'}`}>
          <Outlet />
        </div>
      </main>
      <UploadActivity />
    </div>
  )
}
