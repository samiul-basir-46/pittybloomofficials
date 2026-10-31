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
import { ABOUT_LAYOUT, SITE } from '../config/site'
import { frameSizeIdFor } from '../utils/frameSizeMapping'
import { parseOptions } from '../utils/options'
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
const sortMoreProducts = (items) => items
  .map((item, index) => ({ ...item, order: Number.isFinite(Number(item.order)) ? Number(item.order) : (index + 1) * 10 }))
  .sort((a, b) => a.order - b.order)
const moreProductsCollection = collection('moreProducts', moreProducts, sortMoreProducts)
const SONG_BOOK_TILE_ID = 'song-books'
const isSongBookTile = (item) => item.id === SONG_BOOK_TILE_ID || item.to === '/song-books'
const songBookTile = (book) => ({ id: SONG_BOOK_TILE_ID, name: 'Song Books', image: book.image || '/images/products/song-book.jpg', to: '/song-books' })
const SONG_BOOK_TILE_MIGRATION_KEY = 'moreProductsSongBookSeeded'
const MINI_TILE_ID = 'mini-magazines'
const MINI_TILE_MIGRATION_KEY = 'moreProductsMiniMagazineSeeded'
const isMiniTile = (item) => item.id === MINI_TILE_ID || item.to === '/mini-magazines'
const isPhotoStripTile = (item) => item.id === 'photo-strip' || ['/photo-strip', '/products/photo-strip'].includes(String(item.to || '').replace(/\/+$/, ''))
export const moreProductsApi = {
  ...moreProductsCollection,
  save: async (item) => {
    const items = await moreProductsCollection.list()
    if (isPhotoStripTile(item) && items.some((existing) => existing.id !== item.id && isPhotoStripTile(existing))) {
      throw new Error('Photo Strip can appear only once on the home page.')
    }
    return moreProductsCollection.save(isPhotoStripTile(item) ? { ...item, to: '/photo-strip' } : item)
  },
  list: async () => {
    let items = await moreProductsCollection.list()
    if (!(await store.get(SONG_BOOK_TILE_MIGRATION_KEY, false))) {
      if (items.some(isSongBookTile)) await store.set(SONG_BOOK_TILE_MIGRATION_KEY, true)
      else {
        const book = (await getSongBooks())[0]
        if (book) {
          const tile = songBookTile(book)
          await moreProductsCollection.save(tile)
          await store.set(SONG_BOOK_TILE_MIGRATION_KEY, true)
          items = sortMoreProducts([...items, { ...tile, order: (items.length + 1) * 10 }])
        }
      }
    }
    // One-time: add a "Mini Pocket Magazine" tile once an item exists. The admin can reorder or delete it afterwards.
    if (!(await store.get(MINI_TILE_MIGRATION_KEY, false))) {
      if (items.some(isMiniTile)) await store.set(MINI_TILE_MIGRATION_KEY, true)
      else {
        const mini = (await getMiniMagazines())[0]
        if (mini) {
          const tile = { id: MINI_TILE_ID, name: 'Mini Pocket Magazine', image: mini.image || '', to: '/mini-magazines' }
          try { await moreProductsCollection.save(tile); await store.set(MINI_TILE_MIGRATION_KEY, true) } catch { /* visitors cannot write; show the tile anyway */ }
          items = sortMoreProducts([...items, { ...tile, order: (items.length + 1) * 10 }])
        }
      }
    }
    const [shop, frames, polaroids] = await Promise.all([
      productsApi.list().catch(() => []),
      getFrameProducts().catch(() => []),
      getPolaroidProducts().catch(() => []),
    ])
    let photoStripSeen = false
    return items.map((tile) => {
      if (isPhotoStripTile(tile)) {
        if (photoStripSeen) return null
        photoStripSeen = true
        tile = { ...tile, to: '/photo-strip' }
      }
      const path = String(tile.to || '').replace(/\/+$/, '')
      const product = shop.find((item) => path === `/${item.id}` || path === `/products/${item.id}`)
      const canonical = path === '/frame' ? frames[0] : path === '/polaroids' ? polaroids[0] : product
      return canonical ? { ...tile, name: canonical.title || canonical.name || tile.name, image: canonical.image || tile.image } : tile
    }).filter((tile) => {
      if (!tile) return false
      const path = String(tile.to || '').replace(/\/+$/, '')
      if (path === '/sticker' || path === '/products/sticker') return shop.some((item) => item.id === 'sticker')
      if (path !== '/photo-strip' && path !== '/products/photo-strip') return true
      const product = shop.find((item) => item.id === 'photo-strip')
      return Array.isArray(product?.designs) && product.designs.some((design) => design?.id && design.image)
    })
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
const storedProductsApi = collection('products', products)
const CONFIGURABLE_PRODUCT_KEYS = { 'photo-strip': 'photoStripConfigured', sticker: 'stickerConfigured' }
export const productsApi = {
  ...storedProductsApi,
  list: async () => {
    const items = await storedProductsApi.list()
    const configured = Object.fromEntries(await Promise.all(Object.entries(CONFIGURABLE_PRODUCT_KEYS).map(async ([id, key]) => [id, await store.get(key, false)])))
    return items.filter((item) => !CONFIGURABLE_PRODUCT_KEYS[item.id] || configured[item.id])
  },
  save: async (item) => {
    const result = await storedProductsApi.save(item)
    const key = CONFIGURABLE_PRODUCT_KEYS[item.id]
    if (key) await store.set(key, true)
    return result
  },
  remove: async (id) => {
    const result = await storedProductsApi.remove(id)
    const key = CONFIGURABLE_PRODUCT_KEYS[id]
    if (key) await store.set(key, false)
    return result
  },
}
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
      // The About photos are positional (Magazine, Frame, Gift box), so keep a fixed number of slots and never shift empty ones away.
      aboutImages: ABOUT_LAYOUT.map((_, index) => removeMissingLocalImage((Array.isArray(saved.aboutImages) ? saved.aboutImages : SITE.aboutImages)[index]) || ''),
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
// Cards that point at a shop product (/frame, /polaroids, /sticker, /photo-strip) always show that product's current
// name and image, so they are edited once in Admin > Shop Products.
export const getMoreProducts = async () => {
  return moreProductsApi.list()
}
export const getMagazines = magazinesApi.list
// Customers only see sizes that have a price.
export const getSizes = async () => (await sizesApi.list()).filter((s) => s.price > 0)
export const getOccasions = async () => (await occasionsApi.list()).filter((o) => o.status !== 'Inactive')
export const withPhotoStripPricing = (product) => {
  if (!product || product.id !== 'photo-strip' || Number(product.unitPrice) > 0) return product
  const oldOptions = parseOptions(product.options)
  if (!oldOptions.length) return { ...product, packs: Array.isArray(product.packs) ? product.packs : [] }
  const quantities = oldOptions.map((option) => Number(option.label.match(/\d+/)?.[0]) || 1)
  return {
    ...product,
    unitPrice: Math.max(1, Math.round(oldOptions[0].price / quantities[0])),
    packs: oldOptions.slice(1).map((option, index) => ({ id: `legacy-${quantities[index + 1]}`, pieces: quantities[index + 1], price: option.price, tag: option.tag || '' })),
  }
}
export const getProducts = async () => {
  const [items, frames, polaroids] = await Promise.all([productsApi.list(), getFrameProducts(), getPolaroidProducts()])
  const firstFrame = frames[0]
  const firstPolaroid = polaroids[0]
  return items.map((product) => product.id === 'frame' && firstFrame
    ? { ...product, name: firstFrame.title || product.name, image: firstFrame.image || product.image }
    : product.id === 'polaroids' && firstPolaroid
      ? { ...product, name: firstPolaroid.title || product.name, image: firstPolaroid.image || product.image, unitPrice: firstPolaroid.unitPrice, minQuantity: firstPolaroid.minQuantity, packs: firstPolaroid.packs ?? [] }
      : product.id === 'photo-strip' ? withPhotoStripPricing(product) : product)
}
export const getProduct = async (id) => (await getProducts()).find((p) => p.id === id) ?? null
// All designs uploaded in Admin > Frames, de-duplicated; used by the guest/manual order form.
export const getFrameDesigns = async () => {
  const seen = new Map()
  const [frameProducts, frameCatalog] = await Promise.all([getFrameProducts(), getProduct('frame')])
  const frameOptions = parseOptions(frameCatalog?.options)
  for (const frame of frameProducts) {
    for (const design of Array.isArray(frame.designs) ? frame.designs : []) {
      if (design?.id && design.image && !seen.has(design.id)) seen.set(design.id, { id: design.id, name: design.name || '', image: design.image, sizeId: frameSizeIdFor(frame, frameOptions), price: Number(frame.price) || 0 })
    }
  }
  return [...seen.values()]
}
export const polaroidProductsApi = collection('polaroidProducts', [], (items) => [...items].sort((a, b) => Number(a.order ?? 99) - Number(b.order ?? 99)))
const POLAROID_CATALOG_MIGRATED_KEY = 'polaroidCatalogManaged'
const legacyPolaroidCatalogItem = async () => {
  if (await store.get(POLAROID_CATALOG_MIGRATED_KEY, false)) return null
  const product = (await productsApi.list()).find((item) => item.id === 'polaroids')
  if (!product) return null
  const packs = parseOptions(product.options).flatMap((option) => {
    const pieces = Number(String(option.label).match(/\d+/)?.[0])
    return Number.isInteger(pieces) && pieces > 0 ? [{ id: `pack-${pieces}`, pieces, price: option.price, tag: option.tag }] : []
  })
  return { id: 'polaroids', title: product.name || 'Polaroids', image: product.image || '', description: product.description || '', unitPrice: Number(product.unitPrice) || 8, minQuantity: Number(product.minQuantity) || 9, packs, status: product.status === 'Coming soon' ? 'Inactive' : 'Available', order: 10 }
}
export const getPolaroidProducts = async () => {
  const items = await polaroidProductsApi.list()
  if (items.length) return items.filter((item) => item.status !== 'Inactive')
  const legacy = await legacyPolaroidCatalogItem()
  return legacy ? [legacy] : []
}
const getPolaroidCatalogItems = async () => {
  const items = await polaroidProductsApi.list()
  if (items.length || await store.get(POLAROID_CATALOG_MIGRATED_KEY, false)) return items
  const legacy = await legacyPolaroidCatalogItem()
  return legacy ? [legacy] : []
}
export const polaroidCatalogApi = {
  list: getPolaroidCatalogItems,
  save: async (item) => {
    await store.set(POLAROID_CATALOG_MIGRATED_KEY, true)
    return polaroidProductsApi.save(item)
  },
  remove: async (id) => {
    await store.set(POLAROID_CATALOG_MIGRATED_KEY, true)
    return polaroidProductsApi.remove(id)
  },
}
export const getPolaroidProduct = async (id) => (await getPolaroidProducts()).find((item) => item.id === id) ?? null
export const miniMagazinesApi = collection('miniMagazines', [], (items) => [...items].sort((a, b) => Number(a.order ?? 99) - Number(b.order ?? 99)))
export const getMiniMagazines = async () => (await miniMagazinesApi.list()).filter((item) => item.status !== 'Inactive')
export const getMiniMagazine = async (id) => (await getMiniMagazines()).find((item) => item.id === id) ?? null
export const getFrameProducts = async () => (await frameProductsApi.list()).filter((item) => item.status !== 'Inactive')
export const getFrameProduct = async (id) => (await getFrameProducts()).find((item) => item.id === id) ?? null
const mapAddonsToCatalog = async (items) => {
  const [products, frames, polaroids] = await Promise.all([productsApi.list(), getFrameProducts(), getPolaroidProducts()])
  return items.map((addon) => {
    const product = addon.id === 'frame' ? frames[0] : addon.id === 'polaroids' ? polaroids[0] : products.find((item) => item.id === addon.id)
    const catalogAvailable = addon.id === 'photo-strip'
      ? Boolean(product?.designs?.some((design) => design?.id && design.image))
      : addon.id === 'sticker' ? Boolean(product) : true
    return { ...addon, ...(product ? { name: product.title || product.name || addon.name, image: product.image || addon.image, options: product.options, unitPrice: product.unitPrice, packs: product.packs } : {}), catalogAvailable }
  }).filter((addon) => addon.catalogAvailable)
}
export const getAddonCatalog = async () => mapAddonsToCatalog(await addonsApi.list())
export const getActiveAddons = async () => (await getAddonCatalog()).filter((a) => a.status !== 'Inactive')
export const getFaqs = faqsApi.list
export const getPolicies = policiesApi.list
export const getNavLinks = navLinksApi.list
export const getMagazine = async (id) => (await magazinesApi.list()).find((m) => m.id === id) ?? null
export const getPolicy = async (id) => (await policiesApi.list()).find((p) => p.id === id) ?? null
