// Items without a `to` link open the "Coming Soon" page at /products/<id>.
// When a product page is designed, set its `to` here (or in Admin) and add the route in App.jsx.
export const bestSelling = [
  { id: 'magazine', name: 'Magazine', image: '/images/best-selling/magazine.jpg', to: '/magazines' },
  { id: 'frame', name: 'Frame', image: '/images/best-selling/frame.jpg', to: '/products/frame' },
]

export const moreProducts = [
  { id: 'magazine', name: 'Magazine', image: '/images/products/magazine.jpg', to: '/magazines' },
  { id: 'frame', name: 'Frame', image: '/images/products/frame.jpg', to: '/products/frame' },
  { id: 'polaroids', name: 'Polaroids', image: '/images/products/polaroids.jpg', to: '/products/polaroids' },
  { id: 'sticker', name: 'Sticker', image: '/images/products/sticker.jpg', to: '/products/sticker' },
  { id: 'photo-strip', name: 'Photo Strip', image: '/images/products/photo-strip.jpg', to: '/products/photo-strip' },
]