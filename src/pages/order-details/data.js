// Layout for the magazine details page. The rows marked `sample: true` are PLACEHOLDER text only,
// not final specifications. Replace them with the real details later; the page renders whatever is returned here.
export const getMagazineDetailSections = (magazine, size) => [
  {
    title: 'Your selection',
    rows: [
      { label: 'Magazine', value: magazine.title },
      { label: 'Pages', value: `${size.pages} Pages` },
      { label: 'Photos', value: `${size.photos} Photos` },
    ],
  },
  {
    title: 'Print & finish',
    rows: [
      { label: 'Cover', value: 'Sample: glossy laminated cover', sample: true },
      { label: 'Paper', value: 'Sample: premium art paper', sample: true },
      { label: 'Binding', value: 'Sample: perfect binding', sample: true },
    ],
  },
  {
    title: 'Production & delivery',
    rows: [
      { label: 'Making time', value: 'Sample: 5-7 working days', sample: true },
      { label: 'Delivery', value: 'Charge and time confirmed when you order' },
    ],
  },
]

// Placeholder rows for each selected add-on until real product details exist.
export const getAddonDetailRows = () => [{ label: 'Details', value: 'Product details coming soon', sample: true }]
