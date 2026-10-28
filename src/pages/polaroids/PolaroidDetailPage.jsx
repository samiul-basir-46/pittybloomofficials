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

export default function PolaroidDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: item, loading } = useAsync(() => getPolaroidProduct(id), [id])
  const minimum = Math.max(1, Number(item?.minQuantity) || 1)
  const [qty, setQty] = useState(minimum)
  useEffect(() => { setQty((current) => Math.max(minimum, current)) }, [minimum])
  if (loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  if (!item) return <p className="py-32 text-center text-ink/60">This Polaroid was not found.</p>
  const price = Number(item.unitPrice) || 0
  const go = (cart) => navigate(`/polaroids/order?item=${encodeURIComponent(item.id)}&qty=${Math.max(minimum, qty)}${cart ? '&mode=cart' : ''}`)
  return <Container className="pb-20 pt-4"><Link to="/polaroids" className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 text-sm"><ArrowLeft size={16} /> Back to Polaroids</Link>
    <div className="mt-8 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
      <div className="mx-auto aspect-[4/5] w-full min-w-0 max-w-sm overflow-hidden rounded-2xl bg-cream sm:max-w-md"><SmartImage src={item.image} alt={item.title} className="size-full object-cover" /></div>
      <div className="min-w-0 self-center">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Polaroid</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{item.title}</h1>
        <p className="mt-4 text-3xl font-extrabold">{formatPrice(price)} <span className="text-base font-medium text-ink/60">per piece</span></p>
        {item.description && <ExpandableText text={item.description} className="mt-5 leading-7 text-ink/70" />}
        <p className="mt-5 font-medium text-ink/65">Minimum {minimum}. Upload one photo for each piece after selecting Buy now.</p>
        <div className="mt-6 flex items-center gap-4"><span className="font-semibold">Quantity</span><QtyStepper value={Math.max(qty, minimum)} min={minimum} max={9999} onChange={setQty} /></div>
        <p className="mt-3 text-sm text-ink/60">Subtotal: <strong className="text-ink">{formatPrice(price * Math.max(qty, minimum))}</strong></p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2"><Button variant="outline" className="h-14 gap-2" onClick={() => go(true)}><ShoppingCart size={18} /> Add to Cart</Button><Button className="h-14 gap-2 shadow-lg" onClick={() => go(false)}>Buy now <ArrowRight size={18} /></Button></div>
      </div>
    </div>
  </Container>
}
