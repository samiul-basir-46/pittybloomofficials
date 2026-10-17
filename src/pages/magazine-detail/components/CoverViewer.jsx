import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SmartImage from '../../../shared/ui/SmartImage'

export default function CoverViewer({ images, title }) {
  const [index, setIndex] = useState(0)
  const go = (step) => setIndex((index + step + images.length) % images.length)

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full justify-center bg-linear-to-b from-white to-cream pb-8 pt-6 sm:pt-10">
        <div className="relative aspect-[37/52] w-[min(70%,370px)] shadow-[0_25px_40px_rgba(0,0,0,0.12)]">
          <span className="absolute -left-2 inset-y-0 w-2 bg-brand/30" />
          <SmartImage src={images[index]} alt={title} />
        </div>
      </div>
      <div className="mt-6 flex items-center gap-5 text-xs uppercase tracking-widest text-ink/60">
        <button onClick={() => go(-1)} aria-label="Previous" className="grid size-10 place-items-center rounded-full border border-brand text-brand">
          <ChevronLeft size={18} />
        </button>
        Click to flip
        <button onClick={() => go(1)} aria-label="Next" className="grid size-10 place-items-center rounded-full border border-brand text-brand">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
