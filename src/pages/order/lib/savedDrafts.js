// "Save to Cart": an unfinished magazine order the customer can come back to.
// Drafts live in their own list, so a draft is never mistaken for a placed order (those are in 'orders').
// For now they are kept in this browser only. When accounts and a backend exist, replace the four functions
// below with API calls tied to the signed-in user; nothing else needs to change.
const KEY = 'pb:saved-drafts'

const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
const write = (list) => localStorage.setItem(KEY, JSON.stringify(list)) // throws when storage is full: callers show an error

export const newDraftId = () => `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const savedDrafts = {
  list: async () => [...read()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  get: async (id) => read().find((d) => d.id === id) ?? null,
  // One entry per id: saving the same draft again updates it, so it can never be added twice.
  save: async (entry) => {
    const list = read()
    const old = list.find((d) => d.id === entry.id)
    const now = new Date().toISOString()
    const next = { ...entry, status: 'draft', createdAt: old?.createdAt ?? now, updatedAt: now }
    write(old ? list.map((d) => (d.id === entry.id ? next : d)) : [...list, next])
    return next
  },
  remove: async (id) => {
    write(read().filter((d) => d.id !== id))
  },
}
