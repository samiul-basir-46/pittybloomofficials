const partsInDhaka = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(({ type, value }) => [type, value]),
)

export const dhakaToday = (date = new Date()) => {
  const parts = partsInDhaka(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export const dhakaHour = (date = new Date()) => Number(partsInDhaka(date).hour)

export const dateOffsetFromDhaka = (isoDate, now = new Date()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || '')) return NaN
  const [year, month, day] = isoDate.split('-').map(Number)
  const chosen = new Date(Date.UTC(year, month - 1, day))
  if (chosen.getUTCFullYear() !== year || chosen.getUTCMonth() !== month - 1 || chosen.getUTCDate() !== day) return NaN
  const [todayYear, todayMonth, todayDay] = dhakaToday(now).split('-').map(Number)
  return Math.round((chosen.getTime() - Date.UTC(todayYear, todayMonth - 1, todayDay)) / 86400000)
}

export const minimumDeliveryOffset = ({ area, now = new Date() }) => {
  if (area !== 'inside' && area !== 'outside') return NaN
  const afterCutoff = dhakaHour(now) >= 18
  if (area === 'outside') return afterCutoff ? 3 : 2
  return afterCutoff ? 2 : 1
}

export const minimumDeliveryDate = (options) => {
  const [year, month, day] = dhakaToday(options.now).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + minimumDeliveryOffset(options)))
  return date.toISOString().slice(0, 10)
}

export const expeditedSurcharge = ({ date, area, hasRushProducts, now = new Date() }) => {
  if (!hasRushProducts) return 0
  const days = dateOffsetFromDhaka(date, now)
  const minimum = minimumDeliveryOffset({ area, now })
  if (!Number.isFinite(minimum) || days < minimum) return null
  const eligibleDays = days - minimum
  return eligibleDays === 0 ? 100 : eligibleDays === 1 ? 50 : 0
}

export const deliveryFee = (area) => area === 'inside' ? 60 : area === 'outside' ? 110 : 0

export const validBangladeshPhone = (value = '') => /^(?:\+?88)?01[3-9]\d{8}$/.test(String(value).replace(/[\s()-]/g, ''))

export const validUpload = (file, maxSize = 10 * 1024 * 1024) =>
  ['image/jpeg', 'image/png', 'image/webp'].includes(file?.type) && file.size > 0 && file.size <= maxSize
