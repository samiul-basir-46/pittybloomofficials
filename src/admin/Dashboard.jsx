import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Flame, RotateCcw, Settings } from 'lucide-react'
import Button from '../shared/ui/Button'
import useAsync from '../shared/hooks/useAsync'
import { store } from '../shared/services/storage'
import { getOrderSettings, ordersApi } from '../shared/services/contentService'
import { getUrgency } from '../shared/utils/urgency'
import { SECTIONS } from './sections'

function Stat({ section }) {
  const { data } = useAsync(section.api.list)
  const Icon = section.icon
  return (
    <Link
      to={`/admin/${section.path}`}
      className="group rounded-2xl border border-sand bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-sand/70 text-brand transition group-hover:bg-brand group-hover:text-white">
        <Icon size={22} />
      </span>
      <p className="mt-5 text-3xl font-bold">{data?.length ?? '–'}</p>
      <p className="text-sm text-ink/60">{section.title}</p>
    </Link>
  )
}

// Open orders by how soon they are needed. Each number opens the Orders list with that filter.
function Attention() {
  const orders = useAsync(ordersApi.list)
  const settings = useAsync(getOrderSettings)
  const now = useMemo(() => new Date(), [])
  if (!orders.data || !settings.data) return null
  const levels = orders.data.map((o) => getUrgency(o, settings.data, now).level)
  const n = (level) => levels.filter((l) => l === level).length
  const cards = [
    { id: 'overdue', label: 'Overdue', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
    { id: 'urgent', label: 'Urgent', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
    { id: 'standard', label: 'Standard', tone: 'border-sand bg-white text-ink/70' },
  ]
  return (
    <section aria-labelledby="attention" className="mt-8">
      <h2 id="attention" className="flex items-center gap-2 font-serif text-2xl">
        <Flame size={22} className="text-brand" /> Open orders by delivery date
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.id} to={`/admin/orders?urgency=${c.id}`} className={`rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${c.tone}`}>
            <p className="text-3xl font-bold">{n(c.id)}</p>
            <p className="text-sm font-medium">{c.label}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

const reset = async () => {
  if (!window.confirm('Reset ALL content to defaults? Your edits will be lost.')) return
  try {
    await store.clear()
    window.location.reload()
  } catch {
    window.alert('Could not reset site content. Check your admin sign-in and try again.')
  }
}

export default function Dashboard() {
  return (
    <div>
      <h1 className="font-serif text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-ink/60">Pick a section to edit. Changes show on the site instantly.</p>

      <Attention />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((s) => (
          <Stat key={s.path} section={s} />
        ))}
      </div>

      <Link
        to="/admin/settings"
        className="mt-4 flex items-center gap-4 rounded-2xl border border-sand bg-white p-5 transition hover:shadow-md"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-sand/70 text-brand">
          <Settings size={22} />
        </span>
        <div>
          <p className="font-semibold">Site Settings</p>
          <p className="text-sm text-ink/60">Brand, hero, about text, footer and contact info</p>
        </div>
      </Link>

      <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/50 p-5">
        <p className="font-semibold text-red-700">Danger zone</p>
        <p className="mt-1 text-sm text-ink/60">Brings every section and setting back to the original defaults.</p>
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={reset}>
          <RotateCcw size={14} /> Reset to defaults
        </Button>
      </div>
    </div>
  )
}
