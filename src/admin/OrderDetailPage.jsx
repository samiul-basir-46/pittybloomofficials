import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Trash2 } from 'lucide-react'
import SmartImage from '../shared/ui/SmartImage'
import useAsync from '../shared/hooks/useAsync'
import { addonsApi, ordersApi } from '../shared/services/contentService'
import { ORDER_STATUSES } from '../shared/utils/orders'
import { formatPrice } from '../shared/utils/format'
import { inputClass } from './classes'
import { StatusBadge, when } from './orderUi'

const Card = ({ title, children, className = '' }) => (
  <section className={`rounded-2xl border border-sand bg-white p-5 shadow-sm sm:p-6 ${className}`}>
    {title && <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand">{title}</h2>}
    {children}
  </section>
)

const Rows = ({ rows }) => (
  <dl className="divide-y divide-sand text-sm">
    {rows
      .filter((r) => r.value)
      .map((r) => (
        <div key={r.label} className="flex justify-between gap-6 py-2">
          <dt className="shrink-0 text-ink/60">{r.label}</dt>
          <dd className="text-right font-medium [overflow-wrap:anywhere]">{r.value}</dd>
        </div>
      ))}
  </dl>
)

function Item({ item, image }) {
  return (
    <li className="flex gap-4 p-4 sm:p-5">
      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-sand sm:size-20">
        <SmartImage src={item.image || image} alt={item.name} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{item.name}</p>
            <p className="text-sm text-ink/60">
              {[item.optionLabel, item.meta?.photos && `${item.meta.photos} photos`, `Qty ${item.qty}`].filter(Boolean).join(' · ')}
            </p>
          </div>
          <p className="shrink-0 font-bold">{formatPrice(item.price * item.qty)}</p>
        </div>
        {item.note && <p className="mt-1 text-sm italic text-ink/60">“{item.note}”</p>}
        {item.details?.length > 0 && (
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 rounded-xl bg-cream/70 p-3 text-sm sm:grid-cols-2">
            {item.details.map((r) => (
              <div key={r.label} className="min-w-0">
                <dt className="text-xs text-ink/50">{r.label}</dt>
                <dd className="font-medium [overflow-wrap:anywhere]">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {item.photos && (
          <p className="mt-2 text-sm text-ink/60">
            Photos: {item.photos.count} chosen
            {item.photos.front && ` · Front: ${item.photos.front}`}
            {item.photos.back && ` · Back: ${item.photos.back}`}
          </p>
        )}
      </div>
    </li>
  )
}

function ItemList({ title, items, imageFor }) {
  if (items.length === 0) return null
  return (
    <Card title={`${title} (${items.length})`} className="!p-0">
      <h2 className="sr-only">{title}</h2>
      <ul className="divide-y divide-sand">
        {items.map((i, n) => (
          <Item key={`${i.id}-${n}`} item={i} image={imageFor(i)} />
        ))}
      </ul>
    </Card>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const orders = useAsync(ordersApi.list)
  const addons = useAsync(addonsApi.list)
  const [note, setNote] = useState({ type: '', text: '' })
  const order = orders.data?.find((o) => o.id === id)

  const back = (
    <Link to="/admin/orders" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
      <ArrowLeft size={16} /> All orders
    </Link>
  )
  if (orders.loading && !orders.data) return <p className="py-10 text-center text-ink/60">Loading…</p>
  if (orders.error || !order)
    return (
      <div>
        {back}
        <div className="rounded-2xl border border-dashed border-sand bg-white py-16 text-center">
          <p className="font-semibold">{orders.error ? 'The order could not be loaded.' : 'Order not found.'}</p>
          <p className="mt-1 text-sm text-ink/60">{orders.error ? 'Please refresh the page.' : 'It may have been deleted.'}</p>
        </div>
      </div>
    )

  const magazines = order.items.filter((i) => i.kind === 'magazine')
  const extras = order.items.filter((i) => i.kind === 'addon')
  const others = order.items.filter((i) => i.kind !== 'magazine' && i.kind !== 'addon')
  // Oversized uploaded images are not stored in orders; use the add-on's current image instead.
  const addonImage = (i) => addons.data?.find((a) => a.id === i.id)?.image ?? ''
  const c = order.customer ?? {}

  const changeStatus = async (status) => {
    setNote({ type: '', text: '' })
    try {
      await ordersApi.save({ ...order, status })
      await orders.reload()
      setNote({ type: 'ok', text: `Status changed to ${status}.` })
    } catch {
      setNote({ type: 'error', text: 'The status could not be saved. Please try again.' })
    }
  }
  const remove = async () => {
    if (!window.confirm(`Delete order ${order.id}? This cannot be undone.`)) return
    try {
      await ordersApi.remove(order.id)
      navigate('/admin/orders')
    } catch {
      setNote({ type: 'error', text: 'The order could not be deleted. Please try again.' })
    }
  }

  return (
    <div>
      {back}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl">{order.id}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-ink/60">Placed {when(order.createdAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-ink/50">Total</p>
          <p className="text-3xl font-extrabold">{formatPrice(order.total)}</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ItemList title="Magazines" items={magazines} imageFor={() => ''} />
          <ItemList title="Additional products" items={extras} imageFor={addonImage} />
          <ItemList title="Other products" items={others} imageFor={() => ''} />
          {extras.length === 0 && <p className="text-sm text-ink/50">No additional products in this order.</p>}
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <label className="block text-sm">
              <span className="sr-only">Order status</span>
              <select className={inputClass} value={order.status} onChange={(e) => changeStatus(e.target.value)}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {note.text && (
              <p role={note.type === 'error' ? 'alert' : 'status'} className={`mt-2 flex items-center gap-1.5 text-sm ${note.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>
                {note.type === 'ok' && <Check size={15} />} {note.text}
              </p>
            )}
          </Card>

          <Card title="Customer">
            <Rows
              rows={[
                { label: 'Name', value: c.name },
                { label: 'Phone', value: c.phone },
                { label: 'Instagram', value: c.instagram },
                { label: 'Email', value: c.email },
              ]}
            />
            {c.note && <p className="mt-3 rounded-xl bg-cream/70 p-3 text-sm italic text-ink/70">“{c.note}”</p>}
          </Card>

          <Card title="Delivery">
            <Rows
              rows={[
                { label: 'Recipient', value: c.recipient },
                { label: 'Delivery phone', value: c.deliveryPhone && c.deliveryPhone !== c.phone ? c.deliveryPhone : '' },
                { label: 'Address', value: c.address },
                { label: 'Location', value: order.deliveryInfo?.locationLabel },
                { label: 'Delivery', value: order.delivery },
              ]}
            />
          </Card>

          <Card title="Price">
            <dl className="space-y-2 text-sm">
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
                <div className="flex justify-between">
                  <dt className="text-ink/60">Delivery charge</dt>
                  <dd>{formatPrice(order.deliveryCharge || 0)}</dd>
                </div>
              )}
              {order.rushCharge > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink/60">Rush delivery</dt>
                  <dd>{formatPrice(order.rushCharge)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-sand pt-3 text-base font-extrabold">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Card>

          <button type="button" onClick={remove} className="flex items-center gap-1.5 text-sm text-red-500 hover:underline">
            <Trash2 size={15} /> Delete order
          </button>
        </div>
      </div>
    </div>
  )
}
