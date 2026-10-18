import { checkDate } from './pricing'

export const cleanPhone = (v = '') => v.replace(/[\s-]/g, '')
export const isPhone = (v) => /^(?:\+?88)?01[3-9]\d{8}$/.test(cleanPhone(v))
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const blank = (v) => !String(v ?? '').trim()

export const PHONE_MESSAGE = 'Enter a valid mobile number, like 01712345678.'

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
  if (blank(contact.phone)) errors.contactPhone = 'Please enter your phone number.'
  else if (!isPhone(contact.phone)) errors.contactPhone = PHONE_MESSAGE
  if (!blank(contact.email) && !isEmail(contact.email)) errors.email = 'This email address does not look right.'
  return errors
}
