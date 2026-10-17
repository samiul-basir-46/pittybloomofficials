import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, MessageCircle, ShoppingBag, Trash2 } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import SmartImage from '../../shared/ui/SmartImage'
import PageNav from '../../shared/ui/PageNav'
import QtyStepper from '../../shared/ui/QtyStepper'
import { useCart } from '../../shared/context/CartContext'
import { useSettings } from '../../shared/context/SettingsContext'
import { ordersApi } from '../../shared/services/contentService'
import { buildOrder, makeOrderId } from '../../shared/utils/orders'
import { formatPrice } from '../../shared/utils/format'
import { inputClass } from '../../admin/classes'

const buildMessage = (items, subtotal, c, brand, orderId) =>
  [
    `New order for ${brand}`,
    `Order ID: ${orderId}`,
    '',
    `Name: ${c.name}`,
    `Phone: ${c.phone}`,
    `Address: ${c.address}`,
    ...(c.note.trim() ? [`Note: ${c.note.trim()}`] : []),
    '',
    ...items.flatMap((i, n) => [
      `${n + 1}. ${i.kind === 'addon' ? '[Add-on] ' : ''}${i.name}${i.kind === 'addon' ? '' : ` (${i.optionLabel})`} x${i.qty} = ${formatPrice(i.price * i.qty)}`,
      ...(i.note ? [`   Instructions: ${i.note}`] : []),
    ]),
    '',
    `Subtotal: ${formatPrice(subtotal)} (delivery charge to be confirmed)`,
  ].join('\n')

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
      <h2 className="mt-6 font-serif text-3xl">Order ready to send</h2>
      <p className="mt-3 text-ink/60">
        Your order ID is <span className="font-bold text-ink">{order.id}</span>. Send the message that just opened so we can confirm your order.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button as="a" href={order.url} target="_blank" rel="noreferrer" className="gap-2">
          <MessageCircle size={16} /> Open message again
        </Button>
        <Button as={Link} to="/magazines" variant="outline">
          Continue shopping
        </Button>
      </div>
    </div>
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
  const submitting = useRef(false)
  const [placed, setPlaced] = useState(null)
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', note: '' })
  const set = (key) => (e) => setCustomer({ ...customer, [key]: e.target.value })
  const whatsapp = (settings.whatsapp || '').replace(/\D/g, '')

  const placeOrder = async (e) => {
    e.preventDefault()
    if (submitting.current || items.length === 0) return
    submitting.current = true
    const existing = await ordersApi.list()
    const id = makeOrderId(existing)
    const text = buildMessage(items, subtotal, customer, settings.name, id)
    const url = whatsapp
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`
      : `mailto:${settings.email}?subject=${encodeURIComponent(`New order ${id}`)}&body=${encodeURIComponent(text)}`

    // The order is saved first. If browser storage is full the customer can still send the message.
    try {
      await ordersApi.save(buildOrder({ id, cartItems: items, customer }))
    } catch {
      // the message below still carries the whole order
    }
    if (whatsapp) window.open(url, '_blank', 'noopener')
    else window.location.href = url
    setPlaced({ id, url })
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

        {placed ? (
          <Placed order={placed} />
        ) : items.length === 0 ? (
          <EmptyCart />
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

              <Button type="submit" className="w-full gap-2 shadow-lg">
                <MessageCircle size={18} /> {whatsapp ? 'Place order on WhatsApp' : 'Place order by email'}
              </Button>
              <p className="text-center text-xs text-ink/50">
                This opens a ready message with your order. Send it and we will confirm the details, delivery charge and payment with you.
              </p>
            </form>
          </div>
        )}
      </Container>
    </div>
  )
}
