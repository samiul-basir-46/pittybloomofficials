import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, CheckCircle2, ImagePlus, Maximize2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
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

const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
const MAX_FRAMES = 20

// Full-size look at a design before choosing it.
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
function FramePiece({ pieceKey, index, total, designs, designId, photos, error, onDesign, onPhotos, onRemovePhoto, onRemove, onPreview }) {
  const input = useRef(null)
  return <section id={`frame-piece-${pieceKey}`} className={`min-w-0 max-w-full scroll-mt-24 rounded-2xl border p-4 sm:p-5 ${error ? 'border-red-300 bg-red-50/30' : 'border-sand bg-[#fffefa]'}`} aria-label={`Frame ${index + 1}`}>
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-serif text-xl">{total > 1 ? `Frame #${index + 1}` : 'Your frame'}</h3>
      {total > 1 && <button type="button" onClick={onRemove} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 size={14} /> Remove</button>}
    </div>

    {designs.length > 0 && <div className="mt-4 min-w-0 max-w-full">
      <p className="text-sm font-semibold">Choose one design for this frame <span className="text-red-600">*</span></p>
      <div role="radiogroup" aria-label={`Design for frame ${index + 1}`} className="mt-2 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-2">
        {designs.map((design) => {
          const selected = design.id === designId
          return <div key={design.id} className={`relative w-[76px] shrink-0 overflow-hidden rounded-lg border-2 bg-white sm:w-[84px] ${selected ? 'border-brand shadow-sm' : 'border-sand'}`}>
            <button type="button" role="radio" aria-checked={selected} aria-label={design.name || 'Design'} onClick={() => onDesign(design.id)} className="block w-full text-left">
              <img src={design.image} alt={design.name || 'Frame design'} loading="lazy" className="size-[72px] object-cover sm:size-[80px]" />
              {design.name && <span className="block truncate px-1 py-1 text-[10px] font-medium">{design.name}</span>}
            </button>
            {selected && <span className="pointer-events-none absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-brand text-white"><Check size={12} /></span>}
            <button type="button" aria-label={`View ${design.name || 'design'} larger`} onClick={() => onPreview(design)} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow-sm hover:bg-white"><Maximize2 size={12} /></button>
          </div>
        })}
      </div>
    </div>}

    <div className="mt-5 min-w-0 max-w-full">
      <p className="text-sm font-semibold">Photos for {total > 1 ? `frame #${index + 1}` : 'your frame'} <span className="text-red-600">*</span></p>
      <p className="mt-0.5 text-xs text-ink/60">Upload all photos for this frame. Every photo in this group uses the design selected above. To use a different design, add another frame.</p>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { onPhotos(Array.from(event.target.files ?? [])); event.target.value = '' }} />
      {photos.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {photos.map((photo) => <div key={photo.id} className="relative w-16 shrink-0 overflow-hidden rounded-lg border border-sand bg-cream sm:w-[72px]">
          {photo.url && <img src={photo.url} alt={photo.name} className="aspect-square w-full object-cover" />}
          <p className="truncate px-1.5 py-1 text-[11px]" title={photo.name}>{photo.name}</p>
          <button type="button" aria-label={`Remove ${photo.name}`} onClick={() => onRemovePhoto(photo.id)} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/95 text-red-600 shadow-sm hover:bg-white"><Trash2 size={13} /></button>
        </div>)}
      </div>}
      <button type="button" onClick={() => input.current?.click()} className="mt-3 flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/30 bg-cream px-3 text-center text-sm font-semibold text-brand hover:border-brand"><ImagePlus size={17} /> {photos.length ? 'Add more photos' : 'Upload your photos'}</button>
      <p className="mt-1.5 text-xs text-ink/50">{photos.length} photo{photos.length === 1 ? '' : 's'} selected. Each image can be up to 20 MB.</p>
    </div>
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
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
  const [customerErrors, setCustomerErrors] = useState({})
  const [pieces, setPieces] = useState(() => [{ key: newKey(), designId: '' }])
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

  // The frame is loaded after the first render; start with as many frames as the link asked for.
  useEffect(() => {
    if (perPiece && qty > 1) setPieces((current) => (current.length >= qty ? current : [...current, ...Array.from({ length: qty - current.length }, () => ({ key: newKey(), designId: '' }))]))
  }, [perPiece, qty])

  if (legacyLoading || frameLoading) return <p className="py-32 text-center text-ink/60">Loading frame order…</p>
  if (!product || !option) return <div className="py-24 text-center">Frame size is unavailable. <Link className="text-brand underline" to="/frame">Choose a frame size</Link></div>
  if (!designs.length) return <Container className="py-24 text-center"><h1 className="font-serif text-3xl">Designs are being prepared</h1><p className="mt-3 text-sm text-ink/60">Please choose another frame or check back later.</p><Link to="/frame" className="mt-6 inline-flex rounded-full border border-sand px-5 py-2 text-sm font-medium">Back to Frames</Link></Container>

  const designOf = (piece) => designs.find((design) => design.id === piece.designId) ?? null
  const count = perPiece ? pieces.length : qty

  const setCount = (next) => {
    const wanted = Math.min(MAX_FRAMES, Math.max(1, next))
    setPieces((current) => {
      if (wanted > current.length) return [...current, ...Array.from({ length: wanted - current.length }, () => ({ key: newKey(), designId: '' }))]
      current.slice(wanted).forEach((piece) => photoStore.list(photoKeyOf(piece)).forEach((photo) => photoStore.remove(photoKeyOf(piece), photo.id)))
      return current.slice(0, wanted)
    })
  }
  const removePiece = (piece) => {
    photoStore.list(photoKeyOf(piece)).forEach((photo) => photoStore.remove(photoKeyOf(piece), photo.id))
    setPieces((current) => current.filter((entry) => entry.key !== piece.key))
  }
  const chooseDesign = (piece, designId) => {
    setPieces((current) => current.map((entry) => (entry.key === piece.key ? { ...entry, designId } : entry)))
    setPieceErrors((current) => ({ ...current, [piece.key]: '' }))
  }
  const addPhotos = (piece, files) => {
    if (!files.length) return
    const valid = files.filter((file) => orderImageType(file) && file.size <= 20 * 1024 * 1024)
    const result = photoStore.add(photoKeyOf(piece), valid, { allowDuplicates: true })
    refresh()
    setPieceErrors((current) => ({ ...current, [piece.key]: '' }))
    const rejected = files.length - valid.length
    setError(rejected ? `${result.added.length} photo${result.added.length === 1 ? '' : 's'} added. ${rejected} file${rejected === 1 ? ' was' : 's were'} skipped because it was not an image or was over 20 MB.` : '')
  }
  const removePhoto = (piece, id) => {
    photoStore.remove(photoKeyOf(piece), id)
    refresh()
  }
  const setCustomerField = (field) => (event) => {
    setCustomer((current) => ({ ...current, [field]: event.target.value }))
    setCustomerErrors((current) => ({ ...current, [field]: '' }))
  }

  const placeOrder = async (event) => {
    event.preventDefault()
    if (placing) return
    setError('')
    // Validate every frame and contact field ourselves so all problems are shown together.
    const problems = {}
    pieces.forEach((piece, index) => {
      const label = pieces.length > 1 ? `Frame #${index + 1}` : 'your frame'
      const missing = []
      if (!piece.designId) missing.push('choose a design')
      if (!photoStore.list(photoKeyOf(piece)).length) missing.push('upload at least one photo')
      if (missing.length) {
        problems[piece.key] = `For ${label}, ${missing.join(' and ')}.`
      }
    })
    const contactProblems = cartMode ? {} : {
      name: customer.name.trim() ? '' : 'Enter your full name.',
      phone: customer.phone.trim() ? '' : 'Enter your WhatsApp or phone number.',
      address: customer.address.trim() ? '' : 'Enter your delivery address.',
    }
    setPieceErrors(problems)
    setCustomerErrors(contactProblems)
    if (Object.keys(problems).length || Object.values(contactProblems).some(Boolean)) {
      setError('')
      const firstInvalidPiece = pieces.find((piece) => problems[piece.key])
      window.requestAnimationFrame(() => {
        document.getElementById(firstInvalidPiece ? `frame-piece-${firstInvalidPiece.key}` : 'frame-delivery-information')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
          optionLabel: design?.name ? `${option.label} · ${design.name}` : option.label, price: option.price, mrp: option.mrp, qty: perPiece ? 1 : qty,
          ...(design ? { design: { id: design.id, name: design.name || '', image: design.image } } : {}),
          meta: { cartConfigId: newKey(), ...(pieces.length > 1 ? { piece: index + 1, pieces: pieces.length } : {}) },
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
        extras: { deliveryLabel: 'Delivery details received' },
      }), requestKey.current)
      setPlacedOrder(order)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not place the frame order. Please try again.')
    } finally { setPlacing(false) }
  }

  const unit = option.price
  const total = unit * count

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
          <h1 className="mt-1 font-serif text-4xl">Almost there</h1>
          <p className="mt-2 text-sm text-ink/60">Choose a design and add the photo or photos for each frame.{cartMode ? ' You can add delivery information in your cart.' : ' Then add your delivery information.'}</p>
        </div>
        <form noValidate onSubmit={placeOrder} className="mt-7 grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]">
          <section className="min-w-0 max-w-full space-y-6 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-7">
            {perPiece && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream px-4 py-3">
              <div><p className="font-semibold">How many frames?</p><p className="text-xs text-ink/60">Each frame gets its own design and photos.</p></div>
              <div className="flex items-center gap-2" role="group" aria-label="Number of frames">
                <button type="button" aria-label="Fewer frames" onClick={() => setCount(count - 1)} disabled={count <= 1} className="grid size-10 place-items-center rounded-full border border-brand/40 text-brand hover:bg-white disabled:opacity-30"><Minus size={16} /></button>
                <span className="w-8 text-center text-lg font-semibold" aria-live="polite">{count}</span>
                <button type="button" aria-label="More frames" onClick={() => setCount(count + 1)} disabled={count >= MAX_FRAMES} className="grid size-10 place-items-center rounded-full border border-brand/40 text-brand hover:bg-white disabled:opacity-30"><Plus size={16} /></button>
              </div>
            </div>}

            {pieces.map((piece, index) => <FramePiece
              key={piece.key} pieceKey={piece.key} index={index} total={pieces.length} designs={designs} designId={piece.designId}
              photos={photoStore.list(photoKeyOf(piece))} error={pieceErrors[piece.key]}
              onDesign={(id) => chooseDesign(piece, id)} onPhotos={(files) => addPhotos(piece, files)} onRemovePhoto={(id) => removePhoto(piece, id)}
              onRemove={() => removePiece(piece)} onPreview={setPreview}
            />)}

            {!cartMode && <div id="frame-delivery-information" className="min-w-0 scroll-mt-24 border-t border-sand pt-6">
              <h2 className="font-serif text-2xl">Delivery information</h2>
              <p className="mb-4 mt-1 text-sm text-ink/60">We’ll contact you to confirm the delivery details.</p>
              <div className="space-y-3">
                <div><input aria-label="Full name" aria-invalid={Boolean(customerErrors.name)} aria-describedby={customerErrors.name ? 'frame-name-error' : undefined} className={`${inputClass} ${customerErrors.name ? 'border-red-500' : ''}`} placeholder="Full name" autoComplete="name" value={customer.name} onChange={setCustomerField('name')} />{customerErrors.name && <p id="frame-name-error" className="mt-1 text-xs text-red-700">{customerErrors.name}</p>}</div>
                <div><input aria-label="WhatsApp / phone number" aria-invalid={Boolean(customerErrors.phone)} aria-describedby={customerErrors.phone ? 'frame-phone-error' : undefined} className={`${inputClass} ${customerErrors.phone ? 'border-red-500' : ''}`} type="tel" placeholder="WhatsApp / phone number" autoComplete="tel" value={customer.phone} onChange={setCustomerField('phone')} />{customerErrors.phone && <p id="frame-phone-error" className="mt-1 text-xs text-red-700">{customerErrors.phone}</p>}</div>
                <div><textarea aria-label="Full delivery address" aria-invalid={Boolean(customerErrors.address)} aria-describedby={customerErrors.address ? 'frame-address-error' : undefined} className={`${inputClass} ${customerErrors.address ? 'border-red-500' : ''}`} rows={4} placeholder="Full delivery address" autoComplete="street-address" value={customer.address} onChange={setCustomerField('address')} />{customerErrors.address && <p id="frame-address-error" className="mt-1 text-xs text-red-700">{customerErrors.address}</p>}</div>
              </div>
            </div>}
            {error && <p role="alert" aria-live="assertive" className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={placing} className="w-full gap-2">{placing ? (cartMode ? 'Adding to cart…' : 'Placing order…') : (cartMode ? 'Add to Cart' : 'Place order')} <ShoppingBag size={17} /></Button>
          </section>
          <aside className="min-w-0 max-w-full rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6">
            <h2 className="font-serif text-2xl">Order summary</h2>
            <ul className="mt-5 divide-y divide-sand border-b border-sand">
              {pieces.map((piece, index) => {
                const design = designOf(piece)
                return <li key={piece.key} className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-cream"><img src={design?.image || product.image} alt={design?.name || product.name} className="size-full object-cover" /></div>
                  <div className="min-w-0 flex-1"><p className="font-semibold">{product.name}{pieces.length > 1 ? ` #${index + 1}` : ''}</p><p className="mt-1 truncate text-sm text-ink/60">{design?.name || 'Choose a design'} · {photoStore.list(photoKeyOf(piece)).length} photo{photoStore.list(photoKeyOf(piece)).length === 1 ? '' : 's'}</p></div>
                  <p className="font-semibold">{formatPrice(unit * (perPiece ? 1 : qty))}</p>
                </li>
              })}
            </ul>
            <div className="mt-4 flex justify-between text-sm"><span className="text-ink/60">Delivery</span><span className="text-ink/60">Confirmed with you</span></div>
            <div className="mt-4 flex justify-between border-t border-sand pt-4 text-lg"><span className="font-semibold">Total</span><span className="font-extrabold">{formatPrice(total)}</span></div>
            <p className="mt-4 text-xs leading-5 text-ink/50">{cartMode ? 'Add delivery information when you place the full cart order.' : 'No delivery date selection is needed. We’ll confirm delivery after you place the order.'}</p>
          </aside>
        </form>
        {preview && <DesignPreview design={preview} onClose={() => setPreview(null)} />}
      </>}
    </Container>
  </div>
}
