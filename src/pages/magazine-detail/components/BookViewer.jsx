import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageFlip } from 'page-flip'
import { bookStore } from '../../../shared/services/bookStore'

// Realistic page-flip preview of the magazine PDF.
// Shows the first page alone (closed book), then two pages side by side after every flip, and the last
// page alone as the back cover. On narrow screens it switches to one page at a time.
// If the book cannot be loaded (e.g. its pages are not in this browser), `fallback` is shown instead.
const MIN_PAGE_WIDTH = 240 // below 2 x this width the book switches to single-page view
const MAX_PAGE_WIDTH = 520

export default function BookViewer({ book, title, fallback }) {
  const host = useRef(null)
  const flip = useRef(null)
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
    host.current.appendChild(el)

    bookStore
      .get(book.key)
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
        pageFlip.on('flip', (e) => setIndex(e.data))
        pageFlip.loadFromImages(urls)
        flip.current = pageFlip
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      flip.current = null
      try {
        pageFlip?.destroy()
      } catch {
        // already torn down
      }
      el.remove()
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [book.key, book.pageCount, book.ratio])

  if (status === 'error') return fallback

  const ready = status === 'ready'
  const arrow = 'grid size-10 place-items-center rounded-full border border-brand text-brand disabled:opacity-30'

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="relative w-full bg-linear-to-b from-white to-cream pb-8 pt-6 sm:pt-10">
        <div ref={host} role="img" aria-label={`${title} book preview`} className="mx-auto min-h-[320px] w-full max-w-[1040px]" />
        {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-ink/50">Loading preview…</p>}
      </div>
      <div className="mt-6 flex items-center gap-5 text-xs uppercase tracking-widest text-ink/60">
        <button
          type="button"
          onClick={() => flip.current?.flipPrev()}
          disabled={!ready || index <= 0}
          aria-label="Previous page"
          className={arrow}
        >
          <ChevronLeft size={18} />
        </button>
        Click to flip
        <button
          type="button"
          onClick={() => flip.current?.flipNext()}
          disabled={!ready || index >= lastIndex}
          aria-label="Next page"
          className={arrow}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
