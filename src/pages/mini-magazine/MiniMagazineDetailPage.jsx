import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  const [slide, setSlide] = useState(0)
  if (loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  if (!item) return <p className="py-32 text-center text-ink/60">This mini pocket magazine was not found.</p>
  const rule = photoRule(item)
  const images = [...new Set([item.image, ...(Array.isArray(item.gallery) ? item.gallery.map((photo) => photo?.image) : [])].filter(Boolean))]
  const activeSlide = Math.min(slide, Math.max(0, images.length - 1))
  const start = (cart) => navigate(`/mini-magazines/order?item=${encodeURIComponent(item.id)}${cart ? '&mode=cart' : ''}`)
  return <Container className="pb-20 pt-4">
    <div className="grid min-w-0 grid-cols-1 gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-2 lg:gap-16">
      <div className="mx-auto w-full min-w-0 max-w-[470px]">
        <div className="grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-[minmax(0,1fr)_76px] sm:gap-3">
          <div className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-lg bg-[#f7f4f1] sm:rounded-xl"><SmartImage src={images[activeSlide] || item.image} alt={`${item.title} page ${activeSlide + 1}`} className="size-full object-contain" />
            {images.length > 1 && <>
              <button type="button" aria-label="Previous page" onClick={() => setSlide((activeSlide - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink/80 shadow-sm transition hover:bg-white"> <ArrowLeft size={17} /></button>
              <button type="button" aria-label="Next page" onClick={() => setSlide((activeSlide + 1) % images.length)} className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink/80 shadow-sm transition hover:bg-white"><ArrowRight size={17} /></button>
            </>}
          </div>
          {images.length > 1 && <div aria-label="Magazine pages" className="hidden max-h-[min(125vw,590px)] flex-col gap-2 overflow-y-auto pr-1 [scrollbar-width:thin] sm:flex">
            {images.map((src, index) => <button key={`${src}-${index}`} type="button" aria-label={`Show page ${index + 1}`} aria-current={index === activeSlide ? 'true' : undefined} onClick={() => setSlide(index)} className={`aspect-[4/5] w-full shrink-0 overflow-hidden rounded-md bg-[#f7f4f1] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${index === activeSlide ? 'ring-2 ring-brand ring-offset-1' : 'opacity-65 hover:opacity-100'}`}><SmartImage src={src} alt={`Page ${index + 1} thumbnail`} className="size-full object-contain" /></button>)}
          </div>}
        </div>
        {images.length > 1 && <div aria-label="Select a magazine page" className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:hidden">
          {images.map((src, index) => <button key={`mobile-${src}-${index}`} type="button" aria-label={`Show page ${index + 1}`} aria-current={index === activeSlide ? 'true' : undefined} onClick={() => setSlide(index)} className={`aspect-[4/5] w-12 shrink-0 overflow-hidden rounded bg-[#f7f4f1] ${index === activeSlide ? 'ring-2 ring-brand ring-offset-1' : 'opacity-65'}`}><SmartImage src={src} alt={`Page ${index + 1} thumbnail`} className="size-full object-contain" /></button>)}
        </div>}
      </div>
      <div className="min-w-0 self-center">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Mini Pocket Magazine</p>
        <h1 className="mt-2 font-serif text-2xl sm:text-5xl">{item.title}</h1>
        <p className="mt-4 text-xl font-extrabold sm:text-2xl">{formatPrice(item.price)}</p>
        <p className="mt-2 text-sm font-medium text-ink/70">8 pages · fixed price</p>
        <p className="mt-2 text-sm text-ink/60">{rule.summary}</p>
        {item.description && <ExpandableText text={item.description} className="mt-3 text-sm leading-6 text-ink/70 sm:mt-5 sm:text-base sm:leading-7" />}
        <div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => start(false)} className="gap-2">Buy now <ArrowRight size={17} /></Button><Button variant="outline" onClick={() => start(true)} className="gap-2"><ShoppingCart size={17} /> Add to cart</Button></div>
      </div>
    </div>
  </Container>
}
