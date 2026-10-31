import ItemManager from './ItemManager'
import { productsApi } from '../shared/services/contentService'
import { parseOptions } from '../shared/utils/options'

const stickerApi = {
  ...productsApi,
  list: async () => (await productsApi.list()).filter((item) => item.id === 'sticker'),
}

export default function StickerSettingsPage() {
  return <ItemManager
    title="Sticker"
    note="No Sticker product is created automatically. Add it here when you are ready; product details and prices are managed together."
    api={stickerApi}
    fields={[
      { name: 'name', label: 'Product name', required: true },
      { name: 'image', label: 'Cover image', type: 'image', required: true },
      { name: 'status', label: 'Availability', type: 'select', options: ['Available', 'Coming soon'] },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { name: 'options', label: 'Options & prices', type: 'options', required: true },
    ]}
    blank={{ name: '', image: '', status: 'Coming soon', tagline: '', description: '', options: '' }}
    allowAdd={(items) => items.length === 0}
    makeId={() => 'sticker'}
    label={(item) => item.name || 'Sticker'}
    columns={[{ key: 'status', label: 'Availability' }]}
    validate={(item) => !item.name?.trim() || !item.image ? 'Add a product name and cover image.' : !parseOptions(item.options).length ? 'Add at least one priced option.' : ''}
  />
}
