import { describe, expect, it } from 'vitest'
import { buildOrder } from './orders'

const frameItem = (extra = {}) => ({
  kind: 'frame', id: 'frame-1', name: 'Wood frame', image: '/frame.jpg', optionLabel: 'Wood frame · Rose', qty: 1, price: 150, ...extra,
})

describe('buildOrder frame designs', () => {
  it('keeps the design each frame was ordered with', () => {
    const design = { id: 'd1', name: 'Rose', image: 'https://media.example/catalog-images/abc12345' }
    const order = buildOrder({ id: 'PB-1', cartItems: [frameItem({ design }), frameItem({ design: { id: 'd2', name: 'Lily', image: 'https://media.example/catalog-images/def67890' } })], customer: {} })
    expect(order.items.map((item) => item.design.id)).toEqual(['d1', 'd2'])
    expect(order.total).toBe(300)
  })

  it('leaves out the design field when none was chosen (Firestore rejects undefined)', () => {
    const order = buildOrder({ id: 'PB-2', cartItems: [frameItem()], customer: {} })
    expect('design' in order.items[0]).toBe(false)
  })
})
