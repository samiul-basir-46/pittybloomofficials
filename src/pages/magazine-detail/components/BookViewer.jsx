import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageFlip } from 'page-flip'
import { bookStore } from '../../../shared/services/bookStore'

const MAX_PAGE_WIDTH = 520

export default function BookViewer({ book, title, fallback }) {
  const host = useRef(null)
  const flip = useRef(null)
  const currentPage = useRef(0)
  const [status, setStatus] = useState('loading')
  const [pageIndex, setPageIndex] = useState(0)
  const lastPage = book.pageCount - 1

  useEffect(() => {
    let cancelled = false
    let instance
    let pageUrls = []
    const mount = host.current
    if (!mount) return undefined

    // PageFlip removes its mount node when destroyed, so keep it outside React's managed tree.
    const element = document.createElement('div')
    element.style.width = '100%'
    element.style.touchAction = 'pan-y'
    element.style.webkitTapHighlightColor = 'transparent'
    mount.appendChild(element)

    bookStore.get(book.key, book.pageCount)
      .then((pages) => {
        if (cancelled) return
        if (!Array.isArray(pages) || pages.length !== book.pageCount) throw new Error('Book pages not found')

        pageUrls = pages.map((page) => URL.createObjectURL(page))
        const ratio = book.ratio || 1 / 1.4142
        const pageWidth = MAX_PAGE_WIDTH
        instance = new PageFlip(element, {
          width: pageWidth,
          height: Math.round(pageWidth / ratio),
          size: 'stretch',
          minWidth: 150,
          maxWidth: MAX_PAGE_WIDTH,
          minHeight: Math.round(150 / ratio),
          maxHeight: Math.round(MAX_PAGE_WIDTH / ratio),
          showCover: true,
          usePortrait: false,
          flippingTime: 900,
          maxShadowOpacity: 0.55,
          // Keep vertical page scrolling native while allowing PageFlip to receive
          // horizontal touch swipes and perform its real page-curl gesture.
          mobileScrollSupport: true,
          drawShadow: true,
          startPage: 0,
        })
        // PageFlip sizes its canvas at CSS pixels, which looks soft on Retina/mobile
        // screens. Keep the same visual size but render the canvas at a higher DPR.
        const ui = instance.getUI()
        const resizeCanvas = ui.resizeCanvas.bind(ui)
        ui.resizeCanvas = () => {
          resizeCanvas()
          const canvas = ui.getCanvas()
          const bounds = canvas.getBoundingClientRect()
          const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
          canvas.width = Math.max(1, Math.round(bounds.width * dpr))
          canvas.height = Math.max(1, Math.round(bounds.height * dpr))
          const context = canvas.getContext('2d')
          context?.setTransform(dpr, 0, 0, dpr, 0, 0)
          if (context) context.imageSmoothingQuality = 'high'
        }
        ui.resizeCanvas()
        instance.on('flip', ({ data }) => {
          currentPage.current = data
          setPageIndex(data)
        })
        instance.loadFromImages(pageUrls)
        flip.current = instance
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      flip.current = null
      try {
        instance?.destroy()
      } catch {
        // PageFlip can already be torn down when the route changes.
      }
      element.remove()
      pageUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [book.key, book.pageCount, book.ratio])

  if (status === 'error') return fallback

  const ready = status === 'ready'
  const arrow = 'grid size-9 place-items-center rounded-full border border-brand/50 text-brand transition hover:bg-cream disabled:opacity-30 sm:size-10'

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="relative w-full overflow-hidden rounded-xl bg-[#FBF7F7] px-0 py-2 sm:rounded-none sm:bg-transparent sm:py-0">
        <div ref={host} role="img" aria-label={`${title} book preview`} className="mx-auto min-h-[260px] w-full max-w-[1040px] sm:min-h-[320px]" />
        {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-ink/50">Loading preview…</p>}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-ink/60 sm:mt-5 sm:gap-5 sm:uppercase sm:tracking-widest">
        <button type="button" onClick={() => flip.current?.flipPrev()} disabled={!ready || pageIndex <= 0} aria-label="Previous pages" className={arrow}>
          <ChevronLeft size={18} />
        </button>
        <span aria-live="polite">{pageIndex === 0 ? 'Cover' : pageIndex >= lastPage ? 'Back cover' : `Pages ${pageIndex + 1}–${Math.min(pageIndex + 2, book.pageCount)}`} · {book.pageCount}</span>
        <button type="button" onClick={() => flip.current?.flipNext()} disabled={!ready || pageIndex >= lastPage} aria-label="Next pages" className={arrow}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
