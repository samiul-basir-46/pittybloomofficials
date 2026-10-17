// Starting content for the home page product cards.
// Each product's `to` points at its own page (see src/App.jsx). Items added later from Admin with no link
// fall back to /products/<id>, which shows a Coming Soon screen.
export const bestSelling = [
  { id: 'magazine', name: 'Magazine', image: '/images/best-selling/magazine.jpg', to: '/magazines' },
  { id: 'frame', name: 'Frame', image: '/images/best-selling/frame.jpg', to: '/frame' },
]

export const moreProducts = [
  { id: 'magazine', name: 'Magazine', image: '/images/products/magazine.jpg', to: '/magazines' },
  { id: 'frame', name: 'Frame', image: '/images/products/frame.jpg', to: '/frame' },
  { id: 'polaroids', name: 'Polaroids', image: '/images/products/polaroids.jpg', to: '/polaroids' },
  { id: 'sticker', name: 'Sticker', image: '/images/products/sticker.jpg', to: '/sticker' },
  { id: 'photo-strip', name: 'Photo Strip', image: '/images/products/photo-strip.jpg', to: '/photo-strip' },
]
