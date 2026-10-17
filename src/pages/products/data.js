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
    options: 'Pack of 10 | 399\nPack of 20 | 699 | 799 | Most Popular\nPack of 30 | 949 | 1199 | Best Value',
  },
  {
    id: 'sticker',
    name: 'Sticker',
    image: '/images/products/sticker.jpg',
    status: 'Available',
    tagline: 'Stick your memories anywhere.',
    description: 'Custom stickers cut from your photos and designs. Great for laptops, journals and gifts.',
    options: 'Sheet of 12 | 299\nSheet of 24 | 499 | 599 | Most Popular\nSheet of 36 | 699 | 899 | Best Value',
  },
  {
    id: 'photo-strip',
    name: 'Photo Strip',
    image: '/images/products/photo-strip.jpg',
    status: 'Available',
    tagline: 'Photo booth vibes, made by you.',
    description: 'Photo booth style strips printed from your pictures. Perfect for sharing with the people in them.',
    options: '3 Strips | 249\n6 Strips | 449 | 499 | Most Popular\n10 Strips | 699 | 799 | Best Value',
  },
]
