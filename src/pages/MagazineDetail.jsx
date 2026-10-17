import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronRight, Gift, ShoppingCart } from 'lucide-react'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import CoverViewer from '../components/product/CoverViewer'
import SizeSelector from '../components/product/SizeSelector'
import ProductAbout from '../components/product/ProductAbout'
import MagazineMiniCard from '../components/product/MagazineMiniCard'
import useAsync from '../hooks/useAsync'
import { useCart } from '../context/CartContext'
import { useSettings } from '../context/SettingsContext'
import { getMagazine, getMagazines, getSizes } from '../services/contentService'
import { DEFAULT_SIZE } from '../data/magazineMeta'
import { formatPrice } from '../utils/format'

function Detail({ magazine, sizes }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { add } = useCart()
  const { productInfo } = useSettings().settings
  const related = useAsync(getMagazines)
  const [sizeId, setSizeId] = useState((sizes.find((s) => s.id === DEFAULT_SIZE) ?? sizes[0]).id)
  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0]
  const save = magazine.mrp - size.price

  return (
    <Container className="pb-20 pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          // location.key is "default" when the page was opened directly, so there is nothing to go back to
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/magazines'))}
          className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-sand"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-ink/60">
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

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
        <CoverViewer images={[magazine.image, magazine.backImage].filter(Boolean)} title={magazine.title} />
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Magazine</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">{magazine.title}</h1>
          <p className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {save > 0 && <span className="text-2xl text-ink/50 line-through">{formatPrice(magazine.mrp)}</span>}
            <span className="text-3xl font-extrabold sm:text-4xl">Price: {formatPrice(size.price)}</span>
            {save > 0 && (
              <span className="rounded-full border border-sand bg-cream px-3 py-1 text-xs font-semibold text-warm">
                Save {formatPrice(save)}
              </span>
            )}
          </p>
          <div className="mt-8 space-y-3 text-ink/75">
            {productInfo.notes.filter(Boolean).map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
          <p className="mb-5 mt-10 font-semibold">Choose Magazine Size</p>
          <SizeSelector sizes={sizes} value={size.id} onChange={setSizeId} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Button variant="outline" className="h-[76px] gap-2" onClick={() => add({ id: magazine.id, sizeId })}>
              <ShoppingCart size={18} /> Add to Cart
            </Button>
            <Button className="h-[76px] flex-col shadow-lg">
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
    </Container>
  )
}

export default function MagazineDetail() {
  const { id } = useParams()
  const magazine = useAsync(() => getMagazine(id), [id])
  const sizes = useAsync(getSizes)

  if (magazine.loading || sizes.loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  if (!magazine.data) return <p className="py-32 text-center text-ink/60">Magazine not found.</p>
  if (!sizes.data.length) return <p className="py-32 text-center text-ink/60">No sizes available.</p>
  return <Detail key={magazine.data.id} magazine={magazine.data} sizes={sizes.data} />
}