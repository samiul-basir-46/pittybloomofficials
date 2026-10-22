import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ShoppingCart } from 'lucide-react'
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

function Detail({ product, options }) {
  const navigate = useNavigate()
  const { add } = useCart()
  const isFrame = product.id === 'frame'
  const isPolaroids = product.id === 'polaroids'
  const minimumQty = isPolaroids ? Math.max(1, Number(product.minQuantity) || 9) : 1
  const [optionId, setOptionId] = useState(options[0].id)
  const [qty, setQty] = useState(minimumQty)
  const [note, setNote] = useState('')
  const option = options.find((o) => o.id === optionId) ?? options[0]
  const save = option.mrp - option.price
  const line = () => ({
    kind: 'product',
    id: product.id,
    optionId: option.id,
    name: product.name,
    image: product.image,
    optionLabel: option.label,
    price: option.price,
    mrp: option.mrp,
    qty,
    note,
    to: `/products/${product.id}`,
  })

  return (
    <Container className="pb-20 pt-4">
      <PageNav trail={[{ label: product.name }]} />
      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="mx-auto w-full max-w-xl">
          <div className="aspect-square overflow-hidden rounded-2xl bg-sand shadow-lg"><SmartImage src={product.image} alt={product.name} placeholder="800x800" /></div>
        </div>
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl">{product.name}</h1>
          {product.tagline && <p className="mt-2 text-lg text-ink/60">{product.tagline}</p>}
          <p className="mt-6 flex flex-wrap items-center gap-3">
            {save > 0 && <span className="text-xl text-ink/50 line-through">{formatPrice(option.mrp)}</span>}
            <span className="text-3xl font-extrabold">{formatPrice(option.price)}</span>
            {save > 0 && <span className="rounded-full border border-sand bg-cream px-3 py-1 text-xs font-semibold text-warm">Save {formatPrice(save)}</span>}
          </p>
          {product.description && <p className="mt-5 leading-7 text-ink/70">{product.description}</p>}
          {!isPolaroids && <p className="mb-4 mt-8 font-semibold">{isFrame ? 'Choose frame size' : 'Choose an option'}</p>}
          {!isPolaroids && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {options.map((o) => <button key={o.id} type="button" onClick={() => setOptionId(o.id)} className={`relative rounded-xl border bg-white px-3 py-4 text-center transition ${o.id === option.id ? 'border-2 border-brand bg-cream' : 'border-sand hover:border-brand/40'}`}>
              {o.tag && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-brand">✦ {o.tag} ✦</span>}
              <p className="text-sm font-semibold">{o.label}</p><p className="mt-2 font-bold text-warm">{formatPrice(o.price)}</p>
            </button>)}
          </div>}
          {isPolaroids && <p className="mt-5 font-medium text-ink/65">৳{Number(product.unitPrice) || 8} per Polaroid · Minimum {minimumQty}. Upload one photo for each piece after selecting Buy now.</p>}
          <div className="mt-6 flex items-center gap-4"><span className="font-semibold">Quantity</span><QtyStepper value={Math.max(qty, minimumQty)} min={minimumQty} max={isPolaroids ? 9999 : 99} onChange={setQty} /></div>
          {!isFrame && !isPolaroids && <label className="mt-6 block"><span className="mb-1 block text-sm font-medium">Special instructions (optional)</span><textarea rows={3} className={inputClass} placeholder="Theme, caption, colours, anything we should know" value={note} onChange={(e) => setNote(e.target.value)} /></label>}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Button variant="outline" className="h-14 gap-2" onClick={() => {
              if (isFrame) navigate(`/frame/order?mode=cart&size=${encodeURIComponent(option.id)}&qty=${qty}`)
              else if (isPolaroids) navigate(`/polaroids/order?mode=cart&qty=${qty}`)
              else add(line())
            }}><ShoppingCart size={18} /> Add to Cart</Button>
            <Button className="h-14 gap-2 shadow-lg" onClick={() => {
              if (isFrame) navigate(`/frame/order?size=${encodeURIComponent(option.id)}&qty=${qty}`)
              else if (isPolaroids) navigate(`/polaroids/order?qty=${qty}`)
              else { add(line(), { silent: true }); navigate('/cart') }
            }}>Buy now <ArrowRight size={18} /></Button>
          </div>
          {!isFrame && !isPolaroids && <p className="mt-4 text-sm text-ink/50">Send your photos after ordering. We will confirm everything with you before printing. <Link to="/faq" className="text-brand underline">FAQ</Link></p>}
        </div>
      </div>
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
    : options
  if (!product || product.status === 'Coming soon' || productOptions.length === 0) return <ComingSoon title={product?.name ?? titleFromId(id)} />
  return <Detail key={product.id} product={product} options={productOptions} />
}
