// Small pieces shared by the Orders list and the order detail page.
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
      const found = groups.find((g) => g.label === label)
      if (found) found.qty += i.qty
      else groups.push({ label, qty: i.qty })
    })
  const others = order.items.filter((i) => i.kind !== 'magazine').length
  const text = groups.map((g) => `${g.qty} × ${g.label}`).join(', ')
  return [text || 'No magazine', others ? `+ ${others} extra${others > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ')
}
