import { describe, expect, it } from 'vitest'
import { availableSizes, giftCardPrice, sizeById } from './sizes'
import { itemCategory } from '../../shared/utils/orderCategory'

describe('gift card sizes', () => {
  it('prices each size and hides unpriced sizes', () => {
    const card = { priceA4: 250, priceA3: 0 }
    expect(giftCardPrice(card, 'a4')).toBe(250)
    expect(giftCardPrice(card, 'a3')).toBe(0)
    expect(availableSizes(card).map((size) => size.id)).toEqual(['a4'])
    expect(sizeById('a3').cm).toBe('29.7 × 42 cm')
  })
  it('files gift card order lines under Gift Card', () => {
    expect(itemCategory({ kind: 'product', id: 'gift-card', optionId: 'gift-card-a4', name: 'Gift Card' })).toBe('gift-card')
  })
})
