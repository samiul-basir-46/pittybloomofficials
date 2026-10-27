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

const songBookText = (item) => {
  const pages = Number(item.meta?.pages ?? item.details?.find((detail) => /^pages$/i.test(detail.label))?.value?.match?.(/\d+/)?.[0])
  return `${item.name}${pages ? ` (${pages}p)` : ''}${item.qty > 1 ? ` x${item.qty}` : ''}`
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
  order.items.filter((i) => i.kind !== 'magazine').forEach((i) => parts.push(i.kind === 'song-book' ? songBookText(i) : i.qty > 1 ? `${i.name} x${i.qty}` : i.name))
  return parts.join(' ,, ') || 'Custom Order'
}

// "🎂 Birthday" → "birthday". Several copies with different occasions: "birthday | couple".
export function categoryText(order) {
  const found = order.items
    .flatMap((i) => i.kind === 'song-book'
      ? [i.details?.find((d) => /^category$/i.test(d.label))?.value ?? '']
      : i.kind === 'magazine'
        ? [i.details?.find((d) => d.label === 'Occasion')?.value ?? '']
        : [])
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

const productSection = (item) => {
  const name = `${item.name ?? ''} ${item.optionLabel ?? ''}`.toLowerCase()
  if (/mini.*mag|mag.*mini/.test(name)) return 'Mini Magazine'
  if (item.kind === 'magazine') return 'Magazine'
  if (item.kind === 'song-book') return 'Song Book'
  if (/polaroid/.test(name)) return 'Polaroid'
  if (/frame/.test(name)) return 'Frame'
  if (/song\s*book/.test(name)) return 'Song Book'
  if (/sticker/.test(name)) return 'Sticker'
  return item.name || 'Other'
}

const detailValue = (item, pattern) => item.details?.find((row) => pattern.test(row.label))?.value?.trim() ?? ''
const titleCase = (text) => text ? text[0].toLocaleUpperCase() + text.slice(1) : ''

function magazineText(items) {
  const variants = new Map()
  for (const item of items) {
    const label = item.optionLabel ?? ''
    const format = item.meta?.format ?? label.match(/\bA[45]\b/)?.[0] ?? 'A4'
    const pages = (item.meta?.pages ?? Number(label.match(/(\d+)\s*Pages?/i)?.[1])) || ''
    const key = `${format}-${pages}`
    const current = variants.get(key) ?? { format, pages, qty: 0 }
    current.qty += Number(item.qty) || 1
    variants.set(key, current)
  }
  return [...variants.values()].map((variant) => `${variant.format}(${variant.qty}pcs${variant.pages ? `, ${variant.pages}p` : ''})`).join(' + ')
}

function orderLine(order, section, items, sectionCount, settings, now) {
  const customer = order.customer ?? {}
  const phone = customer.phone || customer.deliveryPhone || order.customerPhone || 'N/A'
  const instagram = (customer.instagram ?? '').trim().replace(/^@+/, '') || 'no_ig'
  const magazine = section === 'Magazine'
  const products = magazine
    ? magazineText(items)
    : items.map((item) => item.kind === 'song-book' ? songBookText(item) : `${item.name}${Number(item.qty) > 1 ? ` (${item.qty}pcs)` : ''}`).join(' + ')
  const occasions = magazine ? [...new Set(items.map((item) => detailValue(item, /^occasion$/i)).filter(Boolean).map((value) => titleCase(value.replace(/^[^\p{L}\p{N}]+/u, '').trim())))].join(' | ') : ''
  const personal = magazine ? [...new Set(items.flatMap((item) => (item.details ?? []).filter((row) => !/^occasion$/i.test(row.label) && !/note|age|date/i.test(row.label)).map((row) => row.value?.trim()).filter(Boolean)))].join(' , ') : ''
  const emoji = magazine ? items.map((item) => detailValue(item, /^occasion$/i).match(/^\p{Extended_Pictographic}/u)?.[0] ?? '').find(Boolean) ?? '' : ''
  const personalization = personal ? ` [${emoji ? `${emoji} ` : ''}${personal}]` : ''
  const itemSubtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0)
  const rush = Number(order.rushCharge) || 0
  const amount = sectionCount === 1 ? Math.max(0, (Number(order.total) || itemSubtotal) - rush) : itemSubtotal
  const rushText = rush > 0 ? ` + urgent ${rush}tk` : ''
  const date = deliveryDateOf(order)
  const need = date ? ` - need ${needDate(date)}` : ''
  const city = cityText(order)
  return `${phone} (${instagram}) - ${[occasions, `${products}${personalization}`].filter(Boolean).join(' - ')} - ${amount}tk${rushText}${need} - ${city}`
}

export function groupedOrderSummaries(orders, settings, now = new Date()) {
  const sections = new Map()
  for (const order of orders) {
    const groups = new Map()
    for (const item of order.items ?? []) {
      const name = productSection(item)
      const items = groups.get(name) ?? []
      items.push(item)
      groups.set(name, items)
    }
    for (const [name, items] of groups) {
      const rows = sections.get(name) ?? []
      rows.push(orderLine(order, name, items, groups.size, settings, now))
      sections.set(name, rows)
    }
  }
  const preferred = ['Magazine', 'Mini Magazine', 'Polaroid', 'Frame', 'Song Book', 'Sticker']
  const names = [...sections.keys()].sort((a, b) => {
    const ai = preferred.indexOf(a)
    const bi = preferred.indexOf(b)
    return (ai < 0 ? preferred.length : ai) - (bi < 0 ? preferred.length : bi) || a.localeCompare(b)
  })
  return names.map((name) => `-------------${name}----------------\n\n${sections.get(name).join('\n\n')}`).join('\n\n')
}
