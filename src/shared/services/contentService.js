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
// Deletes stored book pages that no magazine uses any more (replaced/removed PDFs, abandoned uploads).
const pruneBooks = async () => {
  try {
    const keys = (await magazinesCollection.list()).map((m) => m.book?.key).filter(Boolean)
    await bookStore.prune(keys)
  } catch {
    // cleanup is best-effort and must never block saving
  }
}
export const magazinesApi = {
  ...magazinesCollection,
  save: async (item) => {
    const result = await magazinesCollection.save(item)
    await pruneBooks()
    return result
  },
  remove: async (id) => {
    const result = await magazinesCollection.remove(id)
    await pruneBooks()
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
export const ordersApi = collection('orders', [], (items) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
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