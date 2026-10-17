// Stores the rendered page images of each magazine's PDF book in IndexedDB.
// Page images are far too big for localStorage, so they live here and the magazine record only keeps
// a small reference: { key, pageCount, ratio, name }.
// When a backend is added, replace these four functions with API calls (upload pages, fetch page URLs).
const DB_NAME = 'pittybloom'
const STORE = 'books'

const open = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

const run = (mode, action) =>
  open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = action(tx.objectStore(STORE))
        tx.oncomplete = () => {
          db.close()
          resolve(req?.result)
        }
        tx.onabort = tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }),
  )

export const bookStore = {
  // pages: array of image Blobs, in page order. Returns the key to keep on the magazine.
  async save(pages) {
    const key = `book-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    await run('readwrite', (s) => s.put(pages, key))
    return key
  },
  get: (key) => run('readonly', (s) => s.get(key)),
  remove: (key) => run('readwrite', (s) => s.delete(key)),
  // Deletes every stored book that no magazine refers to any more (replaced or removed PDFs).
  async prune(keysInUse) {
    const keys = await run('readonly', (s) => s.getAllKeys())
    await Promise.all(keys.filter((k) => !keysInUse.includes(k)).map((k) => this.remove(k)))
  },
}
