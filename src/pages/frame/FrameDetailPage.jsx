import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ShoppingCart, X } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import SmartImage from '../../shared/ui/SmartImage'
import useAsync from '../../shared/hooks/useAsync'
import { getFrameProduct } from '../../shared/services/contentService'
import { formatPrice } from '../../shared/utils/format'
import { useCart } from '../../shared/context/CartContext'
import ExpandableText from '../../shared/ui/ExpandableText'

export default function FrameDetailPage() {
  const [previewDesign, setPreviewDesign] = useState(null)
  const { id } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const { data: frame, loading } = useAsync(() => getFrameProduct(id), [id])
  useEffect(() => {
    if (!previewDesign) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setPreviewDesign(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [previewDesign])
  if (loading) return <p className="py-32 text-center text-ink/60">Loading frame…</p>
  if (!frame) return <p className="py-32 text-center text-ink/60">Frame not found.</p>
  const designs = (Array.isArray(frame.designs) ? frame.designs : []).filter((design) => design?.id && design.image)
  const startOrder = (cartMode = false) => navigate(`/frame/order?frame=${encodeURIComponent(frame.id)}${cartMode ? '&mode=cart' : ''}`)
  return <Container className="pb-20 pt-4"><Link to="/frame" className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 text-sm"><ArrowLeft size={16} /> Back to Frames</Link>
    <div className="mt-8 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16"><div className="mx-auto aspect-[4/5] w-full min-w-0 max-w-sm overflow-hidden rounded-2xl bg-cream sm:max-w-md"><SmartImage src={frame.image} alt={frame.title} className="size-full object-cover" /></div>
      <div className="min-w-0 self-center"><p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Frame</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">{frame.title}</h1>{frame.description && <ExpandableText text={frame.description} className="mt-5 leading-7 text-ink/70" />}{designs.length > 0 && <div className="mt-6 min-w-0"><p className="text-sm font-semibold">{designs.length} design{designs.length === 1 ? '' : 's'} to choose from</p><div className="mt-2 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-2">{designs.slice(0, 8).map((design, index) => <button key={design.id} type="button" aria-label={`View ${design.name || `design ${index + 1}`} larger`} onClick={() => setPreviewDesign(design)} className="size-14 shrink-0 overflow-hidden rounded-lg border border-sand bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand sm:size-16"><SmartImage src={design.image} alt={design.name || 'Frame design'} className="size-full object-cover" /></button>)}{designs.length > 8 && <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-cream text-xs font-semibold text-ink/60 sm:size-16">+{designs.length - 8}</span>}</div></div>}<p className="mt-6 text-3xl font-bold text-brand">{formatPrice(frame.price)}</p><p className="mt-5 text-sm text-ink/60">Pick a design and upload the photo or photos you want printed in this frame during checkout.</p>{!designs.length && <p className="mt-3 rounded-lg bg-cream p-3 text-sm text-ink/60">Design choices are being prepared for this frame.</p>}<div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2"><Button variant="outline" className="h-14 min-w-0 gap-2" disabled={!designs.length} onClick={() => startOrder(true)}><ShoppingCart size={18} /> Add to Cart</Button><Button className="h-14 min-w-0 gap-2" disabled={!designs.length} onClick={() => startOrder(false)}>Order this frame <ArrowRight size={17} /></Button></div></div>
    </div>
    {previewDesign && <div role="dialog" aria-modal="true" aria-label={previewDesign.name || 'Frame design preview'} onClick={() => setPreviewDesign(null)} className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4"><figure className="relative max-h-full max-w-lg" onClick={(event) => event.stopPropagation()}><SmartImage src={previewDesign.image} alt={previewDesign.name || 'Frame design'} className="max-h-[85vh] w-auto max-w-full rounded-2xl bg-white object-contain" />{previewDesign.name && <figcaption className="mt-2 text-center text-sm font-medium text-white">{previewDesign.name}</figcaption>}<button type="button" aria-label="Close preview" onClick={() => setPreviewDesign(null)} className="absolute -right-2 -top-2 grid size-9 place-items-center rounded-full bg-white text-ink shadow"><X size={18} /></button></figure></div>}
  </Container>
}
