import { useEffect, useState } from 'react'
import SmartImage from '../ui/SmartImage'

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function HeroSlider({ images, interval = 4500 }) {
  const [index, setIndex] = useState(0)
  const count = images.length
  const current = count ? index % count : 0

  useEffect(() => {
    if (count < 2 || reduceMotion) return
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), interval)
    return () => clearTimeout(id)
  }, [index, count, interval])

  return (
    <div className="absolute inset-0">
      {images.map((src, i) => (
        <div
          key={`${i}-${src}`}
          className={`absolute inset-0 transition-all duration-[1400ms] ease-out ${
            i === current ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
          }`}
        >
          <SmartImage src={src} alt={`Hero image ${i + 1}`} placeholder="1600x900" />
        </div>
      ))}
      <div className="absolute inset-0 bg-linear-to-b from-brand/60 via-brand/35 to-brand/75" />
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2.5">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`Show image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === current ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
