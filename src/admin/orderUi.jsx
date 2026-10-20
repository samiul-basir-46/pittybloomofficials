import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, Copy, Flame } from 'lucide-react'
import { compactDate } from '../shared/utils/urgency'
import { copyText } from './clipboard'

// Small pieces shared by the Orders list, the order page and the summary dialog.
export const STATUS_STYLE = {
  New: 'bg-blue-50 text-blue-700',
  Confirmed: 'bg-indigo-50 text-indigo-700',
  'In production': 'bg-amber-50 text-amber-700',
  Shipped: 'bg-purple-50 text-purple-700',
  Delivered: 'bg-green-50 text-green-700',
  Cancelled: 'bg-red-50 text-red-600',
}

export const when = (iso) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

export function StatusBadge({ status }) {
  return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status] ?? 'bg-sand'}`}>{status}</span>
}

// "2 × A4 Magazine · 8 Pages, 1 × A5 Magazine · 4 Pages + 2 extras"
export function orderSummary(order) {
  const groups = []
  order.items
    .filter((i) => i.kind === 'magazine')
    .forEach((i) => {
      const label = i.optionLabel || i.name
      const found = groups.find((g) => g.label === label && g.name === i.name)
      if (found) found.qty += i.qty
      else groups.push({ label, name: i.name, qty: i.qty })
    })
  const extras = order.items.filter((i) => i.kind === 'addon').map((i) => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`)
  const others = order.items.filter((i) => i.kind !== 'magazine' && i.kind !== 'addon').map((i) => i.name)
  const text = groups.map((g) => `${g.qty} × ${g.name} · ${g.label}`).join(', ')
  return [text || 'No magazine', extras.length ? `+ ${extras.join(', ')}` : '', others.length ? `+ ${others.join(', ')}` : ''].filter(Boolean).join(' ')
}

export const LEVEL_STYLE = {
  overdue: { pill: 'border-rose-200 bg-rose-50 text-rose-700', bar: 'border-l-rose-500', icon: AlertTriangle, title: 'Overdue' },
  urgent: { pill: 'border-amber-200 bg-amber-50 text-amber-800', bar: 'border-l-amber-400', icon: Flame, title: 'Urgent' },
  standard: { pill: 'border-sand bg-white text-ink/70', bar: 'border-l-sand', icon: CalendarDays, title: 'Standard' },
  none: { pill: 'border-transparent bg-transparent text-ink/50', bar: 'border-l-transparent', icon: CalendarDays, title: 'Finished' },
}

// "🔥 Tomorrow · Tue 20 Oct", "Overdue by 2 days · Sat 17 Oct", "In 6 days · Sun 25 Oct"
export function UrgencyPill({ urgency }) {
  const style = LEVEL_STYLE[urgency.level]
  const Icon = style.icon
  if (urgency.level === 'none' && !urgency.date) return null
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.pill}`}>
      {urgency.level !== 'none' && <Icon size={12} aria-hidden="true" />}
      {urgency.level === 'none' ? `Needed ${compactDate(urgency.date)}` : urgency.date ? `${urgency.short} · ${compactDate(urgency.date)}` : urgency.short}
    </span>
  )
}

// Copies text and says so ("Copied") for two seconds. variant 'icon' is a small square button for lists.
export function CopyButton({ getText, label = 'Copy summary', doneLabel = 'Copied', variant = 'button', className = '', onCopied }) {
  const [state, setState] = useState('idle') // idle | copied | failed
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const run = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const ok = await copyText(getText())
    setState(ok ? 'copied' : 'failed')
    if (ok) onCopied?.()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2000)
  }
  const text = state === 'copied' ? doneLabel : state === 'failed' ? 'Could not copy' : label
  const Icon = state === 'copied' ? Check : Copy
  if (variant === 'icon')
    return (
      <>
        <button
          type="button"
          onClick={run}
          aria-label={label}
          title={text}
          className={`grid size-10 shrink-0 place-items-center rounded-xl border transition ${
            state === 'copied' ? 'border-green-200 bg-green-50 text-green-700' : state === 'failed' ? 'border-red-200 bg-red-50 text-red-600' : 'border-sand text-brand hover:bg-sand'
          } ${className}`}
        >
          <Icon size={16} />
        </button>
        <span role="status" className="sr-only">
          {state === 'idle' ? '' : text}
        </span>
      </>
    )
  return (
    <>
      <button
        type="button"
        onClick={run}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
          state === 'copied' ? 'bg-green-600 text-white' : state === 'failed' ? 'bg-red-600 text-white' : 'bg-brand text-white hover:bg-brand-dark'
        } ${className}`}
      >
        <Icon size={15} /> {text}
      </button>
      <span role="status" className="sr-only">
        {state === 'idle' ? '' : text}
      </span>
    </>
  )
}
