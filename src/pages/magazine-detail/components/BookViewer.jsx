import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageFlip } from 'page-flip'
import { bookStore } from '../../../shared/services/bookStore'

const MIN_PAGE_WIDTH = 120
const MAX_PAGE_WIDTH = 520
const SLIDE = 'transform 850ms cubic-bezier(0.45, 0, 0.2, 1)'
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
    const el = document.createElement('div')
    el.style.width = '100%'
    el.style.margin = '0 auto'
    el.style.mixBlendMode = 'multiply'
    host.current.appendChild(el)

    // The cover and back cover sit on the outside half of a full-width spread.
    // Center only those single pages; interior pages stay edge-to-edge.
    place.current = (where, animate = true) => {
      const width = host.current?.clientWidth ?? 0
      const halfPage = Math.min(width / 2, MAX_PAGE_WIDTH) / 2
      const x = where === 'cover' ? -halfPage : where === 'back' ? halfPage : 0
      el.style.transition = animate ? SLIDE : 'none'
      el.style.transform = `translateX(${x}px)`
    }

    const setFrameHeight = () => {
      const width = host.current?.clientWidth ?? 0
      if (!width) return
      const height = Math.round(width / 2 / (book.ratio || 1 / 1.4142))
      host.current.style.height = `${height}px`
      el.style.height = `${height}px`
    }
    const onResize = () => {
      setFrameHeight()
      place.current?.(whereFor(current.current, lastIndex), false)
    }
    setStatus('loading')
    setFrameHeight()
    window.addEventListener('resize', onResize)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize)
    observer?.observe(host.current)

    bookStore.get(book.key, book.pageCount)
      .then((blobs) => {
        if (cancelled) return
        if (!Array.isArray(blobs) || blobs.length !== book.pageCount) throw new Error('Book pages not found')
        urls = blobs.map((blob) => URL.createObjectURL(blob))
        const ratio = book.ratio || 1 / 1.4142
        const pageWidth = Math.min(400, (host.current?.clientWidth ?? 800) / 2)
        pageFlip = new PageFlip(el, {
          width: pageWidth,
          height: Math.round(pageWidth / ratio),
          startPage: current.current,
          size: 'stretch',
          minWidth: MIN_PAGE_WIDTH,
          maxWidth: MAX_PAGE_WIDTH,
          minHeight: Math.round(MIN_PAGE_WIDTH / ratio),
          maxHeight: Math.round(MAX_PAGE_WIDTH / ratio),
          showCover: true,
          usePortrait: false,
          flippingTime: 900,
          maxShadowOpacity: 0.5,
          mobileScrollSupport: false,
        })
        pageFlip.on('flip', (event) => {
          current.current = event.data
          setIndex(event.data)
          place.current?.(whereFor(event.data, lastIndex))
        })
        pageFlip.on('changeOrientation', onResize)
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
      window.removeEventListener('resize', onResize)
      observer?.disconnect()
      try { pageFlip?.destroy() } catch { /* already torn down */ }
      el.remove()
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [book.key, book.pageCount, book.ratio, lastIndex])

  const next = () => {
    const indexNow = current.current
    if (indexNow === 0) place.current?.('open')
    else if (indexNow >= lastIndex - 2) place.current?.('back')
    flip.current?.flipNext()
  }
  const prev = () => {
    const indexNow = current.current
    if (indexNow >= lastIndex) place.current?.('open')
    else if (indexNow <= 2) place.current?.('cover')
    flip.current?.flipPrev()
  }

  if (status === 'error') return fallback
  const ready = status === 'ready'
  const arrow = 'grid size-10 place-items-center rounded-full border border-brand text-brand disabled:opacity-30'

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="relative w-full overflow-x-clip bg-linear-to-b from-white to-cream pb-8 pt-20 sm:pt-10">
        <div ref={host} role="img" aria-label={`${title} book preview`} className="mx-auto w-full max-w-[1040px]" />
        {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-ink/50">Loading preview…</p>}
      </div>
      <div className="mt-4 flex items-center gap-5 text-xs uppercase tracking-widest text-ink/60 sm:mt-6">
        <button type="button" onClick={prev} disabled={!ready || index <= 0} aria-label="Previous page" className={arrow}><ChevronLeft size={18} /></button>
        Click to flip
        <button type="button" onClick={next} disabled={!ready || index >= lastIndex} aria-label="Next page" className={arrow}><ChevronRight size={18} /></button>
      </div>
    </div>
  )
}
