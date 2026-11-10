import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ImagePlus, ShoppingBag, Trash2 } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import useAsync from '../../shared/hooks/useAsync'
import { getGiftCard, ordersApi } from '../../shared/services/contentService'
import { useAuth } from '../../shared/context/AuthContext'
import { useCart } from '../../shared/context/CartContext'
import { buildOrder } from '../../shared/utils/orders'
import { formatPrice } from '../../shared/utils/format'
import { orderImageType } from '../../shared/utils/manualOrderRules'
import { inputClass } from '../../admin/classes'
import { cleanInstagram, instagramProblem } from '../order/lib/validation'
import { photoStore } from '../order/lib/photoStore'
import { MAX_GIFT_PHOTOS, NOTE_LIMIT, availableSizes, giftCardPrice } from '../gift-card/sizes'

const deliveryFee = (area) => area === 'inside' ? 60 : area === 'outside' ? 110 : 0
const deliveryAreaLabel = (area) => area === 'inside' ? 'Inside Dhaka' : area === 'outside' ? 'Outside Dhaka' : ''
const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export default function GiftCardOrderPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { add: addToCart } = useCart()
  const { user } = useAuth()
  const { data: card, loading } = useAsync(() => getGiftCard(), [])
  const cartMode = params.get('mode') === 'cart'
  const [sizeId, setSizeId] = useState(params.get('size') || '')
  const [photos, setPhotos] = useState([])
  const [letter, setLetter] = useState({ from: '', text: '', left: '', right: '' })
  const [note, setNote] = useState('')
  const [customer, setCustomer] = useState({ name: '', phone: '', instagram: '', address: '' })
  const [deliveryArea, setDeliveryArea] = useState('')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const inputRef = useRef(null)
  const photoKey = useRef(`gift-card-${uid()}`)
  const requestKey = useRef(uid())

  if (loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  const sizes = card ? availableSizes(card) : []
  if (!card || !sizes.length) return <div className="py-24 text-center">The Gift Card is unavailable right now. <Link className="text-brand underline" to="/">Go home</Link></div>
  const size = sizes.find((row) => row.id === sizeId) ?? sizes[0]
  const price = giftCardPrice(card, size.id)

  const setLetterField = (field) => (event) => setLetter((current) => ({ ...current, [field]: event.target.value }))
  const addPhotos = (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const valid = files.filter((file) => orderImageType(file) && file.size <= 100 * 1024 * 1024)
    const remaining = Math.max(0, MAX_GIFT_PHOTOS - photoStore.list(photoKey.current).length)
    const result = photoStore.add(photoKey.current, valid.slice(0, remaining), { allowDuplicates: true })
    setPhotos([...photoStore.list(photoKey.current)])
    const rejected = files.length - valid.length
    const overLimit = Math.max(0, valid.length - remaining)
    setError(rejected || overLimit ? `${result.added.length} photo${result.added.length === 1 ? '' : 's'} added. ${[rejected ? `${rejected} invalid or over 100 MB` : '', overLimit ? `${overLimit} skipped (limit is ${MAX_GIFT_PHOTOS} photos)` : ''].filter(Boolean).join(', ')}.` : '')
  }
  const setField = (field) => (event) => setCustomer((current) => ({ ...current, [field]: event.target.value }))

  const placeOrder = async (event) => {
    event.preventDefault()
    if (placing) return
    if (!letter.text.trim()) { setError('Please write your letter.'); document.getElementById('gift-letter')?.focus(); return }
    if (!cartMode && instagramProblem(customer.instagram)) { setError(`Instagram username: ${instagramProblem(customer.instagram)}`); return }
    if (!cartMode && !deliveryArea) { setError('Select Inside Dhaka or Outside Dhaka.'); return }
    setPlacing(true)
    setError('')
    try {
      await photoStore.flush([photoKey.current])
      const uploaded = photoStore.list(photoKey.current)
      const details = [
        { label: 'Size', value: `${size.label} (${size.cm})` },
        ...(letter.from.trim() ? [{ label: 'From', value: letter.from.trim() }] : []),
        { label: 'Letter', value: letter.text.trim() },
        ...(letter.left.trim() ? [{ label: 'Left side note', value: letter.left.trim() }] : []),
        ...(letter.right.trim() ? [{ label: 'Right side note', value: letter.right.trim() }] : []),
      ]
      const line = {
        kind: 'product', id: card.id, name: card.title, image: card.image,
        optionId: `gift-card-${size.id}`, optionLabel: `${size.label} · ${size.cm}`,
        price, qty: 1, ...(note.trim() ? { note: note.trim() } : {}), details,
        meta: { size: size.id, cartConfigId: uid() },
        ...(uploaded.length ? { photos: { count: uploaded.length, files: uploaded.map(({ id, name, size: fileSize, type, storageKey }) => ({ id, name, size: fileSize, type, storageKey })) } } : {}),
      }
      if (cartMode) { addToCart(line); navigate('/cart'); return }
      const order = await ordersApi.place(buildOrder({
        id: '',
        cartItems: [line],
        customer: { ...customer, instagram: cleanInstagram(customer.instagram), uid: user?.uid || '', email: user?.email || '' },
        extras: { deliveryCharge: deliveryFee(deliveryArea), deliveryLabel: `${deliveryAreaLabel(deliveryArea)} · Delivery details received`, deliveryInfo: { location: deliveryArea, locationLabel: deliveryAreaLabel(deliveryArea) } },
      }), requestKey.current)
      setPlacedOrder(order)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not place the order. Please try again.')
    } finally { setPlacing(false) }
  }

  const Counter = ({ value, max }) => <span className={`text-xs tabular-nums ${value >= max ? 'text-red-600' : 'text-ink/45'}`}>{value} / {max}</span>

  return <div className="min-h-screen bg-cream pb-16 pt-6 sm:pt-10"><Container>
    {placedOrder ? <section className="mx-auto mt-12 max-w-xl rounded-3xl border border-sand bg-white p-8 text-center shadow-sm">
      <CheckCircle2 className="mx-auto text-green-600" size={44} />
      <h1 className="mt-4 font-serif text-3xl">Your order is confirmed</h1>
      <p className="mt-2 text-sm text-ink/60">Order ID: <strong className="text-ink">{placedOrder.id}</strong>. We’ll contact you to confirm delivery and payment.</p>
      <Button className="mt-6" onClick={() => navigate('/account')}>View my orders</Button>
    </section> : <>
      <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Gift Card</p><h1 className="mt-1 font-serif text-4xl">{card.title}</h1><p className="mt-2 text-sm text-ink/60">Write your letter and notes. We print them on your card.</p></div>
      <form onSubmit={placeOrder} className="mt-7 grid w-full min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]">
        <section className="min-w-0 max-w-full space-y-6 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-7">
          <div>
            <h2 className="font-serif text-2xl">Size</h2>
            <div role="radiogroup" aria-label="Size" className="mt-3 grid grid-cols-2 gap-2.5">
              {sizes.map((row) => { const on = row.id === size.id; return <button key={row.id} type="button" role="radio" aria-checked={on} onClick={() => setSizeId(row.id)} className={`rounded-xl border-2 px-3 py-3 text-left transition ${on ? 'border-brand bg-cream shadow-sm' : 'border-sand bg-white hover:border-brand/40'}`}><span className="block font-serif text-xl">{row.label}</span><span className="block text-xs text-ink/60">{row.cm}</span><span className="mt-1 block text-sm font-bold">{formatPrice(giftCardPrice(card, row.id))}</span></button> })}
            </div>
          </div>

          <div className="border-t border-sand pt-6">
            <h2 className="font-serif text-2xl">Your card</h2>
            <p className="mt-1 text-sm text-ink/60">Your letter goes in the middle. Notes go on the left and right sides.</p>
            <div aria-hidden="true" className="mt-4 grid grid-cols-[1fr_1.6fr_1fr] gap-2 rounded-xl bg-cream p-2.5 text-[11px] leading-4 text-ink/60">
              <div className="rounded-lg border border-dashed border-brand/40 bg-white p-2"><p className="font-semibold text-brand">Left note</p><p className="mt-1 line-clamp-4 break-words">{letter.left.trim() || 'Optional'}</p></div>
              <div className="rounded-lg border border-brand/40 bg-white p-2 text-center"><p className="font-semibold text-brand">Your letter</p>{letter.from.trim() && <p className="mt-0.5">From: {letter.from.trim()}</p>}<p className="mt-1 line-clamp-5 break-words">{letter.text.trim() || 'Write below'}</p></div>
              <div className="rounded-lg border border-dashed border-brand/40 bg-white p-2"><p className="font-semibold text-brand">Right note</p><p className="mt-1 line-clamp-4 break-words">{letter.right.trim() || 'Optional'}</p></div>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium">From <span className="font-normal text-ink/50">(your name on the card, optional)</span><input className={`${inputClass} mt-1`} maxLength={60} placeholder="e.g. Your Nini" value={letter.from} onChange={setLetterField('from')} /></label>
              <label className="block text-sm font-medium"><span className="flex items-center justify-between gap-2"><span>Letter <span className="text-red-600">*</span></span><Counter value={letter.text.length} max={size.letterLimit} /></span><textarea id="gift-letter" rows={9} maxLength={size.letterLimit} required className={`${inputClass} mt-1`} placeholder="Write your letter here…" value={letter.text} onChange={setLetterField('text')} /></label>
              <label className="block text-sm font-medium"><span className="flex items-center justify-between gap-2"><span>Left side note <span className="font-normal text-ink/50">(optional)</span></span><Counter value={letter.left.length} max={NOTE_LIMIT} /></span><textarea rows={3} maxLength={NOTE_LIMIT} className={`${inputClass} mt-1`} value={letter.left} onChange={setLetterField('left')} /></label>
              <label className="block text-sm font-medium"><span className="flex items-center justify-between gap-2"><span>Right side note <span className="font-normal text-ink/50">(optional)</span></span><Counter value={letter.right.length} max={NOTE_LIMIT} /></span><textarea rows={3} maxLength={NOTE_LIMIT} className={`${inputClass} mt-1`} value={letter.right} onChange={setLetterField('right')} /></label>
            </div>
          </div>

          <div className="border-t border-sand pt-6">
            <h2 className="font-serif text-2xl">Photos <span className="text-base font-normal text-ink/50">(optional)</span></h2>
            <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={addPhotos} />
            {photos.length > 0 && <div className="mt-4 flex w-full min-w-0 gap-2.5 overflow-x-auto pb-2">{photos.map((photo) => <div key={photo.id} className="relative w-24 shrink-0 overflow-hidden rounded-lg border border-sand bg-cream sm:w-28">
              {photo.url && <img src={photo.url} alt={photo.name} className="aspect-square w-full object-cover" />}
              <p className="truncate px-2 py-1.5 text-xs" title={photo.name}>{photo.name}</p>
              <button type="button" aria-label={`Remove ${photo.name}`} onClick={() => { photoStore.remove(photoKey.current, photo.id); setPhotos([...photoStore.list(photoKey.current)]) }} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/95 shadow"><Trash2 size={14} /></button>
            </div>)}</div>}
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/30 bg-cream px-4 text-sm font-semibold text-brand hover:border-brand"><ImagePlus size={18} /> Upload photos for your card</button>
            <p className="mt-2 text-xs text-ink/50">Selected: {photos.length} / {MAX_GIFT_PHOTOS}. Photos are kept exactly as you upload them. Each image can be up to 100 MB.</p>
          </div>

          <label className="block text-sm font-medium">Notes for us <span className="font-normal text-ink/50">(optional)</span><textarea rows={3} className={`${inputClass} mt-1`} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          {!cartMode && <div className="border-t border-sand pt-6"><h2 className="font-serif text-2xl">Delivery information</h2><p className="mb-4 mt-1 text-sm text-ink/60">We’ll contact you to confirm delivery.</p><div className="space-y-3">
            <input className={inputClass} placeholder="Full name" autoComplete="name" required value={customer.name} onChange={setField('name')} />
            <input className={inputClass} type="tel" placeholder="WhatsApp / phone number" autoComplete="tel" required value={customer.phone} onChange={setField('phone')} />
            <input className={inputClass} placeholder="Instagram username (e.g. @yourname)" aria-label="Instagram username" autoComplete="off" autoCapitalize="none" required value={customer.instagram} onChange={setField('instagram')} />
              <textarea className={inputClass} rows={4} placeholder="Full delivery address" autoComplete="street-address" required value={customer.address} onChange={setField('address')} />
            <label className="block text-sm font-medium">Delivery area <span className="text-red-600">*</span><span className="relative mt-1 block"><select aria-label="Delivery area" required value={deliveryArea} onChange={(event) => setDeliveryArea(event.target.value)} className={`${inputClass} appearance-none pr-10`}><option value="">Select an area</option><option value="inside">Inside Dhaka · ৳60</option><option value="outside">Outside Dhaka · ৳110</option></select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50" /></span></label>
          </div></div>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={placing} className="w-full gap-2">{placing ? (cartMode ? 'Adding to cart…' : 'Placing order…') : (cartMode ? 'Add to Cart' : 'Place order')} <ShoppingBag size={17} /></Button>
        </section>
        <aside className="min-w-0 max-w-full rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6">
          <h2 className="font-serif text-2xl">Order summary</h2>
          <div className="mt-5 flex items-center gap-3 border-b border-sand pb-5"><div className="size-16 shrink-0 overflow-hidden rounded-xl bg-cream"><img src={card.image} alt={card.title} className="size-full object-cover" /></div><div className="min-w-0 flex-1"><p className="font-semibold">{card.title}</p><p className="text-sm text-ink/60">{size.label} · {size.cm}</p></div><p className="font-semibold">{formatPrice(price)}</p></div>
          <div className="mt-4 flex justify-between text-sm"><span className="text-ink/60">Delivery {deliveryArea ? `(${deliveryAreaLabel(deliveryArea)})` : ''}</span><span>{cartMode ? 'Set at cart checkout' : deliveryArea ? formatPrice(deliveryFee(deliveryArea)) : 'Select an area'}</span></div>
          <div className="mt-4 flex justify-between border-t border-sand pt-4 text-lg"><span className="font-semibold">Total</span><span className="font-extrabold">{formatPrice(price + (cartMode ? 0 : deliveryFee(deliveryArea)))}</span></div>
        </aside>
      </form>
    </>}
  </Container></div>
}
