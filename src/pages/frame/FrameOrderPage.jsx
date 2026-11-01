import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, CheckCircle2, ChevronDown, ImagePlus, Maximize2, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
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
import { orderImageType } from '../../shared/utils/manualOrderRules'
import { inputClass } from '../../admin/classes'
import { photoStore } from '../order/lib/photoStore'

const deliveryFee = (area) => area === 'inside' ? 60 : area === 'outside' ? 110 : 0
const deliveryAreaLabel = (area) => area === 'inside' ? 'Inside Dhaka' : area === 'outside' ? 'Outside Dhaka' : ''

const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
const MAX_FRAMES = 20

// Full-size look at a design before choosing it.
// "Upload my own design": the customer's own picture is printed exactly as sent, no template.
const CUSTOM_DESIGN = { id: 'custom', name: 'My own design (printed as uploaded)', image: '' }

function DesignPreview({ design, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div role="dialog" aria-modal="true" aria-label={design.name || 'Frame design'} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
    <figure className="relative max-h-full max-w-lg" onClick={(event) => event.stopPropagation()}>
      <img src={design.image} alt={design.name || 'Frame design'} className="max-h-[80vh] w-full rounded-2xl bg-white object-contain" />
      {design.name && <figcaption className="mt-2 text-center text-sm font-medium text-white">{design.name}</figcaption>}
      <button type="button" aria-label="Close preview" onClick={onClose} className="absolute -right-2 -top-2 grid size-9 place-items-center rounded-full bg-white text-ink shadow"><X size={18} /></button>
    </figure>
  </div>
}

// One frame of the order: its own design and its own photos.
function FramePiece({ pieceKey, index, total, designs, designId, quantity, onQuantity, photos, errors = {}, onDesign, onPhotos, onRemovePhoto, onRemove, onPreview }) {
  const input = useRef(null)
  const hasError = Boolean(errors.quantity || errors.design || errors.photos)
  return <section id={`frame-piece-${pieceKey}`} className={`min-w-0 max-w-full scroll-mt-24 rounded-2xl border p-4 sm:p-5 ${hasError ? 'border-red-300 bg-red-50/30' : 'border-sand bg-[#fffefa]'}`} aria-label={`Frame ${index + 1}`}>
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-serif text-xl">{total > 1 ? `Frame #${index + 1}` : 'Your frame'}</h3>
      {total > 1 && <button type="button" onClick={onRemove} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 size={14} /> Remove setup</button>}
    </div>
    {onQuantity && <label className="mt-3 block max-w-xs text-sm font-medium">Quantity of this design<input id={`frame-quantity-${pieceKey}`} type="number" min="1" max={MAX_FRAMES} value={quantity} aria-invalid={Boolean(errors.quantity)} onChange={(event) => onQuantity(event.target.value)} className={`${inputClass} mt-1 ${errors.quantity ? 'border-red-500' : ''}`} />{errors.quantity ? <span className="mt-1 block text-xs text-red-600">{errors.quantity}</span> : <span className="mt-1 block text-xs text-ink/50">Repeats this design and photo group.</span>}</label>}

    {<div className="mt-4 min-w-0 max-w-full">
      <p className="text-sm font-semibold">Choose one design for this frame <span className="text-red-600">*</span></p>
      <div id={`frame-design-${pieceKey}`} tabIndex={-1} role="radiogroup" aria-label={`Design for frame ${index + 1}`} className={`mt-2 grid min-w-0 grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-2 rounded-lg ${errors.design ? 'outline outline-1 outline-red-400 outline-offset-2' : ''}`}>
        <button type="button" role="radio" aria-checked={designId === CUSTOM_DESIGN.id} onClick={() => onDesign(CUSTOM_DESIGN.id)} className={`col-span-full flex min-h-14 w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left ${designId === CUSTOM_DESIGN.id ? 'border-brand bg-cream shadow-sm' : 'border-dashed border-brand/40 bg-white'}`}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">{designId === CUSTOM_DESIGN.id ? <Check size={17} /> : <ImagePlus size={17} />}</span><span className="min-w-0"><span className="block text-sm font-semibold">Use my own design / photo</span><span className="block text-xs text-ink/60">Upload from your phone — we print it exactly as you send it.</span></span></button>
        {designs.map((design) => {
          const selected = design.id === designId
          return <div key={design.id} className={`relative min-w-0 overflow-hidden rounded-lg border-2 bg-white ${selected ? 'border-brand shadow-sm' : 'border-sand'}`}>
            <button type="button" role="radio" aria-checked={selected} aria-label={design.name || 'Design'} onClick={() => onDesign(design.id)} className="block w-full min-w-0 text-left">
              <img src={design.image} alt={design.name || 'Frame design'} loading="lazy" className="aspect-square w-full object-cover" />
              {design.name && <span className="block truncate px-1 py-1 text-[10px] font-medium">{design.name}</span>}
            </button>
            {selected && <span className="pointer-events-none absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-brand text-white"><Check size={12} /></span>}
            <button type="button" aria-label={`View ${design.name || 'design'} larger`} onClick={() => onPreview(design)} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow-sm hover:bg-white"><Maximize2 size={12} /></button>
          </div>
        })}
      </div>
      {errors.design && <p className="mt-2 text-xs text-red-600">{errors.design}</p>}
    </div>}

    <div className="mt-5 min-w-0 max-w-full">
      <p className="text-sm font-semibold">{designId === CUSTOM_DESIGN.id ? 'Your design to print on' : 'Photos for'} {total > 1 ? `frame #${index + 1}` : 'your frame'} <span className="text-red-600">*</span></p>
      <p className="mt-0.5 text-xs text-ink/60">{designId === CUSTOM_DESIGN.id ? 'Upload the finished design or picture. It will be printed exactly as uploaded.' : 'Photos in this group repeat for the quantity above. Add another setup for a different design or photos.'}</p>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { onPhotos(Array.from(event.target.files ?? [])); event.target.value = '' }} />
      {photos.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {photos.map((photo) => <div key={photo.id} className="relative w-16 shrink-0 overflow-hidden rounded-lg border border-sand bg-cream sm:w-[72px]">
          {photo.url && <img src={photo.url} alt={photo.name} className="aspect-square w-full object-cover" />}
          <p className="truncate px-1.5 py-1 text-[11px]" title={photo.name}>{photo.name}</p>
          <button type="button" aria-label={`Remove ${photo.name}`} onClick={() => onRemovePhoto(photo.id)} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/95 text-red-600 shadow-sm hover:bg-white"><Trash2 size={13} /></button>
        </div>)}
      </div>}
      <button id={`frame-photos-${pieceKey}`} type="button" onClick={() => input.current?.click()} className={`mt-3 flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-cream px-3 text-center text-sm font-semibold text-brand hover:border-brand ${errors.photos ? 'border-red-500' : 'border-brand/30'}`}><ImagePlus size={17} /> {photos.length ? 'Add more photos' : 'Upload your photos'}</button>
      <p className="mt-1.5 text-xs text-ink/50">{photos.length} photo{photos.length === 1 ? '' : 's'} selected. Each image can be up to 100 MB.</p>
      {errors.photos && <p className="mt-1 text-xs text-red-600">{errors.photos}</p>}
    </div>
  </section>
}

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
  const designs = (Array.isArray(frame?.designs) ? frame.designs : []).filter((design) => design?.id && design.image)
  const qtyValue = Number(params.get('qty'))
  const qty = Number.isInteger(qtyValue) ? Math.min(MAX_FRAMES, Math.max(1, qtyValue)) : 1
  const cartMode = params.get('mode') === 'cart'
  // Each frame of a frame product is its own piece (own design, own photos). The old size-based product keeps one piece with a quantity.
  const perPiece = Boolean(frame)
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' })
  const [deliveryArea, setDeliveryArea] = useState('')
  const [customerErrors, setCustomerErrors] = useState({})
  const [step, setStep] = useState(1)
  const [pieces, setPieces] = useState(() => [{ key: newKey(), designId: '', quantity: qty }])
  const [pieceErrors, setPieceErrors] = useState({})
  const [preview, setPreview] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [, refresh] = useReducer((count) => count + 1, 0)
  const requestKey = useRef(newKey())
  const photoKeyOf = (piece) => `frame-photo-${piece.key}`

  useEffect(() => {
    if (placedOrder) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [placedOrder])

  if (legacyLoading || frameLoading) return <p className="py-32 text-center text-ink/60">Loading frame order…</p>
  if (!product || !option) return <div className="py-24 text-center">Frame size is unavailable. <Link className="text-brand underline" to="/frame">Choose a frame size</Link></div>

  const designOf = (piece) => piece.designId === CUSTOM_DESIGN.id ? CUSTOM_DESIGN : designs.find((design) => design.id === piece.designId) ?? null
  const count = perPiece ? pieces.reduce((sum, piece) => sum + (Number(piece.quantity) || 0), 0) : qty

  const addPiece = () => setPieces((current) => current.length < MAX_FRAMES ? [...current, { key: newKey(), designId: '', quantity: 1 }] : current)
  const updateQuantity = (piece, value) => setPieces((current) => current.map((entry) => entry.key === piece.key ? { ...entry, quantity: value } : entry))
  const removePiece = (piece) => {
    photoStore.list(photoKeyOf(piece)).forEach((photo) => photoStore.remove(photoKeyOf(piece), photo.id))
    setPieces((current) => current.filter((entry) => entry.key !== piece.key))
  }
  const chooseDesign = (piece, designId) => {
    setPieces((current) => current.map((entry) => (entry.key === piece.key ? { ...entry, designId } : entry)))
    setPieceErrors((current) => ({ ...current, [piece.key]: { ...current[piece.key], design: '' } }))
  }
  const addPhotos = (piece, files) => {
    if (!files.length) return
    const valid = files.filter((file) => orderImageType(file) && file.size <= 100 * 1024 * 1024)
    const result = photoStore.add(photoKeyOf(piece), valid, { allowDuplicates: true })
    refresh()
    setPieceErrors((current) => ({ ...current, [piece.key]: { ...current[piece.key], photos: '' } }))
    const rejected = files.length - valid.length
    setError(rejected ? `${result.added.length} photo${result.added.length === 1 ? '' : 's'} added. ${rejected} file${rejected === 1 ? ' was' : 's were'} skipped because it was not an image or was over 100 MB.` : '')
  }
  const removePhoto = (piece, id) => {
    photoStore.remove(photoKeyOf(piece), id)
    refresh()
  }
  const setCustomerField = (field) => (event) => {
    setCustomer((current) => ({ ...current, [field]: event.target.value }))
    setCustomerErrors((current) => ({ ...current, [field]: '' }))
  }

  const continueToDelivery = () => {
    const problems = {}
    pieces.forEach((piece) => {
      problems[piece.key] = {
        quantity: perPiece && (!Number.isInteger(Number(piece.quantity)) || Number(piece.quantity) < 1) ? 'Enter a quantity of at least 1.' : '',
        design: !piece.designId ? 'Choose a design for this frame.' : '',
        photos: !photoStore.list(photoKeyOf(piece)).length ? 'Upload at least one photo for this design.' : '',
      }
    })
    if (count > MAX_FRAMES) {
      setError('')
      if (pieces[0]) {
        setPieceErrors((current) => ({ ...current, [pieces[0].key]: { ...current[pieces[0].key], quantity: `Total frame quantity cannot be greater than ${MAX_FRAMES}.` } }))
        window.requestAnimationFrame(() => { const target = document.getElementById(`frame-quantity-${pieces[0].key}`); target?.scrollIntoView({ behavior: 'smooth', block: 'center' }); target?.focus({ preventScroll: true }) })
      }
      return
    }
    const firstInvalid = pieces.find((piece) => problems[piece.key]?.quantity || problems[piece.key]?.design || problems[piece.key]?.photos)
    if (firstInvalid) {
      setError('')
      setPieceErrors(problems)
      const fields = problems[firstInvalid.key]
      const targetId = fields.quantity ? `frame-quantity-${firstInvalid.key}` : fields.design ? `frame-design-${firstInvalid.key}` : `frame-photos-${firstInvalid.key}`
      window.requestAnimationFrame(() => {
        const target = document.getElementById(targetId)
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target?.focus({ preventScroll: true })
      })
      return
    }
    setPieceErrors({})
    setError('')
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const placeOrder = async (event) => {
    event.preventDefault()
    if (placing) return
    setError('')
    // Validate every frame and contact field ourselves so all problems are shown together.
    const problems = {}
    pieces.forEach((piece) => {
      problems[piece.key] = {
        quantity: perPiece && (!Number.isInteger(Number(piece.quantity)) || Number(piece.quantity) < 1) ? 'Enter a quantity of at least 1.' : '',
        design: !piece.designId ? 'Choose a design for this frame.' : '',
        photos: !photoStore.list(photoKeyOf(piece)).length ? 'Upload at least one photo for this design.' : '',
      }
    })
    if (count > MAX_FRAMES) { if (pieces[0]) problems[pieces[0].key].quantity = `Total frame quantity cannot be greater than ${MAX_FRAMES}.`; setPieceErrors(problems); setError(''); window.requestAnimationFrame(() => { const target = document.getElementById(`frame-quantity-${pieces[0]?.key}`); target?.scrollIntoView({ behavior: 'smooth', block: 'center' }); target?.focus({ preventScroll: true }) }); return }
    const contactProblems = cartMode ? {} : {
      name: customer.name.trim() ? '' : 'Enter your full name.',
      phone: customer.phone.trim() ? '' : 'Enter your WhatsApp or phone number.',
      address: customer.address.trim() ? '' : 'Enter your delivery address.',
      deliveryArea: deliveryArea ? '' : 'Select Inside Dhaka or Outside Dhaka.',
    }
    setPieceErrors(problems)
    setCustomerErrors(contactProblems)
    const firstInvalidPiece = pieces.find((piece) => problems[piece.key]?.quantity || problems[piece.key]?.design || problems[piece.key]?.photos)
    if (firstInvalidPiece || Object.values(contactProblems).some(Boolean)) {
      setError('')
      window.requestAnimationFrame(() => {
        const fields = firstInvalidPiece ? problems[firstInvalidPiece.key] : null
        const targetId = firstInvalidPiece ? fields.quantity ? `frame-quantity-${firstInvalidPiece.key}` : fields.design ? `frame-design-${firstInvalidPiece.key}` : `frame-photos-${firstInvalidPiece.key}` : contactProblems.name ? 'frame-customer-name' : contactProblems.phone ? 'frame-customer-phone' : contactProblems.address ? 'frame-customer-address' : 'frame-delivery-area'
        const target = document.getElementById(targetId)
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target?.focus({ preventScroll: true })
      })
      return
    }
    setPlacing(true)
    try {
      await photoStore.flush(pieces.map(photoKeyOf))
      const items = pieces.map((piece, index) => {
        const saved = photoStore.list(photoKeyOf(piece))
        const design = designOf(piece)
        return {
          kind: frame ? 'frame' : 'product', id: frame?.id ?? product.id, name: product.name, image: design?.image || product.image,
          ...(frame ? { type: 'frame', optionId: frame.id } : {}),
          optionLabel: design?.id === CUSTOM_DESIGN.id ? `${option.label} · Own design` : design?.name ? `${option.label} · ${design.name}` : option.label, price: option.price, mrp: option.mrp, qty: perPiece ? Number(piece.quantity) || 1 : qty,
          ...(design ? { design: { id: design.id, name: design.name || '', image: design.image || '', custom: design.id === CUSTOM_DESIGN.id } } : {}),
          meta: { cartConfigId: newKey(), ...(pieces.length > 1 ? { piece: index + 1, pieces: pieces.length } : {}), ...(perPiece ? { frameQuantity: Number(piece.quantity) || 1 } : {}) },
          photos: {
            count: saved.length,
            files: saved.map((photo) => ({ id: photo.id, name: photo.name, size: photo.size, type: photo.type, storageKey: photo.storageKey })),
          },
        }
      })
      if (cartMode) {
        items.forEach((item, index) => addToCart(item, { silent: index < items.length - 1 }))
        navigate('/cart')
        return
      }
      const order = await ordersApi.place(buildOrder({
        id: '', cartItems: items, customer: { ...customer, uid: user?.uid || '', email: user?.email || '' },
        extras: { deliveryCharge: deliveryFee(deliveryArea), deliveryLabel: `${deliveryAreaLabel(deliveryArea)} · Delivery details received`, deliveryInfo: { location: deliveryArea, locationLabel: deliveryAreaLabel(deliveryArea) } },
      }), requestKey.current)
      setPlacedOrder(order)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not place the frame order. Please try again.')
    } finally { setPlacing(false) }
  }

  const unit = option.price
  const deliveryCharge = cartMode ? 0 : deliveryFee(deliveryArea)
  const total = unit * count + deliveryCharge

  return <div className="min-h-screen bg-cream pb-16 pt-6 sm:pt-10">
    <Container>
      <PageNav trail={[{ label: 'Frame', to: '/frame' }, { label: 'Order' }]} />
      {placedOrder ? <section className="mx-auto mt-12 max-w-xl rounded-3xl border border-sand bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto text-green-600" size={44} />
        <h1 className="mt-4 font-serif text-3xl">Your frame order is confirmed</h1>
        <p className="mt-2 text-sm text-ink/60">Order ID: <strong className="text-ink">{placedOrder.id}</strong>. We’ll contact you to confirm delivery and payment.</p>
        <Button className="mt-6" onClick={() => navigate('/account')}>View my orders</Button>
      </section> : <>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Frame order</p>
          <h1 className="mt-1 font-serif text-2xl leading-tight sm:text-4xl">{step === 1 || cartMode ? 'Choose your frame designs and photos' : 'Delivery information'}</h1>
          <p className="mt-2 text-sm leading-5 text-ink/60">{step === 1 || cartMode ? `Choose a design and upload photos for each frame.${cartMode ? ' Add delivery information in your cart.' : ''}` : 'Tell us where to deliver your frame order.'}</p>
        </div>
        {!cartMode && <nav aria-label="Order steps" className="mt-5 grid grid-cols-2 rounded-xl border border-sand bg-white p-1 text-xs sm:mt-6 sm:p-1.5 sm:text-sm"><div aria-current={step === 1 ? 'step' : undefined} className={`grid min-h-11 place-items-center rounded-lg px-2 text-center font-medium leading-tight sm:px-3 ${step === 1 ? 'bg-brand text-white' : 'text-ink/55'}`}>1. Frame details</div><div aria-current={step === 2 ? 'step' : undefined} className={`grid min-h-11 place-items-center rounded-lg px-2 text-center font-medium leading-tight sm:px-3 ${step === 2 ? 'bg-brand text-white' : 'text-ink/55'}`}>2. Delivery</div></nav>}
        <form noValidate onSubmit={placeOrder} className="mt-7 grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]">
          <section className="min-w-0 max-w-full space-y-6 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-7">
            {(cartMode || step === 1) && <>
            {perPiece && <div className="flex items-start justify-between gap-3 rounded-xl bg-cream px-3 py-3 sm:px-4"><div className="min-w-0"><p className="font-semibold">{count} frame{count === 1 ? '' : 's'} total</p><p className="mt-0.5 text-xs leading-4 text-ink/60">Set a quantity to repeat a design, or add another design.</p></div><p className="shrink-0 whitespace-nowrap font-semibold text-brand">{formatPrice(unit * count)}</p></div>}

            {pieces.map((piece, index) => <FramePiece
              key={piece.key} pieceKey={piece.key} index={index} total={pieces.length} designs={designs} designId={piece.designId} quantity={piece.quantity}
              photos={photoStore.list(photoKeyOf(piece))} errors={pieceErrors[piece.key]}
              onQuantity={perPiece ? (value) => { updateQuantity(piece, value); setPieceErrors((current) => ({ ...current, [piece.key]: { ...current[piece.key], quantity: '' } })) } : undefined}
              onDesign={(id) => chooseDesign(piece, id)} onPhotos={(files) => addPhotos(piece, files)} onRemovePhoto={(id) => removePhoto(piece, id)}
              onRemove={() => removePiece(piece)} onPreview={setPreview}
            />)}
            {perPiece && <Button type="button" variant="outline" disabled={pieces.length >= MAX_FRAMES || count >= MAX_FRAMES} onClick={addPiece} className="gap-2"><Plus size={16} /> Add another frame design</Button>}
            </>}

            {!cartMode && step === 2 && <div id="frame-delivery-information" className="min-w-0 scroll-mt-24 border-t border-sand pt-6">
              <h2 className="font-serif text-2xl">Delivery information</h2>
              <p className="mb-4 mt-1 text-sm text-ink/60">We’ll contact you to confirm the delivery details.</p>
              <div className="space-y-3">
                <div><input id="frame-customer-name" aria-label="Full name" aria-invalid={Boolean(customerErrors.name)} aria-describedby={customerErrors.name ? 'frame-name-error' : undefined} className={`${inputClass} ${customerErrors.name ? 'border-red-500' : ''}`} placeholder="Full name" autoComplete="name" value={customer.name} onChange={setCustomerField('name')} />{customerErrors.name && <p id="frame-name-error" className="mt-1 text-xs text-red-700">{customerErrors.name}</p>}</div>
                <div><input id="frame-customer-phone" aria-label="WhatsApp / phone number" aria-invalid={Boolean(customerErrors.phone)} aria-describedby={customerErrors.phone ? 'frame-phone-error' : undefined} className={`${inputClass} ${customerErrors.phone ? 'border-red-500' : ''}`} type="tel" placeholder="WhatsApp / phone number" autoComplete="tel" value={customer.phone} onChange={setCustomerField('phone')} />{customerErrors.phone && <p id="frame-phone-error" className="mt-1 text-xs text-red-700">{customerErrors.phone}</p>}</div>
                <div><textarea id="frame-customer-address" aria-label="Full delivery address" aria-invalid={Boolean(customerErrors.address)} aria-describedby={customerErrors.address ? 'frame-address-error' : undefined} className={`${inputClass} ${customerErrors.address ? 'border-red-500' : ''}`} rows={4} placeholder="Full delivery address" autoComplete="street-address" value={customer.address} onChange={setCustomerField('address')} />{customerErrors.address && <p id="frame-address-error" className="mt-1 text-xs text-red-700">{customerErrors.address}</p>}</div>
                <label className="block text-sm font-medium">Delivery area <span className="text-red-600">*</span><span className="relative mt-1 block"><select id="frame-delivery-area" aria-label="Delivery area" required value={deliveryArea} onChange={(event) => { setDeliveryArea(event.target.value); setCustomerErrors((current) => ({ ...current, deliveryArea: '' })) }} className={`${inputClass} appearance-none pr-10 ${customerErrors.deliveryArea ? 'border-red-500' : ''}`}><option value="">Select delivery area</option><option value="inside">Inside Dhaka — ৳60</option><option value="outside">Outside Dhaka — ৳110</option></select><ChevronDown aria-hidden="true" size={17} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B665C]" /></span>{customerErrors.deliveryArea && <span className="mt-1 block text-xs text-red-700">{customerErrors.deliveryArea}</span>}</label>
              </div>
            </div>}
            {error && <p role="alert" aria-live="assertive" className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {cartMode ? <Button type="submit" disabled={placing} className="w-full gap-2">{placing ? 'Adding to cart…' : 'Add to Cart'} <ShoppingBag size={17} /></Button> : step === 1 ? <Button type="button" onClick={continueToDelivery} className="w-full gap-2">Continue to delivery <Plus size={17} /></Button> : <div className="grid gap-3 sm:grid-cols-2"><Button type="button" variant="outline" onClick={() => { setStep(1); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Back to frame details</Button><Button type="submit" disabled={placing} className="w-full gap-2">{placing ? 'Placing order…' : 'Place order'} <ShoppingBag size={17} /></Button></div>}
          </section>
          <aside className="min-w-0 max-w-full rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6">
            <h2 className="font-serif text-2xl">Order summary</h2>
            <ul className="mt-5 divide-y divide-sand border-b border-sand">
              {pieces.map((piece, index) => {
                const design = designOf(piece)
                return <li key={piece.key} className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-cream"><img src={design?.image || product.image} alt={design?.name || product.name} className="size-full object-cover" /></div>
                  <div className="min-w-0 flex-1"><p className="font-semibold">{product.name}{pieces.length > 1 ? ` #${index + 1}` : ''}{perPiece ? ` · Qty ${piece.quantity}` : ''}</p><p className="mt-1 truncate text-sm text-ink/60">{design?.name || 'Choose a design'} · {photoStore.list(photoKeyOf(piece)).length} photo{photoStore.list(photoKeyOf(piece)).length === 1 ? '' : 's'}</p></div>
                  <p className="font-semibold">{formatPrice(unit * (perPiece ? Number(piece.quantity || 0) : qty))}</p>
                </li>
              })}
            </ul>
            <div className="mt-4 flex justify-between text-sm"><span className="text-ink/60">Delivery {deliveryArea ? `(${deliveryAreaLabel(deliveryArea)})` : ''}</span><span>{cartMode ? 'Set at cart checkout' : deliveryArea ? formatPrice(deliveryCharge) : 'Select an area'}</span></div>
            <div className="mt-4 flex justify-between border-t border-sand pt-4 text-lg"><span className="font-semibold">Total</span><span className="font-extrabold">{formatPrice(total)}</span></div>
            <p className="mt-4 text-xs leading-5 text-ink/50">{cartMode ? 'Add delivery information when you place the full cart order.' : 'No delivery date selection is needed. We’ll confirm delivery after you place the order.'}</p>
          </aside>
        </form>
        {preview && <DesignPreview design={preview} onClose={() => setPreview(null)} />}
      </>}
    </Container>
  </div>
}
