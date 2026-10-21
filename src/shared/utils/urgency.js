import { MONTHS, daysBetween, toISO } from '../../pages/order/lib/pricing'

// Which orders still need work. Shipped, Delivered and Cancelled orders are no longer "urgent" for production.
export const ACTIVE_STATUSES = ['New', 'Confirmed', 'In production']

export const LEVELS = ['overdue', 'urgent', 'standard', 'none']

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// 'YYYY-MM-DD' the customer picked as "when do you need the magazine", or '' for orders without one (old cart orders).
export const deliveryDateOf = (order) => {
  const date = order?.deliveryInfo?.date ?? ''
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ''
}

export const locationOf = (order) => {
  const location = order?.deliveryInfo?.location ?? ''
  if (location === 'inside' || location === 'outside') return location
  const label = `${order?.deliveryInfo?.locationLabel ?? ''} ${order?.delivery ?? ''}`
  if (/outside\s+dhaka/i.test(label)) return 'outside'
  if (/inside\s+dhaka/i.test(label)) return 'inside'
  return location
}

// "19 October"
export const needDate = (iso) => {
  if (!iso) return ''
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}
// "Mon 19 Oct"
export const compactDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${DAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1].slice(0, 3)}`
}

/**
 * How soon an order is needed.
 *   level  'overdue'  the date has passed and the order is still open
 *          'urgent'   needed within 2 days Inside Dhaka or 3 days Outside Dhaka
 *          'standard' open order with more time left, or with no date
 *          'none'     nothing to do any more (Shipped, Delivered, Cancelled)
 */
export function getUrgency(order, _settings = {}, now = new Date()) {
  const date = deliveryDateOf(order)
  const base = { date, daysLeft: null, level: 'none', label: '', short: '' }
  if (!ACTIVE_STATUSES.includes(order?.status)) return { ...base, label: date ? compactDate(date) : '', short: date ? compactDate(date) : '' }
  if (!date) return { ...base, level: 'standard', label: 'No delivery date', short: 'No date' }

  const daysLeft = daysBetween(toISO(now), date)
  const window = locationOf(order) === 'outside' ? 3 : 2
  const when = daysLeft < 0 ? `Overdue by ${-daysLeft} day${daysLeft === -1 ? '' : 's'}` : daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`
  const level = daysLeft < 0 ? 'overdue' : daysLeft <= window ? 'urgent' : 'standard'
  return { ...base, level, daysLeft, label: when, short: when }
}

// Overdue → Urgent → Standard → finished. Inside a group: the earliest delivery date first, then the newest order.
export function compareByDelivery(a, b, settings, now) {
  const ua = getUrgency(a, settings, now)
  const ub = getUrgency(b, settings, now)
  const rank = LEVELS.indexOf(ua.level) - LEVELS.indexOf(ub.level)
  if (rank) return rank
  if (ua.level !== 'none' && ua.date !== ub.date) {
    if (!ua.date) return 1
    if (!ub.date) return -1
    return ua.date < ub.date ? -1 : 1
  }
  return String(b.createdAt).localeCompare(String(a.createdAt))
}
