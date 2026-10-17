// The Buy Now selection (magazine + add-ons) while the customer moves popup → details page → cart.
// sessionStorage keeps it across a refresh but never across a closed tab.
const KEY = 'pb:draft'

export const draft = {
  get() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY))
    } catch {
      return null
    }
  },
  set(value) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(value))
    } catch {
      // the flow still works from router state if storage is blocked
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
