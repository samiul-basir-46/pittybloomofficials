import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleGuestOrder } from './guestOrders'
import { dateOffsetFromDhaka, minimumDeliveryDate } from '../../../src/shared/utils/manualOrderRules'

const sessionKey = 'f'.repeat(32)
let sequence = 0
const photo = (name) => {
  const id = (++sequence).toString(16).padStart(32, '0')
  return { id, name, size: 100, type: 'image/jpeg', storageKey: `manual-orders/${sessionKey}/${id}` }
}
const values = (map) => ({ mapValue: { fields: Object.fromEntries(Object.entries(map).map(([key, value]) => [key, typeof value === 'number' ? { integerValue: String(value) } : { stringValue: String(value) }])) } })
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => { vi.unstubAllGlobals(); sequence = 0 })

describe('guest multi-product order endpoint', () => {
  it('reprices and saves several independent items, and safely returns the same order on retry', async () => {
    const now = new Date()
    const area = 'inside'
    const hasPolaroids = true
    const date = minimumDeliveryDate({ area, hasPolaroids, now })
    const files = []
    const addPhotos = (count, prefix) => Array.from({ length: count }, (_, index) => {
      const saved = photo(`${prefix}-${index + 1}.jpg`); files.push(saved); return saved
    })
    const polaroids = addPhotos(1, 'polaroid')
    const frame = addPhotos(1, 'frame')
    const miniOne = addPhotos(2, 'mini-one')
    const miniTwo = addPhotos(2, 'mini-two')
    const magazineA4 = addPhotos(2, 'mag-a4')
    const magazineA5 = addPhotos(2, 'mag-a5')
    const songOne = addPhotos(2, 'song-one')
    const songTwo = addPhotos(2, 'song-two')
    const frameReference = photo('frame-reference.jpg'); files.push(frameReference)
    const input = {
      submissionKey: sessionKey,
      customer: { name: 'Mina', instagram: 'mina.gifts', whatsapp: '01712345678' },
      delivery: { recipient: 'Rafi', phone: '01812345678', address: 'House 4, Road 2', city: 'Dhaka', area, date },
      items: [
        { type: 'polaroids', quantity: 9, photos: polaroids },
        { type: 'frame', optionId: 'Medium (8×10 in)', quantity: 2, photos: frame, referenceFile: frameReference, price: 1 },
        { type: 'mini-magazine', quantity: 1, photos: miniOne, frontId: miniOne[0].id, backId: miniOne[1].id },
        { type: 'mini-magazine', quantity: 1, photos: miniTwo, frontId: miniTwo[1].id, backId: miniTwo[0].id },
        { type: 'magazine', sizeId: 'a4-20', category: 'Birthday', custom: { name: 'Asha', age: '20', date: '2026-11-05' }, photos: magazineA4, frontId: magazineA4[0].id, backId: magazineA4[1].id },
        { type: 'magazine', sizeId: 'a5-4', category: 'Couple', custom: { names: 'Mina & Rafi' }, photos: magazineA5, frontId: magazineA5[1].id, backId: magazineA5[0].id },
        { type: 'song-book', songName: 'Our Song', lyrics: 'A song with enough lyrics to lay out across the twelve printed pages.', photos: songOne, frontId: songOne[0].id, backId: songOne[1].id },
        { type: 'song-book', songName: 'Another Song', lyrics: 'A second independent song book with its own photos and cover selections.', photos: songTwo, frontId: songTwo[1].id, backId: songTwo[0].id },
      ],
    }
    const documentFields = []
    const existingById = new Map()
    const fetchMock = vi.fn(async (url, options = {}) => {
      const target = String(url)
      if (target.includes('/contentData/')) {
        if (target.endsWith('printSizes--a4-20')) return jsonResponse({ fields: { value: values({ id: 'a4-20', format: 'A4', pages: 20, price: 1149, photos: '45–50' }) } })
        return jsonResponse({ error: { status: 'NOT_FOUND' } }, 404)
      }
      if (target.includes('/orders?documentId=') && options.method === 'POST') {
        const body = JSON.parse(options.body); documentFields.push(body)
        const id = new URL(target).searchParams.get('documentId')
        existingById.set(id, body)
        return documentFields.length === 1 ? jsonResponse({ name: id }) : jsonResponse({ error: { status: 'ALREADY_EXISTS' } }, 409)
      }
      const existing = target.match(/\/orders\/([^/?]+)$/)
      if (existing) return existingById.has(existing[1]) ? jsonResponse({ fields: existingById.get(existing[1]).fields }) : jsonResponse({}, 404)
      throw new Error(`Unexpected fetch in test: ${target}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const env = { FIREBASE_PROJECT_ID: 'test-project', MEDIA_BUCKET: { head: vi.fn(async (key) => {
      const entry = files.find((file) => file.storageKey === key)
      return entry ? { size: entry.size, httpMetadata: { contentType: entry.type } } : null
    }) } }
    const request = () => new Request('https://worker.test/guest-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })

    const earliestDate = input.delivery.date
    const tooSoon = new Date(`${earliestDate}T00:00:00Z`)
    tooSoon.setUTCDate(tooSoon.getUTCDate() - 1)
    input.delivery.date = tooSoon.toISOString().slice(0, 10)
    const rejected = await handleGuestOrder(request(), env, {})
    expect(rejected.status).toBe(400)
    expect((await rejected.json()).error).toMatch(/too soon/)
    input.delivery.date = earliestDate

    const first = await handleGuestOrder(request(), env, {})
    const saved = await first.json()
    expect(first.status).toBe(201)
    expect(saved.order.items).toHaveLength(8)
    expect(saved.order.items.map((item) => item.price)).toEqual([8, 999, 150, 150, 1149, 200, 849, 849])
    expect(saved.order.items[1].photos.reference.storageKey).toBe(frameReference.storageKey)
    expect(saved.order.items[4].photos.front).toBe(magazineA4[0].name)
    expect(saved.order.magazineTotal).toBe(1349)
    expect(saved.order.otherTotal).toBe(4068)
    const offset = dateOffsetFromDhaka(date, now)
    expect(saved.order.deliveryInfo.daysAhead).toBe(offset)
    expect(saved.order.deliveryCharge).toBe(60)
    expect(saved.order.rushCharge).toBe(100)
    expect(saved.order.total).toBe(5417 + 60 + saved.order.rushCharge)
    expect(saved.order.customer.recipient).toBe('Rafi')
    expect(saved.order.customer.name).toBe('Mina')
    expect(saved.order.deliveryInfo.recipient).toBe('Rafi')

    const retry = await handleGuestOrder(request(), env, {})
    const retried = await retry.json()
    expect(retry.status).toBe(200)
    expect(retried.order.id).toBe(saved.order.id)
    expect(documentFields).toHaveLength(2) // one create attempt plus idempotent retry lookup
  })
})
