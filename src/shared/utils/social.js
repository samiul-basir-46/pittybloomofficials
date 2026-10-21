export function whatsappNumber(value = '') {
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('880')) return digits
  if (digits.startsWith('0')) return `88${digits}`
  return digits
}
