import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ShoppingCart } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import SmartImage from '../../shared/ui/SmartImage'
import useAsync from '../../shared/hooks/useAsync'
import { getFrameProduct } from '../../shared/services/contentService'
import { formatPrice } from '../../shared/utils/format'
import { useCart } from '../../shared/context/CartContext'

export default function FrameDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const { data: frame, loading } = useAsync(() => getFrameProduct(id), [id])
  if (loading) return <p className="py-32 text-center text-ink/60">Loading frame…</p>
  if (!frame) return <p className="py-32 text-center text-ink/60">Frame not found.</p>
  const startOrder = (cartMode = false) => navigate(`/frame/order?frame=${encodeURIComponent(frame.id)}${cartMode ? '&mode=cart' : ''}`)
  return <Container className="pb-20 pt-4"><Link to="/frame" className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 text-sm"><ArrowLeft size={16} /> Back to Frames</Link>
    <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16"><div className="mx-auto aspect-[4/5] w-full max-w-xl overflow-hidden rounded-2xl bg-cream"><SmartImage src={frame.image} alt={frame.title} className="size-full object-cover" /></div>
      <div className="self-center"><p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Frame</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">{frame.title}</h1>{frame.description && <p className="mt-5 leading-7 text-ink/70">{frame.description}</p>}<p className="mt-6 text-3xl font-bold text-brand">{formatPrice(frame.price)}</p><p className="mt-5 text-sm text-ink/60">Upload the photo or photos you want printed in this frame during checkout.</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><Button variant="outline" className="h-14 gap-2" onClick={() => startOrder(true)}><ShoppingCart size={18} /> Add to Cart</Button><Button className="h-14 gap-2" onClick={() => startOrder(false)}>Order this frame <ArrowRight size={17} /></Button></div></div>
    </div>
  </Container>
}
