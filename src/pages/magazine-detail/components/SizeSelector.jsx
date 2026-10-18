import { useState } from 'react'
import { formatPrice } from '../../../shared/utils/format'

// Pick A4 or A5 first, then the number of pages. Only sizes that have a price are listed.
export default function SizeSelector({ sizes, formats, value, onChange }) {
  const active = sizes.find((s) => s.id === value) ?? sizes[0]
  const available = formats.filter((f) => sizes.some((s) => s.format === f.id))
  const [format, setFormat] = useState(active.format)
  const shown = sizes.filter((s) => s.format === format)

  const chooseFormat = (id) => {
    setFormat(id)
    // Keep the same page count when the other size has it, otherwise its first option
    const next = sizes.find((s) => s.format === id && s.pages === active.pages) ?? sizes.find((s) => s.format === id)
    if (next) onChange(next.id)
  }

  return (
    <div>
      {available.length > 1 && (
        <div role="radiogroup" aria-label="Magazine size" className="mx-auto mb-4 grid max-w-sm grid-cols-2 gap-2 rounded-full bg-sand p-1">
          {available.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={f.id === format}
              onClick={() => chooseFormat(f.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                f.id === format ? 'bg-brand text-white shadow' : 'text-ink/70 hover:text-ink'
              }`}
            >
              {f.id}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((s) => {
          const on = s.id === active.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              aria-pressed={on}
              className={`relative rounded-xl border bg-white px-3 py-4 text-center ${on ? 'border-2 border-brand bg-cream' : 'border-sand'}`}
            >
              {s.tag && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-brand">
                  ✦ {s.tag} ✦
                </span>
              )}
              <p className="text-sm font-semibold">{s.pages} Pages</p>
              {s.photos && <p className="mt-1 text-xs text-ink/50">{s.photos} Photos</p>}
              <p className="mt-2 font-bold text-warm">{formatPrice(s.price)}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
