import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ClipboardList, Search } from 'lucide-react'
import useAsync from '../shared/hooks/useAsync'
import { ordersApi } from '../shared/services/contentService'
import { ORDER_STATUSES } from '../shared/utils/orders'
import { formatPrice } from '../shared/utils/format'
import { inputClass } from './classes'
import { StatusBadge, orderSummary, when } from './orderUi'

// The list shows just enough to find an order. Clicking a row opens the full order on its own page.
export default function OrdersPage() {
  const { data, loading, error } = useAsync(ordersApi.list)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const orders = (data ?? []).filter(
    (o) =>
      (filter === 'All' || o.status === filter) &&
      (!q || [o.id, o.customer?.name, o.customer?.phone, o.customer?.instagram].some((v) => String(v ?? '').toLowerCase().includes(q))),
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-ink/60">{data?.length ?? 0} total</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Search orders</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            className={`${inputClass} pl-9`}
            placeholder="Search by order ID, name or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select aria-label="Filter by status" className={`${inputClass} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)}>
          {['All', ...ORDER_STATUSES].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Orders are saved in the browser where the customer placed them, so this list only shows orders made on this device.
        The WhatsApp message is what reaches you from customers until orders are connected to an online database.
      </p>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          The orders could not be loaded. Please refresh the page.
        </p>
      ) : loading && !data ? (
        <p className="py-10 text-center text-ink/60">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand bg-white py-16 text-center text-ink/50">
          <ClipboardList className="mx-auto mb-3" />
          {data?.length ? 'No orders match your search.' : 'No orders yet.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                to={`/admin/orders/${encodeURIComponent(o.id)}`}
                className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl border border-sand bg-white p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto_auto_auto] sm:p-5"
              >
                <div className="min-w-0">
                  <p className="font-bold">{o.id}</p>
                  <p className="truncate text-sm text-ink/60">
                    {o.customer?.name} · {when(o.createdAt)}
                  </p>
                </div>
                <p className="order-last col-span-2 truncate text-sm text-ink/70 sm:order-none sm:col-span-1">{orderSummary(o)}</p>
                <div className="justify-self-end sm:justify-self-auto">
                  <StatusBadge status={o.status} />
                </div>
                <p className="hidden w-24 text-right font-extrabold sm:block">{formatPrice(o.total)}</p>
                <ChevronRight size={18} className="hidden text-ink/40 transition group-hover:translate-x-0.5 group-hover:text-brand sm:block" />
                <p className="col-start-1 font-extrabold sm:hidden">{formatPrice(o.total)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
