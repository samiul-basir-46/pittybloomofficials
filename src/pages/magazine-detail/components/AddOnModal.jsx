import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Check, X } from 'lucide-react'
import Button from '../../../shared/ui/Button'
import SmartImage from '../../../shared/ui/SmartImage'
import useAsync from '../../../shared/hooks/useAsync'
import { getActiveAddons } from '../../../shared/services/contentService'
import { formatPrice } from '../../../shared/utils/format'

// Buy Now popup: shows the chosen magazine, then optional add-on products managed in Admin → Add-on Products.
// Continuing with nothing selected is always allowed.
export default function AddOnModal({ magazine, size, initial = [], onClose, onContinue }) {
  const { data, loading, error, reload } = useAsync(getActiveAddons)
  const [picked, setPicked] = useState(() => Object.fromEntries(initial.map((a) => [a.id, a.qty])))
  const addons = data ?? []

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Only add-ons that still exist and are active count (Admin may have changed them since the last visit).
  const selected = useMemo(
    () => addons.filter((a) => picked[a.id]).map((a) => ({ id: a.id, qty: picked[a.id] })),
    [addons, picked],
  )
  const total = size.price + addons.reduce((sum, a) => sum + (picked[a.id] ? a.price * picked[a.id] : 0), 0)

  const toggle = (id) =>
    setPicked((p) => {
      const next = { ...p }
      if (next[id]) delete next[id]
      else next[id] = 1
      return next
    })

  // Rendered on document.body so no parent (transforms, overflow) can ever shift it off the screen.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose add-ons"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl motion-safe:animate-page-in sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-sand px-5 py-4 sm:px-7">
          <div>
            <h2 className="font-serif text-2xl">Almost there</h2>
            <p className="text-sm text-ink/60">Add something extra to your order (optional)</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-sand">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="flex items-center gap-4 rounded-2xl border border-sand bg-cream p-3 sm:p-4">
            <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-sand sm:size-24">
              <SmartImage src={magazine.image} alt={magazine.title} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">Your magazine</p>
              <p className="truncate text-lg font-bold">{magazine.title}</p>
              <p className="text-sm text-ink/60">
                {size.pages} Pages · {size.photos} Photos
              </p>
            </div>
            <p className="shrink-0 text-lg font-extrabold">{formatPrice(size.price)}</p>
          </div>

          <h3 className="mb-4 mt-7 font-semibold">Add-on products</h3>

          {loading && <p className="py-10 text-center text-ink/60">Loading add-ons…</p>}

          {error && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <AlertCircle className="text-red-500" />
              <p className="text-sm text-ink/70">Could not load add-ons. You can still continue without them.</p>
              <Button size="sm" variant="outline" onClick={reload}>
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && addons.length === 0 && (
            <p className="rounded-2xl border border-dashed border-sand py-10 text-center text-sm text-ink/50">
              No add-ons available right now. Just press Continue.
            </p>
          )}

          {addons.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {addons.map((a) => {
                const on = Boolean(picked[a.id])
                return (
                  <li
                    key={a.id}
                    className={`relative overflow-hidden rounded-2xl border-2 bg-white transition ${
                      on ? 'border-brand shadow-lg' : 'border-sand hover:border-brand/40'
                    }`}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(a.id)}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-square overflow-hidden bg-sand">
                        <SmartImage src={a.image} alt={a.name} placeholder="600x600" />
                        <span
                          className={`absolute right-2 top-2 grid size-7 place-items-center rounded-full border-2 transition ${
                            on ? 'border-brand bg-brand text-white' : 'border-white bg-white/70 text-transparent'
                          }`}
                        >
                          <Check size={16} />
                        </span>
                      </div>
                      <div className={`px-3 py-3 text-center ${on ? 'bg-cream' : ''}`}>
                        <p className="truncate text-sm font-semibold">{a.name}</p>
                        {a.price > 0 && <p className="mt-0.5 text-sm font-bold text-warm">{formatPrice(a.price)}</p>}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-sand bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs text-ink/50">
              {selected.length ? `${selected.length} add-on${selected.length > 1 ? 's' : ''} selected` : 'No add-ons'}
            </p>
            <p className="text-xl font-extrabold">{formatPrice(total)}</p>
          </div>
          <Button className="min-w-40 gap-2 shadow-lg" onClick={() => onContinue(selected)}>
            Continue
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
