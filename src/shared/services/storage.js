import { db, firebaseConfigured } from './firebaseClient'
import { collection, deleteDoc, doc, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore'

const PREFIX = 'pb:'
const CONTENT = 'contentData'

const localRead = (key, seed) => {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : seed
  } catch { return seed }
}

const chunk = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

async function cloudGet(key, seed) {
  if (Array.isArray(seed)) {
    const meta = await getDoc(doc(db, CONTENT, `${key}--meta`))
    if (!meta.exists()) {
      const legacy = localRead(key, null)
      if (legacy) {
        await cloudSet(key, legacy)
        localStorage.removeItem(PREFIX + key)
        return legacy
      }
      return seed
    }
    const snapshot = await getDocs(query(collection(db, CONTENT), where('group', '==', key)))
    return snapshot.docs.filter((item) => item.data().recordType === 'item').map((item) => item.data().value)
  }
  const snapshot = await getDoc(doc(db, CONTENT, `${key}--singleton`))
  if (snapshot.exists()) return snapshot.data().value
  const legacy = localRead(key, null)
  if (legacy) {
    await cloudSet(key, legacy)
    localStorage.removeItem(PREFIX + key)
    return legacy
  }
  return seed
}

async function cloudSet(key, value) {
  if (!Array.isArray(value)) {
    const batch = writeBatch(db)
    batch.set(doc(db, CONTENT, `${key}--singleton`), { group: key, value })
    await batch.commit()
    return value
  }

  const groupRef = collection(db, CONTENT)
  const existing = await getDocs(query(groupRef, where('group', '==', key)))
  const wanted = new Set(value.map((item) => `${key}--${encodeURIComponent(String(item.id ?? 'item'))}`))
  const writes = []
  value.forEach((item) => {
    const id = `${key}--${encodeURIComponent(String(item.id ?? 'item'))}`
    writes.push((batch) => batch.set(doc(db, CONTENT, id), { group: key, recordType: 'item', value: item }))
  })
  existing.docs.forEach((item) => {
    if (item.data().recordType === 'item' && !wanted.has(item.id)) writes.push((batch) => batch.delete(item.ref))
  })
  writes.push((batch) => batch.set(doc(db, CONTENT, `${key}--meta`), { group: key, recordType: 'meta', count: value.length }))
  for (const group of chunk(writes, 450)) {
    const batch = writeBatch(db)
    group.forEach((write) => write(batch))
    await batch.commit()
  }
  return value
}

export const store = {
  get: (key, seed) => firebaseConfigured ? cloudGet(key, seed) : Promise.resolve(localRead(key, seed)),
  set: (key, value) => {
    if (firebaseConfigured) return cloudSet(key, value)
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
      return Promise.resolve(value)
    } catch (error) { return Promise.reject(error) }
  },
  clear: async () => {
    if (!firebaseConfigured) {
      Object.keys(localStorage).filter((key) => key.startsWith(PREFIX)).forEach((key) => localStorage.removeItem(key))
      return
    }
    const snapshot = await getDocs(collection(db, CONTENT))
    for (const group of chunk(snapshot.docs, 450)) {
      const batch = writeBatch(db)
      group.forEach((item) => batch.delete(item.ref))
      await batch.commit()
    }
    Object.keys(localStorage).filter((key) => key.startsWith(PREFIX)).forEach((key) => localStorage.removeItem(key))
  },
}
