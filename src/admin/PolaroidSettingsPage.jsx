import ItemManager from './ItemManager'
import { polaroidProductsApi } from '../shared/services/contentService'

export default function PolaroidSettingsPage() {
  return <ItemManager title="Polaroids" note="Each item appears on /polaroids as its own card. Customers choose one, then upload one photo for every piece." api={polaroidProductsApi} fields={[
    { name: 'title', label: 'Polaroid title', required: true },
    { name: 'image', label: 'Cover image', type: 'image', required: true },
    { name: 'unitPrice', label: 'Price per Polaroid (BDT)', type: 'number', required: true },
    { name: 'minQuantity', label: 'Minimum quantity', type: 'number', required: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 6 },
    { name: 'status', label: 'Availability', type: 'select', options: ['Available', 'Inactive'] },
    { name: 'order', label: 'List position', type: 'number' },
  ]} blank={{ title: '', image: '', unitPrice: 8, minQuantity: 9, description: '', status: 'Available', order: 10 }} label={(item) => item.title} columns={[
    { key: 'unitPrice', label: 'Per piece', format: (value) => `৳${value}` },
    { key: 'minQuantity', label: 'Min quantity' },
    { key: 'status', label: 'Availability' },
  ]} validate={(item) => !item.title?.trim() || !item.image ? 'Add a title and cover image.' : !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 1 ? 'Set a price per Polaroid of at least ৳1.' : !Number.isInteger(Number(item.minQuantity)) || Number(item.minQuantity) < 1 ? 'Minimum quantity must be at least 1.' : ''} />
}
