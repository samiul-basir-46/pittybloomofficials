import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronRight, Gift, ShoppingCart } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import CoverViewer from './components/CoverViewer'
import BookViewer from './components/BookViewer'
import { isValidPageCount } from '../../shared/services/pdfBook'
import SizeSelector from './components/SizeSelector'
import ProductAbout from './components/ProductAbout'
import MagazineMiniCard from './components/MagazineMiniCard'
import useAsync from '../../shared/hooks/useAsync'
import { useCart } from '../../shared/context/CartContext'
import { useSettings } from '../../shared/context/SettingsContext'
import { getMagazine, getMagazines, getOrderSettings, getSizes } from '../../shared/services/contentService'
import { DEFAULT_SIZE, magazineLine } from './data'
import { freshDraft, orderDraft } from '../order/lib/orderDraft'
import { getFormats } from '../order/lib/copies'
import { photoStore } from '../order/lib/photoStore'

function Detail({ magazine, sizes, settings }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { add } = useCart()
  const { productInfo } = useSettings().settings
  const related = useAsync(getMagazines)
  const formats = getFormats(settings)
  const [sizeId, setSizeId] = useState((sizes.find((s) => s.id === DEFAULT_SIZE) ?? sizes[0]).id)
  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0]
  // Show the flipbook whenever a stored book has at least one valid page.
  const hasBook = Boolean(magazine.book?.key) && isValidPageCount(magazine.book.pageCount)
  const orderItem = () => magazineLine(magazine, size)
  const addToCart = () => add(orderItem())
  const startOrder = () => {
    photoStore.clear()
    orderDraft.set(freshDraft(magazine.id, size))
    navigate(`/magazines/${magazine.id}/order`)
  }
  const cover = <CoverViewer images={[magazine.image, magazine.backImage].filter(Boolean)} title={magazine.title} />

  return (
    <Container className="pb-32 pt-3 sm:pb-20 sm:pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          // location.key is "default" when the page was opened directly, so there is nothing to go back to
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/magazines'))}
          className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-sand"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm text-ink/60 sm:flex">
          <Link to="/" className="hover:text-brand">
            Home
          </Link>
          <ChevronRight size={14} className="shrink-0" />
          <Link to="/magazines" className="hover:text-brand">
            Magazines
          </Link>
          <ChevronRight size={14} className="shrink-0" />
          <span className="truncate font-medium text-ink">{magazine.title}</span>
        </nav>
      </div>

      <div className="mt-3 grid gap-4 sm:mt-5 sm:gap-7 lg:mt-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14">
        {hasBook ? (
          <BookViewer book={magazine.book} title={magazine.title} fallback={cover} />
        ) : (
          cover
        )}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand sm:text-sm">Magazine</p>
          <h1 className="mt-3 font-serif text-[1.35rem] sm:mt-4 sm:text-5xl">{magazine.title}</h1>
          <div className="mt-5 space-y-2 text-sm text-ink/75 sm:mt-8 sm:space-y-3 sm:text-base">
            {productInfo.notes.filter(Boolean).map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
          <p className="mb-3 mt-6 font-semibold sm:mb-5 sm:mt-10">Choose Magazine Size</p>
          <SizeSelector sizes={sizes} formats={formats} value={size.id} onChange={setSizeId} />
          <div className="mt-8 hidden gap-4 sm:grid sm:grid-cols-2">
            <Button variant="outline" className="h-[76px] gap-2" onClick={addToCart}>
              <ShoppingCart size={18} /> Add to Cart
            </Button>
            <Button
              className="h-[76px] flex-col shadow-lg"
              // Buy Now always starts a fresh order with the size chosen here
              onClick={startOrder}
            >
              <span className="flex items-center gap-2 text-xl font-extrabold uppercase">
                Buy now <ArrowRight size={18} />
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-white/80">
                <Gift size={14} /> {productInfo.buyNote}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <ProductAbout size={size} />
      </div>

      <div className="mt-14 border-t border-sand pt-14">
        <h2 className="text-center font-display text-5xl uppercase">You may also like</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-6 lg:justify-start">
          {(related.data ?? [])
            .filter((m) => m.id !== magazine.id)
            .slice(0, 4)
            .map((m) => (
              <MagazineMiniCard key={m.id} magazine={m} />
            ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-sand bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(42,26,28,0.08)] backdrop-blur sm:hidden">
        <Button variant="outline" size="sm" className="h-11 gap-2 px-2 text-xs" onClick={addToCart}>
          <ShoppingCart size={16} /> Add to Cart
        </Button>
        <Button size="sm" className="h-11 gap-1 px-2 text-xs" onClick={startOrder}>
          Buy Now <ArrowRight size={14} />
        </Button>
      </div>
    </Container>
  )
}

export default function MagazineDetail() {
  const { id } = useParams()
  const magazine = useAsync(() => getMagazine(id), [id])
  const sizes = useAsync(getSizes)
  const settings = useAsync(getOrderSettings)

  if (magazine.loading || sizes.loading || settings.loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  if (!magazine.data) return <p className="py-32 text-center text-ink/60">Magazine not found.</p>
  if (!sizes.data.length) return <p className="py-32 text-center text-ink/60">No sizes available.</p>
  return <Detail key={magazine.data.id} magazine={magazine.data} sizes={sizes.data} settings={settings.data} />
}
