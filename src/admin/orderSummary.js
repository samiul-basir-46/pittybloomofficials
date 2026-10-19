import { ACTIVE_STATUSES, compareByDelivery, deliveryDateOf, getUrgency, locationOf, needDate } from '../shared/utils/urgency'

// One line per order, for the production team:
//   wp number(ig id) - products - category - price - urgent (need 20 October) - city
//   01712345678 (sarah_a) - A4(2pcs, 8p) ,, Gift Box - birthday | couple - 1557tk - urgent (need 20 October) - Dhaka

const magazineOf = (item) => {
  const label = item.optionLabel ?? ''
  const format = item.meta?.format ?? label.match(/\bA[45]\b/)?.[0] ?? 'A4'
  const found = label.match(/(\d+)\s*Pages?/i)
  const pages = item.meta?.pages ?? (found ? Number(found[1]) : '')
  return { format, pages }
}

export function productsText(order) {
  const groups = []
  order.items
    .filter((i) => i.kind === 'magazine')
    .forEach((item) => {
      const { format, pages } = magazineOf(item)
      const key = `${format}-${pages}`
      const found = groups.find((g) => g.key === key)
      if (found) found.count += item.qty
      else groups.push({ key, format, pages, count: item.qty })
    })
  const parts = groups.map((g) => `${g.format}(${g.count}pcs${g.pages ? `, ${g.pages}p` : ''})`)
  order.items.filter((i) => i.kind !== 'magazine').forEach((i) => parts.push(i.qty > 1 ? `${i.name} x${i.qty}` : i.name))
  return parts.join(' ,, ') || 'Custom Order'
}

// "🎂 Birthday" → "birthday". Several copies with different occasions: "birthday | couple".
export function categoryText(order) {
  const found = order.items
    .filter((i) => i.kind === 'magazine')
    .map((i) => i.details?.find((d) => d.label === 'Occasion')?.value ?? '')
    .map((v) => v.replace(/^[^\p{L}\p{N}]+/u, '').trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(found)].join(' | ') || 'personal'
}

export function cityText(order) {
  const city = (order.deliveryInfo?.city ?? '').trim()
  if (city) return city
  const last = (order.customer?.address ?? '').split(',').pop().trim()
  return last || (locationOf(order) === 'outside' ? 'Outside Dhaka' : 'Dhaka')
}

export function formatOrderSummary(order, settings, now = new Date()) {
  const c = order.customer ?? {}
  const ig = (c.instagram ?? '').trim().replace(/^@+/, '') || 'no_ig'
  const { level } = getUrgency(order, settings, now)
  const date = deliveryDateOf(order)
  const word = level === 'overdue' || level === 'urgent' ? 'urgent' : 'standard'
  const urgency = date ? `${word} (need ${needDate(date)})` : word
  return `${c.phone || 'N/A'} (${ig}) - ${productsText(order)} - ${categoryText(order)} - ${order.total}tk - ${urgency} - ${cityText(order)}`
}

// scope: 'urgent' (overdue + urgent) | 'standard' | 'active' (every open order)
export function summariesFor(orders, scope, settings, now = new Date()) {
  const wanted = {
    urgent: (l) => l === 'overdue' || l === 'urgent',
    standard: (l) => l === 'standard',
    active: (l) => l !== 'none',
  }[scope]
  return orders
    .filter((o) => ACTIVE_STATUSES.includes(o.status) && wanted(getUrgency(o, settings, now).level))
    .sort((a, b) => compareByDelivery(a, b, settings, now))
    .map((order) => ({ order, text: formatOrderSummary(order, settings, now) }))
}
