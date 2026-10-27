import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronRight, Gift, ShoppingCart } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import CoverViewer from '../magazine-detail/components/CoverViewer'
import BookViewer from '../magazine-detail/components/BookViewer'
import { isValidPageCount } from '../../shared/services/pdfBook'
import useAsync from '../../shared/hooks/useAsync'
import { getSongBook, getSongBooks } from '../../shared/services/contentService'
import { formatPrice } from '../../shared/utils/format'
import { useCart } from '../../shared/context/CartContext'
import ExpandableText from '../../shared/ui/ExpandableText'

export default function SongBookDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const result = useAsync(() => getSongBook(id), [id])
  const books = useAsync(getSongBooks)
  const [pages, setPages] = useState(12)
  if (result.loading) return <p className="py-32 text-center text-ink/55">Loading Song Book…</p>
  const book = result.data
  if (result.error || !book) return <p className="py-32 text-center text-ink/55">Song Book not found.</p>

  const price = Number(pages === 12 ? book.price12 : book.price16)
  const uploadedPreview = book.previewBook ?? book.preview12 ?? book.preview16
  const hasBook = Boolean(uploadedPreview?.key) && isValidPageCount(uploadedPreview.pageCount)
  const covers = [book.image, book.backImage].filter(Boolean)
  const cover = covers.length ? <CoverViewer images={covers} title={book.title} /> : <div className="grid aspect-[4/5] place-items-center rounded-xl bg-cream text-center font-serif text-2xl text-brand">{book.title}</div>
  const addToCart = () => {
    add({ kind: 'song-book', id: book.id, name: book.title, image: book.image, optionId: `${pages}-pages`, optionLabel: `${pages} pages · customization needed`, price, mrp: price, qty: 1, meta: { pages }, photos: { count: 0, files: [] }, details: [], to: `/song-books/${book.id}` })
    navigate('/cart')
  }
  const buy = () => navigate(`/song-books/${book.id}/order?pages=${pages}`)

  return (
    <Container className="pb-32 pt-3 sm:pb-20 sm:pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button type="button" onClick={() => navigate('/song-books')} className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-sand"><ArrowLeft size={16} /> Back</button>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm text-ink/60 sm:flex"><Link to="/" className="hover:text-brand">Home</Link><ChevronRight size={14} className="shrink-0" /><Link to="/song-books" className="hover:text-brand">Song Books</Link><ChevronRight size={14} className="shrink-0" /><span className="truncate font-medium text-ink">{book.title}</span></nav>
      </div>

      <div className="mt-3 grid gap-4 sm:mt-5 sm:gap-7 lg:mt-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14">
        {hasBook ? <BookViewer key={uploadedPreview.key} book={uploadedPreview} title={book.title} fallback={cover} /> : cover}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand sm:text-sm">Song Book</p>
          <h1 className="mt-3 font-serif text-[1.35rem] sm:mt-4 sm:text-5xl">{book.title}</h1>
          <div className="mt-5 space-y-2 text-sm text-ink/75 sm:mt-8 sm:space-y-3 sm:text-base"><ExpandableText text={book.description} /><p>Personalized with your song, lyrics and photos.</p></div>
          <p className="mb-3 mt-6 font-semibold sm:mb-5 sm:mt-10">Choose Song Book Length</p>
          <div role="radiogroup" aria-label="Song Book page count" className="mx-auto grid max-w-md grid-cols-2 gap-3">{[12, 16].map((count) => { const amount = Number(count === 12 ? book.price12 : book.price16); return <button key={count} type="button" role="radio" aria-checked={pages === count} disabled={!Number.isFinite(amount) || amount <= 0} onClick={() => setPages(count)} className={`rounded-2xl border-2 p-4 text-left transition disabled:opacity-40 ${pages === count ? 'border-brand bg-cream shadow-sm' : 'border-sand bg-white hover:border-brand/40'}`}><span className="block font-serif text-xl">{count} pages</span><span className="mt-1 block font-semibold text-brand">{formatPrice(amount)}</span></button> })}</div>
          <p className="mt-5 text-xs leading-5 text-ink/55">Choose Personal, Couple, or Best Friend and add your song, lyrics and photos. 60–80 lyric words is recommended; there is no word-count limit.</p>
          <div className="mt-8 hidden gap-4 sm:grid sm:grid-cols-2"><Button variant="outline" className="h-[76px] gap-2" onClick={addToCart}><ShoppingCart size={18} /> Add to Cart</Button><Button className="h-[76px] flex-col shadow-lg" onClick={buy}><span className="flex items-center gap-2 text-xl font-extrabold uppercase">Buy now <ArrowRight size={18} /></span><span className="flex items-center gap-1.5 text-sm font-medium text-white/80"><Gift size={14} /> Make it yours</span></Button></div>
        </div>
      </div>

      {(books.data ?? []).filter((item) => item.id !== book.id).length > 0 && <section className="mt-14 border-t border-sand pt-14"><h2 className="text-center font-display text-4xl uppercase sm:text-5xl">You may also like</h2><div className="mt-10 flex flex-wrap justify-center gap-6 lg:justify-start">{(books.data ?? []).filter((item) => item.id !== book.id).slice(0, 4).map((item) => <Link key={item.id} to={`/song-books/${item.id}`} className="group block w-36 text-center sm:w-48"><div className="aspect-[4/5] overflow-hidden rounded-xl bg-sand"><img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div><h3 className="mt-4 font-bold">{item.title}</h3></Link>)}</div></section>}

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-sand bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(42,26,28,0.08)] backdrop-blur sm:hidden"><Button variant="outline" size="sm" className="h-11 gap-2 px-2 text-xs" onClick={addToCart}><ShoppingCart size={16} /> Add to Cart</Button><Button size="sm" className="h-11 gap-1 px-2 text-xs" onClick={buy}>Buy Now <ArrowRight size={14} /></Button></div>
    </Container>
  )
}
