import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ShoppingCart, X } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import SmartImage from '../../shared/ui/SmartImage'
import PageNav from '../../shared/ui/PageNav'
import QtyStepper from '../../shared/ui/QtyStepper'
import ComingSoon from '../../shared/ui/ComingSoon'
import useAsync from '../../shared/hooks/useAsync'
import { useCart } from '../../shared/context/CartContext'
import { getProduct } from '../../shared/services/contentService'
import { parseOptions } from '../../shared/utils/options'
import { formatPrice } from '../../shared/utils/format'
import { inputClass } from '../../admin/classes'
import ExpandableText from '../../shared/ui/ExpandableText'
import { polaroidPricing, validPacks } from '../polaroids/packs'

function Detail({ product, options }) {
  const navigate = useNavigate()
  const { add } = useCart()
  const isFrame = product.id === 'frame'
  const isPolaroids = product.id === 'polaroids'
  const isPhotoStrip = product.id === 'photo-strip'
  const hasQuantityPricing = isPolaroids || (isPhotoStrip && Number(product.unitPrice) > 0)
  const minimumQty = isPolaroids ? Math.max(1, Number(product.minQuantity) || 9) : 1
  const [optionId, setOptionId] = useState(options[0].id)
  const [qty, setQty] = useState(minimumQty)
  const [note, setNote] = useState('')
  const [previewDesign, setPreviewDesign] = useState(null)
  const option = options.find((o) => o.id === optionId) ?? options[0]
  const unitPrice = isPhotoStrip ? Number(product.unitPrice) || option.price : Number(product.unitPrice) || 8
  const packs = hasQuantityPricing ? validPacks(product) : []
  const previewDesigns = isPhotoStrip ? (Array.isArray(product.designs) ? product.designs : []).filter((design) => design?.id && design.image) : []
  const pricing = hasQuantityPricing ? polaroidPricing({ ...product, unitPrice }, qty) : null
  const displayPrice = hasQuantityPricing ? pricing.total : option.price
  const save = hasQuantityPricing ? pricing.saving : option.mrp - option.price
  const line = () => ({
    kind: 'product',
    id: product.id,
    optionId: hasQuantityPricing ? `${product.id}-piece` : option.id,
    name: product.name,
    image: product.image,
    optionLabel: hasQuantityPricing ? `${qty} ${isPhotoStrip ? 'strip' : 'piece'}${qty === 1 ? '' : 's'}${pricing?.applied ? ` · offer: ${pricing.applied.pieces}+` : ` · ৳${unitPrice} each`}` : option.label,
    price: hasQuantityPricing ? (packs.length ? pricing.total : unitPrice) : option.price,
    mrp: hasQuantityPricing ? 0 : option.mrp,
    qty: hasQuantityPricing && packs.length ? 1 : qty,
    note,
    to: `/products/${product.id}`,
  })

  return (
    <Container className="pb-20 pt-4">
      <PageNav trail={[{ label: product.name }]} />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 [&>*]:min-w-0">
        <div className="mx-auto w-full min-w-0 max-w-xl">
          <div className="aspect-square overflow-hidden rounded-2xl bg-sand shadow-lg"><SmartImage src={product.image} alt={product.name} placeholder="800x800" /></div>
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-4xl sm:text-5xl">{product.name}</h1>
          {product.tagline && <p className="mt-2 text-lg text-ink/60">{product.tagline}</p>}
          {previewDesigns.length > 0 && <div className="mt-5 min-w-0"><p className="text-sm font-semibold">{previewDesigns.length} design{previewDesigns.length === 1 ? '' : 's'} to choose from</p><div className="mt-2 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-2">{previewDesigns.slice(0, 8).map((design, index) => <button key={design.id} type="button" aria-label={`View ${design.name || `design ${index + 1}`} larger`} onClick={() => setPreviewDesign(design)} className="size-14 shrink-0 overflow-hidden rounded-lg border border-sand bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand sm:size-16"><img src={design.image} alt={design.name || 'Photo Strip design'} loading="lazy" className="size-full object-cover" /></button>)}{previewDesigns.length > 8 && <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-cream text-xs font-semibold text-ink/60 sm:size-16">+{previewDesigns.length - 8}</span>}</div></div>}
          <p className="mt-6 flex flex-wrap items-center gap-3">
            {save > 0 && <span className="text-xl text-ink/50 line-through">{formatPrice(hasQuantityPricing ? pricing.regular : option.mrp)}</span>}
            <span className="text-3xl font-extrabold">{formatPrice(displayPrice)}</span>
            {save > 0 && <span className="rounded-full border border-sand bg-cream px-3 py-1 text-xs font-semibold text-warm">Save {formatPrice(save)}</span>}
            {hasQuantityPricing && <span className="text-sm text-ink/60">for {qty} {isPhotoStrip ? 'strip(s)' : 'pieces'}</span>}
          </p>
          {product.description && <ExpandableText text={product.description} className="mt-5 leading-7 text-ink/70" />}
          {!hasQuantityPricing && <p className="mb-4 mt-8 font-semibold">{isFrame ? 'Choose frame size' : 'Choose an option'}</p>}
          {!hasQuantityPricing && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {options.map((o) => <button key={o.id} type="button" onClick={() => setOptionId(o.id)} className={`relative rounded-xl border bg-white px-3 py-4 text-center transition ${o.id === option.id ? 'border-2 border-brand bg-cream' : 'border-sand hover:border-brand/40'}`}>
              {o.tag && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-brand">✦ {o.tag} ✦</span>}
              <p className="text-sm font-semibold">{o.label}</p><p className="mt-2 font-bold text-warm">{formatPrice(o.price)}</p>
            </button>)}
          </div>}
          {hasQuantityPricing && <p className="mt-5 font-medium text-ink/65">{formatPrice(unitPrice)} per {isPhotoStrip ? 'strip. Order any quantity.' : `Polaroid · Minimum ${minimumQty}. Upload one photo for each piece after selecting Buy now.`}</p>}
          <div className="mt-6 flex items-center gap-4"><span className="font-semibold">Quantity</span><QtyStepper value={Math.max(qty, minimumQty)} min={minimumQty} max={hasQuantityPricing ? 9999 : 99} onChange={setQty} editable={hasQuantityPricing} /></div>
          {hasQuantityPricing && packs.length > 0 && <div className="mt-6"><p className="mb-2 text-sm font-semibold">Combo offers</p><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{packs.map((pack) => <button key={pack.id} type="button" onClick={() => setQty(Math.max(minimumQty, pack.pieces))} className={`relative rounded-xl border bg-white px-3 py-3 text-center transition ${pricing.applied?.pieces === pack.pieces ? 'border-2 border-brand bg-cream' : 'border-sand hover:border-brand/40'}`}>{pack.tag && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-brand">✦ {pack.tag} ✦</span>}<p className="text-sm font-semibold">{pack.pieces} {isPhotoStrip ? 'strips' : 'pieces'}</p><p className="mt-1 font-bold text-warm">{formatPrice(pack.price)}</p></button>)}</div><p className="mt-2 text-xs text-ink/55">Order any quantity. Combo pricing applies automatically when you reach an offer quantity.</p></div>}
          {!isFrame && !isPolaroids && !isPhotoStrip && <label className="mt-6 block"><span className="mb-1 block text-sm font-medium">Special instructions (optional)</span><textarea rows={3} className={inputClass} placeholder="Theme, caption, colours, anything we should know" value={note} onChange={(e) => setNote(e.target.value)} /></label>}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Button variant="outline" className="h-14 gap-2" onClick={() => {
              if (isFrame) navigate(`/frame/order?mode=cart&size=${encodeURIComponent(option.id)}&qty=${qty}`)
              else if (isPolaroids) navigate(`/polaroids/order?mode=cart&qty=${qty}`)
              else if (isPhotoStrip) navigate(`/photo-strip/order?mode=cart&qty=${qty}${hasQuantityPricing ? '' : `&option=${encodeURIComponent(option.id)}`}`)
              else add(line())
            }}><ShoppingCart size={18} /> Add to Cart</Button>
            <Button className="h-14 gap-2 shadow-lg" onClick={() => {
              if (isFrame) navigate(`/frame/order?size=${encodeURIComponent(option.id)}&qty=${qty}`)
              else if (isPolaroids) navigate(`/polaroids/order?qty=${qty}`)
              else if (isPhotoStrip) navigate(`/photo-strip/order?qty=${qty}${hasQuantityPricing ? '' : `&option=${encodeURIComponent(option.id)}`}`)
              else { add(line(), { silent: true }); navigate('/cart') }
            }}>Buy now <ArrowRight size={18} /></Button>
          </div>
          {!isFrame && !isPolaroids && <p className="mt-4 text-sm text-ink/50">{isPhotoStrip ? 'Choose your design and upload photos after continuing.' : <>Send your photos after ordering. We will confirm everything with you before printing. <Link to="/faq" className="text-brand underline">FAQ</Link></>}</p>}
        </div>
      </div>
      {previewDesign && <div role="dialog" aria-modal="true" aria-label={previewDesign.name || 'Photo Strip design preview'} onClick={() => setPreviewDesign(null)} className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4"><figure className="relative max-h-full max-w-lg" onClick={(event) => event.stopPropagation()}><img src={previewDesign.image} alt={previewDesign.name || 'Photo Strip design'} className="max-h-[85vh] w-auto max-w-full rounded-2xl bg-white object-contain" />{previewDesign.name && <figcaption className="mt-2 text-center text-sm font-medium text-white">{previewDesign.name}</figcaption>}<button type="button" aria-label="Close preview" onClick={() => setPreviewDesign(null)} className="absolute -right-2 -top-2 grid size-9 place-items-center rounded-full bg-white text-ink shadow"><X size={18} /></button></figure></div>}
    </Container>
  )
}

const titleFromId = (id = '') => id.split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

// Used by /frame, /polaroids, /sticker, /photo-strip, and /products/:id.
export default function ProductPage({ id: fixedId }) {
  const params = useParams()
  const id = fixedId ?? params.id
  const { data: product, loading } = useAsync(() => getProduct(id), [id])
  if (loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  const options = parseOptions(product?.options)
  const productOptions = id === 'polaroids'
    ? [{ id: 'polaroid-piece', label: 'Per piece', price: Number(product?.unitPrice) || 8, mrp: 0, tag: '' }]
    : id === 'photo-strip' && Number(product?.unitPrice) > 0
      ? [{ id: 'photo-strip-piece', label: 'Per strip', price: Number(product.unitPrice), mrp: 0, tag: '' }]
    : options
  if (!product || product.status === 'Coming soon' || productOptions.length === 0 || (id === 'photo-strip' && !product.designs?.some((design) => design?.id && design.image))) return <ComingSoon title={product?.name ?? titleFromId(id)} />
  return <Detail key={product.id} product={product} options={productOptions} />
}
