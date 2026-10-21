import { store } from './storage'
import { bookStore } from './bookStore'
import { bestSelling, moreProducts } from '../../pages/home/data'
import { magazines } from '../../pages/magazines/data'
import { SIZES } from '../../pages/magazine-detail/data'
import { products } from '../../pages/products/data'
import { addons } from '../../pages/addons/data'
import { ORDER_DEFAULTS, OCCASIONS } from '../../pages/order/data'
import { faqs } from '../../pages/faq/data'
import { policies } from '../../pages/policy/data'
import { navLinks } from '../layout/navLinks'
import { SITE } from '../config/site'
import { auth, db, firebaseConfigured } from './firebaseClient'
import { collection as fsCollection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore'

const collection = (key, seed, sort = (items) => items) => ({
  list: async () => sort(await store.get(key, seed)),
  save: async (item) => {
    const items = await store.get(key, seed)
    const exists = items.some((i) => i.id === item.id)
    return store.set(key, exists ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item])
  },
  remove: async (id) => store.set(key, (await store.get(key, seed)).filter((i) => i.id !== id)),
})

export const bestSellingApi = collection('bestSelling', bestSelling)
export const moreProductsApi = collection('moreProducts', moreProducts)
const magazinesCollection = collection('magazines', magazines)
export const magazinesApi = {
  ...magazinesCollection,
  save: async (item) => {
    const previous = (await magazinesCollection.list()).find((magazine) => magazine.id === item.id)
    const result = await magazinesCollection.save(item)
    if (previous?.book?.key && previous.book.key !== item.book?.key) {
      await bookStore.remove(previous.book.key).catch(() => {})
    }
    return result
  },
  remove: async (id) => {
    const previous = (await magazinesCollection.list()).find((magazine) => magazine.id === id)
    const result = await magazinesCollection.remove(id)
    if (previous?.book?.key) await bookStore.remove(previous.book.key).catch(() => {})
    return result
  },
}
// Stored under a new key: the old 'sizes' list used a different layout (no A4/A5), so it is left untouched.
export const sizesApi = collection('printSizes', SIZES, (items) =>
  [...items].sort((a, b) => (a.format ?? '').localeCompare(b.format ?? '') || a.pages - b.pages),
)
export const occasionsApi = collection('occasions', OCCASIONS, (items) => [...items].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)))
export const productsApi = collection('products', products)
export const addonsApi = collection('addons', addons)
const localOrdersApi = collection('orders', [], (items) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const requireSignedIn = () => {
  if (!auth?.currentUser) throw new Error('Sign in with Google before working with orders.')
  return auth.currentUser
}
const userIsAdmin = async (user) => {
  const admin = await getDoc(doc(db, 'admins', user.uid))
  return admin.exists() && admin.data()?.role === 'admin'
}
export const ordersApi = !firebaseConfigured ? localOrdersApi : {
  list: async () => {
    const user = requireSignedIn()
    const admin = await userIsAdmin(user)
    const ref = fsCollection(db, 'orders')
    if (admin) {
      const snapshot = await getDocs(query(ref, orderBy('createdAt', 'desc')))
      const remote = snapshot.docs.map((d) => d.data())
      const known = new Set(remote.map((order) => order.id))
      // Bring this browser's pre-Firestore orders into the shared admin queue once.
      for (const legacy of await localOrdersApi.list()) {
        if (known.has(legacy.id)) continue
        const imported = { ...legacy, ownerUid: legacy.ownerUid || 'legacy-local-order' }
        await setDoc(doc(db, 'orders', imported.id), imported)
        remote.push(imported)
      }
      return remote.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    }
    const snapshot = await getDocs(query(ref, where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc')))
    return snapshot.docs.map((d) => d.data())
  },
  save: async (order) => {
    const user = requireSignedIn()
    const ref = doc(db, 'orders', order.id)
    const existing = await getDoc(ref)
    const isAdmin = existing.exists() ? await userIsAdmin(user) : false
    if (existing.exists() && !isAdmin) {
      if (existing.data().ownerUid === user.uid) return existing.data()
      throw new Error('This order ID is already in use.')
    }
    const next = existing.exists() ? { ...order, ownerUid: existing.data().ownerUid } : {
      ...order,
      ownerUid: user.uid,
      customer: { ...order.customer, uid: user.uid, contactEmail: order.customer?.email || '', email: user.email || '' },
    }
    await setDoc(ref, next)
    return next
  },
  remove: async (id) => deleteDoc(doc(db, 'orders', id)),
}
export const faqsApi = collection('faqs', faqs)
export const policiesApi = collection('policies', policies)
export const navLinksApi = collection('navLinks', navLinks)

export const settingsApi = {
  get: async () => ({ ...SITE, ...(await store.get('settings', {})) }),
  save: (settings) => store.set('settings', settings),
}

export const orderSettingsApi = {
  get: async () => ({ ...ORDER_DEFAULTS, ...(await store.get('orderSettings', {})) }),
  save: (settings) => store.set('orderSettings', settings),
}
export const getOrderSettings = orderSettingsApi.get

export const getBestSelling = bestSellingApi.list
export const getMoreProducts = moreProductsApi.list
export const getMagazines = magazinesApi.list
// Customers only see sizes that have a price.
export const getSizes = async () => (await sizesApi.list()).filter((s) => s.price > 0)
export const getOccasions = async () => (await occasionsApi.list()).filter((o) => o.status !== 'Inactive')
export const getProducts = productsApi.list
export const getProduct = async (id) => (await productsApi.list()).find((p) => p.id === id) ?? null
export const getActiveAddons = async () => (await addonsApi.list()).filter((a) => a.status !== 'Inactive')
export const getFaqs = faqsApi.list
export const getPolicies = policiesApi.list
export const getNavLinks = navLinksApi.list
export const getMagazine = async (id) => (await magazinesApi.list()).find((m) => m.id === id) ?? null
export const getPolicy = async (id) => (await policiesApi.list()).find((p) => p.id === id) ?? null
