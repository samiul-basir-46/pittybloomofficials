import { Check } from 'lucide-react'

// Progress indicator. Steps you have already reached can be clicked to jump back or forward.
export default function Stepper({ steps, current, reached, onGo }) {
  return (
    <nav aria-label="Order progress">
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-brand">
            Step {current} of {steps.length}
          </p>
          <p className="text-sm text-ink/70">{steps[current - 1].label}</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current}>
          <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${(current / steps.length) * 100}%` }} />
        </div>
      </div>

      <ol className="hidden items-start sm:flex">
        {steps.map((s, i) => {
          const n = i + 1
          const done = n < current
          const here = n === current
          const open = n <= reached && !here
          return (
            <li key={s.id} className="flex flex-1 items-start last:flex-none">
              <button
                type="button"
                disabled={!open}
                onClick={() => onGo(n)}
                aria-current={here ? 'step' : undefined}
                className="group flex w-20 flex-col items-center gap-2 disabled:cursor-default"
              >
                <span
                  className={`grid size-9 place-items-center rounded-full text-sm font-bold transition ${
                    done || (open && n < reached)
                      ? 'bg-brand text-white'
                      : here
                        ? 'border-2 border-brand bg-white text-brand shadow'
                        : open
                          ? 'bg-sand text-brand'
                          : 'bg-sand text-ink/40'
                  }`}
                >
                  {done ? <Check size={16} /> : n}
                </span>
                <span className={`text-xs font-medium ${here ? 'text-brand' : 'text-ink/60'}`}>{s.label}</span>
              </button>
              {n < steps.length && <span className={`mt-[17px] h-0.5 flex-1 rounded ${done ? 'bg-brand' : 'bg-sand'}`} />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
