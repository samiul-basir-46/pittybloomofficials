import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, ClipboardList, ClipboardCopy, Search } from 'lucide-react'
import useAsync from '../shared/hooks/useAsync'
import { getOrderSettings, ordersApi } from '../shared/services/contentService'
import { ORDER_STATUSES } from '../shared/utils/orders'
import { formatPrice } from '../shared/utils/format'
import { compareByDelivery, getUrgency } from '../shared/utils/urgency'
import { inputClass } from './classes'
import { CopyButton, LEVEL_STYLE, StatusBadge, UrgencyPill, orderSummary, when } from './orderUi'
import { cityText, formatOrderSummary } from './orderSummary'
import SummaryDialog from './SummaryDialog'

const PILLS = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: '🚨 Overdue' },
  { id: 'urgent', label: '🔥 Urgent' },
  { id: 'standard', label: '📅 Standard' },
]
const SORTS = [
  { id: 'delivery', label: 'Delivery date (urgent first)' },
  { id: 'newest', label: 'Newest orders first' },
  { id: 'oldest', label: 'Oldest orders first' },
]
const GROUP_TITLE = { overdue: '🚨 Overdue', urgent: '🔥 Urgent', standard: '📅 Standard', none: 'Shipped, delivered or cancelled' }

function Row({ order, urgency, settings, now }) {
  const bar = LEVEL_STYLE[urgency.level].bar
  return (
    <li className={`flex items-center gap-2 rounded-2xl border border-l-4 border-sand bg-white pr-3 shadow-sm transition hover:border-brand/40 hover:shadow-md ${bar}`}>
      <Link
        to={`/admin/orders/${encodeURIComponent(order.id)}`}
        className="group grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_auto_auto_auto] sm:p-5"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-bold">{order.id}</p>
            <UrgencyPill urgency={urgency} />
          </div>
          <p className="truncate text-sm text-ink/60">
            {order.customer?.name} · {cityText(order)} · placed {when(order.createdAt)}
          </p>
        </div>
        <p className="order-last col-span-2 truncate text-sm text-ink/70 sm:order-none sm:col-span-1">{orderSummary(order)}</p>
        <div className="justify-self-end sm:justify-self-auto">
          <StatusBadge status={order.status} />
        </div>
        <p className="hidden w-24 text-right font-extrabold sm:block">{formatPrice(order.total)}</p>
        <ChevronRight size={18} className="hidden text-ink/40 transition group-hover:translate-x-0.5 group-hover:text-brand sm:block" />
        <p className="col-start-1 font-extrabold sm:hidden">{formatPrice(order.total)}</p>
      </Link>
      <CopyButton variant="icon" label={`Copy summary of ${order.id}`} getText={() => formatOrderSummary(order, settings, now)} />
    </li>
  )
}

// The list shows just enough to find an order and to see how soon it is needed.
// Clicking a row opens the full order on its own page. Filters live in the address, so Back keeps them.
export default function OrdersPage() {
  const orders = useAsync(ordersApi.list)
  const settingsData = useAsync(getOrderSettings)
  const [params, setParams] = useSearchParams()
  const [dialog, setDialog] = useState(false)
  const now = useMemo(() => new Date(), [])
  const settings = settingsData.data ?? {}

  const urgencyFilter = PILLS.some((p) => p.id === params.get('urgency')) ? params.get('urgency') : 'all'
  const status = ['All', ...ORDER_STATUSES].includes(params.get('status')) ? params.get('status') : 'All'
  const sort = SORTS.some((s) => s.id === params.get('sort')) ? params.get('sort') : 'delivery'
  const query = params.get('q') ?? ''
  const set = (key, value, fallback) => {
    const next = new URLSearchParams(params)
    if (value === fallback || value === '') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const all = orders.data ?? []
  const q = query.trim().toLowerCase()
  const withUrgency = useMemo(
    () =>
      all
        .filter(
          (o) =>
            (status === 'All' || o.status === status) &&
            (!q || [o.id, o.customer?.name, o.customer?.phone, o.customer?.instagram].some((v) => String(v ?? '').toLowerCase().includes(q))),
        )
        .map((order) => ({ order, urgency: getUrgency(order, settings, now) })),
    [all, status, q, settings, now],
  )
  const count = (level) => withUrgency.filter((x) => x.urgency.level === level).length
  const counts = { all: withUrgency.length, overdue: count('overdue'), urgent: count('urgent'), standard: count('standard') }
  const urgentTotal = counts.overdue + counts.urgent

  const shown = withUrgency
    .filter((x) => urgencyFilter === 'all' || x.urgency.level === urgencyFilter)
    .sort((a, b) =>
      sort === 'delivery'
        ? compareByDelivery(a.order, b.order, settings, now)
        : sort === 'oldest'
          ? String(a.order.createdAt).localeCompare(String(b.order.createdAt))
          : String(b.order.createdAt).localeCompare(String(a.order.createdAt)),
    )
  // With "Delivery date" sorting the list is split under headings, so the urgent ones cannot be missed
  const grouped = sort === 'delivery' && urgencyFilter === 'all'
  const groups = grouped
    ? ['overdue', 'urgent', 'standard', 'none'].map((level) => ({ level, rows: shown.filter((x) => x.urgency.level === level) })).filter((g) => g.rows.length)
    : [{ level: '', rows: shown }]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Orders</h1>
          <p className="mt-1 text-sm text-ink/60">{all.length} total</p>
        </div>
        <button
          type="button"
          onClick={() => setDialog(true)}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-brand-dark"
        >
          <ClipboardCopy size={16} /> Copy summaries
          {urgentTotal > 0 && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs" aria-label={`${urgentTotal} urgent`}>{urgentTotal} urgent</span>}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Search orders</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            className={`${inputClass} pl-9`}
            placeholder="Search by order ID, name, phone or Instagram"
            value={query}
            onChange={(e) => set('q', e.target.value, '')}
          />
        </label>
        <select aria-label="Filter by status" className={`${inputClass} w-auto`} value={status} onChange={(e) => set('status', e.target.value, 'All')}>
          {['All', ...ORDER_STATUSES].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Sort orders" className={`${inputClass} w-auto`} value={sort} onChange={(e) => set('sort', e.target.value, 'delivery')}>
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by delivery urgency">
        {PILLS.map((p) => {
          const on = urgencyFilter === p.id
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => set('urgency', p.id, 'all')}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                on ? 'border-brand bg-brand text-white shadow' : 'border-sand bg-white text-ink/70 hover:border-brand/40'
              }`}
            >
              {p.label} <span className={on ? 'text-white/80' : 'text-ink/50'}>({counts[p.id]})</span>
            </button>
          )
        })}
      </div>

      <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Orders are saved in the browser where the customer placed them, so this list only shows orders made on this device.
        The WhatsApp message is what reaches you from customers until orders are connected to an online database.
      </p>

      {orders.error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          The orders could not be loaded. Please refresh the page.
        </p>
      ) : orders.loading && !orders.data ? (
        <p className="py-10 text-center text-ink/60">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand bg-white py-16 text-center text-ink/50">
          <ClipboardList className="mx-auto mb-3" />
          {all.length ? 'No orders match these filters.' : 'No orders yet.'}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.level || 'all'} aria-label={g.level ? GROUP_TITLE[g.level] : 'Orders'}>
              {g.level && (
                <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-ink/60">
                  {GROUP_TITLE[g.level]} <span className="font-normal">({g.rows.length})</span>
                </h2>
              )}
              <ul className="space-y-3">
                {g.rows.map(({ order, urgency }) => (
                  <Row key={order.id} order={order} urgency={urgency} settings={settings} now={now} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {dialog && <SummaryDialog orders={all} settings={settings} now={now} onClose={() => setDialog(false)} />}
    </div>
  )
}
