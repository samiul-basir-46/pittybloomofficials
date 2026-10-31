// Starting content for the shop products (Frame, Polaroids, Sticker, Photo Strip). Edit from Admin → Products.
// `options` is one choice per line:  Name | Price | MRP (optional) | Tag (optional)
// NOTE: prices below are placeholders. Set the real ones in Admin.
export const products = [
  {
    id: 'frame',
    name: 'Frame',
    image: '/images/products/frame.jpg',
    status: 'Available',
    tagline: 'Your favourite moment, framed.',
    description: 'A personalised photo frame made from your own picture, ready to hang or place on a shelf.',
    options: 'Small (6×8 in) | 699 | 899\nMedium (8×10 in) | 999 | 1299 | Most Popular\nLarge (12×16 in) | 1499 | 1899',
  },
  {
    id: 'polaroids',
    name: 'Polaroids',
    image: '/images/products/polaroids.jpg',
    status: 'Available',
    tagline: 'Little memories you can hold.',
    description: 'Classic polaroid-style prints made from your photos, with a white border for captions.',
    unitPrice: 8,
    minQuantity: 9,
    options: 'Pack of 10 | 399\nPack of 20 | 699 | 799 | Most Popular\nPack of 30 | 949 | 1199 | Best Value',
  },
]
