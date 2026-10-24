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

const IMAGE_MIME_BY_EXTENSION = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jpe: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp',
  tif: 'image/tiff', tiff: 'image/tiff', heic: 'image/heic', heif: 'image/heif', avif: 'image/avif',
}
export const ORDER_IMAGE_TYPES = new Set(Object.values(IMAGE_MIME_BY_EXTENSION))
export const orderImageType = (file) => {
  const type = String(file?.type || '').toLowerCase().split(';')[0]
  if (ORDER_IMAGE_TYPES.has(type)) return type
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase()
  return Object.hasOwn(IMAGE_MIME_BY_EXTENSION, extension) ? IMAGE_MIME_BY_EXTENSION[extension] : ''
}
export const detectOrderImageType = async (file) => {
  let bytes
  try { bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer()) }
  catch { return orderImageType(file) }
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end))
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (ascii(0, 3) === 'GIF') return 'image/gif'
  if (ascii(0, 2) === 'BM') return 'image/bmp'
  if ((ascii(0, 2) === 'II' && bytes[2] === 42 && bytes[3] === 0) || (ascii(0, 2) === 'MM' && bytes[2] === 0 && bytes[3] === 42)) return 'image/tiff'
  if (ascii(4, 8) === 'ftyp') {
    const brands = [ascii(8, 12), ascii(16, 20), ascii(20, 24), ascii(24, 28), ascii(28, 32)]
    if (brands.some((brand) => ['avif', 'avis'].includes(brand))) return 'image/avif'
    if (brands.some((brand) => ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand))) return 'image/heic'
  }
  return orderImageType(file)
}
export const validUpload = (file, maxSize = 20 * 1024 * 1024) =>
  Boolean(orderImageType(file)) && file.size > 0 && file.size <= maxSize
