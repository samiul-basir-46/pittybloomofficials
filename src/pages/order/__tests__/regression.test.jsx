import { describe, expect, it } from 'vitest'
import { buildOrder } from '../../../shared/utils/orders'
import { magazineLine } from '../../magazine-detail/data'
import { SIZES } from '../../magazine-detail/data'
import { SECTIONS } from '../../../admin/sections'

describe('existing cart checkout is unchanged', () => {
  it('builds the same order as before when no delivery extras are given', () => {
    const line = magazineLine({ id: 'm', title: 'Classic', image: '', mrp: 1999 }, SIZES.find((s) => s.id === 'a4-8'))
    const order = buildOrder({ id: 'PB-1', cartItems: [{ ...line, qty: 2 }], customer: { name: 'A', phone: '1', address: 'x', note: '' } })
    expect(order).toMatchObject({ magazineTotal: 1098, total: 1098, delivery: 'To be confirmed' })
    expect(order.deliveryInfo).toBeUndefined()
    expect(line.optionLabel).toBe('A4 · 8 Pages')
  })
})

describe('admin: Sizes & Pricing rules', () => {
  const sizes = SECTIONS.find((s) => s.path === 'sizes')
  const check = (item) => sizes.validate(item, { items: SIZES })

  it('A5 cannot have more than 8 pages', async () => {
    expect(await check({ id: 'x', format: 'A5', pages: 12, price: 300 })).toMatch(/at most 8 pages/)
    expect(await check({ id: 'x', format: 'A4', pages: 40, price: 300 })).toMatch(/already exists/)
  })
  it('pages must be a multiple of 4 and prices cannot be negative', async () => {
    expect(await check({ id: 'x', format: 'A4', pages: 10, price: 300 })).toMatch(/multiple of 4/)
    expect(await check({ id: 'x', format: 'A5', pages: 8, price: -5 })).toMatch(/negative/)
  })
  it('the A5 8-page option can be priced by editing it', async () => {
    expect(await check({ id: 'a5-8', format: 'A5', pages: 8, price: 350 })).toBe('')
  })
})
