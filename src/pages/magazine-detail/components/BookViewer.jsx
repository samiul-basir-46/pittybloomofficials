import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageFlip } from 'page-flip'
import { bookStore } from '../../../shared/services/bookStore'

// Realistic page-flip preview of the magazine PDF.
// Shows the first page alone in the middle (closed book), then two pages side by side after every flip, and
// the last page alone in the middle as the back cover. On narrow screens it shows one page at a time.
// If the book cannot be loaded (e.g. its pages are not in this browser), `fallback` is shown instead.
const MIN_PAGE_WIDTH = 240 // below 2 x this width the book switches to single-page view
const MAX_PAGE_WIDTH = 520
const SLIDE = 'transform 850ms cubic-bezier(0.45, 0, 0.2, 1)'

// 'cover' = closed at the front, 'back' = closed at the back, 'open' = two-page spread
const whereFor = (index, lastIndex) => (index === 0 ? 'cover' : index >= lastIndex ? 'back' : 'open')

export default function BookViewer({ book, title, fallback }) {
  const host = useRef(null)
  const flip = useRef(null)
  const place = useRef(null)
  const current = useRef(0)
  const [status, setStatus] = useState('loading')
  const [index, setIndex] = useState(0)
  const lastIndex = book.pageCount - 1

  useEffect(() => {
    let cancelled = false
    let pageFlip = null
    let urls = []
    // PageFlip removes the element it is given when destroyed, so give it its own element instead of React's.
    const el = document.createElement('div')
    el.style.width = '100%'
    el.style.margin = '0 auto'
    // page-flip paints the whole book area as an opaque white rectangle. Multiplying it with the background makes
    // the white vanish, so a closed book is just its single page on the soft background (shadows and photos stay).
    el.style.mixBlendMode = 'multiply'
    host.current.appendChild(el)

    // A closed book shows its cover on the right half of the book (back cover on the left half). Slide the whole
    // book by half a page so the single page sits in the middle, and slide it back when the book opens.
    place.current = (where, animate = true) => {
      const width = host.current?.clientWidth ?? 0
      const portrait = width < MIN_PAGE_WIDTH * 2
      const half = Math.min(width / 2, MAX_PAGE_WIDTH) / 2
      const x = portrait ? 0 : where === 'cover' ? -half : where === 'back' ? half : 0
      el.style.transition = animate ? SLIDE : 'none'
      el.style.transform = `translateX(${x}px)`
    }
    const settle = () => place.current?.(whereFor(current.current, lastIndex), false)
    window.addEventListener('resize', settle)

    bookStore
      .get(book.key, book.pageCount)
      .then((blobs) => {
        if (cancelled) return
        if (!Array.isArray(blobs) || blobs.length !== book.pageCount) throw new Error('Book pages not found')
        urls = blobs.map((blob) => URL.createObjectURL(blob))
        const ratio = book.ratio || 1 / 1.4142
        const width = 400
        pageFlip = new PageFlip(el, {
          width,
          height: Math.round(width / ratio),
          size: 'stretch',
          minWidth: MIN_PAGE_WIDTH,
          maxWidth: MAX_PAGE_WIDTH,
          minHeight: Math.round(MIN_PAGE_WIDTH / ratio),
          maxHeight: Math.round(MAX_PAGE_WIDTH / ratio),
          showCover: true,
          usePortrait: true,
          flippingTime: 900,
          maxShadowOpacity: 0.5,
          mobileScrollSupport: false,
        })
        pageFlip.on('flip', (e) => {
          current.current = e.data
          setIndex(e.data)
          place.current?.(whereFor(e.data, lastIndex))
        })
        pageFlip.on('changeOrientation', settle)
        pageFlip.loadFromImages(urls)
        flip.current = pageFlip
        place.current('cover', false)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      flip.current = null
      place.current = null
      window.removeEventListener('resize', settle)
      try {
        pageFlip?.destroy()
      } catch {
        // already torn down
      }
      el.remove()
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [book.key, book.pageCount, book.ratio, lastIndex])

  // The slide starts together with the page turn (the page-flip "flip" event only fires when the turn has finished).
  const next = () => {
    const i = current.current
    if (i === 0) place.current?.('open')
    else if (i >= lastIndex - 2) place.current?.('back')
    flip.current?.flipNext()
  }
  const prev = () => {
    const i = current.current
    if (i >= lastIndex) place.current?.('open')
    else if (i <= 2) place.current?.('cover')
    flip.current?.flipPrev()
  }

  if (status === 'error') return fallback

  const ready = status === 'ready'
  const arrow = 'grid size-10 place-items-center rounded-full border border-brand text-brand disabled:opacity-30'

  return (
    <div className="flex min-w-0 flex-col items-center">
      {/* overflow-x-clip: the closed book is slid half a page sideways, so its empty half sticks out. It is cut off here
          instead of covering the size and cart buttons next to the book. Do not add isolate/z-index/transform here:
          that would stop the multiply blend above from seeing the background. */}
      <div className="relative w-full overflow-x-clip bg-linear-to-b from-white to-cream pb-8 pt-6 sm:pt-10">
        <div ref={host} role="img" aria-label={`${title} book preview`} className="mx-auto min-h-[320px] w-full max-w-[1040px]" />
        {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-ink/50">Loading preview…</p>}
      </div>
      <div className="mt-6 flex items-center gap-5 text-xs uppercase tracking-widest text-ink/60">
        <button type="button" onClick={prev} disabled={!ready || index <= 0} aria-label="Previous page" className={arrow}>
          <ChevronLeft size={18} />
        </button>
        Click to flip
        <button type="button" onClick={next} disabled={!ready || index >= lastIndex} aria-label="Next page" className={arrow}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
