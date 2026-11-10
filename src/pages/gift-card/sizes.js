// Standard paper sizes. Only the prices are set by the shop (Admin → Gift Card).
export const GIFT_CARD_SIZES = [
  { id: 'a4', label: 'A4', priceKey: 'priceA4', widthMm: 210, heightMm: 297, cm: '21 × 29.7 cm', inch: '8.3 × 11.7 in', letterLimit: 1500 },
  { id: 'a3', label: 'A3', priceKey: 'priceA3', widthMm: 297, heightMm: 420, cm: '29.7 × 42 cm', inch: '11.7 × 16.5 in', letterLimit: 2500 },
]
export const NOTE_LIMIT = 300
export const MAX_GIFT_PHOTOS = 6

export const sizeById = (id) => GIFT_CARD_SIZES.find((size) => size.id === id) ?? null
export const giftCardPrice = (card, sizeId) => {
  const size = sizeById(sizeId)
  return size ? Number(card?.[size.priceKey]) || 0 : 0
}
// Sizes the shop has priced; an unpriced size is hidden from customers.
export const availableSizes = (card) => GIFT_CARD_SIZES.filter((size) => giftCardPrice(card, size.id) > 0)
