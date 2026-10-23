import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ImagePlus, ShoppingBag, Trash2 } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import PageNav from '../../shared/ui/PageNav'
import useAsync from '../../shared/hooks/useAsync'
import { getFrameProduct, getProduct, ordersApi } from '../../shared/services/contentService'
import { useAuth } from '../../shared/context/AuthContext'
import { useCart } from '../../shared/context/CartContext'
import { buildOrder } from '../../shared/utils/orders'
import { parseOptions } from '../../shared/utils/options'
import { formatPrice } from '../../shared/utils/format'
import { inputClass } from '../../admin/classes'
import { photoStore } from '../order/lib/photoStore'

export default function FrameOrderPage() {
  const [params] = useSearchParams()
  const frameId = params.get('frame')
  const navigate = useNavigate()
  const { add: addToCart } = useCart()
  const { user } = useAuth()
  const { data: legacyProduct, loading: legacyLoading } = useAsync(() => frameId ? Promise.resolve(null) : getProduct('frame'), [frameId])
  const { data: frame, loading: frameLoading } = useAsync(() => frameId ? getFrameProduct(frameId) : Promise.resolve(null), [frameId])
  const product = frame ? { id: frame.id, name: frame.title, image: frame.image } : legacyProduct
  const options = frame ? [{ id: frame.id, label: frame.title, price: Number(frame.price), mrp: Number(frame.mrp) || 0 }] : parseOptions(product?.options)
  const option = frame ? options[0] : options.find((entry) => entry.id === params.get('size')) ?? options[0]
  const qtyValue = Number(params.get('qty'))
  const qty = Number.isInteger(qtyValue) ? Math.min(20, Math.max(1, qtyValue)) : 1
  const cartMode = params.get('mode') === 'cart'
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' })
  const [framePhotos, setFramePhotos] = useState([])
  const [reference, setReference] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const inputRef = useRef(null)
  const framePhotoInput = useRef(null)
  const framePhotoKey = useRef(`frame-photo-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`)
  const referenceKey = useRef(`frame-reference-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`)
  const requestKey = useRef(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    if (placedOrder) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [placedOrder])

  if (legacyLoading || frameLoading) return <p className="py-32 text-center text-ink/60">Loading frame order…</p>
  if (!product || !option) return <div className="py-24 text-center">Frame size is unavailable. <Link className="text-brand underline" to="/frame">Choose a frame size</Link></div>

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Choose an image file for the reference design.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('The reference image must be smaller than 20 MB.'); return }
    const previous = photoStore.list(referenceKey.current)[0]
    if (previous) photoStore.remove(referenceKey.current, previous.id)
    const result = photoStore.add(referenceKey.current, [file])
    setReference(result.added[0] ?? null)
    setError('')
  }
  const handleFramePhoto = (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const valid = files.filter((file) => file.type.startsWith('image/') && file.size <= 20 * 1024 * 1024)
    const result = photoStore.add(framePhotoKey.current, valid, { allowDuplicates: true })
    setFramePhotos(photoStore.list(framePhotoKey.current))
    const rejected = files.length - valid.length
    setError(rejected ? `${result.added.length} photo${result.added.length === 1 ? '' : 's'} added. ${rejected} file${rejected === 1 ? ' was' : 's were'} skipped because it was not an image or was over 20 MB.` : '')
  }
  const setCustomerField = (field) => (event) => setCustomer((current) => ({ ...current, [field]: event.target.value }))
  const placeOrder = async (event) => {
    event.preventDefault()
    if (placing) return
    setPlacing(true)
    setError('')
    try {
      const selectedFramePhotos = photoStore.list(framePhotoKey.current)
      if (!selectedFramePhotos.length) {
        setError('Upload at least one photo for your frame.')
        setPlacing(false)
        return
      }
      await photoStore.flush([framePhotoKey.current, ...(reference ? [referenceKey.current] : [])])
      const savedFramePhotos = photoStore.list(framePhotoKey.current)
      const savedReference = photoStore.list(referenceKey.current)[0]
      const item = {
        kind: frame ? 'frame' : 'product', id: frame?.id ?? product.id, name: product.name, image: product.image,
        ...(frame ? { type: 'frame', optionId: frame.id } : {}),
        optionLabel: option.label, price: option.price, mrp: option.mrp, qty,
        meta: { cartConfigId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}` },
        photos: {
          count: savedFramePhotos.length,
          files: savedFramePhotos.map((photo) => ({ id: photo.id, name: photo.name, size: photo.size, type: photo.type, storageKey: photo.storageKey })),
          ...(savedReference ? { reference: { id: savedReference.id, name: savedReference.name, size: savedReference.size, type: savedReference.type, storageKey: savedReference.storageKey } } : {}),
        },
      }
      if (cartMode) {
        addToCart(item)
        navigate('/cart')
        return
      }
      const order = await ordersApi.place(buildOrder({
        id: '', cartItems: [item], customer: { ...customer, uid: user?.uid || '', email: user?.email || '' },
        extras: { deliveryLabel: 'Delivery details received' },
      }), requestKey.current)
      setPlacedOrder(order)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not place the frame order. Please try again.')
    } finally { setPlacing(false) }
  }

  return <div className="min-h-screen bg-cream pb-16 pt-6 sm:pt-10">
    <Container>
      <PageNav trail={[{ label: 'Frame', to: '/frame' }, { label: 'Order' }]} />
      {placedOrder ? <section className="mx-auto mt-12 max-w-xl rounded-3xl border border-sand bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto text-green-600" size={44} />
        <h1 className="mt-4 font-serif text-3xl">Your frame order is confirmed</h1>
        <p className="mt-2 text-sm text-ink/60">Order ID: <strong className="text-ink">{placedOrder.id}</strong>. We’ll contact you to confirm delivery and payment.</p>
        <Button className="mt-6" onClick={() => navigate('/account')}>View my orders</Button>
      </section> : <>
        <Link to="/frame" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"><ArrowLeft size={16} /> Back to frame</Link>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Frame order</p>
          <h1 className="mt-1 font-serif text-4xl">Almost there</h1>
          <p className="mt-2 text-sm text-ink/60">Add as many print photos as you need and an optional design reference.{cartMode ? ' You can add delivery information in your cart.' : ' Then add your delivery information.'}</p>
        </div>
        <form onSubmit={placeOrder} className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]">
          <section className="space-y-6 rounded-2xl border border-sand bg-white p-5 shadow-sm sm:p-7">
            <div>
              <h2 className="font-serif text-2xl">Photo for your frame <span className="font-sans text-sm font-semibold text-red-600">*</span></h2>
              <p className="mt-1 text-sm text-ink/60">Upload all the pictures you want us to print and place in your frame.</p>
              <input ref={framePhotoInput} type="file" accept="image/*" multiple className="sr-only" onChange={handleFramePhoto} />
              {framePhotos.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {framePhotos.map((photo) => <div key={photo.id} className="relative w-24 shrink-0 overflow-hidden rounded-xl border border-sand bg-cream sm:w-28">
                  {photo.url && <img src={photo.url} alt={photo.name} className="aspect-square w-full object-cover" />}
                  <p className="truncate px-2 py-1.5 text-xs" title={photo.name}>{photo.name}</p>
                  <button type="button" aria-label={`Remove ${photo.name}`} onClick={() => { photoStore.remove(framePhotoKey.current, photo.id); setFramePhotos(photoStore.list(framePhotoKey.current)) }} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/95 text-red-600 shadow-sm hover:bg-white"><Trash2 size={15} /></button>
                </div>)}
              </div>}
              <button type="button" onClick={() => framePhotoInput.current?.click()} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/30 bg-cream px-4 text-sm font-semibold text-brand hover:border-brand"><ImagePlus size={18} /> {framePhotos.length ? 'Add more photos' : 'Upload your photos'}</button>
              <p className="mt-2 text-xs text-ink/50">{framePhotos.length} photo{framePhotos.length === 1 ? '' : 's'} selected. Each image can be up to 20 MB.</p>
            </div>
            <div className="border-t border-sand pt-6">
            <div>
              <h2 className="font-serif text-2xl">Reference design</h2>
              <p className="mt-1 text-sm text-ink/60">Upload a screenshot to show how you want the frame to look. This is optional.</p>
              <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} />
              {reference ? <div className="mt-4 flex items-center gap-3 rounded-xl border border-sand bg-cream p-3">
                {reference.url && <img src={reference.url} alt="Reference design preview" className="size-16 rounded-lg object-cover" />}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{reference.name}</span>
                <button type="button" aria-label="Remove reference image" onClick={() => { photoStore.remove(referenceKey.current, reference.id); setReference(null) }} className="grid size-10 shrink-0 place-items-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>
              </div> : <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/30 bg-cream px-4 text-sm font-semibold text-brand hover:border-brand"><ImagePlus size={18} /> Upload reference screenshot</button>}
            </div>
            </div>
            {!cartMode && <div className="border-t border-sand pt-6">
              <h2 className="font-serif text-2xl">Delivery information</h2>
              <p className="mb-4 mt-1 text-sm text-ink/60">We’ll contact you to confirm the delivery details.</p>
              <div className="space-y-3">
                <input className={inputClass} placeholder="Full name" autoComplete="name" required value={customer.name} onChange={setCustomerField('name')} />
                <input className={inputClass} type="tel" placeholder="WhatsApp / phone number" autoComplete="tel" required value={customer.phone} onChange={setCustomerField('phone')} />
                <textarea className={inputClass} rows={4} placeholder="Full delivery address" autoComplete="street-address" required value={customer.address} onChange={setCustomerField('address')} />
              </div>
            </div>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={placing} className="w-full gap-2">{placing ? (cartMode ? 'Adding to cart…' : 'Placing order…') : (cartMode ? 'Add to Cart' : 'Place order')} <ShoppingBag size={17} /></Button>
          </section>
          <aside className="rounded-2xl border border-sand bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
            <h2 className="font-serif text-2xl">Order summary</h2>
            <div className="mt-5 flex items-center gap-3 border-b border-sand pb-5">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-cream"><img src={product.image} alt={product.name} className="size-full object-cover" /></div>
              <div className="min-w-0 flex-1"><p className="font-semibold">{product.name}</p><p className="mt-1 text-sm text-ink/60">{option.label} · Qty {qty}</p></div>
              <p className="font-semibold">{formatPrice(option.price * qty)}</p>
            </div>
            <div className="mt-4 flex justify-between text-sm"><span className="text-ink/60">Delivery</span><span className="text-ink/60">Confirmed with you</span></div>
            <div className="mt-4 flex justify-between border-t border-sand pt-4 text-lg"><span className="font-semibold">Total</span><span className="font-extrabold">{formatPrice(option.price * qty)}</span></div>
            <p className="mt-4 text-xs leading-5 text-ink/50">{cartMode ? 'Add delivery information when you place the full cart order.' : 'No delivery date selection is needed. We’ll confirm delivery after you place the order.'}</p>
          </aside>
        </form>
      </>}
    </Container>
  </div>
}
