// The order in progress. sessionStorage keeps it across a refresh (never across a closed tab),
// so moving Back and Continue between steps never loses what the customer typed.
const KEY = 'pb:order-draft'

export const emptyDelivery = { recipient: '', phone: '', address: '', city: '', location: '', date: '' }
export const emptyContact = { name: '', phone: '', instagram: '', email: '', note: '' }

export const freshDraft = (magazineId, size) => ({
  magazineId,
  reached: 1,
  picks: size ? { [size.format]: { sizeId: size.id, qty: 1 } } : {},
  addons: [],
  addonDetails: {},
  customs: {},
  photos: {},
  delivery: { ...emptyDelivery },
  contact: { ...emptyContact },
})

export const orderDraft = {
  get(magazineId) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY))
      return saved && saved.magazineId === magazineId ? saved : null
    } catch {
      return null
    }
  },
  set(value) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(value))
    } catch {
      // the flow still works in memory if storage is blocked
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // nothing to clear
    }
  },
}
