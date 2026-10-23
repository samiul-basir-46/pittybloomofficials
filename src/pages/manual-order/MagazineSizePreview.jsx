import { useEffect, useRef } from 'react'
import { Heart, X } from 'lucide-react'

const sizes = [
  { name: 'A4', dimensions: '21 × 29.7 cm', sheet: 'size-preview-sheet--a4' },
  { name: 'A5', dimensions: '14.8 × 21 cm', sheet: 'size-preview-sheet--a5' },
]

export default function MagazineSizePreview({ onClose }) {
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-ink/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="magazine-size-preview-title"
        className="relative w-full max-w-2xl rounded-3xl border border-sand bg-[#FFFEFC] p-5 shadow-2xl sm:p-8"
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Close size preview"
          onClick={onClose}
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-ink/60 transition-colors hover:bg-cream hover:text-brand"
        >
          <X size={20} />
        </button>

        <div className="pr-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand/60">Magazine sizes</p>
          <h2 id="magazine-size-preview-title" className="mt-1 font-serif text-2xl font-semibold text-brand sm:text-3xl">Compare A4 and A5</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-ink/65">Both are portrait size. A4 gives your photos and stories more room; A5 is a smaller, hand-held keepsake.</p>
        </div>

        <div className="mt-7 flex min-h-[260px] items-end justify-center gap-5 rounded-2xl bg-[#F5F0ED] px-3 pt-5 sm:gap-10 sm:px-8">
          {sizes.map((size) => (
            <div key={size.name} className="flex flex-col items-center">
              <div className={`size-preview-sheet ${size.sheet}`}>
                <span className="size-preview-brand">PittyBloom</span>
                <div className="size-preview-art">
                  <span className="size-preview-sun" />
                  <span className="size-preview-heart"><Heart size={25} fill="currentColor" strokeWidth={1.4} /></span>
                  <span className="size-preview-hill size-preview-hill--back" />
                  <span className="size-preview-hill size-preview-hill--front" />
                </div>
                <span className="size-preview-caption">a little book of memories</span>
              </div>
              <p className="mt-3 text-sm font-bold text-brand">{size.name}</p>
              <p className="text-xs text-ink/60">{size.dimensions}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-ink/50">Shown at the same scale so you can compare the real page dimensions.</p>
        <button type="button" onClick={onClose} className="mt-6 min-h-11 w-full rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto">Done</button>
      </section>
    </div>
  )
}
