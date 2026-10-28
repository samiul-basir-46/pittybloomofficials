import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

export default function QtyStepper({ value, onChange, min = 1, max = 99, editable = false }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const commit = () => {
    const parsed = Number.parseInt(draft, 10)
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min
    setDraft(String(next))
    onChange(next)
  }
  const btn = 'grid size-9 place-items-center rounded-full transition-colors hover:bg-sand disabled:opacity-30 disabled:hover:bg-transparent'
  return (
    <div className="inline-flex items-center rounded-full border border-sand bg-white">
      <button type="button" aria-label="Decrease quantity" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus size={15} />
      </button>
      {editable ? <input aria-label="Quantity" type="text" inputMode="numeric" pattern="[0-9]*" value={draft} onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} className="w-12 bg-transparent text-center text-sm font-semibold outline-none" /> : <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{value}</span>}
      <button type="button" aria-label="Increase quantity" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus size={15} />
      </button>
    </div>
  )
}
