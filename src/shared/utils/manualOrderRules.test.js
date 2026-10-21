import { describe, expect, it } from 'vitest'
import { dateOffsetFromDhaka, deliveryFee, expeditedSurcharge, minimumDeliveryDate } from './manualOrderRules'

const beforeCutoff = new Date('2026-10-22T11:59:00.000Z') // 17:59 in Dhaka
const atCutoff = new Date('2026-10-22T12:00:00.000Z') // 18:00 in Dhaka

describe('manual order delivery dates and express charges', () => {
  it('uses the Dhaka area and the exact 6 PM cutoff to set availability', () => {
    expect(minimumDeliveryDate({ area: 'inside', now: beforeCutoff })).toBe('2026-10-23')
    expect(minimumDeliveryDate({ area: 'outside', now: beforeCutoff })).toBe('2026-10-24')
    expect(minimumDeliveryDate({ area: 'inside', now: atCutoff })).toBe('2026-10-24')
    expect(minimumDeliveryDate({ area: 'outside', now: atCutoff })).toBe('2026-10-25')
  })

  it('charges eligible products from the first available day, not from order day', () => {
    expect(expeditedSurcharge({ date: '2026-10-23', area: 'inside', hasRushProducts: true, now: beforeCutoff })).toBe(100)
    expect(expeditedSurcharge({ date: '2026-10-24', area: 'inside', hasRushProducts: true, now: beforeCutoff })).toBe(50)
    expect(expeditedSurcharge({ date: '2026-10-25', area: 'inside', hasRushProducts: true, now: beforeCutoff })).toBe(0)

    expect(expeditedSurcharge({ date: '2026-10-23', area: 'outside', hasRushProducts: true, now: beforeCutoff })).toBeNull()
    expect(expeditedSurcharge({ date: '2026-10-24', area: 'outside', hasRushProducts: true, now: beforeCutoff })).toBe(100)
    expect(expeditedSurcharge({ date: '2026-10-25', area: 'outside', hasRushProducts: true, now: beforeCutoff })).toBe(50)
    expect(expeditedSurcharge({ date: '2026-10-26', area: 'outside', hasRushProducts: true, now: beforeCutoff })).toBe(0)
  })

  it('shifts the first and second eligible day at or after 6 PM in Dhaka', () => {
    expect(expeditedSurcharge({ date: '2026-10-23', area: 'inside', hasRushProducts: true, now: atCutoff })).toBeNull()
    expect(expeditedSurcharge({ date: '2026-10-24', area: 'inside', hasRushProducts: true, now: atCutoff })).toBe(100)
    expect(expeditedSurcharge({ date: '2026-10-25', area: 'inside', hasRushProducts: true, now: atCutoff })).toBe(50)
    expect(expeditedSurcharge({ date: '2026-10-26', area: 'inside', hasRushProducts: true, now: atCutoff })).toBe(0)

    expect(expeditedSurcharge({ date: '2026-10-24', area: 'outside', hasRushProducts: true, now: atCutoff })).toBeNull()
    expect(expeditedSurcharge({ date: '2026-10-25', area: 'outside', hasRushProducts: true, now: atCutoff })).toBe(100)
    expect(expeditedSurcharge({ date: '2026-10-26', area: 'outside', hasRushProducts: true, now: atCutoff })).toBe(50)
    expect(expeditedSurcharge({ date: '2026-10-27', area: 'outside', hasRushProducts: true, now: atCutoff })).toBe(0)
  })

  it('does not charge Polaroids, Frames, or Mini Pocket Magazine, and keeps delivery fees separate', () => {
    expect(expeditedSurcharge({ date: '2026-10-23', area: 'inside', hasRushProducts: false, now: beforeCutoff })).toBe(0)
    expect(deliveryFee('inside')).toBe(60)
    expect(deliveryFee('outside')).toBe(110)
    expect(dateOffsetFromDhaka('2026-10-22', beforeCutoff)).toBe(0)
    expect(dateOffsetFromDhaka('2026-02-30', beforeCutoff)).toBeNaN()
  })
})
