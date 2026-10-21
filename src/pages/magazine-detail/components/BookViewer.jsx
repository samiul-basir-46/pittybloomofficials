import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageFlip } from 'page-flip'
import { bookStore } from '../../../shared/services/bookStore'

const MAX_PAGE_WIDTH = 520
// Below this container width the book shows one big page at a time (still with the page-curl),
// because two tiny pages side by side are unreadable on a phone.
const SINGLE_PAGE_BELOW = 600
const MAX_DPR = 3
// Always draw the book at no less than 2x. On a normal 1x desktop monitor a 1:1 canvas shows each
// page at exactly its screen size, and any tiny size mismatch resamples the image and softens it.
// A 2x canvas fed with 2x images maps pixel-for-pixel and the browser then shrinks it smoothly.
const renderScale = () => Math.min(Math.max(window.devicePixelRatio || 1, 2), MAX_DPR)
// On phones the book is shown small and centred (one page, still flips), like a product photo,
// instead of stretching to the full screen width.
const PHONE_QUERY = '(max-width: 639px)'
const PHONE_PAGE_MAX = 240
const PHONE_PAGE_SHARE = 0.58

function useIsPhone() {
  const [phone, setPhone] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(PHONE_QUERY).matches : false))
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY)
    const update = () => setPhone(query.matches)
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return phone
}

// Shrinks a page image to the exact pixel size it will be drawn at. Scaling a 1650px scan straight
// down to ~500px makes text jagged, so halve it step by step with high-quality smoothing instead.
async function fitPage(blob, targetWidth) {
  try {
    const bitmap = await createImageBitmap(blob)
    if (bitmap.width <= targetWidth * 1.25) {
      bitmap.close()
      return blob
    }
    const targetHeight = Math.round((bitmap.height * targetWidth) / bitmap.width)
    let current = bitmap
    let width = bitmap.width
    let height = bitmap.height
    while (width / 2 > targetWidth) {
      const step = document.createElement('canvas')
      step.width = Math.round(width / 2)
      step.height = Math.round(height / 2)
      const stepContext = step.getContext('2d')
      stepContext.imageSmoothingQuality = 'high'
      stepContext.drawImage(current, 0, 0, step.width, step.height)
      current.close?.()
      current = step
      width = step.width
      height = step.height
    }
    const out = document.createElement('canvas')
    out.width = targetWidth
    out.height = targetHeight
    const context = out.getContext('2d')
    context.imageSmoothingQuality = 'high'
    context.drawImage(current, 0, 0, targetWidth, targetHeight)
    current.close?.()
    const result = await new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.97))
    return result ?? blob
  } catch {
    return blob
  }
}

async function fitAll(pages, targetWidth) {
  const out = []
  for (let i = 0; i < pages.length; i += 4) {
    out.push(...(await Promise.all(pages.slice(i, i + 4).map((page) => fitPage(page, targetWidth)))))
  }
  return out
}

export default function BookViewer({ book, title, fallback }) {
  const host = useRef(null)
  const flip = useRef(null)
  const currentPage = useRef(0)
  const [status, setStatus] = useState('loading')
  const [pageIndex, setPageIndex] = useState(0)
  const [single, setSingle] = useState(false)
  const lastPage = book.pageCount - 1
  const phone = useIsPhone()

  useEffect(() => {
    let cancelled = false
    let instance
    let pageUrls = []
    const mount = host.current
    if (!mount) return undefined

    // PageFlip removes its mount node when destroyed, so keep it outside React's managed tree.
    const element = document.createElement('div')
    element.style.width = phone ? `min(${PHONE_PAGE_MAX}px, ${PHONE_PAGE_SHARE * 100}%)` : '100%'
    element.style.margin = '0 auto'
    element.style.touchAction = 'pan-y'
    element.style.webkitTapHighlightColor = 'transparent'
    mount.appendChild(element)

    bookStore.get(book.key, book.pageCount)
      .then(async (pages) => {
        if (cancelled) return
        if (!Array.isArray(pages) || pages.length !== book.pageCount) throw new Error('Book pages not found')

        const dpr = renderScale()
        const box = mount.clientWidth || MAX_PAGE_WIDTH * 2
        const cssPageWidth = phone ? Math.min(PHONE_PAGE_MAX, box * PHONE_PAGE_SHARE) : Math.min(MAX_PAGE_WIDTH, box < SINGLE_PAGE_BELOW ? box : box / 2)
        const sharp = await fitAll(pages, Math.ceil(cssPageWidth * dpr))
        if (cancelled) return

        pageUrls = sharp.map((page) => URL.createObjectURL(page))
        const ratio = book.ratio || 1 / 1.4142
        const pageWidth = MAX_PAGE_WIDTH
        instance = new PageFlip(element, {
          width: pageWidth,
          height: Math.round(pageWidth / ratio),
          size: 'stretch',
          minWidth: SINGLE_PAGE_BELOW / 2,
          maxWidth: MAX_PAGE_WIDTH,
          minHeight: Math.round(150 / ratio),
          maxHeight: Math.round(MAX_PAGE_WIDTH / ratio),
          showCover: true,
          usePortrait: true,
          flippingTime: 900,
          maxShadowOpacity: 0.55,
          // Keep vertical page scrolling native while allowing PageFlip to receive
          // horizontal touch swipes and perform its real page-curl gesture.
          mobileScrollSupport: true,
          drawShadow: true,
          startPage: 0,
        })
        instance.loadFromImages(pageUrls)
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
        instance.on('changeOrientation', ({ data }) => setSingle(data === 'portrait'))
        setSingle(instance.getOrientation() === 'portrait')
        flip.current = instance
        setStatus('ready')
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
      element.remove()
      pageUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [book.key, book.pageCount, book.ratio, phone])

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
        <span aria-live="polite">{pageIndex === 0 ? 'Cover' : pageIndex >= lastPage ? 'Back cover' : single ? `Page ${pageIndex + 1}` : `Pages ${pageIndex + 1}–${Math.min(pageIndex + 2, book.pageCount)}`} · {book.pageCount}</span>
        <button type="button" onClick={() => flip.current?.flipNext()} disabled={!ready || pageIndex >= lastPage} aria-label="Next pages" className={arrow}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
