import { BookOpen, LayoutGrid, Star, Tag } from 'lucide-react'
import { bestSellingApi, magazinesApi, moreProductsApi, sizesApi } from '../services/contentService'
import { formatPrice } from '../utils/format'

const card = {
  fields: [
    { name: 'name', label: 'Name', required: true },
    { name: 'image', label: 'Image', type: 'image' },
    { name: 'to', label: 'Link (optional, e.g. /magazines)' },
  ],
  blank: { name: '', image: '', to: '' },
  label: (i) => i.name,
  columns: [{ key: 'to', label: 'Link' }],
}

export const SECTIONS = [
  { path: 'best-selling', title: 'Best Selling', icon: Star, api: bestSellingApi, ...card },
  { path: 'more-products', title: 'More Products', icon: LayoutGrid, api: moreProductsApi, ...card },
  {
    path: 'magazines',
    title: 'Magazines',
    icon: BookOpen,
    api: magazinesApi,
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'price', label: 'Price (BDT)', type: 'number' },
      { name: 'mrp', label: 'MRP in BDT (struck-through price)', type: 'number' },
      { name: 'badge', label: 'Badge', type: 'select', options: ['', 'Best Seller', 'New Release'] },
      { name: 'image', label: 'Cover image', type: 'image' },
      { name: 'backImage', label: 'Second image', type: 'image' },
    ],
    blank: { title: '', price: 1499, mrp: 1999, badge: '', image: '', backImage: '' },
    label: (i) => i.title,
    columns: [
      { key: 'price', label: 'Price', format: formatPrice },
      { key: 'badge', label: 'Badge' },
    ],
  },
  {
    path: 'sizes',
    title: 'Sizes & Pricing',
    icon: Tag,
    api: sizesApi,
    fields: [
      { name: 'pages', label: 'Pages', type: 'number', required: true },
      { name: 'sides', label: 'Sides', type: 'number', required: true },
      { name: 'photos', label: 'Photos (e.g. 24–30)', required: true },
      { name: 'price', label: 'Price (BDT)', type: 'number', required: true },
      { name: 'tag', label: 'Tag', type: 'select', options: ['', 'Most Popular', 'Best Value'] },
    ],
    blank: { pages: 10, sides: 20, photos: '', price: 1499, tag: '' },
    label: (i) => `${i.pages} Pages · ${i.sides} Sides`,
    makeId: (i) => String(i.pages),
    columns: [
      { key: 'photos', label: 'Photos' },
      { key: 'price', label: 'Price', format: formatPrice },
    ],
  },
]
