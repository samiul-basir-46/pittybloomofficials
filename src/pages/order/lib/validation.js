import { checkDate } from './pricing'

export const cleanPhone = (v = '') => v.replace(/[\s-]/g, '')
export const isPhone = (v) => /^(?:\+?88)?01[3-9]\d{8}$/.test(cleanPhone(v))
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const blank = (v) => !String(v ?? '').trim()

export const PHONE_MESSAGE = 'Enter a valid mobile number, like 01712345678.'

// WhatsApp numbers: a Bangladesh mobile number, or any international number written with a + and country code.
export const isWhatsApp = (v) => isPhone(v) || /^\+[1-9]\d{7,14}$/.test(cleanPhone(v))
export const WHATSAPP_MESSAGE = 'Enter a valid WhatsApp number, like 01712345678, or +14155550123 for a number outside Bangladesh.'

// Instagram: the username only (letters, numbers, dots and underscores, up to 30 characters), never a profile link.
const stripAt = (v = '') => String(v).trim().replace(/^@+/, '')
export const cleanInstagram = (v) => (stripAt(v) ? `@${stripAt(v)}` : '')
const looksLikeLink = (v) => /[/:]|instagram\.com/i.test(v)
const isInstagram = (v) => /^[A-Za-z0-9._]{1,30}$/.test(stripAt(v))

// Every validator returns { fieldKey: 'message' }. An empty object means the step is fine.

export function validateMagazine({ picks, formats }) {
  const errors = {}
  const chosen = formats.filter((f) => picks[f.id])
  if (chosen.length === 0) errors.picks = 'Please choose at least one magazine size.'
  chosen.forEach((f) => {
    if (!picks[f.id].sizeId) errors[`pages.${f.id}`] = 'Please choose the number of pages.'
  })
  return errors
}

export function validateCustomize({ copies, customs, occasions }) {
  const errors = {}
  if (occasions.length === 0) return errors // nothing to ask until occasions are set up in Admin
  copies.forEach((c) => {
    const custom = customs[c.key]
    const occasion = occasions.find((o) => o.id === custom?.occasionId)
    if (!occasion) {
      errors[`${c.key}.occasion`] = 'Please choose an occasion for this magazine.'
      return
    }
    occasion.fields.forEach((f) => {
      const value = custom.values?.[f.id] ?? ''
      if (f.required && blank(value)) errors[`${c.key}.${f.id}`] = 'This field is required.'
    })
  })
  return errors
}

export function validateDelivery({ delivery, settings, now }) {
  const errors = {}
  if (blank(delivery.phone)) errors.phone = 'Please enter a contact number for delivery.'
  else if (!isPhone(delivery.phone)) errors.phone = PHONE_MESSAGE
  if (blank(delivery.address)) errors.address = 'Please enter the full address.'
  if (blank(delivery.city)) errors.city = 'Please enter the city or district.'
  if (!delivery.location) errors.location = 'Please choose Inside Dhaka or Outside Dhaka.'
  if (!delivery.date) errors.date = 'Please choose the date you need the magazine.'
  else if (delivery.location && !checkDate(delivery.date, delivery.location, settings, now).allowed)
    errors.date = 'This date is no longer available. Please pick another date.'
  return errors
}

export function validateContact({ contact }) {
  const errors = {}
  if (blank(contact.name)) errors.name = 'Please enter your name.'
  if (blank(contact.phone)) errors.contactPhone = 'Please enter your WhatsApp number.'
  else if (!isWhatsApp(contact.phone)) errors.contactPhone = WHATSAPP_MESSAGE
  const instagram = contact.instagram ?? ''
  if (blank(instagram) || !stripAt(instagram)) errors.instagram = 'Please enter your Instagram username.'
  else if (looksLikeLink(instagram)) errors.instagram = 'Please enter your username, like @yourname, not a link.'
  else if (!isInstagram(instagram)) errors.instagram = 'This does not look like an Instagram username. Use letters, numbers, dots and underscores only.'
  if (!blank(contact.email) && !isEmail(contact.email)) errors.email = 'This email address does not look right.'
  return errors
}
