import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ImagePlus, ShoppingBag, Trash2 } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import PageNav from '../../shared/ui/PageNav'
import QtyStepper from '../../shared/ui/QtyStepper'
import useAsync from '../../shared/hooks/useAsync'
import { getPolaroidProduct, getProduct, ordersApi } from '../../shared/services/contentService'
import { useAuth } from '../../shared/context/AuthContext'
import { useCart } from '../../shared/context/CartContext'
import { buildOrder } from '../../shared/utils/orders'
import { formatPrice } from '../../shared/utils/format'
import { orderImageType } from '../../shared/utils/manualOrderRules'
import { inputClass } from '../../admin/classes'
import { photoStore } from '../order/lib/photoStore'
import { polaroidPricing, validPacks } from './packs'

const deliveryFee = (area) => area === 'inside' ? 60 : area === 'outside' ? 110 : 0
const deliveryAreaLabel = (area) => area === 'inside' ? 'Inside Dhaka' : area === 'outside' ? 'Outside Dhaka' : ''

export default function PolaroidsOrderPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { add: addToCart } = useCart()
  const { user } = useAuth()
  const itemId = params.get('item') || ''
  // A Polaroid chosen from the list (Admin > Polaroid settings) or, when none exist, the single legacy Polaroid product.
  const { data: product, loading } = useAsync(async () => {
    if (!itemId) return getProduct('polaroids')
    const chosen = await getPolaroidProduct(itemId)
    return chosen ? { id: chosen.id, name: chosen.title, image: chosen.image, unitPrice: chosen.unitPrice, minQuantity: chosen.minQuantity, packs: validPacks(chosen) } : null
  }, [itemId])
  const unitPrice = Number(product?.unitPrice) || 8
  const minimumQty = Math.max(1, Number(product?.minQuantity) || 9)
  const initialQty = Number(params.get('qty'))
  const [qtyState, setQty] = useState(Number.isInteger(initialQty) ? Math.min(9999, Math.max(1, initialQty)) : 9)
  const hasPacks = Boolean(product?.packs?.length)
  const qty = qtyState
  const priced = polaroidPricing(product, qty)
  // With offers, the total for this quantity is one line (the photos already say how many pieces); otherwise price x quantity as before.
  const lineUnit = hasPacks ? priced.total : unitPrice
  const lineQty = hasPacks ? 1 : qty
  const cartMode = params.get('mode') === 'cart'
  const [photos, setPhotos] = useState([])
  const [reference, setReference] = useState(null)
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' })
  const [deliveryArea, setDeliveryArea] = useState('')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const inputRef = useRef(null)
  const referenceInputRef = useRef(null)
  const referenceKey = useRef(`polaroid-reference-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`)
  const photoKey = useRef(`polaroid-order-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`)
  const requestKey = useRef(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

  useEffect(() => { setQty((current) => Math.max(minimumQty, current)) }, [minimumQty])

  useEffect(() => {
    if (placedOrder) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [placedOrder])

  if (loading) return <p className="py-32 text-center text-ink/60">Loading Polaroid order…</p>
  if (!product) return <div className="py-24 text-center">Polaroids are unavailable. <Link className="text-brand underline" to="/polaroids">Go back</Link></div>

  const addPhotos = (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const valid = files.filter((file) => orderImageType(file) && file.size <= 100 * 1024 * 1024)
    const remaining = Math.max(0, qty - photoStore.list(photoKey.current).length)
    const result = photoStore.add(photoKey.current, valid.slice(0, remaining), { allowDuplicates: true })
    setPhotos(photoStore.list(photoKey.current))
    const rejected = files.length - valid.length
    const overLimit = Math.max(0, valid.length - remaining)
    setError(rejected || overLimit ? `${result.added.length} photo${result.added.length === 1 ? '' : 's'} added. ${[rejected ? `${rejected} invalid or over 100 MB` : '', overLimit ? `${overLimit} skipped because you selected ${qty} Polaroids` : ''].filter(Boolean).join('; ')}.` : '')
  }
  const addReference = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!orderImageType(file) || file.size > 100 * 1024 * 1024) { setError('Choose an image under 100 MB for the reference.'); return }
    const previous = photoStore.list(referenceKey.current)[0]
    if (previous) photoStore.remove(referenceKey.current, previous.id)
    const added = photoStore.add(referenceKey.current, [file]).added[0]
    setReference(added ?? null)
    setError('')
  }
  const setCustomerField = (field) => (event) => setCustomer((current) => ({ ...current, [field]: event.target.value }))
  const placeOrder = async (event) => {
    event.preventDefault()
    if (placing) return
    const selectedPhotos = photoStore.list(photoKey.current)
    if (qty < minimumQty) { setError(`The minimum Polaroid order is ${minimumQty} pieces.`); return }
    if (selectedPhotos.length !== qty) {
      setError(`Choose exactly ${qty} photo${qty === 1 ? '' : 's'} for ${qty} Polaroid${qty === 1 ? '' : 's'}.`)
      return
    }
    if (!cartMode && !deliveryArea) { setError('Select Inside Dhaka or Outside Dhaka.'); return }
    setPlacing(true)
    setError('')
    try {
      await photoStore.flush([photoKey.current, ...(reference ? [referenceKey.current] : [])])
      const uploaded = photoStore.list(photoKey.current)
      const savedReference = photoStore.list(referenceKey.current)[0]
      const item = {
        kind: 'product', id: product.id, name: product.name, image: product.image,
        optionId: 'polaroid-piece',
        optionLabel: hasPacks ? `${qty} piece${qty === 1 ? '' : 's'}${priced.applied ? ` · offer: ${priced.applied.pieces}+ pieces` : ` · ৳${unitPrice} each`}` : `${qty} piece${qty === 1 ? '' : 's'} · ৳${unitPrice} each`,
        price: lineUnit, qty: lineQty,
        meta: { cartConfigId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}` },
        photos: { count: uploaded.length, files: uploaded.map(({ id, name, size, type, storageKey }) => ({ id, name, size, type, storageKey })), ...(savedReference ? { reference: { id: savedReference.id, name: savedReference.name, size: savedReference.size, type: savedReference.type, storageKey: savedReference.storageKey } } : {}) },
      }
      if (cartMode) {
        addToCart(item)
        navigate('/cart')
        return
      }
      const order = await ordersApi.place(buildOrder({
        id: '',
        cartItems: [item],
        customer: { ...customer, uid: user?.uid || '', email: user?.email || '' },
        extras: { deliveryCharge: deliveryFee(deliveryArea), deliveryLabel: `${deliveryAreaLabel(deliveryArea)} · Delivery details received`, deliveryInfo: { location: deliveryArea, locationLabel: deliveryAreaLabel(deliveryArea) } },
      }), requestKey.current)
      setPlacedOrder(order)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not place the Polaroid order. Please try again.')
    } finally { setPlacing(false) }
  }

  return <div className="min-h-screen bg-cream pb-16 pt-6 sm:pt-10">
    <Container>
      <PageNav trail={[{ label: 'Polaroids', to: '/polaroids' }, { label: 'Order' }]} />
      {placedOrder ? <section className="mx-auto mt-12 max-w-xl rounded-3xl border border-sand bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto text-green-600" size={44} />
        <h1 className="mt-4 font-serif text-3xl">Your Polaroid order is confirmed</h1>
        <p className="mt-2 text-sm text-ink/60">Order ID: <strong className="text-ink">{placedOrder.id}</strong>. We’ll contact you to confirm delivery and payment.</p>
        <Button className="mt-6" onClick={() => navigate('/account')}>View my orders</Button>
      </section> : <>
        <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Polaroid order</p><h1 className="mt-1 font-serif text-4xl">Choose your photos</h1><p className="mt-2 text-sm text-ink/60">One uploaded photo makes one Polaroid. {hasPacks && priced.applied ? `Offer applied: you save ৳${priced.saving}.` : `Each piece is ৳${unitPrice}.`}</p></div>
        <form onSubmit={placeOrder} className="mt-7 grid w-full min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]">
          <section className="min-w-0 max-w-full space-y-6 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-7">
            <div>
              <div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"><div className="min-w-0"><h2 className="font-serif text-2xl">Photos for printing</h2><p className="mt-1 text-sm text-ink/60">Upload exactly one photo for each Polaroid. Minimum order is {minimumQty} pieces.</p></div><div className="flex shrink-0 items-center gap-2"><span className="text-sm font-medium">Pieces</span><QtyStepper value={Math.max(qty, minimumQty)} min={minimumQty} max={9999} onChange={setQty} editable /></div></div>
              <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={addPhotos} />
              {photos.length > 0 && <div className="mt-4 flex w-full min-w-0 gap-2.5 overflow-x-auto pb-2">
                {photos.map((photo) => <div key={photo.id} className="relative w-24 shrink-0 overflow-hidden rounded-lg border border-sand bg-cream sm:w-28">
                  {photo.url && <img src={photo.url} alt={photo.name} className="aspect-square w-full object-cover" />}
                  <p className="truncate px-2 py-1.5 text-xs" title={photo.name}>{photo.name}</p>
                  <button type="button" aria-label={`Remove ${photo.name}`} onClick={() => { photoStore.remove(photoKey.current, photo.id); setPhotos(photoStore.list(photoKey.current)) }} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/95 text-red-600 shadow-sm hover:bg-white"><Trash2 size={15} /></button>
                </div>)}
              </div>}
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/30 bg-cream px-4 text-sm font-semibold text-brand hover:border-brand"><ImagePlus size={18} /> {photos.length ? 'Add more photos' : 'Upload photos'}</button>
              <p className="mt-2 text-xs text-ink/50">Selected: {photos.length} / {qty} photos. Each image can be up to 100 MB.</p>
            </div>
            {!itemId && <div className="border-t border-sand pt-6"><h2 className="font-serif text-2xl">Reference picture <span className="font-sans text-sm font-normal text-ink/50">(optional)</span></h2><p className="mt-1 text-sm text-ink/60">Add a sample style or design reference.</p><input ref={referenceInputRef} type="file" accept="image/*" className="sr-only" onChange={addReference} />{reference ? <div className="mt-3 flex items-center gap-3 rounded-xl border border-sand bg-cream p-3">{reference.url && <img src={reference.url} alt="Polaroid reference" className="size-16 rounded-lg object-cover" />}<span className="min-w-0 flex-1 truncate text-sm">{reference.name}</span><button type="button" onClick={() => { photoStore.remove(referenceKey.current, reference.id); setReference(null) }} className="text-sm text-red-600">Remove</button></div> : <button type="button" onClick={() => referenceInputRef.current?.click()} className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/30 bg-cream px-4 text-sm font-semibold text-brand hover:border-brand"><ImagePlus size={18} /> Upload reference picture</button>}</div>}
            {!cartMode && <div className="border-t border-sand pt-6"><h2 className="font-serif text-2xl">Delivery information</h2><p className="mb-4 mt-1 text-sm text-ink/60">We’ll contact you to confirm delivery.</p><div className="space-y-3">
              <input className={inputClass} placeholder="Full name" autoComplete="name" required value={customer.name} onChange={setCustomerField('name')} />
              <input className={inputClass} type="tel" placeholder="WhatsApp / phone number" autoComplete="tel" required value={customer.phone} onChange={setCustomerField('phone')} />
              <textarea className={inputClass} rows={4} placeholder="Full delivery address" autoComplete="street-address" required value={customer.address} onChange={setCustomerField('address')} />
              <label className="block text-sm font-medium">Delivery area <span className="text-red-600">*</span><span className="relative mt-1 block"><select aria-label="Delivery area" required value={deliveryArea} onChange={(event) => setDeliveryArea(event.target.value)} className={`${inputClass} appearance-none pr-10`}><option value="">Select delivery area</option><option value="inside">Inside Dhaka — ৳60</option><option value="outside">Outside Dhaka — ৳110</option></select><ChevronDown aria-hidden="true" size={17} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B665C]" /></span></label>
            </div></div>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={placing} className="w-full gap-2">{placing ? (cartMode ? 'Adding to cart…' : 'Placing order…') : (cartMode ? 'Add to Cart' : 'Place order')} <ShoppingBag size={17} /></Button>
          </section>
          <aside className="min-w-0 max-w-full rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6">
            <h2 className="font-serif text-2xl">Order summary</h2>
            <div className="mt-5 flex items-center gap-3 border-b border-sand pb-5"><div className="size-16 shrink-0 overflow-hidden rounded-xl bg-cream"><img src={product.image} alt={product.name} className="size-full object-cover" /></div><div className="min-w-0 flex-1"><p className="font-semibold">Polaroids</p><p className="mt-1 text-sm text-ink/60">{qty} piece{qty === 1 ? '' : 's'}{hasPacks ? (priced.applied ? ' · offer price' : ` · ৳${unitPrice} each`) : ` · ৳${unitPrice} each`}</p></div><p className="font-semibold">{formatPrice(lineUnit * lineQty)}</p></div>
            <div className="mt-4 flex justify-between text-sm"><span className="text-ink/60">Delivery {deliveryArea ? `(${deliveryAreaLabel(deliveryArea)})` : ''}</span><span>{cartMode ? 'Set at cart checkout' : deliveryArea ? formatPrice(deliveryFee(deliveryArea)) : 'Select an area'}</span></div>
            <div className="mt-4 flex justify-between border-t border-sand pt-4 text-lg"><span className="font-semibold">Total</span><span className="font-extrabold">{formatPrice(lineUnit * lineQty + (cartMode ? 0 : deliveryFee(deliveryArea)))}</span></div>
            <p className="mt-4 text-xs leading-5 text-ink/50">{cartMode ? 'Add delivery information when you place the full cart order.' : 'No delivery date selection is needed. We’ll confirm delivery after you place the order.'}</p>
          </aside>
        </form>
      </>}
    </Container>
  </div>
}
