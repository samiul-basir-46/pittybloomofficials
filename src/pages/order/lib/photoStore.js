// Photos the customer picked, held in memory for the current visit only.
// There is no online storage connected yet (see data.js → photosNote), so the files are previewed and counted,
// the order records how many were chosen, and the customer sends the files on WhatsApp.
const store = new Map() // copyKey → [{ id, name, size, url }]

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const photoStore = {
  list: (key) => store.get(key) ?? [],
  // Returns { added, skipped, rejected } so the screen can explain what happened.
  add(key, files) {
    const current = store.get(key) ?? []
    const result = { added: [], skipped: 0, rejected: 0 }
    Array.from(files).forEach((file) => {
      if (!file.type?.startsWith('image/')) return void result.rejected++
      if (current.some((p) => p.name === file.name && p.size === file.size)) return void result.skipped++
      const photo = { id: newId(), name: file.name, size: file.size, url: URL.createObjectURL?.(file) ?? '' }
      current.push(photo)
      result.added.push(photo)
    })
    store.set(key, current)
    return result
  },
  remove(key, id) {
    const current = store.get(key) ?? []
    current.filter((p) => p.id === id).forEach((p) => p.url && URL.revokeObjectURL?.(p.url))
    store.set(key, current.filter((p) => p.id !== id))
  },
  clear() {
    store.forEach((list) => list.forEach((p) => p.url && URL.revokeObjectURL?.(p.url)))
    store.clear()
  },
}
