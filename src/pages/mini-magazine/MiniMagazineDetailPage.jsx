import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ShoppingCart } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import SmartImage from '../../shared/ui/SmartImage'
import ExpandableText from '../../shared/ui/ExpandableText'
import useAsync from '../../shared/hooks/useAsync'
import { getMiniMagazine } from '../../shared/services/contentService'
import { formatPrice } from '../../shared/utils/format'
import { photoRule } from './photoRule'

export default function MiniMagazineDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: item, loading } = useAsync(() => getMiniMagazine(id), [id])
  if (loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  if (!item) return <p className="py-32 text-center text-ink/60">This mini pocket magazine was not found.</p>
  const rule = photoRule(item)
  const start = (cart) => navigate(`/mini-magazines/order?item=${encodeURIComponent(item.id)}${cart ? '&mode=cart' : ''}`)
  return <Container className="pb-20 pt-4"><Link to="/mini-magazines" className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 text-sm"><ArrowLeft size={16} /> Back to Mini Pocket Magazines</Link>
    <div className="mt-8 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
      <div className="mx-auto aspect-[4/5] w-full min-w-0 max-w-sm overflow-hidden rounded-2xl bg-cream sm:max-w-md"><SmartImage src={item.image} alt={item.title} className="size-full object-cover" /></div>
      <div className="min-w-0 self-center">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Mini Pocket Magazine</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{item.title}</h1>
        <p className="mt-4 text-2xl font-extrabold">{formatPrice(item.price)}</p>
        <p className="mt-2 text-sm text-ink/60">{rule.summary}</p>
        {item.description && <ExpandableText text={item.description} className="mt-5 leading-7 text-ink/70" />}
        <div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => start(false)} className="gap-2">Buy now <ArrowRight size={17} /></Button><Button variant="outline" onClick={() => start(true)} className="gap-2"><ShoppingCart size={17} /> Add to cart</Button></div>
      </div>
    </div>
  </Container>
}
