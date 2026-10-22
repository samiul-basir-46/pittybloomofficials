import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageFlip } from 'page-flip'
import { bookPageUrl } from '../../../shared/services/bookStore'

const MAX_PAGE_WIDTH = 520
const MAX_DPR = 3
// Always draw the book at no less than 2x. On a normal 1x desktop monitor a 1:1 canvas shows each
// page at exactly its screen size, and any tiny size mismatch resamples the image and softens it.
// A 2x canvas fed with 2x images maps pixel-for-pixel and the browser then shrinks it smoothly.
const renderScale = () => Math.min(Math.max(window.devicePixelRatio || 1, 2), MAX_DPR)

// Pages are loaded straight from Cloudflare as ordinary images, so the book can open as soon as the
// cover is there; the rest download in the background while the visitor looks at it.
const preload = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(url)
    image.onerror = () => reject(new Error(`Could not load ${url}`))
    image.src = url
  })

const blankPage = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, 2, 2)
  return canvas.toDataURL('image/png')
}

// Cover plus the first spread are fetched first; the remaining pages are requested once those are in.
const FIRST_WAVE = 4

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
    const mount = host.current
    if (!mount) return undefined

    // PageFlip removes its mount node when destroyed, so keep it outside React's managed tree.
    const holder = document.createElement('div')
    holder.style.width = '100%'
    holder.style.margin = '0 auto'
    const element = document.createElement('div')
    element.style.touchAction = 'pan-y'
    element.style.webkitTapHighlightColor = 'transparent'
    holder.appendChild(element)
    mount.appendChild(holder)

    const urls = Array.from({ length: book.pageCount }, (_, index) => bookPageUrl(book.key, index + 1))
    const blank = blankPage()

    // Wait only for the cover, then open the book.
    preload(urls[0])
      .then(() => {
        if (cancelled) return
        // Pages after the first spread start as blanks; they are filled in once the first ones are in.
        const firstWave = urls.map((url, index) => (index < FIRST_WAVE ? url : blank))
        const ratio = book.ratio || 1 / 1.4142
        const pageWidth = MAX_PAGE_WIDTH
        instance = new PageFlip(element, {
          width: pageWidth,
          height: Math.round(pageWidth / ratio),
          size: 'stretch',
          minWidth: 120,
          maxWidth: MAX_PAGE_WIDTH,
          minHeight: Math.round(150 / ratio),
          maxHeight: Math.round(MAX_PAGE_WIDTH / ratio),
          showCover: true,
          // Always the two-page spread, also on phones (just smaller), like a real open book.
          usePortrait: false,
          flippingTime: 900,
          maxShadowOpacity: 0.55,
          // Keep vertical page scrolling native while allowing PageFlip to receive
          // horizontal touch swipes and perform its real page-curl gesture.
          mobileScrollSupport: true,
          drawShadow: true,
          startPage: 0,
        })
        instance.loadFromImages(firstWave)
        // PageFlip sizes its canvas at CSS pixels, which looks soft on Retina/mobile screens.
        // Keep the same visual size but render the canvas at a higher DPR. The UI only exists
        // after the pages are loaded, and a failure here must never take the whole book down.
        try {
          const ui = instance.getUI()
          if (ui) {
            const resizeCanvas = ui.resizeCanvas.bind(ui)
            ui.resizeCanvas = () => {
              resizeCanvas()
              const canvas = ui.getCanvas()
              const bounds = canvas.getBoundingClientRect()
              const ratioPx = renderScale()
              canvas.width = Math.max(1, Math.round(bounds.width * ratioPx))
              canvas.height = Math.max(1, Math.round(bounds.height * ratioPx))
              const context = canvas.getContext('2d')
              context?.setTransform(ratioPx, 0, 0, ratioPx, 0, 0)
              if (context) context.imageSmoothingQuality = 'high'
            }
            ui.resizeCanvas()
            instance.update?.()
          }
        } catch (error) {
          console.warn('[Flipbook] Sharp canvas mode unavailable, using the default:', error)
        }
        instance.on('flip', ({ data }) => {
          currentPage.current = data
          setPageIndex(data)
        })
        flip.current = instance
        setStatus('ready')

        Promise.allSettled(urls.slice(0, FIRST_WAVE).map(preload)).then(() => {
          if (cancelled || flip.current !== instance) return
          instance.updateFromImages(urls)
        })
      })
      .catch((error) => {
        // The page quietly falls back to the plain cover, so say why in the console.
        console.error('[Flipbook] Could not load the book preview:', error)
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
      holder.remove()
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
