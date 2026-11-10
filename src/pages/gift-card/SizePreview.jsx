import { useEffect } from 'react'
import { X } from 'lucide-react'
import SmartImage from '../../shared/ui/SmartImage'
import { GIFT_CARD_SIZES } from './sizes'

// Both sheets are drawn to the same scale (1 px = 1.6 mm), so customers see how much bigger A3 is than A4.
const SCALE = 1.6
const px = (mm) => Math.round(mm / SCALE)

export default function SizePreview({ image, title, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [onClose])

  return <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/60 p-3 backdrop-blur-sm" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Size preview" onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="font-serif text-2xl">Size preview</h2><p className="mt-0.5 text-sm text-ink/60">Both sizes drawn to the same scale.</p></div>
        <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full border border-sand hover:bg-cream"><X size={17} /></button>
      </div>
      <div className="mt-5 flex items-end justify-center gap-5 overflow-x-auto rounded-xl bg-cream px-3 pb-4 pt-6 sm:gap-8">
        {GIFT_CARD_SIZES.slice().reverse().map((size) => <figure key={size.id} className="shrink-0 text-center">
          <div className="relative mx-auto" style={{ width: px(size.widthMm), height: px(size.heightMm) }}>
            <div className="grid size-full place-items-center rounded-sm border-2 border-brand/60 bg-white font-serif text-3xl text-brand shadow-md">{size.label}</div>
            <span className="absolute -top-5 left-0 right-0 text-[11px] font-medium text-ink/60">{size.cm.split(' × ')[0]} cm</span>
            <span className="absolute -right-3 top-1/2 origin-center -translate-y-1/2 translate-x-full text-[11px] font-medium text-ink/60 [writing-mode:vertical-rl]">{size.cm.split(' × ')[1].replace(' cm', '')} cm</span>
          </div>
          <figcaption className="mt-3 pr-5 text-sm"><strong className="block">{size.label}</strong><span className="text-ink/60">{size.cm}</span><span className="block text-xs text-ink/45">{size.inch}</span></figcaption>
        </figure>)}
      </div>
      {image && <div className="mt-4 overflow-hidden rounded-xl border border-sand"><SmartImage src={image} alt={`${title || 'Gift card'} size reference`} className="w-full object-contain" /></div>}
      <p className="mt-4 text-xs leading-5 text-ink/55">A4 is about the size of a school notebook page. A3 is twice as big, the size of two A4 sheets side by side.</p>
    </div>
  </div>
}
