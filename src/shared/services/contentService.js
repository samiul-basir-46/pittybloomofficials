import { store } from './storage'
import { bookStore } from './bookStore'
import { deleteCatalogImage } from './catalogImageStore'
import { bestSelling, moreProducts } from '../../pages/home/data'
import { magazines } from '../../pages/magazines/data'
import { songBooks } from '../../pages/song-book/data'
import { SIZES } from '../../pages/magazine-detail/data'
import { products } from '../../pages/products/data'
import { frameProducts } from '../../pages/frame/data'
import { addons } from '../../pages/addons/data'
import { ORDER_DEFAULTS, OCCASIONS } from '../../pages/order/data'
import { faqs } from '../../pages/faq/data'
import { policies } from '../../pages/policy/data'
import { navLinks } from '../layout/navLinks'
import { SITE } from '../config/site'
import { MANUAL_ORDER_CATALOG_DEFAULTS } from '../../pages/manual-order/catalog'
import { adminAuth, adminDb, auth, db, firebaseConfigured } from './firebaseClient'
import { collection as fsCollection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore'

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
const moreProductsCollection = collection('moreProducts', moreProducts)
const SONG_BOOK_TILE_ID = 'song-books'
const isSongBookTile = (item) => item.id === SONG_BOOK_TILE_ID || item.to === '/song-books'
const songBookTile = (book) => ({ id: SONG_BOOK_TILE_ID, name: 'Song Books', image: book.image || '/images/products/song-book.jpg', to: '/song-books' })
const SONG_BOOK_TILE_MIGRATION_KEY = 'moreProductsSongBookSeeded'
export const moreProductsApi = {
  ...moreProductsCollection,
  list: async () => {
    const items = await moreProductsCollection.list()
    if (await store.get(SONG_BOOK_TILE_MIGRATION_KEY, false)) return items
    if (items.some(isSongBookTile)) {
      await store.set(SONG_BOOK_TILE_MIGRATION_KEY, true)
      return items
    }
    const book = (await getSongBooks())[0]
    if (!book) return items
    const tile = songBookTile(book)
    await moreProductsCollection.save(tile)
    await store.set(SONG_BOOK_TILE_MIGRATION_KEY, true)
    return [...items, tile]
  },
}
const magazinesCollection = collection('magazines', magazines)
const songBooksCollection = collection('songBooks', songBooks, (items) => [...items].sort((a, b) => Number(a.order ?? 99) - Number(b.order ?? 99)))
export const songBooksApi = {
  ...songBooksCollection,
  list: async () => (await songBooksCollection.list()).map((book) => {
    const { preview12, preview16, ...current } = book
    return { ...current, previewBook: current.previewBook ?? preview12 ?? preview16 ?? null }
  }),
  save: async (item) => {
    const previous = (await songBooksCollection.list()).find((book) => book.id === item.id)
    const { preview12, preview16, ...current } = item
    current.previewBook ??= preview12 ?? preview16 ?? null
    const result = await songBooksCollection.save(current)
    for (const field of ['image', 'backImage']) {
      if (previous?.[field] && previous[field] !== current[field]) await deleteCatalogImage(previous[field]).catch(() => {})
    }
    const oldPreviewKeys = new Set([previous?.previewBook?.key, previous?.preview12?.key, previous?.preview16?.key].filter(Boolean))
    for (const key of oldPreviewKeys) {
      if (key !== current.previewBook?.key) await bookStore.remove(key).catch(() => {})
    }
    return result
  },
  remove: async (id) => {
    const previous = (await songBooksCollection.list()).find((book) => book.id === id)
    const result = await songBooksCollection.remove(id)
    for (const field of ['image', 'backImage']) {
      if (previous?.[field]) await deleteCatalogImage(previous[field]).catch(() => {})
    }
    const previewKeys = new Set([previous?.previewBook?.key, previous?.preview12?.key, previous?.preview16?.key].filter(Boolean))
    for (const key of previewKeys) await bookStore.remove(key).catch(() => {})
    return result
  },
}
export const getSongBooks = async () => (await songBooksApi.list()).filter((item) => item.status !== 'Inactive')
export const getSongBook = async (id) => (await songBooksApi.list()).find((item) => item.id === id && item.status !== 'Inactive') ?? null
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
const sizesCollection = collection('printSizes', SIZES, (items) =>
  [...items].sort((a, b) => (a.format ?? '').localeCompare(b.format ?? '') || a.pages - b.pages),
)
export const sizesApi = { ...sizesCollection, saveAll: (items) => store.set('printSizes', items) }
export const occasionsApi = collection('occasions', OCCASIONS, (items) => [...items].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)))
export const productsApi = collection('products', products)
export const frameProductsApi = collection('frameProducts', frameProducts, (items) => [...items].sort((a, b) => Number(a.order ?? 99) - Number(b.order ?? 99)))
export const addonsApi = collection('addons', addons)
const localOrdersApi = collection('orders', [], (items) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const changeLocalOrderStatus = async (id, status, fields = {}) => {
  const order = (await localOrdersApi.list()).find((item) => item.id === id)
  if (!order) throw new Error('Order not found.')
  return localOrdersApi.save({ ...order, ...fields, status })
}
const dhakaOrderDay = (date = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Dhaka', year: '2-digit', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.year}${parts.month}${parts.day}`
}
const nextLocalOrderId = async () => {
  const day = dhakaOrderDay()
  const orders = await localOrdersApi.list()
  const highest = orders.reduce((max, order) => {
    const match = order.id?.match(new RegExp(`^PB-${day}-(\\d+)$`))
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `PB-${day}-${String(highest + 1).padStart(2, '0')}`
}
const withoutUndefined = (value) => JSON.parse(JSON.stringify(value ?? {}))
const requireSignedIn = () => {
  if (!auth?.currentUser) throw new Error('Sign in to your customer account before placing an order.')
  return auth.currentUser
}
const customerOrderQueries = (user) => {
  const ref = fsCollection(db, 'orders')
  const queries = [
    query(ref, where('ownerUid', '==', user.uid)),
    query(ref, where('customer.uid', '==', user.uid)),
  ]
  const email = String(user.email || '').trim().toLowerCase()
  if (email) {
    queries.push(query(ref, where('customer.email', '==', email)))
    queries.push(query(ref, where('customer.contactEmail', '==', email)))
  }
  return queries
}
const customerOrdersFromSnapshots = (snapshots) => [...new Map(
  snapshots.flatMap((snapshot) => snapshot.docs.map((entry) => [entry.id, entry.data()])),
).values()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
const claimMatchingLegacyOrders = async (orders, user) => {
  const email = String(user.email || '').trim().toLowerCase()
  return Promise.all(orders.map(async (order) => {
    const orderEmail = String(order.customer?.email || order.customer?.contactEmail || '').trim().toLowerCase()
    const belongsByIdentity = order.ownerUid === user.uid || order.customer?.uid === user.uid
    if (!belongsByIdentity && (!email || orderEmail !== email)) return null
    if (order.ownerUid !== user.uid || order.customer?.uid !== user.uid) {
      const claimed = { ...order, ownerUid: user.uid, customer: { ...order.customer, uid: user.uid } }
      await setDoc(doc(db, 'orders', order.id), claimed)
      return claimed
    }
    return order
  })).then((ordersForUser) => ordersForUser.filter(Boolean))
}
export const ordersApi = !firebaseConfigured ? {
  ...localOrdersApi,
  watchAdmin: (onChange, onError) => {
    let active = true
    void localOrdersApi.list().then((orders) => { if (active) onChange(orders) }).catch((error) => { if (active) onError?.(error) })
    return () => { active = false }
  },
  watch: (onChange) => {
    void localOrdersApi.list().then(onChange)
    return () => {}
  },
  watchOne: (id, onChange) => {
    void localOrdersApi.list().then((orders) => onChange(orders.find((order) => order.id === id) ?? null))
    return () => {}
  },
  updateStatus: changeLocalOrderStatus,
  recordShipment: async (id, fields) => {
    const order = (await localOrdersApi.list()).find((item) => item.id === id)
    if (!order) throw new Error('Order not found.')
    return localOrdersApi.save({ ...order, ...withoutUndefined(fields) })
  },
  place: async (order) => {
    const id = await nextLocalOrderId()
    const saved = { ...order, id }
    await localOrdersApi.save(saved)
    return saved
  },
} : {
  list: async () => {
    const ref = fsCollection(adminDb, 'orders')
    const snapshot = await getDocs(query(ref, orderBy('createdAt', 'desc')))
    const remote = snapshot.docs.map((d) => d.data())
    const known = new Set(remote.map((order) => order.id))
    // Bring this browser's pre-Firestore orders into the shared admin queue once.
    for (const legacy of await localOrdersApi.list()) {
      if (known.has(legacy.id)) continue
      const imported = { ...legacy, ownerUid: legacy.ownerUid || 'legacy-local-order' }
      await setDoc(doc(adminDb, 'orders', imported.id), imported)
      remote.push(imported)
    }
    return remote.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  },
  watchAdmin: (onChange, onError) => {
    let active = true
    let unsubscribe = () => {}
    void (async () => {
      const ref = fsCollection(adminDb, 'orders')
      const orderQuery = query(ref, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(orderQuery)
      const known = new Set(snapshot.docs.map((entry) => entry.id))
      for (const legacy of await localOrdersApi.list()) {
        if (known.has(legacy.id)) continue
        const imported = { ...legacy, ownerUid: legacy.ownerUid || 'legacy-local-order' }
        await setDoc(doc(adminDb, 'orders', imported.id), imported)
      }
      if (!active) return
      unsubscribe = onSnapshot(orderQuery, (current) => {
        onChange(current.docs.map((entry) => entry.data()))
      }, onError)
    })().catch((error) => { if (active) onError?.(error) })
    return () => { active = false; unsubscribe() }
  },
  listMine: async () => {
    const user = requireSignedIn()
    const snapshots = await Promise.all(customerOrderQueries(user).map((customerQuery) => getDocs(customerQuery)))
    return claimMatchingLegacyOrders(customerOrdersFromSnapshots(snapshots), user)
  },
  watch: (onChange, onError) => {
    const user = requireSignedIn()
    const snapshots = new Map()
    const unsubscribers = customerOrderQueries(user).map((customerQuery, index) => onSnapshot(customerQuery, (snapshot) => {
      snapshots.set(index, snapshot)
      if (snapshots.size === customerOrderQueries(user).length) {
        void claimMatchingLegacyOrders(customerOrdersFromSnapshots([...snapshots.values()]), user)
          .then(onChange)
          .catch(onError)
      }
    }, onError))
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  },
  watchOne: (id, onChange, onError) => {
    requireSignedIn()
    return onSnapshot(doc(db, 'orders', id), (snapshot) => onChange(snapshot.exists() ? snapshot.data() : null), onError)
  },
  updateStatus: async (id, status, fields = {}) => {
    const localOrder = (await localOrdersApi.list()).find((order) => order.id === id)
    if (localOrder) await localOrdersApi.save({ ...localOrder, ...fields, status })
    await updateDoc(doc(adminDb, 'orders', id), { ...fields, status })
  },
  save: async (order) => {
    const ref = doc(adminDb, 'orders', order.id)
    const existing = await getDoc(ref)
    const user = adminAuth?.currentUser
    const next = existing.exists()
      ? {
          ...order,
          // Guest/manual orders are created by the Worker without an ownerUid; `undefined` makes Firestore reject the write.
          ownerUid: existing.data().ownerUid ?? order.ownerUid ?? user?.uid ?? 'admin',
          customer: {
            ...order.customer,
            ...((existing.data().customer?.uid ?? order.customer?.uid)
              ? { uid: existing.data().customer?.uid ?? order.customer?.uid }
              : {}),
          },
        }
      : {
          ...order,
          ownerUid: order.ownerUid || user?.uid || 'admin',
          customer: { ...order.customer, uid: order.customer?.uid || user?.uid || '', contactEmail: order.customer?.email || '', email: user?.email || '' },
        }
    const clean = withoutUndefined(next)
    await setDoc(ref, clean)
    return clean
  },
  // Writes only the shipment fields so a courier hand-off never rewrites (or trips over) the rest of the order.
  recordShipment: async (id, fields) => {
    const clean = withoutUndefined(fields)
    const localOrder = (await localOrdersApi.list()).find((order) => order.id === id)
    if (localOrder) await localOrdersApi.save({ ...localOrder, ...clean })
    await updateDoc(doc(adminDb, 'orders', id), clean)
    return clean
  },
  place: async (order, requestKey) => {
    const user = requireSignedIn()
    if (!requestKey) throw new Error('Could not prepare a unique order request. Please try again.')
    const day = dhakaOrderDay()
    const counterRef = doc(db, 'orderSequences', day)
    const requestRef = doc(db, 'orderRequests', requestKey)
    let placedOrder

    await runTransaction(db, async (transaction) => {
      const requestSnapshot = await transaction.get(requestRef)
      if (requestSnapshot.exists()) {
        const savedRef = doc(db, 'orders', requestSnapshot.data().orderId)
        const savedSnapshot = await transaction.get(savedRef)
        if (!savedSnapshot.exists() || savedSnapshot.data().ownerUid !== user.uid) {
          throw new Error('The previous order attempt could not be verified. Please contact support before retrying.')
        }
        placedOrder = savedSnapshot.data()
        return
      }

      const sequenceSnapshot = await transaction.get(counterRef)
      const sequenceNumber = (sequenceSnapshot.exists() ? Number(sequenceSnapshot.data().count) : 0) + 1
      const id = `PB-${day}-${String(sequenceNumber).padStart(2, '0')}`
      placedOrder = {
        ...order,
        id,
        ownerUid: user.uid,
        sequenceDay: day,
        sequenceNumber,
        submissionKey: requestKey,
        customer: { ...order.customer, uid: user.uid, contactEmail: order.customer?.email || '', email: user.email || '' },
      }

      transaction.set(counterRef, { count: sequenceNumber, lastOrderId: id, updatedAt: new Date().toISOString() })
      transaction.set(doc(db, 'orders', id), placedOrder)
      transaction.set(requestRef, { ownerUid: user.uid, orderId: id })
    })

    return placedOrder
  },
  remove: async (id) => {
    await localOrdersApi.remove(id)
    await deleteDoc(doc(adminDb, 'orders', id))
  },
}

export const customerProfileApi = {
  get: async (uid = auth?.currentUser?.uid) => {
    if (!firebaseConfigured || !uid) return {}
    if (auth.currentUser?.uid !== uid) throw new Error('Sign in to view your saved details.')
    const snapshot = await getDoc(doc(db, 'customerProfiles', uid))
    return snapshot.exists() ? snapshot.data() : {}
  },
  save: async (profile) => {
    const user = requireSignedIn()
    const record = {
      uid: user.uid,
      name: String(profile.name || '').trim().slice(0, 100),
      phone: String(profile.phone || '').trim().slice(0, 40),
      instagram: String(profile.instagram || '').trim().replace(/^@/, '').slice(0, 40),
      address: String(profile.address || '').trim().slice(0, 300),
      city: String(profile.city || '').trim().slice(0, 100),
      updatedAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'customerProfiles', user.uid), record, { merge: true })
    return record
  },
}

export const faqsApi = collection('faqs', faqs)
export const policiesApi = collection('policies', policies)
export const navLinksApi = collection('navLinks', navLinks)

export const settingsApi = {
  get: async () => {
    const saved = await store.get('settings', {})
    // Older defaults pointed to image files that were never included in public/.
    // Drop those stale URLs so the homepage and admin previews do not request 404s.
    const removeMissingLocalImage = (source) =>
      typeof source === 'string' && /^\/images\/(?:hero|about)\/\d+\.jpg(?:\?.*)?$/i.test(source)
        ? ''
        : source
    return {
      ...SITE,
      ...saved,
      heroImages: (Array.isArray(saved.heroImages) ? saved.heroImages : SITE.heroImages).map(removeMissingLocalImage).filter(Boolean),
      aboutImages: (Array.isArray(saved.aboutImages) ? saved.aboutImages : SITE.aboutImages).map(removeMissingLocalImage).filter(Boolean),
      // The checked-in logo asset is the current brand logo. Ignore any older
      // logo URL that may still be saved in the site's settings.
      logo: SITE.logo,
      whatsapp: saved.whatsapp || SITE.whatsapp,
      instagram: !saved.instagram || saved.instagram === '@pittybloomofficials' ? SITE.instagram : saved.instagram,
      instagramUrl: !saved.instagramUrl || saved.instagramUrl === 'https://www.instagram.com/pittybloomofficials' ? SITE.instagramUrl : saved.instagramUrl,
      facebookUrl: saved.facebookUrl || SITE.facebookUrl,
    }
  },
  save: (settings) => store.set('settings', settings),
}

export const orderSettingsApi = {
  get: async () => ({ ...ORDER_DEFAULTS, ...(await store.get('orderSettings', {})) }),
  save: (settings) => store.set('orderSettings', settings),
}
export const getOrderSettings = orderSettingsApi.get

export const manualOrderCatalogApi = {
  get: async () => ({ ...MANUAL_ORDER_CATALOG_DEFAULTS, ...(await store.get('manualOrderCatalog', {})) }),
  save: (catalog) => store.set('manualOrderCatalog', catalog),
}
export const getManualOrderCatalog = manualOrderCatalogApi.get

export const getBestSelling = bestSellingApi.list
export const getMoreProducts = async () => {
  const items = await moreProductsCollection.list()
  if (items.some(isSongBookTile) || await store.get(SONG_BOOK_TILE_MIGRATION_KEY, false)) return items
  const book = (await getSongBooks())[0]
  return book ? [...items, songBookTile(book)] : items
}
export const getMagazines = magazinesApi.list
// Customers only see sizes that have a price.
export const getSizes = async () => (await sizesApi.list()).filter((s) => s.price > 0)
export const getOccasions = async () => (await occasionsApi.list()).filter((o) => o.status !== 'Inactive')
export const getProducts = productsApi.list
export const getProduct = async (id) => (await productsApi.list()).find((p) => p.id === id) ?? null
export const getFrameProducts = async () => (await frameProductsApi.list()).filter((item) => item.status !== 'Inactive')
export const getFrameProduct = async (id) => (await getFrameProducts()).find((item) => item.id === id) ?? null
export const getActiveAddons = async () => (await addonsApi.list()).filter((a) => a.status !== 'Inactive')
export const getFaqs = faqsApi.list
export const getPolicies = policiesApi.list
export const getNavLinks = navLinksApi.list
export const getMagazine = async (id) => (await magazinesApi.list()).find((m) => m.id === id) ?? null
export const getPolicy = async (id) => (await policiesApi.list()).find((p) => p.id === id) ?? null
