// Image blobs live in IndexedDB so page changes, refreshes, and saved drafts do not
// discard the customer's files. Orders store only stable photo metadata and IDs.
import { auth, firebaseConfigured } from '../../../shared/services/firebaseClient'
import { orderImageType } from '../../../shared/utils/manualOrderRules'
const DB_NAME = 'pitty-bloom-order-files'
const DB_VERSION = 1
const STORE_NAME = 'photos'
const MEDIA_API = import.meta.env.VITE_MEDIA_API_URL?.replace(/\/$/, '')
const cache = new Map() // copyKey -> [{ id, name, size, url }]
const objectUrls = new Map()
const pendingWrites = new Map()
const writeFailures = new Map()

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
const openDb = () => new Promise((resolve, reject) => {
  if (!globalThis.indexedDB) return reject(new Error('IndexedDB is unavailable'))
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})
const withStore = async (mode, action) => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const result = action(tx.objectStore(STORE_NAME))
    tx.oncomplete = () => { db.close(); resolve(result?.result) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export const photoStore = {
  list: (key) => cache.get(key) ?? [],
  add(key, files, { allowDuplicates = false } = {}) {
    const current = cache.get(key) ?? []
    const result = { added: [], skipped: 0, rejected: 0, tooLarge: 0 }
    Array.from(files ?? []).forEach((file) => {
      const type = orderImageType(file)
      if (!type) return void result.rejected++
      if (file.size > 20 * 1024 * 1024) return void result.tooLarge++
      if (!allowDuplicates && current.some((p) => p.name === file.name && p.size === file.size)) return void result.skipped++
      const id = newId()
      const url = URL.createObjectURL?.(file) ?? ''
      const photo = { id, name: file.name, size: file.size, type, url, file }
      current.push(photo)
      result.added.push(photo)
      if (url) objectUrls.set(id, url)
      // Cache remains usable in the current visit if persistent storage is unavailable.
      const write = withStore('readwrite', (store) => store.put({ id, name: file.name, size: file.size, type: file.type, blob: file }))
        .then((result) => { writeFailures.delete(id); return result }, (error) => { writeFailures.set(id, error); throw error })
        .finally(() => pendingWrites.delete(id))
      pendingWrites.set(id, write)
      write.catch(() => {}) // report persistence errors when the customer saves or submits
    })
    cache.set(key, current)
    return result
  },
  async hydrate(key, photos = []) {
    const cached = cache.get(key)
    const expectedIds = photos.map((p) => p.id).sort().join('|')
    if (cached && cached.map((p) => p.id).sort().join('|') === expectedIds && !cached.some((p) => p.missing)) return cached
    if (cached) cached.forEach((p) => {
      const url = objectUrls.get(p.id)
      if (url) URL.revokeObjectURL?.(url)
      objectUrls.delete(p.id)
    })
    const restored = await Promise.all(photos.map(async (p) => {
      let url = ''
      let missing = false
      try {
        let blob
        if (firebaseConfigured && p.storageKey) blob = await downloadRemote(p.storageKey)
        else blob = (await withStore('readonly', (store) => store.get(p.id)))?.blob
        if (blob) {
          url = URL.createObjectURL(blob)
          objectUrls.set(p.id, url)
        } else missing = true
      } catch { missing = true }
      return { ...p, url, missing }
    }))
    cache.set(key, restored)
    return restored
  },
  async getUrl(id, storageKey, remoteAuth = auth) {
    if (objectUrls.has(id)) return objectUrls.get(id)
    const blob = storageKey
      ? await downloadRemote(storageKey, remoteAuth)
      : (await withStore('readonly', (store) => store.get(id)))?.blob
    if (!blob) return ''
    const url = URL.createObjectURL(blob)
    objectUrls.set(id, url)
    return url
  },
  async getBlob(id, storageKey, remoteAuth = auth) {
    try {
      return storageKey
        ? await downloadRemote(storageKey, remoteAuth)
        : (await withStore('readonly', (store) => store.get(id)))?.blob
    } catch { return null }
  },
  async flush(keys) {
    // Test DOMs and a few restricted browsers do not expose IndexedDB; keep the
    // current in-memory upload flow usable there.
    const hasIndexedDB = Boolean(globalThis.indexedDB)
    if (!hasIndexedDB && !firebaseConfigured) return
    const ids = keys.flatMap((key) => (cache.get(key) ?? []).map((p) => p.id))
    if (hasIndexedDB) await Promise.allSettled(ids.map((id) => pendingWrites.get(id)).filter(Boolean))
    const failed = ids.find((id) => writeFailures.has(id))
    if (failed && !firebaseConfigured) throw writeFailures.get(failed)
    if (firebaseConfigured) {
      if (!MEDIA_API || !auth.currentUser) throw new Error('Cloud photo storage is not configured or you are signed out.')
      if (keys.flatMap((key) => cache.get(key) ?? []).some((photo) => photo.missing)) {
        throw new Error('A saved photo could not be loaded. Re-add the missing image before saving or placing this order.')
      }
      await Promise.all(keys.flatMap((key) => cache.get(key) ?? []).filter((p) => !p.storageKey).map(async (photo) => {
        let file = photo.file
        if (!file) file = (await withStore('readonly', (store) => store.get(photo.id)))?.blob
        if (!file) throw new Error(`The selected photo “${photo.name}” is not available. Please add it again.`)
        const token = await auth.currentUser.getIdToken()
        const response = await fetch(`${MEDIA_API}/media/${encodeURIComponent(photo.id)}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': photo.type || file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(photo.name) },
          body: file,
        })
        if (!response.ok) {
          const failure = await response.json().catch(() => null)
          throw new Error(failure?.error || 'Could not upload a selected photo to Cloudflare R2.')
        }
        const saved = await response.json()
        photo.storageKey = saved.key
        photo.file = undefined
        writeFailures.delete(photo.id)
      }))
    }
  },
  remove(key, id) {
    const current = cache.get(key) ?? []
    const url = objectUrls.get(id)
    if (url) URL.revokeObjectURL?.(url)
    objectUrls.delete(id)
    cache.set(key, current.filter((p) => p.id !== id))
    withStore('readwrite', (store) => store.delete(id)).catch(() => {})
  },
  async removeFiles(files = []) {
    const ids = [...new Set(files.map((file) => file?.id).filter(Boolean))]
    for (const [key, photos] of cache.entries()) {
      photos.filter((photo) => ids.includes(photo.id)).forEach((photo) => this.remove(key, photo.id))
    }
    await Promise.all(ids.map((id) => withStore('readwrite', (store) => store.delete(id)).catch(() => {})))
  },
  clear() {
    objectUrls.forEach((url) => URL.revokeObjectURL?.(url))
    objectUrls.clear()
    cache.clear()
  },
}

async function downloadRemote(storageKey, tokenAuth = auth) {
  if (storageKey?.startsWith('manual-orders/')) {
    if (!MEDIA_API) throw new Error('Cloud photo storage is not configured.')
    if (!tokenAuth?.currentUser) throw new Error('Sign in to view customer order photos.')
    const token = await tokenAuth.currentUser.getIdToken()
    const response = await fetch(`${MEDIA_API}/guest-media?key=${encodeURIComponent(storageKey)}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error(`Could not load a guest order photo (HTTP ${response.status}).`)
    return response.blob()
  }
  if (!MEDIA_API || !tokenAuth?.currentUser) throw new Error('Cloud photo storage is not configured or you are signed out.')
  const token = await tokenAuth.currentUser.getIdToken()
  const response = await fetch(`${MEDIA_API}/media?key=${encodeURIComponent(storageKey)}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error(`Could not load a photo from Cloudflare R2 (HTTP ${response.status}).`)
  return response.blob()
}
