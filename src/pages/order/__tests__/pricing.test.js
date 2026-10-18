import { describe, expect, it } from 'vitest'
import { ORDER_DEFAULTS } from '../data'
import { SIZES } from '../../magazine-detail/data'
import { calcTotals, checkDate, orderingDay, parseRange, parseRushRules, rushSentence } from '../lib/pricing'
import { validateContact, validateDelivery, isPhone } from '../lib/validation'

const settings = ORDER_DEFAULTS
const at = (iso, hour = 10) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, hour, 0)
}
const size = (id) => SIZES.find((s) => s.id === id)

describe('A4 / A5 prices (from the old order form)', () => {
  it.each([
    ['a4-4', 299], ['a4-8', 549], ['a4-12', 749], ['a4-16', 949], ['a4-20', 1149],
    ['a4-24', 1349], ['a4-28', 1649], ['a4-32', 1949], ['a4-36', 2149], ['a4-40', 2349], ['a5-4', 200],
  ])('%s costs %i', (id, price) => expect(size(id).price).toBe(price))

  it('A5 8 pages has no price yet, so customers do not see it', () => expect(size('a5-8').price).toBe(0))
})

describe('delivery dates and rush charges', () => {
  const now = at('2026-10-18', 10) // before the 6 PM cut-off
  it('today is not available, tomorrow is +100, the day after is +50, then free (Inside Dhaka)', () => {
    expect(checkDate('2026-10-18', 'inside', settings, now).allowed).toBe(false)
    expect(checkDate('2026-10-19', 'inside', settings, now)).toMatchObject({ allowed: true, rush: 100 })
    expect(checkDate('2026-10-20', 'inside', settings, now)).toMatchObject({ allowed: true, rush: 50 })
    expect(checkDate('2026-10-21', 'inside', settings, now)).toMatchObject({ allowed: true, rush: 0 })
  })
  it('orders after 6 PM count from the next day', () => {
    const late = at('2026-10-18', 18)
    expect(orderingDay(late, 18)).toBe('2026-10-19')
    expect(checkDate('2026-10-19', 'inside', settings, late).allowed).toBe(false)
    expect(checkDate('2026-10-20', 'inside', settings, late)).toMatchObject({ allowed: true, rush: 100 })
  })
  it('Outside Dhaka never has a rush charge and needs the minimum lead time', () => {
    expect(checkDate('2026-10-19', 'outside', settings, now).allowed).toBe(false)
    expect(checkDate('2026-10-21', 'outside', settings, now)).toMatchObject({ allowed: true, rush: 0 })
  })
  it('works across a month end', () => {
    expect(checkDate('2026-11-01', 'inside', settings, at('2026-10-31', 9))).toMatchObject({ allowed: true, rush: 100 })
  })
  it('parses rush rules and ignores broken lines', () => {
    expect(parseRushRules('2 | 50\n1 | 100\nnonsense')).toEqual([{ days: 1, charge: 100 }, { days: 2, charge: 50 }])
    expect(rushSentence(settings, (n) => `৳${n}`)).toBe('Inside Dhaka: 1 day is +৳100, 2 days is +৳50 (Orders placed after 6:00 PM count from the next day).')
  })
})

describe('order totals', () => {
  const now = at('2026-10-18', 10)
  const copy = (id) => ({ size: size(id) })

  it('adds magazines, add-ons, delivery and rush charge', () => {
    const t = calcTotals({ copies: [copy('a4-8'), copy('a4-8'), copy('a5-4')], addons: [{ price: 299, qty: 1 }], location: 'inside', date: '2026-10-19', settings, now })
    expect(t).toMatchObject({ magazineTotal: 549 * 2 + 200, addonTotal: 299, deliveryCharge: 60, rushCharge: 100, rushDays: 1 })
    expect(t.total).toBe(1298 + 299 + 60 + 100)
  })
  it('charges Outside Dhaka delivery with no rush', () => {
    expect(calcTotals({ copies: [copy('a4-8')], location: 'outside', date: '2026-10-21', settings, now }).total).toBe(549 + 110)
  })
  it('shows only the magazine price until a location is chosen', () => {
    expect(calcTotals({ copies: [copy('a4-8')], settings, now }).total).toBe(549)
  })
  it('counts a discount only when an MRP is set', () => {
    expect(calcTotals({ copies: [{ size: { price: 549, mrp: 699 } }], settings, now }).savings).toBe(150)
    expect(calcTotals({ copies: [copy('a4-8')], settings, now }).savings).toBe(0)
  })
})

describe('validation', () => {
  it('accepts Bangladeshi mobile numbers', () => {
    ;['01712345678', '+8801712345678', '017-1234 5678'].forEach((n) => expect(isPhone(n)).toBe(true))
    ;['0171234', '02123456789', 'abc'].forEach((n) => expect(isPhone(n)).toBe(false))
  })
  it('reports every missing delivery field beside its own field', () => {
    const errs = validateDelivery({ delivery: { phone: '', address: '', city: '', location: '', date: '' }, settings, now: at('2026-10-18') })
    expect(Object.keys(errs).sort()).toEqual(['address', 'city', 'date', 'location', 'phone'])
  })
  it('rejects a date that became invalid after the location changed', () => {
    const errs = validateDelivery({ delivery: { phone: '01712345678', address: 'x', city: 'y', location: 'outside', date: '2026-10-19' }, settings, now: at('2026-10-18') })
    expect(errs.date).toMatch(/no longer available/)
  })
  it('contact: name and phone are required, email is optional but checked', () => {
    expect(Object.keys(validateContact({ contact: { name: '', phone: '', email: '' } })).sort()).toEqual(['contactPhone', 'name'])
    expect(validateContact({ contact: { name: 'A', phone: '01712345678', email: 'bad' } }).email).toBeTruthy()
    expect(validateContact({ contact: { name: 'A', phone: '01712345678', email: '' } })).toEqual({})
  })
  it('recommended photo range', () => {
    expect(parseRange('16–22')).toEqual({ min: 16, max: 22 })
    expect(parseRange('')).toBeNull()
  })
})
