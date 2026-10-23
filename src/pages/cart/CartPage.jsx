import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ShoppingBag, Trash2 } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import SmartImage from '../../shared/ui/SmartImage'
import PageNav from '../../shared/ui/PageNav'
import QtyStepper from '../../shared/ui/QtyStepper'
import { useCart } from '../../shared/context/CartContext'
import { useSettings } from '../../shared/context/SettingsContext'
import useAsync from '../../shared/hooks/useAsync'
import { customerProfileApi, getMagazines, getSongBooks, ordersApi } from '../../shared/services/contentService'
import { savedDrafts } from '../order/lib/savedDrafts'
import { photoStore } from '../order/lib/photoStore'
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
function SavedDrafts({ drafts, magazines, songBooks, onRemove }) {
  return (
    <section aria-labelledby="saved-drafts" className="mt-8">
      <h2 id="saved-drafts" className="font-serif text-2xl">
        Saved to finish later
      </h2>
      <p className="mt-1 text-sm text-ink/60">These orders are not placed yet. Resume any of them right where you stopped.</p>
      <ul className="mt-4 space-y-3">
        {drafts.map((d) => {
          const isSongBook = d.productType === 'song-book' || Boolean(d.songBookId)
          const productId = isSongBook ? (d.songBookId || d.productId) : d.magazineId
          const product = (isSongBook ? songBooks : magazines).find((item) => item.id === productId)
          const productUrl = isSongBook ? `/song-books/${productId}` : `/magazines/${productId}`
          const resumeUrl = isSongBook ? `${productUrl}/order?mode=cart&draft=${encodeURIComponent(d.id)}&step=${d.step}` : `${productUrl}/order?mode=cart&draft=${encodeURIComponent(d.id)}&step=${d.step}`
          const percent = Math.round((d.step / d.totalSteps) * 100)
          return (
            <li key={d.id} className="flex gap-4 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-5">
              <Link to={productUrl} className="size-20 shrink-0 overflow-hidden rounded-xl bg-sand sm:size-24">
                <SmartImage src={product?.image} alt={product?.title ?? d.productTitle ?? d.magazineTitle} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{product?.title ?? d.productTitle ?? d.magazineTitle}</p>
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
                {!isSongBook && d.photoCount > 0 && (
                  <p className="mt-2 text-xs text-amber-800">
                    Your {d.photoCount} photo{d.photoCount > 1 ? 's are' : ' is'} not kept with the draft yet. You will need to add {d.photoCount > 1 ? 'them' : 'it'} again.
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <Button as={Link} size="sm" to={resumeUrl}>
                    Continue order
                  </Button>
                  <button
                    type="button"
                    aria-label={`Delete saved order for ${product?.title ?? d.productTitle ?? d.magazineTitle}`}
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
  const isCustomOrder = item.kind === 'magazine' || item.kind === 'song-book'
  const baseOrderUrl = item.kind === 'song-book' ? `/song-books/${item.id}/order` : `/magazines/${item.id}/order`
  const resumeOrderUrl = `${baseOrderUrl}?mode=cart${item.meta?.draftId ? `&draft=${encodeURIComponent(item.meta.draftId)}&step=${item.meta.draftStep || 1}` : ''}&cartItemKey=${encodeURIComponent(item.key)}${item.meta?.draftId ? '' : item.kind === 'magazine' ? `&size=${encodeURIComponent(item.optionId)}` : `&pages=${encodeURIComponent(item.meta?.pages || 12)}`}`
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
          {isCustomOrder && item.details?.length > 0 && <p className="mt-1 line-clamp-2 text-xs text-ink/60">{item.details.map((detail) => `${detail.label}: ${detail.value}`).join(' · ')}</p>}
          {isCustomOrder && item.photos && <p className="mt-1 text-xs text-ink/60">{item.photos.count || item.photos.files?.length || 0} photos{item.kind === 'magazine' && !item.meta?.draftId && ` · Front: ${item.photos.front || 'not selected'} · Back: ${item.photos.back || 'not selected'}`}</p>}
          {!isCustomOrder && item.photos && <p className="mt-1 text-xs text-ink/60">{item.photos.count || item.photos.files?.length || 0} print photos{item.photos.reference ? ' · Reference added' : ''}</p>}
          {isCustomOrder && item.meta?.draftId && <p className="mt-1 text-xs font-medium text-amber-800">Order in progress · Step {item.meta.draftStep || 1} of {item.meta.draftTotalSteps || 6}: {item.meta.draftStepLabel || item.name}</p>}
          {isCustomOrder && item.meta?.cartDelivery?.deliveryLabel
            ? <p className="mt-1 text-xs font-medium text-brand">Delivery: {item.meta.cartDelivery.deliveryLabel}</p>
            : isCustomOrder && <Link to={resumeOrderUrl} className="mt-1 inline-block text-xs font-semibold text-brand underline">{item.meta?.draftId ? `Continue your ${item.kind === 'song-book' ? 'Song Book' : 'magazine'} order` : `Complete ${item.kind === 'song-book' ? 'Song Book' : 'magazine'} details`}</Link>}
          <p className="mt-1 text-sm font-medium text-warm">
            {formatPrice(item.price)}
            {item.mrp > item.price && <span className="ml-2 text-ink/40 line-through">{formatPrice(item.mrp)}</span>}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          {item.meta?.draftId ? <span className="text-sm text-ink/55">1 order</span> : <QtyStepper value={item.qty} onChange={(q) => setQty(item.key, q)} />}
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
  const [search] = useSearchParams()
  const submitting = useRef(false)
  const submissionKey = useRef(null)
  const drafts = useAsync(savedDrafts.list, [user?.uid])
  const magazines = useAsync(getMagazines)
  const songBooks = useAsync(getSongBooks)
  const profile = useAsync(() => customerProfileApi.get(user?.uid), [user?.uid])
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
  const [checkoutOpen, setCheckoutOpen] = useState(() => search.get('checkout') === '1')
  const [submitError, setSubmitError] = useState('')
  const savedOrderCheckout = items.find((item) => ['magazine', 'song-book'].includes(item.kind) && item.meta?.cartDelivery)?.meta?.cartDelivery
  const [customer, setCustomer] = useState(() => ({
    name: savedOrderCheckout?.customer?.recipient || savedOrderCheckout?.customer?.name || '',
    phone: savedOrderCheckout?.customer?.deliveryPhone || savedOrderCheckout?.customer?.phone || '',
    address: savedOrderCheckout?.customer?.address || '',
    note: savedOrderCheckout?.customer?.note || '',
  }))
  useEffect(() => {
    if (profile.loading) return
    setCustomer((current) => ({
      ...current,
      name: current.name || profile.data?.name || user?.displayName || '',
      phone: current.phone || profile.data?.phone || '',
      address: current.address || [profile.data?.address, profile.data?.city].filter(Boolean).join(', '),
    }))
  }, [profile.loading, profile.data, user?.displayName])
  useEffect(() => {
    if (search.get('checkout') === '1') setCheckoutOpen(true)
  }, [search])
  const set = (key) => (e) => setCustomer((current) => ({ ...current, [key]: e.target.value }))
  const incompleteOrder = items.find((item) => ['magazine', 'song-book'].includes(item.kind) && !item.meta?.cartDelivery)
  const hasIncompleteMagazine = Boolean(incompleteOrder)
  const deliveryCharge = Number(savedOrderCheckout?.deliveryCharge) || 0
  const rushCharge = Number(savedOrderCheckout?.rushCharge) || 0
  const placeOrder = async (e) => {
    e.preventDefault()
    if (submitting.current || items.length === 0) return
    if (firebaseConfigured && !user) {
      navigate(`/account?next=${encodeURIComponent('/cart?checkout=1')}`)
      return
    }
    submitting.current = true
    setSubmitError('')
    submissionKey.current ??= globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

    try {
      const orderCustomer = savedOrderCheckout?.customer
        ? { ...savedOrderCheckout.customer, recipient: customer.name, deliveryPhone: customer.phone, address: customer.address, note: customer.note || savedOrderCheckout.customer.note }
        : { ...customer, recipient: customer.name, deliveryPhone: customer.phone }
      const order = await ordersApi.place(buildOrder({
        id: '',
        cartItems: items,
        customer: orderCustomer,
        extras: savedOrderCheckout ? {
          deliveryCharge,
          rushCharge,
          deliveryLabel: savedOrderCheckout.deliveryLabel,
          deliveryInfo: savedOrderCheckout.deliveryInfo,
        } : {},
      }), submissionKey.current)
      await photoStore.removeFiles(order.items.flatMap((item) => item.photos?.files ?? []))
      setPlaced(order)
    } catch {
      setSubmitError('We could not save your order. Your cart is still here; please try again.')
      submitting.current = false
      return
    }
    clear()
    submitting.current = false
  }
  const beginCheckout = () => {
    if (hasIncompleteMagazine) {
      const draftParams = incompleteOrder.meta?.draftId
        ? `&draft=${encodeURIComponent(incompleteOrder.meta.draftId)}&step=${incompleteOrder.meta.draftStep || 1}`
        : incompleteOrder.kind === 'magazine' ? `&size=${encodeURIComponent(incompleteOrder.optionId)}` : `&pages=${encodeURIComponent(incompleteOrder.meta?.pages || 12)}`
      const productPath = incompleteOrder.kind === 'song-book' ? 'song-books' : 'magazines'
      navigate(`/${productPath}/${incompleteOrder.id}/order?mode=cart${draftParams}&cartItemKey=${encodeURIComponent(incompleteOrder.key)}`)
      return
    }
    setCheckoutOpen(true)
  }

  return (
    <div className="bg-cream py-8 sm:py-12">
      <Container>
        <PageNav trail={[{ label: 'Cart' }]} />
        <h1 className="mt-8 font-serif text-4xl sm:text-5xl">
          {placed ? 'Thank you' : 'Your Cart'} {!placed && count > 0 && <span className="text-2xl text-ink/40">({count})</span>}
        </h1>

        {!placed && draftList.some((draft) => !items.some((item) => item.meta?.draftId === draft.id)) && <SavedDrafts drafts={draftList.filter((draft) => !items.some((item) => item.meta?.draftId === draft.id))} magazines={magazines.data ?? []} songBooks={songBooks.data ?? []} onRemove={removeDraft} />}

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
                {savedOrderCheckout?.deliveryLabel && <div className="flex justify-between"><dt className="text-ink/60">Selected delivery</dt><dd className="text-right">{savedOrderCheckout.deliveryLabel}</dd></div>}
                {deliveryCharge > 0 && <div className="flex justify-between"><dt className="text-ink/60">Delivery charge</dt><dd>{formatPrice(deliveryCharge)}</dd></div>}
                {rushCharge > 0 && <div className="flex justify-between"><dt className="text-ink/60">Rush delivery</dt><dd>{formatPrice(rushCharge)}</dd></div>}
                {!savedOrderCheckout?.deliveryLabel && <div className="flex justify-between">
                  <dt className="text-ink/60">Delivery</dt>
                  <dd className="text-right text-ink/60">Confirmed on order</dd>
                </div>}
                <div className="flex justify-between border-t border-sand pt-3 text-lg">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-extrabold">{formatPrice(subtotal + deliveryCharge + rushCharge)}</dd>
                </div>
              </dl>
              {settings.deliveryNote && <p className="text-xs leading-5 text-ink/50">{settings.deliveryNote}</p>}

              {checkoutOpen ? <div className="space-y-3 border-t border-sand pt-5">
                <p className="font-semibold">Delivery information</p>
                <input className={inputClass} placeholder="Recipient name" required value={customer.name} onChange={set('name')} />
                <input className={inputClass} type="tel" placeholder="Delivery phone number" required value={customer.phone} onChange={set('phone')} />
                <textarea className={inputClass} rows={3} placeholder="Delivery address" required value={customer.address} onChange={set('address')} />
                <input className={inputClass} placeholder="Delivery note (optional)" value={customer.note} onChange={set('note')} />
              </div> : <div className="border-t border-sand pt-5"><Button type="button" className="w-full gap-2 shadow-lg" onClick={beginCheckout}><ShoppingBag size={18} /> {hasIncompleteMagazine ? `Continue ${incompleteOrder.kind === 'song-book' ? 'Song Book' : 'magazine'} order` : 'Place order'}</Button></div>}

              {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}

              {checkoutOpen && <Button type="submit" className="w-full gap-2 shadow-lg">
                <ShoppingBag size={18} /> {firebaseConfigured && !user ? 'Sign in to place order' : 'Place order'}
              </Button>}
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
