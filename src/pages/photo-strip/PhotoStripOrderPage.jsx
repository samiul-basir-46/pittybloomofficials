import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, CheckCircle2, ImagePlus, Maximize2, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
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
import { polaroidPricing } from '../polaroids/packs'

const deliveryFee = (area) => area === 'inside' ? 60 : area === 'outside' ? 110 : 0
const areaLabel = (area) => area === 'inside' ? 'Inside Dhaka' : area === 'outside' ? 'Outside Dhaka' : ''
// "Upload my own design": the customer's own picture is printed exactly as sent, no template.
const CUSTOM_DESIGN = { id: 'custom', name: 'My own design (printed as uploaded)', image: '' }
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
  const findDesign = (id) => id === CUSTOM_DESIGN.id ? CUSTOM_DESIGN : designs.find((item) => item.id === id)
  const cartMode = params.get('mode') === 'cart'
  const rawQty = Number(params.get('qty'))
  const qty = Number.isInteger(rawQty) ? Math.min(9999, Math.max(1, rawQty)) : 1
  const hasQuantityPricing = Number(product?.unitPrice) > 0
  const unitPrice = hasQuantityPricing ? Number(product.unitPrice) : Number(option?.price) || 0
  const [strips, setStrips] = useState(() => [{ key: newKey(), quantity: qty, designId: '', notes: '' }])
  const [preview, setPreview] = useState(null)
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' })
  const [area, setArea] = useState('')
  const [step, setStep] = useState(1)
  const [stripErrors, setStripErrors] = useState({})
  const [customerErrors, setCustomerErrors] = useState({})
  const [error, setError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const requestKey = useRef(newKey())
  const [, refreshPhotos] = useReducer((value) => value + 1, 0)
  const photoKeyOf = (strip) => `photo-strip-${strip.key}`
  const totalQty = strips.reduce((sum, strip) => sum + (Number(strip.quantity) || 0), 0)
  const pricing = hasQuantityPricing ? polaroidPricing({ ...product, unitPrice }, totalQty || 1) : null

  useEffect(() => {
    if (!preview) return undefined
    const close = (event) => event.key === 'Escape' && setPreview(null)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [preview])

  if (loading) return <p className="py-32 text-center text-ink/60">Loading Photo Strip designs…</p>
  if (!product || (!option && !hasQuantityPricing)) return <Container className="py-24 text-center">Photo Strip options are unavailable. <Link className="text-brand underline" to="/photo-strip">Go back</Link></Container>

  const addPhotos = (strip, event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const valid = files.filter((file) => orderImageType(file) && file.size <= 100 * 1024 * 1024)
    const added = photoStore.add(photoKeyOf(strip), valid, { allowDuplicates: true })
    refreshPhotos()
    if (added.added.length) clearStripError(strip.key, 'photos')
    setError(files.length !== valid.length ? `${added.added.length} photo${added.added.length === 1 ? '' : 's'} added. Invalid or over 100 MB files were skipped.` : '')
  }
  const removePhoto = (strip, id) => {
    photoStore.remove(photoKeyOf(strip), id)
    refreshPhotos()
  }
  const updateStrip = (stripKey, field, value) => setStrips((current) => current.map((strip) => strip.key === stripKey ? { ...strip, [field]: value } : strip))
  const clearStripError = (key, field) => setStripErrors((current) => ({ ...current, [key]: { ...current[key], [field]: '' } }))
  const removeStrip = (strip) => {
    photoStore.list(photoKeyOf(strip)).forEach((photo) => photoStore.remove(photoKeyOf(strip), photo.id))
    setStrips((current) => current.filter((item) => item.key !== strip.key))
    refreshPhotos()
  }
  const setCustomerField = (field) => (event) => { setCustomer((current) => ({ ...current, [field]: event.target.value })); setCustomerErrors((current) => ({ ...current, [field]: '' })) }
  const continueToDelivery = () => {
    const errors = Object.fromEntries(strips.map((strip) => [strip.key, {
      quantity: !Number.isInteger(Number(strip.quantity)) || Number(strip.quantity) < 1 ? 'Enter a quantity of at least 1.' : '',
      design: !strip.designId ? 'Choose a design for this set.' : '',
      photos: !photoStore.list(photoKeyOf(strip)).length ? 'Upload at least one photo for this design.' : '',
    }]))
    if (totalQty > 9999) errors[strips[0].key].quantity = 'Total Photo Strip quantity cannot be greater than 9999.'
    setStripErrors(errors)
    if (Object.values(errors).some((entry) => entry.quantity || entry.design || entry.photos)) {
      setError('')
      const invalid = strips.find((strip) => errors[strip.key]?.quantity || errors[strip.key]?.design || errors[strip.key]?.photos)
      const targetId = errors[invalid.key].quantity ? `photo-strip-quantity-${invalid.key}` : errors[invalid.key].design ? `photo-strip-design-${invalid.key}` : `photo-strip-photos-${invalid.key}`
      window.requestAnimationFrame(() => {
        const target = document.getElementById(targetId)
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target?.focus({ preventScroll: true })
      })
      return
    }
    setError('')
    setCustomerErrors({})
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const placeOrder = async (event) => {
    event.preventDefault()
    if (placing) return
    const targetInvalidField = (targetId) => {
      setError('')
      window.requestAnimationFrame(() => {
        const target = document.getElementById(targetId)
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target?.focus({ preventScroll: true })
      })
    }
    const stripValidation = Object.fromEntries(strips.map((strip) => [strip.key, {
      quantity: !Number.isInteger(Number(strip.quantity)) || Number(strip.quantity) < 1 ? 'Enter a quantity of at least 1.' : '',
      design: !strip.designId ? 'Choose a design for this set.' : '',
      photos: !photoStore.list(photoKeyOf(strip)).length ? 'Upload at least one photo for this design.' : '',
    }]))
    if (totalQty > 9999 && strips[0]) stripValidation[strips[0].key].quantity = 'Total Photo Strip quantity cannot be greater than 9999.'
    setStripErrors(stripValidation)
    if (Object.values(stripValidation).some((entry) => entry.quantity || entry.design || entry.photos)) {
      const invalid = strips.find((strip) => stripValidation[strip.key]?.quantity || stripValidation[strip.key]?.design || stripValidation[strip.key]?.photos)
      const targetId = stripValidation[invalid.key].quantity ? `photo-strip-quantity-${invalid.key}` : stripValidation[invalid.key].design ? `photo-strip-design-${invalid.key}` : `photo-strip-photos-${invalid.key}`
      targetInvalidField(targetId)
      return
    }
    if (!cartMode && (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim() || !area)) {
      const errors = {
        name: customer.name.trim() ? '' : 'Enter your full name.',
        phone: customer.phone.trim() ? '' : 'Enter your WhatsApp or phone number.',
        address: customer.address.trim() ? '' : 'Enter your delivery address.',
        area: area ? '' : 'Select your delivery area.',
      }
      setCustomerErrors(errors)
      const targetId = errors.name ? 'photo-strip-customer-name' : errors.phone ? 'photo-strip-customer-phone' : errors.address ? 'photo-strip-customer-address' : 'photo-strip-delivery-area'
      targetInvalidField(targetId)
      return
    }
    setCustomerErrors({})
    setPlacing(true)
    setError('')
    try {
      await photoStore.flush(strips.map(photoKeyOf))
      let allocatedTotal = 0
      const total = hasQuantityPricing ? pricing.total : Number(option.price) * totalQty
      const lines = strips.map((strip, index) => {
        const quantity = Number(strip.quantity) || 1
        const allocated = index === strips.length - 1 ? total - allocatedTotal : Math.floor(total * quantity / totalQty)
        allocatedTotal += allocated
        const selectedDesign = findDesign(strip.designId)
        const savedPhotos = photoStore.list(photoKeyOf(strip))
        return {
          kind: 'product', id: product.id, name: product.name, image: selectedDesign.image || product.image,
          optionId: hasQuantityPricing ? 'photo-strip-piece' : option.id,
          optionLabel: `${quantity} strip${quantity === 1 ? '' : 's'}${selectedDesign.id === CUSTOM_DESIGN.id ? ' · Own design' : selectedDesign.name ? ` · ${selectedDesign.name}` : ''}${pricing?.applied && index === 0 ? ` · offer: ${pricing.applied.pieces}+` : ''}`,
          price: allocated / quantity, mrp: hasQuantityPricing ? 0 : option.mrp, qty: quantity,
          design: { id: selectedDesign.id, name: selectedDesign.name || '', image: selectedDesign.image || '', custom: selectedDesign.id === CUSTOM_DESIGN.id },
          note: strip.notes || '', meta: { cartConfigId: newKey(), stripQuantity: quantity },
          photos: { count: savedPhotos.length, files: savedPhotos.map(({ id, name, size, type, storageKey }) => ({ id, name, size, type, storageKey })) },
        }
      })
      if (cartMode) { lines.forEach((line, index) => addToCart(line, { silent: index < lines.length - 1 })); navigate('/cart'); return }
      const order = await ordersApi.place(buildOrder({
        id: '', cartItems: lines, customer: { ...customer, uid: user?.uid || '', email: user?.email || '' },
        extras: { deliveryCharge: deliveryFee(area), deliveryLabel: `${areaLabel(area)} · Delivery details received`, deliveryInfo: { location: area, locationLabel: areaLabel(area) } },
      }), requestKey.current)
      setPlacedOrder(order)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not place your Photo Strip order. Please try again.')
    } finally { setPlacing(false) }
  }

  const total = hasQuantityPricing ? pricing.total : option.price * totalQty
  return <Container className="pb-20 pt-4">
    <PageNav trail={[{ label: 'Photo Strip', to: '/photo-strip' }, { label: 'Order' }]} />
    {placedOrder ? <section className="mx-auto mt-12 max-w-xl rounded-3xl border border-sand bg-white p-8 text-center shadow-sm"><CheckCircle2 className="mx-auto text-green-600" size={44} /><h1 className="mt-4 font-serif text-3xl">Your Photo Strip order is confirmed</h1><p className="mt-2 text-sm text-ink/60">Order ID: <strong className="text-ink">{placedOrder.id}</strong>.</p><Button className="mt-6" onClick={() => navigate('/account')}>View my orders</Button></section> : <>
      <div className="mt-4 sm:mt-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-brand">Photo Strip order</p><h1 className="mt-1 font-serif text-2xl leading-tight sm:text-4xl">{step === 1 ? 'Choose your design and photos' : 'Delivery information'}</h1><p className="mt-2 max-w-xl text-sm leading-5 text-ink/60">{step === 1 ? 'Select a layout, then upload the photos you want us to use.' : 'Tell us where to deliver your Photo Strip order.'}</p></div>
      {!cartMode && <nav aria-label="Order steps" className="mt-5 grid grid-cols-2 rounded-xl border border-sand bg-white p-1 text-xs sm:mt-6 sm:p-1.5 sm:text-sm"><div aria-current={step === 1 ? 'step' : undefined} className={`grid min-h-11 place-items-center rounded-lg px-2 text-center font-medium leading-tight sm:px-3 ${step === 1 ? 'bg-brand text-white' : 'text-ink/55'}`}>1. Design &amp; photos</div><div aria-current={step === 2 ? 'step' : undefined} className={`grid min-h-11 place-items-center rounded-lg px-2 text-center font-medium leading-tight sm:px-3 ${step === 2 ? 'bg-brand text-white' : 'text-ink/55'}`}>2. Delivery</div></nav>}
      <form noValidate onSubmit={placeOrder} className="mt-7 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
        <section className="min-w-0 space-y-5 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-7">
          {(cartMode || step === 1) && <>
          <div className="flex items-start justify-between gap-3 rounded-xl bg-cream px-3 py-3 sm:px-4"><div className="min-w-0"><p className="font-semibold">{totalQty} strip{totalQty === 1 ? '' : 's'} total</p><p className="mt-0.5 text-xs leading-4 text-ink/60">Set a quantity to repeat a design, or add another design.</p></div><div className="shrink-0 text-right"><p className="whitespace-nowrap font-semibold text-brand">{formatPrice(total)}</p>{pricing?.saving > 0 && <p className="whitespace-nowrap text-xs text-green-700">Save {formatPrice(pricing.saving)}</p>}</div></div>
          <div className="space-y-4">{strips.map((strip, stripIndex) => {
            const selectedDesign = findDesign(strip.designId)
            const photos = photoStore.list(photoKeyOf(strip))
            return <section key={strip.key} className="rounded-2xl border border-sand bg-[#fffefa] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">Photo Strip #{stripIndex + 1}</h2>{strips.length > 1 && <button type="button" onClick={() => removeStrip(strip)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 size={14} /> Remove</button>}</div>
              <label className="block max-w-xs text-sm font-medium">Quantity of this design<input id={`photo-strip-quantity-${strip.key}`} type="number" min="1" max="9999" value={strip.quantity} aria-invalid={Boolean(stripErrors[strip.key]?.quantity)} onChange={(event) => { updateStrip(strip.key, 'quantity', event.target.value); clearStripError(strip.key, 'quantity') }} className={`${inputClass} mt-1 ${stripErrors[strip.key]?.quantity ? 'border-red-500' : ''}`} />{stripErrors[strip.key]?.quantity ? <span className="mt-1 block text-xs text-red-600">{stripErrors[strip.key].quantity}</span> : <span className="mt-1 block text-xs text-ink/50">Use 2 to repeat this design and photo group twice.</span>}</label>
              <div className="mt-5"><h3 className="text-sm font-semibold">Choose a design <span className="text-red-600">*</span></h3>{<div id={`photo-strip-design-${strip.key}`} tabIndex={-1} role="radiogroup" aria-label={`Design for Photo Strip ${stripIndex + 1}`} className={`mt-2 grid min-w-0 grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-2 rounded-lg ${stripErrors[strip.key]?.design ? 'outline outline-1 outline-red-400 outline-offset-2' : ''}`}><button type="button" role="radio" aria-checked={strip.designId === CUSTOM_DESIGN.id} onClick={() => { updateStrip(strip.key, 'designId', CUSTOM_DESIGN.id); clearStripError(strip.key, 'design') }} className={`col-span-full flex min-h-14 w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left ${strip.designId === CUSTOM_DESIGN.id ? 'border-brand bg-cream shadow-sm' : 'border-dashed border-brand/40 bg-white'}`}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">{strip.designId === CUSTOM_DESIGN.id ? <Check size={17} /> : <ImagePlus size={17} />}</span><span className="min-w-0"><span className="block text-sm font-semibold">Use my own design / photo</span><span className="block text-xs text-ink/60">Upload from your phone — we print it exactly as you send it.</span></span></button>{designs.map((item, index) => { const selected = strip.designId === item.id; return <div key={item.id} className={`relative min-w-0 overflow-hidden rounded-lg border-2 bg-white ${selected ? 'border-brand shadow-sm' : 'border-sand'}`}><button type="button" role="radio" aria-checked={selected} aria-label={`Select ${item.name || `design ${index + 1}`} for Photo Strip ${stripIndex + 1}`} onClick={() => { updateStrip(strip.key, 'designId', item.id); clearStripError(strip.key, 'design') }} className="block w-full min-w-0 text-left"><img src={item.image} alt={item.name || `Photo Strip design ${index + 1}`} loading="lazy" className="aspect-square w-full object-cover" />{item.name && <span className="block truncate px-1 py-1 text-[10px] font-medium">{item.name}</span>}</button>{selected && <span className="pointer-events-none absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-brand text-white"><Check size={12} /></span>}<button type="button" aria-label={`View ${item.name || `design ${index + 1}`} larger`} onClick={() => setPreview(item)} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow-sm hover:bg-white"><Maximize2 size={12} /></button></div>})}</div>}{stripErrors[strip.key]?.design && <p className="mt-2 text-xs text-red-600">{stripErrors[strip.key].design}</p>}</div>
              <div className="mt-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-serif text-xl">{strip.designId === CUSTOM_DESIGN.id ? 'Your design to print' : 'Photos for printing'} <span className="text-red-600">*</span></h3><p className="mt-1 text-sm text-ink/60">{strip.designId === CUSTOM_DESIGN.id ? 'Upload the finished design or picture. It will be printed exactly as uploaded.' : 'Upload photos for this design.'}</p></div><span className="shrink-0 pt-1 text-xs text-ink/55 sm:text-sm">{photos.length} selected</span></div><input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => addPhotos(strip, event)} />{photos.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2">{photos.map((photo) => <div key={photo.id} className="relative w-20 shrink-0 overflow-hidden rounded-lg border border-sand bg-cream"><img src={photo.url} alt={photo.name} className="aspect-square w-full object-cover" /><button type="button" aria-label={`Remove ${photo.name}`} onClick={() => removePhoto(strip, photo.id)} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/95 text-red-600 shadow"><Trash2 size={14} /></button></div>)}</div>}<label id={`photo-strip-photos-${strip.key}`} tabIndex={-1} className={`mt-3 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-cream px-4 text-center text-sm font-semibold text-brand hover:border-brand sm:w-auto ${stripErrors[strip.key]?.photos ? 'border-red-500' : 'border-brand/30'}`}><ImagePlus size={17} />{photos.length ? 'Add more photos' : 'Upload your photos'}<input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => addPhotos(strip, event)} /></label>{stripErrors[strip.key]?.photos && <p className="mt-1 text-xs text-red-600">{stripErrors[strip.key].photos}</p>}</div>
              <label className="mt-4 block text-sm font-medium">Notes (optional)<textarea rows={2} value={strip.notes} onChange={(event) => updateStrip(strip.key, 'notes', event.target.value)} className={`${inputClass} mt-1`} /></label>
              <p className="mt-3 text-sm font-medium">{selectedDesign?.name || 'Choose a design'} · {formatPrice(selectedDesign ? (hasQuantityPricing ? unitPrice : option.price) * (Number(strip.quantity) || 1) : 0)} for this setup</p>
            </section>
          })}</div>
          <Button id="photo-strip-add-design" type="button" variant="outline" disabled={strips.length >= 20} onClick={() => setStrips((current) => [...current, { key: newKey(), quantity: 1, designId: '', notes: '' }])} className="w-full justify-center gap-2 rounded-xl py-3 text-center leading-snug sm:w-auto"><Plus size={16} /> Add another design</Button>
          </>}
          {!cartMode && step === 2 && <div className="border-t border-sand pt-5"><h2 className="font-serif text-2xl">Delivery information</h2><p className="mt-1 text-sm text-ink/60">Enter where we should deliver your Photo Strip order.</p><div className="mt-4 space-y-3"><div><input id="photo-strip-customer-name" aria-label="Full name" aria-invalid={Boolean(customerErrors.name)} className={`${inputClass} ${customerErrors.name ? 'border-red-500' : ''}`} placeholder="Full name" autoComplete="name" value={customer.name} onChange={setCustomerField('name')} />{customerErrors.name && <p className="mt-1 text-xs text-red-600">{customerErrors.name}</p>}</div><div><input id="photo-strip-customer-phone" aria-label="WhatsApp / phone number" aria-invalid={Boolean(customerErrors.phone)} className={`${inputClass} ${customerErrors.phone ? 'border-red-500' : ''}`} type="tel" placeholder="WhatsApp / phone number" autoComplete="tel" value={customer.phone} onChange={setCustomerField('phone')} />{customerErrors.phone && <p className="mt-1 text-xs text-red-600">{customerErrors.phone}</p>}</div><div><textarea id="photo-strip-customer-address" aria-label="Full delivery address" aria-invalid={Boolean(customerErrors.address)} className={`${inputClass} ${customerErrors.address ? 'border-red-500' : ''}`} rows={3} placeholder="Full delivery address" autoComplete="street-address" value={customer.address} onChange={setCustomerField('address')} />{customerErrors.address && <p className="mt-1 text-xs text-red-600">{customerErrors.address}</p>}</div><div><select id="photo-strip-delivery-area" aria-label="Delivery area" aria-invalid={Boolean(customerErrors.area)} className={`${inputClass} ${customerErrors.area ? 'border-red-500' : ''}`} value={area} onChange={(event) => { setArea(event.target.value); setCustomerErrors((current) => ({ ...current, area: '' })) }}><option value="">Select delivery area</option><option value="inside">Inside Dhaka — ৳60</option><option value="outside">Outside Dhaka — ৳110</option></select>{customerErrors.area && <p className="mt-1 text-xs text-red-600">{customerErrors.area}</p>}</div></div></div>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {cartMode ? <Button type="submit" disabled={placing} className="w-full gap-2">{placing ? 'Adding to cart…' : 'Add to cart'} <ShoppingBag size={17} /></Button> : step === 1 ? <Button type="button" onClick={continueToDelivery} className="w-full gap-2">Continue to delivery <Plus size={17} /></Button> : <div className="grid gap-3 sm:grid-cols-2"><Button type="button" variant="outline" onClick={() => { setStep(1); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Back to strip details</Button><Button type="submit" disabled={placing} className="w-full gap-2">{placing ? 'Saving order…' : 'Place order'} <ShoppingBag size={17} /></Button></div>}
        </section>
        <aside className="h-fit rounded-2xl border border-sand bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h2 className="font-serif text-2xl">Order summary</h2>
          <ul className="mt-4 divide-y divide-sand">
            {strips.map((strip, index) => { const selected = findDesign(strip.designId); const photos = photoStore.list(photoKeyOf(strip)); return <li key={strip.key} className="flex items-center gap-3 py-3 first:pt-0"><div className="size-14 shrink-0 overflow-hidden rounded-lg bg-cream">{selected && (selected.image || photos[0]?.url) && <img src={selected.image || photos[0]?.url} alt={selected.name || 'Selected design'} className="size-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="font-semibold">Photo Strip #{index + 1} � Qty {strip.quantity || 0}</p><p className="truncate text-sm text-ink/60">{selected?.name || 'Choose a design'} � {photos.length} photo{photos.length === 1 ? '' : 's'}</p></div></li> })}
          </ul>
          {hasQuantityPricing && <div className="mt-2 flex justify-between text-sm"><span className="text-ink/60">Single price</span><span>{formatPrice(unitPrice)} each</span></div>}
          {pricing?.saving > 0 && <div className="mt-2 flex justify-between text-sm text-green-700"><span>Combo offer savings</span><span>-{formatPrice(pricing.saving)}</span></div>}
          <div className="mt-3 flex justify-between border-t border-sand pt-4 text-lg"><span className="font-semibold">Subtotal</span><span className="font-extrabold">{formatPrice(total)}</span></div>
          {!cartMode && <div className="mt-2 flex justify-between text-sm"><span className="text-ink/60">Delivery</span><span>{area ? formatPrice(deliveryFee(area)) : 'Select an area'}</span></div>}
        </aside>
      </form>
    </>}
    {preview && <div role="dialog" aria-modal="true" aria-label="Photo Strip design preview" className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onClick={() => setPreview(null)}><img src={preview.image} alt="Photo Strip design" className="max-h-[85vh] max-w-full rounded-2xl object-contain" /><button type="button" aria-label="Close preview" onClick={() => setPreview(null)} className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-white text-ink"><X size={19} /></button></div>}
  </Container>
}
