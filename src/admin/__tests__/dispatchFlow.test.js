import { describe, expect, it, vi } from 'vitest'
import { dispatchOrder } from '../dispatchFlow'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) } }
const form = { recipient_name: 'Rahim', recipient_phone: '01712345678', recipient_address: 'House 1, Dhaka', cod_amount: '1200', note: '' }
const ok = { tracking_code: 'TRK1', consignment_id: 77, consignment: { tracking_code: 'TRK1' } }
const shapes = {
  regular: { id: 'PB-261025-01', ownerUid: 'u1', customer: { name: 'A', uid: 'u1' } },
  guest: { id: 'PB-261025-ABCDEF1234', source: 'Manual guest order', customer: { name: 'A', address: 'x, Dhaka' } },
}

describe.each(Object.entries(shapes))('dispatch of %s order', (_, order) => {
  it('ships and records tracking', async () => {
    const record = vi.fn().mockResolvedValue()
    const res = await dispatchOrder({ order, form, createConsignment: vi.fn().mockResolvedValue(ok), recordShipment: record, storage: memory() })
    expect(res.ok).toBe(true)
    expect(record).toHaveBeenCalledWith(order.id, expect.objectContaining({ status: 'Shipped', trackingNumber: 'TRK1', consignmentId: '77' }))
  })
  it('shows the real courier error and saves nothing', async () => {
    const record = vi.fn()
    const res = await dispatchOrder({ order, form, createConsignment: vi.fn().mockRejectedValue(new Error('Invalid phone')), recordShipment: record, storage: memory() })
    expect(res).toMatchObject({ ok: false, stage: 'courier', message: 'Invalid phone' })
    expect(record).not.toHaveBeenCalled()
  })
  it('does not create a second shipment when the save failed the first time', async () => {
    const storage = memory()
    const create = vi.fn().mockResolvedValue(ok)
    const record = vi.fn().mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('x')).mockResolvedValue()
    const first = await dispatchOrder({ order, form, createConsignment: create, recordShipment: record, storage })
    expect(first).toMatchObject({ ok: false, stage: 'save' })
    const second = await dispatchOrder({ order, form, createConsignment: create, recordShipment: record, storage })
    expect(second.ok).toBe(true)
    expect(create).toHaveBeenCalledTimes(1)
  })
  it('refuses an order that already has a shipment', async () => {
    const create = vi.fn()
    const res = await dispatchOrder({ order: { ...order, trackingNumber: 'T' }, form, createConsignment: create, recordShipment: vi.fn(), storage: memory() })
    expect(res.stage).toBe('duplicate')
    expect(create).not.toHaveBeenCalled()
  })
})
