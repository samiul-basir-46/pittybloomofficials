import ItemManager from './ItemManager'
import { miniMagazinesApi } from '../shared/services/contentService'

const photoLimitError = (item) => {
  const min = Number(item.minPhotos)
  const max = item.maxPhotos === '' || item.maxPhotos == null ? 0 : Number(item.maxPhotos)
  if (!Number.isInteger(min) || min < 1) return 'Minimum photos must be at least 1.'
  if (max && (!Number.isInteger(max) || max < min)) return 'Maximum photos must be empty (no limit) or at least the minimum.'
  return ''
}

export default function MiniMagazineSettingsPage() {
  return <ItemManager title="Mini pocket magazines" note="Each item appears on /mini-magazines. You control the price and how many photos a customer must / may upload." api={miniMagazinesApi} fields={[
    { name: 'title', label: 'Title', required: true },
    { name: 'image', label: 'Cover image', type: 'image', required: true },
    { name: 'price', label: 'Price (BDT)', type: 'number', required: true },
    { name: 'minPhotos', label: 'Minimum photos', type: 'number', required: true },
    { name: 'maxPhotos', label: 'Maximum photos (leave empty or 0 for no limit)', type: 'number' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 6 },
    { name: 'status', label: 'Availability', type: 'select', options: ['Available', 'Inactive'] },
    { name: 'order', label: 'List position', type: 'number' },
  ]} blank={{ title: '', image: '', price: 0, minPhotos: 2, maxPhotos: 8, description: '', status: 'Available', order: 10 }} label={(item) => item.title} columns={[
    { key: 'price', label: 'Price', format: (value) => `৳${value}` },
    { key: 'minPhotos', label: 'Min photos' },
    { key: 'maxPhotos', label: 'Max photos' },
    { key: 'status', label: 'Availability' },
  ]} validate={(item) => !item.title?.trim() || !item.image ? 'Add a title and cover image.' : !Number.isFinite(Number(item.price)) || Number(item.price) < 1 ? 'Set a price of at least ৳1.' : photoLimitError(item)} />
}
