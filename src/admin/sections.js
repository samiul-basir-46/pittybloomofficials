import { BookOpen, CircleHelp, FileText, LayoutGrid, Menu, Music2, PackagePlus, PartyPopper, ShoppingBag, Star, Tag } from 'lucide-react'
import {
  bestSellingApi,
  faqsApi,
  magazinesApi,
  moreProductsApi,
  navLinksApi,
  occasionsApi,
  orderSettingsApi,
  policiesApi,
  productsApi,
  addonsApi,
  sizesApi,
  songBooksApi,
} from '../shared/services/contentService'
import { formatPrice } from '../shared/utils/format'
import { slugify } from '../shared/utils/text'

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
  {
    path: 'more-products', title: 'More Products', icon: LayoutGrid, api: moreProductsApi,
    note: 'Set each card’s position on the home page. Lower numbers appear first; matching positions keep their current order.',
    fields: [
      ...card.fields,
      { name: 'order', label: 'Position (1 is first)', type: 'number', required: true },
    ],
    blank: { name: '', image: '', to: '', order: 10 },
    label: card.label,
    columns: [...card.columns, { key: 'order', label: 'Position' }],
  },
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
      { name: 'book', label: 'Book preview (PDF)', type: 'pdf' },
    ],
    blank: { title: '', price: 1499, mrp: 1999, badge: '', image: '', backImage: '', book: null },
    label: (i) => i.title,
    columns: [
      { key: 'price', label: 'Price', format: formatPrice },
      { key: 'badge', label: 'Badge' },
      { key: 'book', label: 'Book', format: (b) => `${b.pageCount} pages` },
    ],
  },
  {
    path: 'products',
    title: 'Shop Products',
    icon: ShoppingBag,
    api: productsApi,
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'image', label: 'Image', type: 'image' },
      { name: 'status', label: 'Status', type: 'select', options: ['Available', 'Coming soon'] },
      { name: 'tagline', label: 'Short line under the name' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
      {
        name: 'options',
        label: 'Options & prices (one per line: Name | Price | MRP (optional) | Tag (optional))',
        type: 'textarea',
        rows: 6,
      },
    ],
    blank: { name: '', image: '', status: 'Available', tagline: '', description: '', options: 'Option name | 499' },
    label: (i) => i.name,
    columns: [{ key: 'status', label: 'Status' }],
  },
  {
    path: 'song-books',
    title: 'Song Books',
    icon: Music2,
    api: songBooksApi,
    note: 'Add a Song Book here to publish it on the website. Upload one flipbook preview; customers choose 12 or 16 pages and that selection is saved with the order. List position controls order: 1 appears first, then 2, 3, and so on.',
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { name: 'status', label: 'Availability', type: 'select', options: ['Available', 'Inactive'] },
      { name: 'order', label: 'List position', type: 'number' },
      { name: 'price12', label: '12 page price (BDT)', type: 'number', required: true },
      { name: 'price16', label: '16 page price (BDT)', type: 'number', required: true },
      { name: 'image', label: 'Cover image', type: 'image' },
      { name: 'backImage', label: 'Back cover image (optional)', type: 'image' },
      { name: 'previewBook', label: 'Flipbook preview (PDF or page images)', type: 'pdf' },
    ],
    blank: { title: '', description: '', status: 'Available', order: 10, price12: 849, price16: 1049, image: '', backImage: '', previewBook: null },
    label: (item) => item.title,
    columns: [
      { key: 'status', label: 'Availability' },
      { key: 'price12', label: '12 pages', format: formatPrice },
      { key: 'price16', label: '16 pages', format: formatPrice },
    ],
    validate: async (item) => !Number.isFinite(Number(item.price12)) || Number(item.price12) < 1 || !Number.isFinite(Number(item.price16)) || Number(item.price16) < 1
      ? 'Set a price of at least ৳1 for both page counts.'
      : '',
  },
  {
    path: 'addons',
    title: 'Add-on Products',
    icon: PackagePlus,
    api: addonsApi,
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'image', label: 'Image', type: 'image' },
      { name: 'price', label: 'Price (BDT)', type: 'number' },
      { name: 'status', label: 'Show in Buy Now popup?', type: 'select', options: ['Active', 'Inactive'] },
    ],
    blank: { name: '', image: '', price: 0, status: 'Active' },
    label: (i) => i.name,
    columns: [
      { key: 'price', label: 'Price', format: formatPrice },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    path: 'sizes',
    title: 'Sizes & Pricing',
    icon: Tag,
    api: sizesApi,
    note: 'A4 and A5 magazines, priced by page count. A price of 0 hides an option from customers. Page limits are set in Order Settings.',
    fields: [
      { name: 'format', label: 'Size', type: 'select', options: ['A4', 'A5'] },
      { name: 'pages', label: 'Pages (a multiple of 4)', type: 'number', required: true },
      { name: 'photos', label: 'Recommended photos (e.g. 16–22, leave empty if unknown)' },
      { name: 'price', label: 'Price (BDT). 0 hides this option', type: 'number', required: true },
      { name: 'mrp', label: 'MRP in BDT (optional struck-through price, 0 for none)', type: 'number' },
      { name: 'tag', label: 'Tag', type: 'select', options: ['', 'Most Popular', 'Best Value'] },
    ],
    blank: { format: 'A4', pages: 8, photos: '', price: 0, mrp: 0, tag: '' },
    label: (i) => `${i.format ?? 'A4'} · ${i.pages} Pages${i.price > 0 ? '' : '   ⚠ price not set (hidden)'}`,
    makeId: (i) => `${i.format}-${i.pages}`.toLowerCase(),
    columns: [
      { key: 'photos', label: 'Photos' },
      { key: 'price', label: 'Price', format: formatPrice },
    ],
    validate: async (item, { items }) => {
      const settings = await orderSettingsApi.get()
      const max = Number(item.format === 'A5' ? settings.a5MaxPages : settings.a4MaxPages)
      if (!Number.isInteger(item.pages) || item.pages < 4 || item.pages % 4 !== 0) return 'Pages must be a multiple of 4 (4, 8, 12, …).'
      if (max && item.pages > max) return `${item.format} magazines can have at most ${max} pages. Change the limit in Order Settings if this is wrong.`
      if (!(item.price >= 0)) return 'The price cannot be negative.'
      if (items.some((i) => i.id !== item.id && i.format === item.format && i.pages === item.pages))
        return `${item.format} · ${item.pages} Pages already exists. Edit that one instead.`
      return ''
    },
  },
  {
    path: 'occasions',
    title: 'Occasions',
    icon: PartyPopper,
    api: occasionsApi,
    note: 'The occasion buttons customers see, and the questions asked for each one.',
    fields: [
      { name: 'label', label: 'Name', required: true },
      { name: 'emoji', label: 'Emoji' },
      { name: 'quick', label: 'Show as a big button (otherwise only in the drop-down)', type: 'select', options: ['Yes', 'No'] },
      { name: 'status', label: 'Show to customers?', type: 'select', options: ['Active', 'Inactive'] },
      { name: 'order', label: 'Position (1 is first)', type: 'number' },
      {
        name: 'fields',
        label: 'Questions, one per line: Question | Placeholder | required or optional | text, number or date',
        type: 'textarea',
        rows: 6,
      },
    ],
    blank: { label: '', emoji: '✨', quick: 'No', status: 'Active', order: 50, fields: 'Name | e.g. Sarah Ahmed | required' },
    label: (i) => `${i.emoji ?? ''} ${i.label}`.trim(),
    makeId: (i) => slugify(i.label),
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'quick', label: 'Big button' },
    ],
  },
  {
    path: 'faq',
    title: 'FAQ',
    icon: CircleHelp,
    api: faqsApi,
    fields: [
      { name: 'question', label: 'Question', required: true },
      { name: 'answer', label: 'Answer', type: 'textarea', required: true },
    ],
    blank: { question: '', answer: '' },
    label: (i) => i.question,
  },
  {
    path: 'policies',
    title: 'Policies',
    icon: FileText,
    api: policiesApi,
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'content', label: 'Content', type: 'textarea' },
    ],
    blank: { title: '', content: '' },
    label: (i) => i.title,
  },
  {
    path: 'menu',
    title: 'Menu Links',
    icon: Menu,
    api: navLinksApi,
    fields: [
      { name: 'label', label: 'Label', required: true },
      { name: 'to', label: 'Link (e.g. /magazines)', required: true },
    ],
    blank: { label: '', to: '' },
    label: (i) => i.label,
    columns: [{ key: 'to', label: 'Link' }],
  },
]
