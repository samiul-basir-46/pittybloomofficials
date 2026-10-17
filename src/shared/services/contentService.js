import { store } from './storage'
import { bestSelling, moreProducts } from '../../pages/home/data'
import { magazines } from '../../pages/magazines/data'
import { SIZES } from '../../pages/magazine-detail/data'
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
export const magazinesApi = collection('magazines', magazines)
export const sizesApi = collection('sizes', SIZES, (items) => [...items].sort((a, b) => a.pages - b.pages))
export const faqsApi = collection('faqs', faqs)
export const policiesApi = collection('policies', policies)
export const navLinksApi = collection('navLinks', navLinks)

export const settingsApi = {
  get: async () => ({ ...SITE, ...(await store.get('settings', {})) }),
  save: (settings) => store.set('settings', settings),
}

export const getBestSelling = bestSellingApi.list
export const getMoreProducts = moreProductsApi.list
export const getMagazines = magazinesApi.list
export const getSizes = sizesApi.list
export const getFaqs = faqsApi.list
export const getPolicies = policiesApi.list
export const getNavLinks = navLinksApi.list
export const getMagazine = async (id) => (await magazinesApi.list()).find((m) => m.id === id) ?? null
export const getPolicy = async (id) => (await policiesApi.list()).find((p) => p.id === id) ?? null