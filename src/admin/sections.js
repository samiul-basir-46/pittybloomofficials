import { BookOpen, CircleHelp, FileText, LayoutGrid, Menu, PackagePlus, ShoppingBag, Star, Tag } from 'lucide-react'
import {
  bestSellingApi,
  faqsApi,
  magazinesApi,
  moreProductsApi,
  navLinksApi,
  policiesApi,
  productsApi,
  addonsApi,
  sizesApi,
} from '../shared/services/contentService'
import { formatPrice } from '../shared/utils/format'

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
    fields: [
      { name: 'pages', label: 'Pages', type: 'number', required: true },
      { name: 'photos', label: 'Photos (e.g. 24–30)', required: true },
      { name: 'price', label: 'Price (BDT)', type: 'number', required: true },
      { name: 'tag', label: 'Tag', type: 'select', options: ['', 'Most Popular', 'Best Value'] },
    ],
    blank: { pages: 10, photos: '', price: 1499, tag: '' },
    label: (i) => `${i.pages} Pages`,
    makeId: (i) => String(i.pages),
    columns: [
      { key: 'photos', label: 'Photos' },
      { key: 'price', label: 'Price', format: formatPrice },
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