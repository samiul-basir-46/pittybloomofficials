import { useSyncExternalStore } from 'react'
import { Link, NavLink, Outlet, useMatch } from 'react-router-dom'
import { Check, ClipboardList, ExternalLink, LayoutDashboard, Settings, SlidersHorizontal, Upload, X } from 'lucide-react'
import { SECTIONS } from './sections'
import { dismissBookUpload, getBookUploads, subscribeBookUploads } from '../shared/services/bookUploadQueue'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/order-settings', label: 'Order Settings', icon: SlidersHorizontal },
  ...SECTIONS.map((s) => ({ to: `/admin/${s.path}`, label: s.title, icon: s.icon })),
  { to: '/admin/settings', label: 'Site Settings', icon: Settings },
]

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand text-white shadow-sm' : 'text-ink/70 hover:bg-sand/70 hover:text-ink'
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
        <div className={`mx-auto ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
          <Outlet />
        </div>
      </main>
      <UploadActivity />
    </div>
  )
}
