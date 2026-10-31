import ItemManager from './ItemManager'
import { productsApi, withPhotoStripPricing } from '../shared/services/contentService'

const photoStripApi = {
  ...productsApi,
  list: async () => (await productsApi.list()).filter((item) => item.id === 'photo-strip').map(withPhotoStripPricing),
  save: async (item) => {
    const { options, ...current } = item
    return productsApi.save(current)
  },
}

export default function PhotoStripSettingsPage() {
  return <ItemManager
    title="Photo Strip"
    note="No Photo Strip product is created automatically. Add it here when you are ready; its name, cover, prices, and customer designs are managed together."
    api={photoStripApi}
    fields={[
      { name: 'name', label: 'Product name', required: true },
      { name: 'image', label: 'Cover image', type: 'image', required: true },
      { name: 'status', label: 'Availability', type: 'select', options: ['Available', 'Coming soon'] },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { name: 'unitPrice', label: 'Single price per strip (৳)', type: 'number', required: true },
      { name: 'packs', label: 'Combo offers (optional)', type: 'packs' },
      { name: 'designs', label: 'Customer-selectable designs', type: 'gallery' },
    ]}
    blank={{ name: '', image: '', status: 'Coming soon', description: '', unitPrice: 0, packs: [], designs: [] }}
    allowAdd={(items) => items.length === 0}
    makeId={() => 'photo-strip'}
    label={(item) => item.name || 'Photo Strip'}
    columns={[{ key: 'status', label: 'Availability' }]}
    validate={(item) => {
      if (!item.name?.trim() || !item.image) return 'Add a product name and cover image.'
      if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 1) return 'Set a single price per strip of at least ৳1.'
      const packs = Array.isArray(item.packs) ? item.packs : []
      if (packs.some((row) => !Number.isInteger(Number(row.pieces)) || Number(row.pieces) < 1 || !Number.isFinite(Number(row.price)) || Number(row.price) < 1)) return 'Each combo offer needs a quantity and total price of at least ৳1.'
      if (new Set(packs.map((row) => Number(row.pieces))).size !== packs.length) return 'Each combo offer must have a different quantity.'
      if (item.status === 'Available' && !item.designs?.some((design) => design?.id && design.image)) return 'Add at least one customer design before making Photo Strip available.'
      return ''
    }}
  />
}
