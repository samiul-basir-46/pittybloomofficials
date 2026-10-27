import ItemManager from './ItemManager'
import { frameProductsApi, getProduct } from '../shared/services/contentService'
import useAsync from '../shared/hooks/useAsync'
import { parseOptions } from '../shared/utils/options'
import { frameSizeIdFor } from '../shared/utils/frameSizeMapping'

export default function FrameSettingsPage() {
  const { data: frameProduct, loading } = useAsync(() => getProduct('frame'))
  const frameSizes = parseOptions(frameProduct?.options)
  if (loading) return <p className="py-10 text-center text-ink/60">Loading frame sizes…</p>
  return <ItemManager title="Frames" note="Design galleries match sizes from dimensions in the title or description. Set a size here only when the dimensions are not listed there." api={frameProductsApi} fields={[
    { name: 'title', label: 'Frame title', required: true },
    { name: 'sizeId', label: 'Frame size for this gallery', type: 'select', options: ['', ...frameSizes.map((size) => size.id)] },
    { name: 'image', label: 'Frame cover', type: 'image', required: true },
    { name: 'price', label: 'Price (BDT)', type: 'number', required: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'designs', label: 'Frame designs (customers choose one for each frame)', type: 'gallery' },
    { name: 'status', label: 'Availability', type: 'select', options: ['Available', 'Inactive'] },
    { name: 'order', label: 'List position', type: 'number' },
  ]} blank={{ title: '', sizeId: '', image: '', price: 0, description: '', designs: [], status: 'Available', order: 10 }} label={(item) => item.title} columns={[{ key: 'price', label: 'Price', format: (value) => `৳${value}` }, { key: 'status', label: 'Availability' }]} validate={(item) => !item.title?.trim() || !item.image ? 'Add a frame title and cover image.' : !frameSizeIdFor(item, frameSizes) ? 'Add the frame dimensions to its title or description, or choose a size for this gallery.' : !Number.isFinite(Number(item.price)) || Number(item.price) < 1 ? 'Set a price of at least ৳1.' : !Array.isArray(item.designs) || !item.designs.some((design) => design?.id && design.image) ? 'Upload at least one frame design for customers to choose.' : ''} />
}
