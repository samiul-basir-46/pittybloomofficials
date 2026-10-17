import { formatPrice } from '../../../shared/utils/format'

export default function SizeSelector({ sizes, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {sizes.map((s) => {
        const active = s.id === value
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`relative rounded-xl border bg-white px-3 py-4 text-center ${
              active ? 'border-2 border-brand bg-cream' : 'border-sand'
            }`}
          >
            {s.tag && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-brand">
                ✦ {s.tag} ✦
              </span>
            )}
            <p className="text-sm font-semibold">
              {s.pages} Pages · {s.sides} Sides
            </p>
            <p className="mt-1 text-xs text-ink/50">{s.photos} Photos</p>
            <p className="mt-2 font-bold text-warm">{formatPrice(s.price)}</p>
          </button>
        )
      })}
    </div>
  )
}
