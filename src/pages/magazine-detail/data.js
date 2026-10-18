export const DEFAULT_SIZE = 'a4-8'

// A4 and A5 magazines, priced by page count. Edit from Admin → Sizes & Pricing.
// A price of 0 hides an option from customers until a real price is set.
const size = (format, pages, photos, price) => ({
  id: `${format}-${pages}`.toLowerCase(),
  format,
  pages,
  photos,
  price,
  mrp: 0,
  tag: '',
})

export const SIZES = [
  size('A4', 4, '8–12', 299),
  { ...size('A4', 8, '16–22', 549), tag: 'Most Popular' },
  size('A4', 12, '26–32', 749),
  size('A4', 16, '35–40', 949),
  size('A4', 20, '45–50', 1149),
  size('A4', 24, '55–60', 1349),
  size('A4', 28, '65–70', 1649),
  size('A4', 32, '75–80', 1949),
  size('A4', 36, '85–90', 2149),
  size('A4', 40, '95–100', 2349),
  size('A5', 4, '', 200),
  // TODO: set the A5 8-page price in Admin → Sizes & Pricing. It stays hidden from customers until then.
  size('A5', 8, '', 0),
]

export const ABOUT = {
  tagline: 'A magazine made from your own story.',
  included: ['Premium quality printing', 'Custom layouts designed for you', 'Your captions and messages', 'Matched to the theme you choose'],
  required: [
    'Clear, high-quality photos',
    'Tell us your preferred theme in the special instructions',
    'Need more pages? We can extend any size on request',
  ],
  perfectFor: ['Anniversaries', 'Birthdays', 'Couples', 'Friends', 'Long-distance love', 'Family keepsakes'],
  important: ['Delivery time is shared when you order', 'Fully personalised for you', 'Your photos stay private. Nothing is posted without your permission.'],
  privacy: 'Your photos and orders stay private. Nothing is shared or posted without your permission.',
}

// The cart/order line for a magazine in a chosen size. Used by Add to Cart and the Buy Now flow.
export const magazineLine = (magazine, size) => ({
  kind: 'magazine',
  id: magazine.id,
  optionId: size.id,
  name: magazine.title,
  image: magazine.image,
  optionLabel: `${size.format} · ${size.pages} Pages`,
  price: size.price,
  mrp: size.mrp || 0,
  meta: { pages: size.pages, photos: size.photos, format: size.format },
  to: `/magazines/${magazine.id}`,
})
