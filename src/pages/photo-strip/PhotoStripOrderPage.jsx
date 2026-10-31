import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, CheckCircle2, ImagePlus, Maximize2, ShoppingBag, Trash2, X } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import PageNav from '../../shared/ui/PageNav'
import useAsync from '../../shared/hooks/useAsync'
import { getProduct, ordersApi } from '../../shared/services/contentService'
import { useAuth } from '../../shared/context/AuthContext'
import { useCart } from '../../shared/context/CartContext'
import { buildOrder } from '../../shared/utils/orders'
import { parseOptions } from '../../shared/utils/options'
import { formatPrice } from '../../shared/utils/format'
import { orderImageType } from '../../shared/utils/manualOrderRules'
import { inputClass } from '../../admin/classes'
import { photoStore } from '../order/lib/photoStore'
import { polaroidPricing, validPacks } from '../polaroids/packs'

const deliveryFee = (area) => area === 'inside' ? 60 : area === 'outside' ? 110 : 0
const areaLabel = (area) => area === 'inside' ? 'Inside Dhaka' : area === 'outside' ? 'Outside Dhaka' : ''
const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export default function PhotoStripOrderPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { add: addToCart } = useCart()
  const { data: product, loading } = useAsync(() => getProduct('photo-strip'))
  const options = parseOptions(product?.options)
  const option = options.find((item) => item.id === params.get('option')) || options[0]
  const designs = (Array.isArray(product?.designs) ? product.designs : []).filter((design) => design?.id && design.image)
  const cartMode = params.get('mode') === 'cart'
  const rawQty = Number(params.get('qty'))
  const qty = Number.isInteger(rawQty) ? Math.min(9999, Math.max(1, rawQty)) : 1
  const hasQuantityPricing = Number(product?.unitPrice) > 0
  const unitPrice = hasQuantityPricing ? Number(product.unitPrice) : Number(option?.price) || 0
  const packs = hasQuantityPricing ? validPacks(product) : []
  const pricing = hasQuantityPricing ? polaroidPricing({ ...product, unitPrice }, qty) : null
  const [designId, setDesignId] = useState('')
  const [photos, setPhotos] = useState([])
  const [preview, setPreview] = useState(null)
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' })
  const [area, setArea] = useState('')
  const [error, setError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const inputRef = useRef(null)
  const photoKey = useRef(`photo-strip-${newKey()}`)
  const requestKey = useRef(newKey())
  const design = designs.find((item) => item.id === designId)

  useEffect(() => {
    if (!preview) return undefined
    const close = (event) => event.key === 'Escape' && setPreview(null)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [preview])

  if (loading) return <p className="py-32 text-center text-ink/60">Loading Photo Strip designs…</p>
  if (!product || (!option && !hasQuantityPricing)) return <Container className="py-24 text-center">Photo Strip options are unavailable. <Link className="text-brand underline" to="/photo-strip">Go back</Link></Container>

  const addPhotos = (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const valid = files.filter((file) => orderImageType(file) && file.size <= 100 * 1024 * 1024)
    const added = photoStore.add(photoKey.current, valid, { allowDuplicates: true })
    setPhotos(photoStore.list(photoKey.current))
    setError(files.length !== valid.length ? `${added.added.length} photo${added.added.length === 1 ? '' : 's'} added. Invalid or over 100 MB files were skipped.` : '')
  }
  const removePhoto = (id) => {
    photoStore.remove(photoKey.current, id)
    setPhotos(photoStore.list(photoKey.current))
  }
  const setCustomerField = (field) => (event) => setCustomer((current) => ({ ...current, [field]: event.target.value }))
  const placeOrder = async (event) => {
    event.preventDefault()
    if (placing) return
    if (!design) { setError('Choose a design for your Photo Strip.'); return }
    if (!photoStore.list(photoKey.current).length) { setError('Upload at least one photo for your Photo Strip.'); return }
    if (!cartMode && (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim() || !area)) { setError('Enter your name, phone, delivery address and delivery area.'); return }
    setPlacing(true)
    setError('')
    try {
      await photoStore.flush([photoKey.current])
      const savedPhotos = photoStore.list(photoKey.current)
      const line = {
        kind: 'product', id: product.id, name: product.name, image: design.image,
        optionId: hasQuantityPricing ? 'photo-strip-piece' : option.id,
        optionLabel: `${hasQuantityPricing ? `${qty} strip${qty === 1 ? '' : 's'}${pricing.applied ? ` · offer: ${pricing.applied.pieces}+` : ` · ৳${unitPrice} each`}` : option.label} · ${design.name || 'Selected design'}`,
        price: hasQuantityPricing ? (packs.length ? pricing.total : unitPrice) : option.price,
        mrp: hasQuantityPricing ? 0 : option.mrp,
        qty: hasQuantityPricing && packs.length ? 1 : qty,
        design: { id: design.id, name: design.name || '', image: design.image },
        meta: { cartConfigId: newKey() },
        photos: { count: savedPhotos.length, files: savedPhotos.map(({ id, name, size, type, storageKey }) => ({ id, name, size, type, storageKey })) },
      }
      if (cartMode) { addToCart(line); navigate('/cart'); return }
      const order = await ordersApi.place(buildOrder({
        id: '', cartItems: [line], customer: { ...customer, uid: user?.uid || '', email: user?.email || '' },
        extras: { deliveryCharge: deliveryFee(area), deliveryLabel: `${areaLabel(area)} · Delivery details received`, deliveryInfo: { location: area, locationLabel: areaLabel(area) } },
      }), requestKey.current)
      setPlacedOrder(order)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not place your Photo Strip order. Please try again.')
    } finally { setPlacing(false) }
  }

  const total = hasQuantityPricing ? pricing.total : option.price * qty
  return <Container className="pb-20 pt-4">
    <PageNav trail={[{ label: 'Photo Strip', to: '/photo-strip' }, { label: 'Order' }]} />
    {placedOrder ? <section className="mx-auto mt-12 max-w-xl rounded-3xl border border-sand bg-white p-8 text-center shadow-sm"><CheckCircle2 className="mx-auto text-green-600" size={44} /><h1 className="mt-4 font-serif text-3xl">Your Photo Strip order is confirmed</h1><p className="mt-2 text-sm text-ink/60">Order ID: <strong className="text-ink">{placedOrder.id}</strong>.</p><Button className="mt-6" onClick={() => navigate('/account')}>View my orders</Button></section> : <>
      <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Photo Strip order</p><h1 className="mt-1 font-serif text-4xl">Choose your design and photos</h1><p className="mt-2 text-sm text-ink/60">Select a layout, then upload the photos you want us to use.</p></div>
      <form noValidate onSubmit={placeOrder} className="mt-7 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
        <section className="space-y-6 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-7">
          <div><h2 className="font-serif text-2xl">Choose a design <span className="text-red-600">*</span></h2>{designs.length ? <div role="radiogroup" aria-label="Photo Strip designs" className="mt-2 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-2">{designs.map((item, index) => { const selected = designId === item.id; return <div key={item.id} className={`relative w-[76px] shrink-0 overflow-hidden rounded-lg border-2 bg-white sm:w-[84px] ${selected ? 'border-brand shadow-sm' : 'border-sand'}`}><button type="button" role="radio" aria-checked={selected} aria-label={`Select ${item.name || `design ${index + 1}`}`} onClick={() => setDesignId(item.id)} className="block w-full text-left"><img src={item.image} alt={item.name || `Photo Strip design ${index + 1}`} loading="lazy" className="size-[72px] object-cover sm:size-[80px]" />{item.name && <span className="block truncate px-1 py-1 text-[10px] font-medium">{item.name}</span>}</button>{selected && <span className="pointer-events-none absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-brand text-white"><Check size={12} /></span>}<button type="button" aria-label={`View ${item.name || `design ${index + 1}`} larger`} onClick={() => setPreview(item)} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow-sm hover:bg-white"><Maximize2 size={12} /></button></div>})}</div> : <p className="mt-3 rounded-xl bg-cream p-4 text-sm text-ink/65">Designs are being added. Please check back soon.</p>}</div>
          <div><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-serif text-2xl">Photos for printing <span className="text-red-600">*</span></h2><p className="mt-1 text-sm text-ink/60">Upload the pictures for your selected layout.</p></div><span className="text-sm text-ink/55">{photos.length} selected</span></div><input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={addPhotos} />{photos.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2">{photos.map((photo) => <div key={photo.id} className="relative w-20 shrink-0 overflow-hidden rounded-lg border border-sand bg-cream"><img src={photo.url} alt="Selected photo" className="aspect-square w-full object-cover" /><button type="button" aria-label="Remove photo" onClick={() => removePhoto(photo.id)} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/95 text-red-600 shadow"><Trash2 size={14} /></button></div>)}</div>}<button type="button" onClick={() => inputRef.current?.click()} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-dashed border-brand/30 bg-cream px-4 text-sm font-semibold text-brand hover:border-brand"><ImagePlus size={17} />{photos.length ? 'Add more photos' : 'Upload your photos'}</button></div>
          {!cartMode && <div className="border-t border-sand pt-5"><h2 className="font-serif text-2xl">Delivery information</h2><div className="mt-4 space-y-3"><input aria-label="Full name" className={inputClass} placeholder="Full name" autoComplete="name" value={customer.name} onChange={setCustomerField('name')} /><input aria-label="WhatsApp / phone number" className={inputClass} type="tel" placeholder="WhatsApp / phone number" autoComplete="tel" value={customer.phone} onChange={setCustomerField('phone')} /><textarea aria-label="Full delivery address" className={inputClass} rows={3} placeholder="Full delivery address" autoComplete="street-address" value={customer.address} onChange={setCustomerField('address')} /><select aria-label="Delivery area" className={inputClass} value={area} onChange={(event) => setArea(event.target.value)}><option value="">Select delivery area</option><option value="inside">Inside Dhaka — ৳60</option><option value="outside">Outside Dhaka — ৳110</option></select></div></div>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={placing || !designs.length} className="w-full gap-2">{placing ? 'Saving order…' : cartMode ? 'Add to cart' : 'Place order'} <ShoppingBag size={17} /></Button>
        </section>
        <aside className="h-fit rounded-2xl border border-sand bg-white p-5 shadow-sm lg:sticky lg:top-6"><h2 className="font-serif text-2xl">Order summary</h2><div className="mt-4 flex items-center gap-3">{design && <img src={design.image} alt="Selected design" className="size-16 rounded-xl object-cover" />}<div><p className="font-semibold">{hasQuantityPricing ? `${qty} strip${qty === 1 ? '' : 's'}` : option.label}</p><p className="text-sm text-ink/60">{design ? 'Design selected' : 'Choose a design'} · {photos.length} photo{photos.length === 1 ? '' : 's'}</p></div></div><div className="mt-4 flex justify-between text-sm"><span className="text-ink/60">Quantity</span><span>{qty}</span></div>{hasQuantityPricing && <div className="mt-2 flex justify-between text-sm"><span className="text-ink/60">Single price</span><span>{formatPrice(unitPrice)} each</span></div>}{pricing?.saving > 0 && <div className="mt-2 flex justify-between text-sm text-green-700"><span>Combo offer savings</span><span>−{formatPrice(pricing.saving)}</span></div>}<div className="mt-3 flex justify-between border-t border-sand pt-4 text-lg"><span className="font-semibold">Subtotal</span><span className="font-extrabold">{formatPrice(total)}</span></div>{!cartMode && <div className="mt-2 flex justify-between text-sm"><span className="text-ink/60">Delivery</span><span>{area ? formatPrice(deliveryFee(area)) : 'Select an area'}</span></div>}</aside>
      </form>
    </>}
    {preview && <div role="dialog" aria-modal="true" aria-label="Photo Strip design preview" className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onClick={() => setPreview(null)}><img src={preview.image} alt="Photo Strip design" className="max-h-[85vh] max-w-full rounded-2xl object-contain" /><button type="button" aria-label="Close preview" onClick={() => setPreview(null)} className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-white text-ink"><X size={19} /></button></div>}
  </Container>
}
