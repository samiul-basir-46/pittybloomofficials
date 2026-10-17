import { Minus, Plus } from 'lucide-react'

export default function QtyStepper({ value, onChange, min = 1, max = 99 }) {
  const btn = 'grid size-9 place-items-center rounded-full transition-colors hover:bg-sand disabled:opacity-30 disabled:hover:bg-transparent'
  return (
    <div className="inline-flex items-center rounded-full border border-sand bg-white">
      <button type="button" aria-label="Decrease quantity" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus size={15} />
      </button>
      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label="Increase quantity" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus size={15} />
      </button>
    </div>
  )
}
