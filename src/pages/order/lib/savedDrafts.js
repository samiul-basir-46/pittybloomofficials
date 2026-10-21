import { auth, db, firebaseConfigured } from '../../../shared/services/firebaseClient'
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore'

// A saved draft is stored separately from submitted orders and belongs to one account.
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

export const newDraftId = () => `d-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`

export const savedDrafts = {
  list: async () => {
    if (!firebaseConfigured) return [...read()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const user = auth.currentUser
    const ref = collection(db, 'drafts')
    // Preserve and migrate this browser's drafts when a customer is signed in.
    for (const legacy of user ? read() : []) {
      const draftRef = doc(db, 'drafts', legacy.id)
      const old = await getDoc(draftRef)
      if (!old.exists()) await setDoc(draftRef, { ...legacy, ownerUid: user.uid, status: 'draft' })
    }
    if (user && read().length) write([])
    const snapshot = await getDocs(user
      ? query(ref, where('ownerUid', '==', user.uid), orderBy('updatedAt', 'desc'))
      : query(ref, orderBy('updatedAt', 'desc')))
    return snapshot.docs.map((d) => d.data())
  },
  get: async (id) => {
    if (!firebaseConfigured) return read().find((d) => d.id === id) ?? null
    const snapshot = await getDoc(doc(db, 'drafts', id))
    return snapshot.exists() ? snapshot.data() : null
  },
  // One entry per id: saving the same draft again updates it, so it can never be added twice.
  save: async (entry) => {
    if (firebaseConfigured) {
      const user = auth.currentUser
      if (!user) throw new Error('Sign in with Google before saving a draft.')
      const ref = doc(db, 'drafts', entry.id)
      const old = await getDoc(ref)
      const now = new Date().toISOString()
      const next = {
        ...entry,
        ownerUid: user.uid,
        account: { uid: user.uid, email: user.email || '', displayName: user.displayName || '' },
        status: 'draft',
        createdAt: old.exists() ? old.data().createdAt : now,
        updatedAt: now,
      }
      await setDoc(ref, next)
      return next
    }
    const list = read()
    const old = list.find((d) => d.id === entry.id)
    const now = new Date().toISOString()
    const next = { ...entry, status: 'draft', createdAt: old?.createdAt ?? now, updatedAt: now }
    write(old ? list.map((d) => (d.id === entry.id ? next : d)) : [...list, next])
    return next
  },
  remove: async (id) => firebaseConfigured ? deleteDoc(doc(db, 'drafts', id)) : write(read().filter((d) => d.id !== id)),
}
