import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Images, ShoppingCart, Sparkles } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import SmartImage from '../../shared/ui/SmartImage'
import ExpandableText from '../../shared/ui/ExpandableText'
import useAsync from '../../shared/hooks/useAsync'
import { getMiniMagazine } from '../../shared/services/contentService'
import { formatPrice } from '../../shared/utils/format'
import { photoRule } from './photoRule'

const Chip = ({ icon: Icon, children }) => <li className="inline-flex items-center gap-1.5 rounded-full border border-sand bg-white px-3 py-1.5 text-xs text-ink/80 sm:text-[13px]"><Icon size={14} className="shrink-0 text-brand" aria-hidden="true" />{children}</li>

export default function MiniMagazineDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: item, loading } = useAsync(() => getMiniMagazine(id), [id])
  const [slide, setSlide] = useState(0)
  const touchX = useRef(null)
  const thumbs = useRef({})
  const images = item ? [...new Set([item.image, ...(Array.isArray(item.gallery) ? item.gallery.map((photo) => photo?.image) : [])].filter(Boolean))] : []
  const active = Math.min(slide, Math.max(0, images.length - 1))
  const go = (next) => images.length > 1 && setSlide((next + images.length) % images.length)

  // Keep the chosen thumbnail in view inside its own row, without moving the page.
  useEffect(() => {
    const thumb = thumbs.current[active]
    const row = thumb?.parentElement
    if (thumb && row) row.scrollTo({ left: thumb.offsetLeft - (row.clientWidth - thumb.clientWidth) / 2, behavior: 'smooth' })
  }, [active])

  if (loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  if (!item) return <p className="py-32 text-center text-ink/60">This mini pocket magazine was not found.</p>
  const rule = photoRule(item)
  const start = (cart) => navigate(`/mini-magazines/order?item=${encodeURIComponent(item.id)}${cart ? '&mode=cart' : ''}`)
  const onTouchEnd = (event) => {
    if (touchX.current == null) return
    const dx = event.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) > 45) go(active + (dx < 0 ? 1 : -1))
  }

  return <Container className="pb-20 pt-4">
    <div className="mt-4 grid min-w-0 grid-cols-1 gap-6 sm:mt-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-center lg:justify-center lg:gap-14">
      <div className="mx-auto w-full min-w-0 max-w-[300px] sm:max-w-[360px] lg:max-w-[420px]" onKeyDown={(event) => { if (event.key === 'ArrowLeft') go(active - 1); if (event.key === 'ArrowRight') go(active + 1) }}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-b from-[#fbf6f7] to-sand shadow-[0_18px_40px_-24px_rgba(81,46,48,.4)] ring-1 ring-sand" onTouchStart={(event) => { touchX.current = event.touches[0].clientX }} onTouchEnd={onTouchEnd}>
          <SmartImage src={images[active] || item.image} alt={`${item.title}, picture ${active + 1} of ${images.length || 1}`} className="size-full object-contain" />
          {images.length > 1 && <>
            <span className="absolute right-2.5 top-2.5 rounded-full bg-ink/70 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur">{active + 1} / {images.length}</span>
            <button type="button" aria-label="Previous picture" onClick={() => go(active - 1)} className="absolute left-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-md transition hover:scale-105 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><ChevronLeft size={17} /></button>
            <button type="button" aria-label="Next picture" onClick={() => go(active + 1)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-md transition hover:scale-105 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><ChevronRight size={17} /></button>
          </>}
        </div>
        {images.length > 1 && <div role="group" aria-label="Choose a picture" className="mt-3 flex gap-2 overflow-x-auto px-0.5 pb-1.5 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, index) => <button key={`${src}-${index}`} ref={(node) => { thumbs.current[index] = node }} type="button" aria-label={`Show picture ${index + 1}`} aria-current={index === active ? 'true' : undefined} onClick={() => setSlide(index)} className={`relative aspect-[4/5] w-11 shrink-0 overflow-hidden rounded-lg bg-[#f7f4f1] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand sm:w-12 ${index === active ? 'ring-2 ring-brand ring-offset-1' : 'opacity-60 hover:opacity-100'}`}><SmartImage src={src} alt="" className="size-full object-cover" /></button>)}
        </div>}
      </div>

      <div className="mx-auto min-w-0 w-full max-w-xl self-center lg:mx-0">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-brand">Mini Pocket Magazine</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">{item.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <p className="text-2xl font-extrabold text-ink">{formatPrice(item.price)}</p>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2">
          <Chip icon={BookOpen}>8 pages</Chip>
          <Chip icon={Images}>{rule.summary.replace(/\.$/, '')}</Chip>
          <Chip icon={Sparkles}>You pick the front &amp; back cover</Chip>
        </ul>
        {item.description && <div className="mt-4 border-t border-sand pt-4"><ExpandableText text={item.description} className="text-sm leading-6 text-ink/70" /></div>}
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <Button onClick={() => start(false)} className="h-12 gap-1.5 px-3 text-sm shadow-md">Buy now <ArrowRight size={17} /></Button>
          <Button variant="outline" onClick={() => start(true)} className="h-12 gap-1.5 px-3 text-sm"><ShoppingCart size={16} /> Add to cart</Button>
        </div>
      </div>
    </div>
  </Container>
}
