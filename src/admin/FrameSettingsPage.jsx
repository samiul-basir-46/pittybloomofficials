import ItemManager from './ItemManager'
import { frameProductsApi } from '../shared/services/contentService'

export default function FrameSettingsPage() {
  return <ItemManager title="Frames" note="Upload each frame separately. Customers see these as a product list and order the exact frame they select." api={frameProductsApi} fields={[
    { name: 'title', label: 'Frame title', required: true },
    { name: 'image', label: 'Frame cover', type: 'image', required: true },
    { name: 'price', label: 'Price (BDT)', type: 'number', required: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'designs', label: 'Frame designs (customers choose one for each frame)', type: 'gallery' },
    { name: 'status', label: 'Availability', type: 'select', options: ['Available', 'Inactive'] },
    { name: 'order', label: 'List position', type: 'number' },
  ]} blank={{ title: '', image: '', price: 0, description: '', designs: [], status: 'Available', order: 10 }} label={(item) => item.title} columns={[{ key: 'price', label: 'Price', format: (value) => `৳${value}` }, { key: 'status', label: 'Availability' }]} validate={(item) => !item.title?.trim() || !item.image ? 'Add a frame title and cover image.' : !Number.isFinite(Number(item.price)) || Number(item.price) < 1 ? 'Set a price of at least ৳1.' : ''} />
}
