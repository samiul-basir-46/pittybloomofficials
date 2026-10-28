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
import { validPacks } from './packs'

export default function PolaroidDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: item, loading } = useAsync(() => getPolaroidProduct(id), [id])
  const minimum = Math.max(1, Number(item?.minQuantity) || 1)
  const [qty, setQty] = useState(minimum)
  const [packPieces, setPackPieces] = useState(0)
  const packs = validPacks(item)
  useEffect(() => { setQty((current) => Math.max(minimum, current)) }, [minimum])
  useEffect(() => { if (packs.length && !packs.some((pack) => pack.pieces === packPieces)) setPackPieces(packs[0].pieces) }, [item]) // eslint-disable-line react-hooks/exhaustive-deps
  if (loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  if (!item) return <p className="py-32 text-center text-ink/60">This Polaroid was not found.</p>
  const price = Number(item.unitPrice) || 0
  const pack = packs.find((row) => row.pieces === packPieces) ?? packs[0] ?? null
  const go = (cart) => navigate(`/polaroids/order?item=${encodeURIComponent(item.id)}&${pack ? `pack=${pack.pieces}` : `qty=${Math.max(minimum, qty)}`}${cart ? '&mode=cart' : ''}`)
  return <Container className="pb-20 pt-4"><Link to="/polaroids" className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 text-sm"><ArrowLeft size={16} /> Back to Polaroids</Link>
    <div className="mt-8 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
      <div className="mx-auto aspect-[4/5] w-full min-w-0 max-w-sm overflow-hidden rounded-2xl bg-cream sm:max-w-md"><SmartImage src={item.image} alt={item.title} className="size-full object-cover" /></div>
      <div className="min-w-0 self-center">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Polaroid</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{item.title}</h1>
        {pack ? <p className="mt-4 text-3xl font-extrabold">{formatPrice(pack.price)} <span className="text-base font-medium text-ink/60">for {pack.pieces} pieces</span></p> : <p className="mt-4 text-3xl font-extrabold">{formatPrice(price)} <span className="text-base font-medium text-ink/60">per piece</span></p>}
        {item.description && <ExpandableText text={item.description} className="mt-5 leading-7 text-ink/70" />}
        {pack ? <>
          <p className="mb-3 mt-8 font-semibold">Choose your offer</p>
          <div role="radiogroup" aria-label="Polaroid offers" className="grid grid-cols-2 gap-3 sm:grid-cols-3">{packs.map((row) => {
            const active = row.pieces === pack.pieces
            const save = price > 0 ? Math.max(0, price * row.pieces - row.price) : 0
            return <button key={row.id} type="button" role="radio" aria-checked={active} onClick={() => setPackPieces(row.pieces)} className={`relative rounded-xl border bg-white px-3 py-4 text-center transition ${active ? 'border-2 border-brand bg-cream' : 'border-sand hover:border-brand/40'}`}>
              {row.tag && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-brand">✦ {row.tag} ✦</span>}
              <p className="text-sm font-semibold">{row.pieces} pieces</p><p className="mt-2 font-bold text-warm">{formatPrice(row.price)}</p>
              <p className="mt-1 text-[11px] text-ink/55">{formatPrice(Math.round((row.price / row.pieces) * 10) / 10)} each{save > 0 ? ` · save ${formatPrice(save)}` : ''}</p>
            </button>
          })}</div>
          <p className="mt-5 text-sm text-ink/65">Upload exactly {pack.pieces} photos after selecting Buy now, one for each piece.</p>
        </> : <>
          <p className="mt-5 font-medium text-ink/65">Minimum {minimum}. Upload one photo for each piece after selecting Buy now.</p>
          <div className="mt-6 flex items-center gap-4"><span className="font-semibold">Quantity</span><QtyStepper value={Math.max(qty, minimum)} min={minimum} max={9999} onChange={setQty} /></div>
          <p className="mt-3 text-sm text-ink/60">Subtotal: <strong className="text-ink">{formatPrice(price * Math.max(qty, minimum))}</strong></p>
        </>}
        <div className="mt-8 grid gap-4 sm:grid-cols-2"><Button variant="outline" className="h-14 gap-2" onClick={() => go(true)}><ShoppingCart size={18} /> Add to Cart</Button><Button className="h-14 gap-2 shadow-lg" onClick={() => go(false)}>Buy now <ArrowRight size={18} /></Button></div>
      </div>
    </div>
  </Container>
}
