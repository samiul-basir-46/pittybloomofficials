import { useState } from 'react'
import { ChevronDown, ClipboardList, Trash2 } from 'lucide-react'
import SmartImage from '../shared/ui/SmartImage'
import useAsync from '../shared/hooks/useAsync'
import { addonsApi, ordersApi } from '../shared/services/contentService'
import { ORDER_STATUSES } from '../shared/utils/orders'
import { formatPrice } from '../shared/utils/format'
import { inputClass } from './classes'

const STATUS_STYLE = {
  New: 'bg-blue-50 text-blue-700',
  Confirmed: 'bg-indigo-50 text-indigo-700',
  'In production': 'bg-amber-50 text-amber-700',
  Shipped: 'bg-purple-50 text-purple-700',
  Delivered: 'bg-green-50 text-green-700',
  Cancelled: 'bg-red-50 text-red-600',
}

const when = (iso) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

function Items({ title, items, fallbackImage }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">{title}</p>
      <ul className="divide-y divide-sand rounded-xl border border-sand">
        {items.map((i, n) => (
          <li key={`${i.id}-${n}`} className="flex gap-3 p-3">
            <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-sand">
              <SmartImage src={i.image || fallbackImage(i)} alt={i.name} />
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{i.name}</p>
              <p className="text-ink/60">
                {[i.optionLabel, i.meta?.photos && `${i.meta.photos} photos`, `Qty ${i.qty}`].filter(Boolean).join(' · ')}
              </p>
              {i.note && <p className="mt-0.5 text-xs italic text-ink/50">“{i.note}”</p>}
              {i.details?.length > 0 && (
                <dl className="mt-1.5 space-y-0.5 text-xs">
                  {i.details.map((r) => (
                    <div key={r.label} className="flex gap-2">
                      <dt className="shrink-0 text-ink/50">{r.label}:</dt>
                      <dd className="font-medium [overflow-wrap:anywhere]">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {i.photos && (
                <p className="mt-1 text-xs text-ink/60">
                  Photos: {i.photos.count} chosen
                  {i.photos.front && ` · Front: ${i.photos.front}`}
                  {i.photos.back && ` · Back: ${i.photos.back}`}
                </p>
              )}
            </div>
            <p className="text-sm font-bold">{formatPrice(i.price * i.qty)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Order({ order, addons, onChange, onDelete }) {
  const [open, setOpen] = useState(false)
  const magazines = order.items.filter((i) => i.kind === 'magazine')
  const extras = order.items.filter((i) => i.kind === 'addon')
  const others = order.items.filter((i) => i.kind !== 'magazine' && i.kind !== 'addon')
  // Oversized uploaded images are not stored in orders; use the add-on's current image instead.
  const fallbackImage = (i) => addons.find((a) => a.id === i.id)?.image ?? ''

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-sm">
      <button onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 p-4 text-left sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{order.id}</p>
          <p className="truncate text-sm text-ink/60">
            {order.customer.name} · {when(order.createdAt)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[order.status] ?? 'bg-sand'}`}>{order.status}</span>
        <p className="w-24 text-right font-extrabold">{formatPrice(order.total)}</p>
        <ChevronDown size={18} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-sand bg-cream/50 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">Customer</p>
              <p className="font-semibold">{order.customer.name}</p>
              <p>{order.customer.phone}</p>
              {order.customer.instagram && <p className="text-ink/70">Instagram: {order.customer.instagram}</p>}
              <p className="whitespace-pre-line text-ink/70">{order.customer.address}</p>
              {order.customer.email && <p className="text-ink/70">{order.customer.email}</p>}
              {order.customer.recipient && <p className="mt-1 text-ink/70">Recipient: {order.customer.recipient}</p>}
              {order.customer.deliveryPhone && order.customer.deliveryPhone !== order.customer.phone && (
                <p className="text-ink/70">Delivery phone: {order.customer.deliveryPhone}</p>
              )}
              {order.customer.note && <p className="mt-1 italic text-ink/60">“{order.customer.note}”</p>}
            </div>
            <label className="text-sm">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-brand">Status</span>
              <select className={inputClass} value={order.status} onChange={(e) => onChange({ ...order, status: e.target.value })}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          <Items title="Magazine" items={magazines} fallbackImage={() => ''} />
          <Items title="Additional products" items={extras} fallbackImage={fallbackImage} />
          <Items title="Other products" items={others} fallbackImage={() => ''} />
          {extras.length === 0 && <p className="text-sm text-ink/50">No additional products in this order.</p>}

          <dl className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink/60">Magazine price</dt>
              <dd>{formatPrice(order.magazineTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/60">Additional products</dt>
              <dd>{formatPrice(order.addonTotal)}</dd>
            </div>
            {order.otherTotal > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink/60">Other products</dt>
                <dd>{formatPrice(order.otherTotal)}</dd>
              </div>
            )}
            {order.deliveryInfo && (
              <>
                <div className="flex justify-between">
                  <dt className="text-ink/60">Delivery charge</dt>
                  <dd>{formatPrice(order.deliveryCharge || 0)}</dd>
                </div>
                {order.rushCharge > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-ink/60">Rush delivery</dt>
                    <dd>{formatPrice(order.rushCharge)}</dd>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-ink/60">Delivery</dt>
              <dd className="text-right">{order.delivery}</dd>
            </div>
            <div className="flex justify-between border-t border-sand pt-2 text-base font-extrabold">
              <dt>Total</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </dl>

          <button onClick={onDelete} className="flex items-center gap-1.5 text-sm text-red-500 hover:underline">
            <Trash2 size={15} /> Delete order
          </button>
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  const { data, loading, reload } = useAsync(ordersApi.list)
  const addons = useAsync(addonsApi.list)
  const [filter, setFilter] = useState('All')
  const orders = (data ?? []).filter((o) => filter === 'All' || o.status === filter)

  const update = async (order) => {
    await ordersApi.save(order)
    reload()
  }
  const remove = async (order) => {
    if (!window.confirm(`Delete order ${order.id}?`)) return
    await ordersApi.remove(order.id)
    reload()
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Orders</h1>
          <p className="mt-1 text-sm text-ink/60">{data?.length ?? 0} total</p>
        </div>
        <select className={`${inputClass} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)}>
          {['All', ...ORDER_STATUSES].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Orders are saved in the browser where the customer placed them, so this list only shows orders made on this device.
        The WhatsApp message is what reaches you from customers until orders are connected to an online database.
      </p>

      {loading && !data ? (
        <p className="py-10 text-center text-ink/60">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand bg-white py-16 text-center text-ink/50">
          <ClipboardList className="mx-auto mb-3" />
          No orders yet.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Order key={o.id} order={o} addons={addons.data ?? []} onChange={update} onDelete={() => remove(o)} />
          ))}
        </div>
      )}
    </div>
  )
}
