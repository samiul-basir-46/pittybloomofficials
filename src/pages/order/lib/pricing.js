// Pure price and delivery-date rules for the magazine order. No React in here, so it is easy to test.

const pad = (n) => String(n).padStart(2, '0')
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

// Dates travel as 'YYYY-MM-DD' strings so time zones can never shift a day.
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const dayNumber = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}
export const daysBetween = (fromIso, toIso) => dayNumber(toIso) - dayNumber(fromIso)

// The day an order counts from: today, or tomorrow once the cut-off hour has passed.
export const orderingDay = (now = new Date(), cutoffHour = 18) =>
  toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + (now.getHours() >= num(cutoffHour) ? 1 : 0)))

// "1 | 100" per line → [{ days: 1, charge: 100 }]
export const parseRushRules = (text = '') =>
  text
    .split('\n')
    .map((line) => {
      const [days, charge] = line.split('|').map((s) => Number(s.trim()))
      return { days, charge }
    })
    .filter((r) => Number.isInteger(r.days) && r.days >= 1 && Number.isFinite(r.charge) && r.charge >= 0)
    .sort((a, b) => a.days - b.days)

// 'inside' (Inside Dhaka) may order for tomorrow; 'outside' needs a longer lead time.
export const earliestDays = (location, settings) =>
  location === 'outside' ? Math.max(1, num(settings.outsideMinDays) || 1) : 1

export const checkDate = (iso, location, settings, now = new Date()) => {
  const ahead = daysBetween(orderingDay(now, settings.cutoffHour), iso)
  if (ahead < earliestDays(location, settings)) return { allowed: false, ahead, rush: 0 }
  const rule = location === 'inside' ? parseRushRules(settings.rushRules).find((r) => r.days === ahead) : null
  return { allowed: true, ahead, rush: rule ? rule.charge : 0 }
}

export const deliveryCharge = (location, settings) =>
  location === 'inside' ? num(settings.insideDhakaCharge) : location === 'outside' ? num(settings.outsideDhakaCharge) : 0

// copies: [{ size }]   addons: [{ price, qty }]
export function calcTotals({ copies, addons = [], location = '', date = '', settings, now = new Date() }) {
  const magazineTotal = copies.reduce((sum, c) => sum + num(c.size.price), 0)
  const savings = copies.reduce((sum, c) => sum + Math.max(0, num(c.size.mrp) - num(c.size.price)), 0)
  const addonTotal = addons.reduce((sum, a) => sum + num(a.price) * (a.qty || 1), 0)
  const delivery = deliveryCharge(location, settings)
  const dateInfo = location && date ? checkDate(date, location, settings, now) : null
  const rush = dateInfo?.allowed ? dateInfo.rush : 0
  return {
    magazineTotal,
    savings,
    addonTotal,
    deliveryCharge: delivery,
    rushCharge: rush,
    rushDays: dateInfo?.allowed && rush > 0 ? dateInfo.ahead : 0,
    total: magazineTotal + addonTotal + delivery + rush,
  }
}

// "16–22" → { min: 16, max: 22 }. Returns null when no range is set.
export const parseRange = (text = '') => {
  const [min, max = min] = String(text)
    .split(/[–—-]/)
    .map((s) => parseInt(s.trim(), 10))
  return Number.isFinite(min) ? { min, max: Number.isFinite(max) ? max : min } : null
}

// "Inside Dhaka: 1 day is +৳100, 2 days is +৳50 …" built from the live settings, so it never goes out of date.
export const rushSentence = (settings, formatPrice) => {
  const rules = parseRushRules(settings.rushRules)
  if (!rules.length) return ''
  const parts = rules.map((r) => `${r.days} day${r.days > 1 ? 's' : ''} is +${formatPrice(r.charge)}`)
  const hour = num(settings.cutoffHour)
  const cutoff =
    hour > 0 && hour < 24
      ? ` (Orders placed after ${hour % 12 || 12}:00 ${hour >= 12 ? 'PM' : 'AM'} count from the next day).`
      : '.'
  return `Inside Dhaka: ${parts.join(', ')}${cutoff}`
}

// Written out by hand so the text is identical in every browser and language setting.
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const shortDate = (iso) => {
  const d = fromISO(iso)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}
export const longDate = (iso) => `${shortDate(iso)} ${fromISO(iso).getFullYear()}`
