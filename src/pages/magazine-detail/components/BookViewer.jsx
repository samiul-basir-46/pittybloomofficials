import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageFlip } from 'page-flip'
import { bookStore } from '../../../shared/services/bookStore'

// Realistic page-flip preview of the magazine PDF.
// Shows the first page alone in the middle (closed book), then two pages side by side after every flip, and
// the last page alone in the middle as the back cover. On narrow screens it shows one page at a time.
// If the book cannot be loaded (e.g. its pages are not in this browser), `fallback` is shown instead.
const LANDSCAPE_FROM = 640 // box width from which two pages are shown side by side
const PORTRAIT_MAX_PAGE = 440
const LANDSCAPE_MAX_PAGE = 520
const SLIDE = 'transform 850ms cubic-bezier(0.45, 0, 0.2, 1)'
const SHADOW = 'drop-shadow(0 16px 18px rgba(60, 30, 32, 0.2))'

// A closed book is slid half a page sideways to centre its single page. To keep the whole book (including the
// page that is turning) inside its box while it slides, a page is at most a third of the box width.
const layoutFor = (hostWidth) =>
  hostWidth < LANDSCAPE_FROM
    ? { portrait: true, pageWidth: Math.min(hostWidth, PORTRAIT_MAX_PAGE) }
    : { portrait: false, pageWidth: Math.min(Math.floor(hostWidth / 3), LANDSCAPE_MAX_PAGE) }

// 'cover' = closed at the front, 'back' = closed at the back, 'open' = two-page spread
const whereFor = (index, lastIndex) => (index === 0 ? 'cover' : index >= lastIndex ? 'back' : 'open')

export default function BookViewer({ book, title, fallback }) {
  const host = useRef(null)
  const flip = useRef(null)
  const place = useRef(null)
  const current = useRef(0)
  const [urls, setUrls] = useState(null)
  const [hostWidth, setHostWidth] = useState(0)
  const [status, setStatus] = useState('loading')
  const [index, setIndex] = useState(0)
  const lastIndex = book.pageCount - 1

  // 1. Load the page images of this book
  useEffect(() => {
    let cancelled = false
    let made = []
    bookStore
      .get(book.key)
      .then((blobs) => {
        if (cancelled) return
        if (!Array.isArray(blobs) || blobs.length !== book.pageCount) throw new Error('Book pages not found')
        made = blobs.map((blob) => URL.createObjectURL(blob))
        setUrls(made)
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      made.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [book.key, book.pageCount])

  // 2. Follow the width of the box so the book is rebuilt at the right size when the window changes
  useEffect(() => {
    const node = host.current
    if (!node) return
    let timer
    const measure = () => setHostWidth(Math.round(node.clientWidth))
    measure()
    const observer = new ResizeObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(measure, 150)
    })
    observer.observe(node)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  // 3. Build the flipbook
  useEffect(() => {
    if (!urls || !hostWidth) return
    const { portrait, pageWidth } = layoutFor(hostWidth)
    const ratio = book.ratio || 1 / 1.4142
    const pageHeight = Math.round(pageWidth / ratio)

    // PageFlip removes the element it is given when destroyed, so give it its own element instead of React's.
    const el = document.createElement('div')
    el.style.width = portrait ? `${pageWidth}px` : '100%'
    el.style.margin = '0 auto'
    el.style.filter = SHADOW
    host.current.appendChild(el)

    // A closed book shows its cover on the right half of the book (back cover on the left half). Slide the whole
    // book by half a page so the single page sits in the middle, and slide it back when the book opens.
    place.current = (where, animate = true) => {
      const x = portrait ? 0 : where === 'cover' ? -pageWidth / 2 : where === 'back' ? pageWidth / 2 : 0
      el.style.transition = animate ? SLIDE : 'none'
      el.style.transform = `translateX(${x}px)`
    }

    let pageFlip
    try {
      pageFlip = new PageFlip(el, {
        width: pageWidth,
        height: pageHeight,
        size: 'stretch',
        // min = max = the page size we want; min also decides one page (portrait) or two (landscape)
        minWidth: pageWidth,
        maxWidth: pageWidth,
        minHeight: pageHeight,
        maxHeight: pageHeight,
        startPage: current.current,
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
      pageFlip.loadFromImages(urls)
    } catch {
      el.remove()
      setStatus('error')
      return
    }
    flip.current = pageFlip
    place.current(whereFor(current.current, lastIndex), false)
    setStatus('ready')

    return () => {
      flip.current = null
      place.current = null
      try {
        pageFlip.destroy()
      } catch {
        // already torn down
      }
      el.remove()
    }
  }, [urls, hostWidth, lastIndex, book.ratio])

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
