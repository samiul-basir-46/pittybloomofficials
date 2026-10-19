import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PartyPopper, X } from 'lucide-react'
import { inputClass } from './classes'
import { CopyButton, UrgencyPill } from './orderUi'
import { summariesFor } from './orderSummary'
import { getUrgency } from '../shared/utils/urgency'

const SCOPES = [
  { id: 'urgent', label: 'Urgent and overdue' },
  { id: 'standard', label: 'Standard' },
  { id: 'active', label: 'All open orders' },
]

// Production list: one line per order, copy one or all of them.
export default function SummaryDialog({ orders, settings, now, initialScope = 'urgent', onClose }) {
  const [scope, setScope] = useState(initialScope)
  const closeRef = useRef(null)
  const rows = useMemo(() => summariesFor(orders, scope, settings, now), [orders, scope, settings, now])

  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="summary-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-sand p-5 sm:p-6">
          <div>
            <h2 id="summary-title" className="font-serif text-2xl">
              Production summaries
            </h2>
            <p className="mt-1 text-sm text-ink/60">One line per order, ready to paste into your team chat.</p>
          </div>
          <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-sand">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand bg-cream/60 px-5 py-3 sm:px-6">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Show</span>
            <select className={`${inputClass} w-auto`} value={scope} onChange={(e) => setScope(e.target.value)}>
              {SCOPES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-ink/60" aria-live="polite">
            {rows.length} order{rows.length === 1 ? '' : 's'}
          </p>
          <CopyButton
            key={`${scope}-${rows.length}`}
            label={`Copy all (${rows.length})`}
            doneLabel={`Copied ${rows.length}`}
            getText={() => rows.map((r) => r.text).join('\n\n')}
            className={rows.length === 0 ? 'pointer-events-none opacity-40' : ''}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-ink/60">
              <PartyPopper className="mx-auto mb-3 text-brand" />
              <p className="font-semibold">{scope === 'urgent' ? 'Nothing urgent right now.' : 'No orders to show.'}</p>
              <p className="mt-1 text-sm">Urgent means needed within the next few days. You can change this in Order Settings.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map(({ order, text }) => (
                <li key={order.id} className="rounded-2xl border border-sand bg-white p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/orders/${encodeURIComponent(order.id)}`} onClick={onClose} className="text-sm font-bold hover:underline">
                        {order.id}
                      </Link>
                      <UrgencyPill urgency={getUrgency(order, settings, now)} />
                    </div>
                    <CopyButton variant="icon" label={`Copy summary of ${order.id}`} getText={() => text} />
                  </div>
                  <p className="rounded-xl bg-cream/70 p-3 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">{text}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-xs leading-5 text-ink/50">
            Format: <code>phone (instagram) - products - category - price - urgent or standard (need date) - city</code>. Different products are separated by <code> ,, </code>.
          </p>
        </div>
      </div>
    </div>
  )
}
