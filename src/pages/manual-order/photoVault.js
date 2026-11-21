// Keeps the customer's picked photos in the browser's own disk storage (IndexedDB) instead of pointing at the phone's
// gallery file. A gallery file can change or vanish after it is picked, which breaks preview and upload; the stored
// copy cannot. Reading it back gives a disk-backed Blob, so big A3-quality originals never pile up in RAM.
const DB_NAME = 'pb-guest-photos'
const STORE = 'photos'

const open = () => new Promise((resolve, reject) => {
  if (!globalThis.indexedDB) return reject(new Error('IndexedDB unavailable'))
  const request = indexedDB.open(DB_NAME, 1)
  request.onupgradeneeded = () => request.result.createObjectStore(STORE)
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})
const run = async (mode, work) => {
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const result = work(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(result?.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error || new Error('Storage aborted'))
    })
  } finally { db.close() }
}

export const photoVault = {
  // Stores the picked file, then returns a File backed by that stored copy.
  async keep(id, file, type) {
    await run('readwrite', (store) => store.put(file, id))
    const stored = await run('readonly', (store) => store.get(id))
    if (!stored) throw new Error('Stored photo missing')
    return new File([stored], file.name, { type: type || file.type, lastModified: file.lastModified })
  },
  async drop(id) { try { await run('readwrite', (store) => store.delete(id)) } catch { /* ignore */ } },
  async clear() { try { await run('readwrite', (store) => store.clear()) } catch { /* ignore */ } },
}
