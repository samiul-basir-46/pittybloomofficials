import ItemManager from './ItemManager'
import { productsApi } from '../shared/services/contentService'

const designsApi = {
  list: async () => {
    const product = (await productsApi.list()).find((item) => item.id === 'photo-strip')
    return Array.isArray(product?.designs) ? product.designs : []
  },
  save: async (design) => {
    const product = (await productsApi.list()).find((item) => item.id === 'photo-strip')
    if (!product) throw new Error('Photo Strip product was not found.')
    const designs = Array.isArray(product.designs) ? product.designs : []
    const exists = designs.some((item) => item.id === design.id)
    await productsApi.save({ ...product, designs: exists ? designs.map((item) => item.id === design.id ? design : item) : [...designs, design] })
  },
  remove: async (id) => {
    const product = (await productsApi.list()).find((item) => item.id === 'photo-strip')
    if (!product) throw new Error('Photo Strip product was not found.')
    await productsApi.save({ ...product, designs: (Array.isArray(product.designs) ? product.designs : []).filter((item) => item.id !== id) })
  },
}

export default function PhotoStripSettingsPage() {
  return <ItemManager
    title="Photo Strip designs"
    note="Manage the layouts customers can preview and choose before uploading photos. These designs are saved with the Photo Strip product."
    api={designsApi}
    fields={[
      { name: 'name', label: 'Design name', required: true },
      { name: 'image', label: 'Design image', type: 'image', required: true },
    ]}
    blank={{ name: '', image: '' }}
    label={(item) => item.name || 'Photo Strip design'}
    columns={[{ key: 'name', label: 'Design' }]}
    validate={(item) => !item.name?.trim() || !item.image ? 'Add a design name and image.' : ''}
  />
}
