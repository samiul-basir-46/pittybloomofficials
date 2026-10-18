import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS, fromISO, shortDate, toISO } from '../lib/pricing'
import { formatPrice } from '../../../shared/utils/format'

const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS_AHEAD = 12

// Month calendar. getInfo(iso) → { allowed, rush }: unavailable days are greyed out, rush days show their extra charge.
export default function Calendar({ value, onChange, getInfo, startISO, todayISO, disabled }) {
  const base = fromISO(startISO)
  const [view, setView] = useState(() => {
    const d = value ? fromISO(value) : base
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const first = new Date(view.getFullYear(), view.getMonth(), 1).getDay()
  const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const monthIndex = (d) => d.getFullYear() * 12 + d.getMonth()
  const canPrev = monthIndex(view) > monthIndex(base)
  const canNext = monthIndex(view) < monthIndex(base) + MONTHS_AHEAD
  const move = (by) => setView(new Date(view.getFullYear(), view.getMonth() + by, 1))
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
  const arrow = 'grid size-10 place-items-center rounded-full border border-sand transition hover:bg-sand disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className={`rounded-2xl border border-sand bg-cream/60 p-3 sm:p-4 ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Previous month" className={arrow} disabled={!canPrev} onClick={() => move(-1)}>
          <ChevronLeft size={18} />
        </button>
        <p className="font-semibold" aria-live="polite">
          {MONTHS[view.getMonth()]} {view.getFullYear()}
        </p>
        <button type="button" aria-label="Next month" className={arrow} disabled={!canNext} onClick={() => move(1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink/50">
        {WEEK.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <span key={`blank-${i}`} />
          const iso = toISO(new Date(view.getFullYear(), view.getMonth(), day))
          const info = getInfo(iso)
          const picked = iso === value
          const off = disabled || !info.allowed
          return (
            <button
              key={iso}
              type="button"
              disabled={off}
              aria-pressed={picked}
              aria-label={`${shortDate(iso)}${
                info.rush ? `, rush delivery plus ${formatPrice(info.rush)}` : ''
              }`}
              onClick={() => onChange(iso)}
              className={`flex h-12 flex-col items-center justify-center rounded-xl text-sm font-semibold transition sm:h-14 ${
                picked
                  ? 'bg-brand text-white shadow'
                  : off
                    ? 'cursor-not-allowed text-ink/25'
                    : 'border border-sand bg-white hover:border-brand'
              }`}
            >
              <span>{day}</span>
              {iso === todayISO && !picked ? (
                <span className="text-[9px] font-medium uppercase text-ink/40">Today</span>
              ) : info.allowed && info.rush > 0 ? (
                <span className={`text-[10px] font-medium ${picked ? 'text-white/85' : 'text-amber-700'}`}>+{formatPrice(info.rush)}</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
