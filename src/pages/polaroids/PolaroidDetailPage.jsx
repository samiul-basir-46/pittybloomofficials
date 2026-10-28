import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ShoppingCart } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import SmartImage from '../../shared/ui/SmartImage'
import QtyStepper from '../../shared/ui/QtyStepper'
import ExpandableText from '../../shared/ui/ExpandableText'
import useAsync from '../../shared/hooks/useAsync'
import { getPolaroidProduct } from '../../shared/services/contentService'
import { formatPrice } from '../../shared/utils/format'
import { polaroidPricing, validPacks } from './packs'

export default function PolaroidDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: item, loading } = useAsync(() => getPolaroidProduct(id), [id])
  const minimum = Math.max(1, Number(item?.minQuantity) || 1)
  const [qty, setQty] = useState(minimum)
  const packs = validPacks(item)
  useEffect(() => { setQty((current) => Math.max(minimum, current)) }, [minimum])
  if (loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  if (!item) return <p className="py-32 text-center text-ink/60">This Polaroid was not found.</p>
  const price = Number(item.unitPrice) || 0
  const amount = Math.max(qty, minimum)
  const priced = polaroidPricing(item, amount)
  const go = (cart) => navigate(`/polaroids/order?item=${encodeURIComponent(item.id)}&qty=${amount}${cart ? '&mode=cart' : ''}`)
  return <Container className="pb-20 pt-4"><Link to="/polaroids" className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 text-sm"><ArrowLeft size={16} /> Back to Polaroids</Link>
    <div className="mt-5 grid min-w-0 grid-cols-1 gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-2 lg:gap-16">
      <div className="mx-auto aspect-[4/5] w-full min-w-0 max-w-[190px] overflow-hidden rounded-xl bg-cream sm:max-w-md sm:rounded-2xl"><SmartImage src={item.image} alt={item.title} className="size-full object-cover" /></div>
      <div className="min-w-0 self-center">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Polaroid</p>
        <h1 className="mt-2 font-serif text-2xl sm:text-5xl">{item.title}</h1>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-2xl font-extrabold sm:text-3xl">{formatPrice(priced.total)}</span><span className="text-base font-medium text-ink/60">for {amount} piece{amount === 1 ? '' : 's'}</span>{priced.saving > 0 && <span className="text-base text-ink/45 line-through">{formatPrice(priced.regular)}</span>}</p>
        {item.description && <ExpandableText text={item.description} className="mt-3 text-sm leading-6 text-ink/70 sm:mt-5 sm:text-base sm:leading-7" />}
        <p className="mt-5 font-medium text-ink/65">Minimum {minimum}. Upload one photo for each piece after selecting Buy now.</p>
        <div className="mt-6 flex items-center gap-4"><span className="font-semibold">Quantity</span><QtyStepper value={amount} min={minimum} max={9999} onChange={setQty} editable /></div>
        <p className="mt-3 text-sm text-ink/60">Total: <strong className="text-ink">{formatPrice(priced.total)}</strong>{priced.saving > 0 && <span className="ml-2 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">Offer applied · you save {formatPrice(priced.saving)}</span>}</p>
        {packs.length > 0 && <div className="mt-6"><p className="mb-2 text-sm font-semibold">Offers</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{packs.map((row) => {
            const active = priced.applied?.pieces === row.pieces
            return <button key={row.id} type="button" onClick={() => setQty(Math.max(minimum, row.pieces))} aria-label={`Set quantity to ${row.pieces} pieces`} className={`relative rounded-xl border bg-white px-3 py-3 text-center transition ${active ? 'border-2 border-brand bg-cream' : 'border-sand hover:border-brand/40'}`}>
              {row.tag && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-brand">✦ {row.tag} ✦</span>}
              <p className="text-sm font-semibold">{row.pieces} pieces</p><p className="mt-1 font-bold text-warm">{formatPrice(row.price)}</p>
            </button>
          })}</div>
          <p className="mt-2 text-xs text-ink/55">Order any quantity. Reach an offer's pieces and every piece gets that offer's price.</p></div>}
        <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 sm:grid-cols-2"><Button variant="outline" className="h-12 gap-2 sm:h-14" onClick={() => go(true)}><ShoppingCart size={18} /> Add to Cart</Button><Button className="h-12 gap-2 sm:h-14 shadow-lg" onClick={() => go(false)}>Buy now <ArrowRight size={18} /></Button></div>
      </div>
    </div>
  </Container>
}
