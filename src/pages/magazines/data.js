const make = (id, title, extra = {}) => ({
  id,
  title,
  price: 1499,
  mrp: 1999,
  badge: '',
  image: `/images/magazines/${id}.jpg`,
  backImage: `/images/magazines/${id}-inside.jpg`,
  ...extra,
})

export const magazines = [
  make('classic-magazine', 'Classic Magazine', { badge: 'Best Seller' }),
  make('couple-magazine', 'Couple Magazine'),
  make('birthday-magazine', 'Birthday Magazine'),
  make('wedding-magazine', 'Wedding Magazine', { price: 1999 }),
  make('anniversary-magazine', 'Anniversary Magazine'),
  make('friendship-magazine', 'Friendship Magazine'),
  make('memories-magazine', 'Memories Magazine', { badge: 'New Release' }),
  make('family-magazine', 'Family Magazine'),
]
