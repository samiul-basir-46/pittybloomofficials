import ItemManager from './ItemManager'
import { giftCardsApi } from '../shared/services/contentService'

const priceError = (item) => {
  const prices = [item.priceA4, item.priceA3].map((value) => (value === '' || value == null ? 0 : Number(value)))
  if (prices.some((price) => !Number.isFinite(price) || price < 0)) return 'Prices cannot be negative.'
  return prices.some((price) => price > 0) ? '' : 'Set a price for at least one size (A4 or A3).'
}

export default function GiftCardSettingsPage() {
  return <ItemManager title="Gift Card" api={giftCardsApi} note="Add the Gift Card once. Customers pick A4 or A3, so set a price for each size (leave a price empty or 0 to hide that size). Sizes are standard paper sizes: A4 is 21 × 29.7 cm and A3 is 29.7 × 42 cm. The Gift Card appears on the home page automatically; you can change its home page name and picture in Home page products." fields={[
    { name: 'title', label: 'Title', required: true },
    { name: 'image', label: 'Cover photo (shown on the product card)', type: 'image', required: true },
    { name: 'gallery', label: 'More photos (detail page slider)', type: 'gallery' },
    { name: 'priceA4', label: 'A4 price (BDT)', type: 'number' },
    { name: 'priceA3', label: 'A3 price (BDT)', type: 'number' },
    { name: 'sizeImage', label: 'Size preview picture (optional — shown in “View size preview”)', type: 'image' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 6 },
    { name: 'status', label: 'Availability', type: 'select', options: ['Available', 'Inactive'] },
    { name: 'order', label: 'List position', type: 'number' },
  ]} blank={{ title: 'Gift Card', image: '', gallery: [], priceA4: 0, priceA3: 0, sizeImage: '', description: '', status: 'Available', order: 10 }} label={(item) => item.title} columns={[
    { key: 'priceA4', label: 'A4', format: (value) => Number(value) > 0 ? `৳${value}` : '—' },
    { key: 'priceA3', label: 'A3', format: (value) => Number(value) > 0 ? `৳${value}` : '—' },
    { key: 'status', label: 'Availability' },
  ]} validate={(item) => !item.title?.trim() || !item.image ? 'Add a title and cover image.' : priceError(item)} />
}
