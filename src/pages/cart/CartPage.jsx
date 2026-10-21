import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ShoppingBag, Trash2 } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import SmartImage from '../../shared/ui/SmartImage'
import PageNav from '../../shared/ui/PageNav'
import QtyStepper from '../../shared/ui/QtyStepper'
import { useCart } from '../../shared/context/CartContext'
import { useSettings } from '../../shared/context/SettingsContext'
import useAsync from '../../shared/hooks/useAsync'
import { getMagazines, ordersApi } from '../../shared/services/contentService'
import { savedDrafts } from '../order/lib/savedDrafts'
import { buildOrder } from '../../shared/utils/orders'
import { formatPrice } from '../../shared/utils/format'
import { inputClass } from '../../admin/classes'
import { useAuth } from '../../shared/context/AuthContext'
import { firebaseConfigured } from '../../shared/services/firebaseClient'

function EmptyCart() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-sand text-brand">
        <ShoppingBag size={34} />
      </span>
      <h2 className="mt-6 font-serif text-3xl">Your cart is empty</h2>
      <p className="mt-2 text-ink/60">Pick something you love and it will show up here.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button as={Link} to="/magazines">
          Browse Magazines
        </Button>
        <Button as={Link} to="/" variant="outline">
          Home
        </Button>
      </div>
    </div>
  )
}

function Placed({ order }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-green-50 text-green-600">
        <CheckCircle2 size={38} />
      </span>
      <h2 className="mt-6 font-serif text-3xl">Your order is confirmed</h2>
      <p className="mt-3 text-ink/60">
        Order ID: <span className="font-bold text-ink">{order.id}</span>. We have saved your order and will contact you about delivery and payment.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button as={Link} to="/magazines" variant="outline">
          Continue shopping
        </Button>
      </div>
    </div>
  )
}

const when = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

// Magazine orders the customer saved part-way (Save to Cart). They are not orders and not part of the totals below.
function SavedDrafts({ drafts, magazines, onRemove }) {
  return (
    <section aria-labelledby="saved-drafts" className="mt-8">
      <h2 id="saved-drafts" className="font-serif text-2xl">
        Saved to finish later
      </h2>
      <p className="mt-1 text-sm text-ink/60">These orders are not placed yet. Resume any of them right where you stopped.</p>
      <ul className="mt-4 space-y-3">
        {drafts.map((d) => {
          const magazine = magazines.find((m) => m.id === d.magazineId)
          const percent = Math.round((d.step / d.totalSteps) * 100)
          return (
            <li key={d.id} className="flex gap-4 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-5">
              <Link to={`/magazines/${d.magazineId}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-sand sm:size-24">
                <SmartImage src={magazine?.image} alt={d.magazineTitle} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{magazine?.title ?? d.magazineTitle}</p>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Draft · not ordered yet</span>
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  {d.summary || 'Size not chosen yet'}
                  {d.addonCount > 0 && ` · ${d.addonCount} add-on${d.addonCount > 1 ? 's' : ''}`}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-ink/60">
                    <span>
                      Step {d.step} of {d.totalSteps} · {d.stepLabel}
                    </span>
                    <span>Saved {when(d.updatedAt)}</span>
                  </div>
                  <div role="progressbar" aria-label="Order progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                {d.photoCount > 0 && (
                  <p className="mt-2 text-xs text-amber-800">
                    Your {d.photoCount} photo{d.photoCount > 1 ? 's are' : ' is'} not kept with the draft yet. You will need to add {d.photoCount > 1 ? 'them' : 'it'} again.
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <Button as={Link} size="sm" to={`/magazines/${d.magazineId}/order?draft=${encodeURIComponent(d.id)}&step=${d.step}`}>
                    Resume order
                  </Button>
                  <button
                    type="button"
                    aria-label={`Delete saved order for ${magazine?.title ?? d.magazineTitle}`}
                    onClick={() => onRemove(d)}
                    className="grid size-9 place-items-center rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Line({ item }) {
  const { setQty, remove } = useCart()
  return (
    <li className="flex gap-4 border-b border-sand p-4 last:border-0 sm:p-5">
      <Link to={item.to || '/'} className="size-20 shrink-0 overflow-hidden rounded-xl bg-sand sm:size-24">
        <SmartImage src={item.image} alt={item.name} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link to={item.to || '/'} className="block truncate font-semibold hover:text-brand">
            {item.name}
          </Link>
          <p className="text-sm text-ink/60">{item.kind === 'addon' ? 'Add-on product' : item.optionLabel}</p>
          {item.note && <p className="mt-1 line-clamp-2 text-xs italic text-ink/50">“{item.note}”</p>}
          <p className="mt-1 text-sm font-medium text-warm">
            {formatPrice(item.price)}
            {item.mrp > item.price && <span className="ml-2 text-ink/40 line-through">{formatPrice(item.mrp)}</span>}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <QtyStepper value={item.qty} onChange={(q) => setQty(item.key, q)} />
          <p className="w-20 text-right font-bold">{formatPrice(item.price * item.qty)}</p>
          <button
            aria-label={`Remove ${item.name}`}
            onClick={() => remove(item.key)}
            className="grid size-9 place-items-center rounded-lg text-red-500 hover:bg-red-50"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </li>
  )
}

export default function CartPage() {
  const { items, subtotal, savings, count, clear } = useCart()
  const { settings } = useSettings()
  const { user } = useAuth()
  const navigate = useNavigate()
  const submitting = useRef(false)
  const submissionKey = useRef(null)
  const drafts = useAsync(savedDrafts.list, [user?.uid])
  const magazines = useAsync(getMagazines)
  const draftList = drafts.data ?? []
  const removeDraft = async (d) => {
    if (!window.confirm('Delete this saved order? What you filled in will be lost.')) return
    try {
      await savedDrafts.remove(d.id)
    } finally {
      drafts.reload()
    }
  }
  const [placed, setPlaced] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', note: '' })
  const set = (key) => (e) => setCustomer({ ...customer, [key]: e.target.value })
  const placeOrder = async (e) => {
    e.preventDefault()
    if (submitting.current || items.length === 0) return
    if (firebaseConfigured && !user) {
      navigate(`/account?next=${encodeURIComponent('/cart')}`)
      return
    }
    submitting.current = true
    setSubmitError('')
    submissionKey.current ??= globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

    try {
      const order = await ordersApi.place(buildOrder({ id: '', cartItems: items, customer }), submissionKey.current)
      setPlaced(order)
    } catch {
      setSubmitError('We could not save your order. Your cart is still here; please try again.')
      submitting.current = false
      return
    }
    clear()
    submitting.current = false
  }

  return (
    <div className="bg-cream py-8 sm:py-12">
      <Container>
        <PageNav trail={[{ label: 'Cart' }]} />
        <h1 className="mt-8 font-serif text-4xl sm:text-5xl">
          {placed ? 'Thank you' : 'Your Cart'} {!placed && count > 0 && <span className="text-2xl text-ink/40">({count})</span>}
        </h1>

        {!placed && draftList.length > 0 && <SavedDrafts drafts={draftList} magazines={magazines.data ?? []} onRemove={removeDraft} />}

        {placed ? (
          <Placed order={placed} />
        ) : items.length === 0 ? (
          draftList.length === 0 && <EmptyCart />
        ) : (
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <ul className="overflow-hidden rounded-2xl border border-sand bg-white shadow-sm">
                {items.map((i) => (
                  <Line key={i.key} item={i} />
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Link to="/magazines" className="text-sm font-medium text-brand hover:underline">
                  ← Continue shopping
                </Link>
                <button
                  onClick={() => window.confirm('Remove everything from your cart?') && clear()}
                  className="text-sm text-ink/50 hover:text-red-500"
                >
                  Clear cart
                </button>
              </div>
            </div>

            <form onSubmit={placeOrder} className="space-y-5 rounded-2xl border border-sand bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <h2 className="font-serif text-2xl">Order summary</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink/60">Subtotal</dt>
                  <dd className="font-semibold">{formatPrice(subtotal)}</dd>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-green-700">
                    <dt>You save</dt>
                    <dd>{formatPrice(savings)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink/60">Delivery</dt>
                  <dd className="text-right text-ink/60">Confirmed on order</dd>
                </div>
                <div className="flex justify-between border-t border-sand pt-3 text-lg">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-extrabold">{formatPrice(subtotal)}</dd>
                </div>
              </dl>
              {settings.deliveryNote && <p className="text-xs leading-5 text-ink/50">{settings.deliveryNote}</p>}

              <div className="space-y-3 border-t border-sand pt-5">
                <p className="font-semibold">Your details</p>
                <input className={inputClass} placeholder="Full name" required value={customer.name} onChange={set('name')} />
                <input className={inputClass} type="tel" placeholder="Phone number" required value={customer.phone} onChange={set('phone')} />
                <textarea className={inputClass} rows={3} placeholder="Delivery address" required value={customer.address} onChange={set('address')} />
                <input className={inputClass} placeholder="Note for us (optional)" value={customer.note} onChange={set('note')} />
              </div>

              {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}

              <Button type="submit" className="w-full gap-2 shadow-lg">
                <ShoppingBag size={18} /> {firebaseConfigured && !user ? 'Sign in to place order' : 'Place order'}
              </Button>
              <p className="text-center text-xs text-ink/50">
                Your order will be saved here. We will contact you to confirm delivery and payment details.
              </p>
            </form>
          </div>
        )}
      </Container>
    </div>
  )
}
