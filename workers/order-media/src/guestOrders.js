const FIRESTORE = 'https://firestore.googleapis.com/v1/projects'
import { dateOffsetFromDhaka, expeditedSurcharge, minimumDeliveryOffset, ORDER_IMAGE_TYPES } from '../../../src/shared/utils/manualOrderRules.js'
import { MANUAL_ORDER_CATALOG_DEFAULTS, MANUAL_ORDER_TYPE_TO_CARD, mergeManualOrderCatalog } from '../../../src/pages/manual-order/catalog.js'

const IMAGE_TYPES = ORDER_IMAGE_TYPES
const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const SAFE_ID = /^[a-f0-9]{32}$/i
const CATEGORIES = ['Birthday', 'Couple', 'Anniversary', 'Personal', 'Parents', 'Marriage', 'Special Day', 'Farewell', 'Best Friends', 'Other']
const CATEGORY_REQUIRED = {
  Birthday: ['name', 'age', 'date'], Couple: ['names'], Anniversary: ['names', 'date', 'year'],
  Personal: ['name'], Parents: ['names'], Marriage: ['names', 'date'], 'Special Day': ['name'],
  Farewell: ['name'], 'Best Friends': ['names'], Other: ['occasion'],
}
const CATEGORY_LABELS = { name: 'Name', age: 'Age', date: 'Date', names: 'Names', year: 'Anniversary year', occasion: 'Occasion' }
const DEFAULT_SIZES = [
  ['a4-4', 'A4', 4, 299], ['a4-8', 'A4', 8, 549], ['a4-12', 'A4', 12, 749], ['a4-16', 'A4', 16, 949],
  ['a4-20', 'A4', 20, 1149], ['a4-24', 'A4', 24, 1349], ['a4-28', 'A4', 28, 1649], ['a4-32', 'A4', 32, 1949],
  ['a4-36', 'A4', 36, 2149], ['a4-40', 'A4', 40, 2349], ['a5-4', 'A5', 4, 200], ['a5-8', 'A5', 8, 0],
].map(([id, format, pages, price]) => ({ id, format, pages, price, photos: '' }))
const DEFAULT_FRAME_OPTIONS = [
  { id: 'Small (6×8 in)', label: 'Small (6×8 in)', price: 699 },
  { id: 'Medium (8×10 in)', label: 'Medium (8×10 in)', price: 999 },
  { id: 'Large (12×16 in)', label: 'Large (12×16 in)', price: 1499 },
]

const text = (value, max = 2000) => String(value ?? '').trim().slice(0, max)
const safeName = (value) => text(value, 180).replace(/[\u0000-\u001f]/g, '')
const json = (body, status, cors) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors } })

async function readLimitedBody(stream) {
  if (!stream) return new Uint8Array(0)
  const reader = stream.getReader()
  const chunks = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_IMAGE_BYTES) { await reader.cancel(); return null }
    chunks.push(value)
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  return body
}

function decodeValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue)
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {})
  return null
}
function decodeFields(fields = {}) { return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)])) }
function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } }
  return { mapValue: { fields: encodeFields(value) } }
}
function encodeFields(value) { return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encodeValue(entry)])) }

const docsBase = (project) => `${FIRESTORE}/${encodeURIComponent(project)}/databases/(default)/documents`
async function getFirestoreDoc(project, path) {
  const response = await fetch(`${docsBase(project)}/${path}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Could not load trusted order settings (${response.status}).`)
  const doc = await response.json()
  return decodeFields(doc.fields ?? {})
}

function parseProductOptions(value = '') {
  return String(value).split('\n').map((line) => {
    const [label = '', rawPrice = ''] = line.split('|').map((part) => part.trim())
    return { id: label, label, price: Number(rawPrice) }
  }).filter((option) => option.label && Number.isFinite(option.price) && option.price > 0)
}

// Every design uploaded in Admin > Frames, so the guest form only ever accepts designs that really exist.
async function loadFrameDesigns(project) {
  try {
    const response = await fetch(`${docsBase(project)}:runQuery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'contentData' }], where: { fieldFilter: { field: { fieldPath: 'group' }, op: 'EQUAL', value: { stringValue: 'frameProducts' } } } } }),
    })
    if (!response.ok) return []
    const rows = await response.json()
    const designs = new Map()
    for (const row of Array.isArray(rows) ? rows : []) {
      const value = row?.document ? decodeFields(row.document.fields ?? {}).value : null
      if (!value || value.status === 'Inactive' || !Array.isArray(value.designs)) continue
      for (const design of value.designs) {
        if (design?.id && design.image && !designs.has(String(design.id))) designs.set(String(design.id), { id: String(design.id).slice(0, 80), name: text(design.name, 80), image: String(design.image).slice(0, 600) })
      }
    }
    return [...designs.values()]
  } catch { return [] }
}

async function trustedCatalog(project) {
  const frameDoc = await getFirestoreDoc(project, 'contentData/products--frame')
  const sizeDocs = await Promise.all(DEFAULT_SIZES.map((size) => getFirestoreDoc(project, `contentData/printSizes--${encodeURIComponent(size.id)}`)))
  const settingsDoc = await getFirestoreDoc(project, 'contentData/orderSettings--singleton')
  const manualOrderDoc = await getFirestoreDoc(project, 'contentData/manualOrderCatalog--singleton')
  const frameProduct = frameDoc?.value
  const frameDesigns = await loadFrameDesigns(project)
  const configuredSizes = DEFAULT_SIZES.map((fallback, index) => {
    const saved = sizeDocs[index]?.value
    return saved ? { ...fallback, ...saved, id: fallback.id } : fallback
  })
  return {
    frameDesigns,
    frameOptions: frameProduct ? parseProductOptions(frameProduct.options) : DEFAULT_FRAME_OPTIONS,
    sizes: configuredSizes,
    deliverySettings: settingsDoc?.value ?? {},
    manualOrderCatalog: mergeManualOrderCatalog(manualOrderDoc?.value ?? MANUAL_ORDER_CATALOG_DEFAULTS),
  }
}

function dhakaNow(now = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(({ type, value }) => [type, value]))
}
async function verifyMedia(env, sessionKey, files, allowEmpty = true) {
  if (!Array.isArray(files) || (!allowEmpty && !files.length) || files.length > 50) throw new Error('This item has an invalid number of photos.')
  const verified = []
  for (const file of files) {
    const id = String(file?.id ?? '')
    const key = String(file?.storageKey ?? '')
    const size = Number(file?.size)
    const type = String(file?.type ?? '')
    if (!SAFE_ID.test(id) || key !== `manual-orders/${sessionKey}/${id}` || !IMAGE_TYPES.has(type) || !Number.isInteger(size) || size < 1 || size > MAX_IMAGE_BYTES) {
      throw new Error('An uploaded photo is invalid. Please remove it and add it again.')
    }
    const object = await env.MEDIA_BUCKET.head(key)
    if (!object || Number(object.size) !== size || object.httpMetadata?.contentType !== type) throw new Error(`The uploaded photo ${safeName(file.name)} could not be verified. Please upload it again.`)
    verified.push({ id, name: safeName(file.name) || 'order-photo', size, type, storageKey: key })
  }
  return verified
}

async function verifyReference(env, sessionKey, file) {
  if (!file) return null
  const verified = await verifyMedia(env, sessionKey, [file], false)
  return verified[0]
}

function coverName(files, id) { return files.find((file) => file.id === id)?.name ?? '' }
function assertCovers(files, item) {
  if (files.length < 2) throw new Error('Add at least two photos so every front and back cover can be selected.')
  if (!files.some((file) => file.id === item.frontId) || !files.some((file) => file.id === item.backId)) throw new Error('Choose front and back cover photos from this item’s uploaded photos.')
}

function buildItem(input, config, photos, referenceFile) {
  const quantity = Number(input.quantity ?? 1)
  const notes = text(input.notes, 2000)
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('One item has an invalid quantity.')
  const cardId = MANUAL_ORDER_TYPE_TO_CARD[input.type]
  const card = cardId ? config.manualOrderCatalog[cardId] : null
  if (!card?.enabled) throw new Error('One of the selected products is no longer available. Remove it and try again.')
  if (input.type === 'polaroids') {
    const unitPrice = Number(card.unitPrice)
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Polaroid pricing is not available. Please contact us.')
    if (quantity < Number(card.minQuantity || 9)) throw new Error(`Polaroids must be ordered in quantities of ${Number(card.minQuantity || 9)} or more.`)
    if (!photos.length) throw new Error('Add at least one photo for the Polaroids.')
    return { kind: 'polaroids', id: 'polaroids', name: card.title, optionLabel: `${quantity} pieces`, qty: quantity, price: unitPrice, note: notes, photos: { count: photos.length, files: photos, reference: referenceFile, names: photos.map((file) => file.name) } }
  }
  if (input.type === 'frame') {
    if (!photos.length) throw new Error('Add at least one print photo for this frame.')
    if (quantity > Number(card.maxQuantity || 20)) throw new Error(`Frame quantity cannot be more than ${Number(card.maxQuantity || 20)} for one size.`)
    const option = config.frameOptions.find((row) => row.id === input.optionId)
    if (!option) throw new Error('A selected frame size is no longer available. Please choose another size.')
    const designs = config.frameDesigns ?? []
    const design = input.designId ? designs.find((row) => row.id === String(input.designId)) : null
    if (input.designId && !design) throw new Error('A selected frame design is no longer available. Please choose another design.')
    if (!design && designs.length && !referenceFile) throw new Error('Choose a design for each frame.')
    return { kind: 'frame', id: 'frame', name: card.title, optionLabel: design?.name ? `${option.label} · ${design.name}` : option.label, ...(design ? { design: { id: design.id, name: design.name, image: design.image } } : {}), qty: quantity, price: option.price, note: notes, photos: { count: photos.length, files: photos, reference: referenceFile, names: photos.map((file) => file.name) } }
  }
  if (input.type === 'mini-magazine') {
    const unitPrice = Number(card.unitPrice)
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Mini Magazine pricing is not available. Please contact us.')
    if (quantity !== 1 || photos.length < 2 || photos.length > 8) throw new Error('Each Mini Pocket Magazine needs 2 to 8 photos.')
    assertCovers(photos, input)
    return { kind: 'mini-magazine', id: 'mini-pocket-magazine', name: card.title, optionLabel: `${photos.length} photos`, qty: 1, price: unitPrice, note: notes, details: notes ? [{ label: 'Notes', value: notes }] : [], meta: { pages: 8 }, photos: { count: photos.length, files: photos, names: photos.map((file) => file.name), front: coverName(photos, input.frontId), back: coverName(photos, input.backId), frontId: input.frontId, backId: input.backId } }
  }
  if (input.type === 'magazine') {
    const size = config.sizes.find((row) => row.id === input.sizeId && Number(row.price) > 0)
    if (!size || (size.format === 'A4' && (size.pages < 4 || size.pages > 40 || size.pages % 4 !== 0)) || (size.format === 'A5' && ![4, 8].includes(size.pages))) throw new Error('A selected magazine size or page count is unavailable. Please choose a configured option.')
    if (quantity !== 1 || !CATEGORIES.includes(input.category)) throw new Error('Each magazine must be configured separately with a valid category.')
    for (const key of CATEGORY_REQUIRED[input.category] ?? []) if (!text(input.custom?.[key], 300)) throw new Error(`${CATEGORY_LABELS[key]} is required for this magazine.`)
    assertCovers(photos, input)
    const details = [{ label: 'Occasion', value: input.category }]
    for (const [key, value] of Object.entries(input.custom ?? {})) if (text(value, 300)) details.push({ label: CATEGORY_LABELS[key] ?? key, value: text(value, 300) })
    if (notes) details.push({ label: 'Additional notes', value: notes })
    return { kind: 'magazine', id: 'custom-magazine', name: card.title, optionLabel: `${size.format} · ${size.pages} Pages`, qty: 1, price: Number(size.price), meta: { pages: size.pages, photos: size.photos || '', format: size.format }, details, photos: { count: photos.length, files: photos, names: photos.map((file) => file.name), front: coverName(photos, input.frontId), back: coverName(photos, input.backId), frontId: input.frontId, backId: input.backId } }
  }
  if (input.type === 'song-book') {
    const unitPrice = Number(card.unitPrice)
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Song Book pricing is not available. Please contact us.')
    if (quantity !== 1 || !text(input.songName, 200) || !text(input.lyrics, 20000)) throw new Error('Enter a song name and lyrics for each Song Book.')
    assertCovers(photos, input)
    const details = [{ label: 'Song name', value: text(input.songName, 200) }, { label: 'Lyrics', value: text(input.lyrics, 20000) }]
    if (notes) details.push({ label: 'Additional notes', value: notes })
    return { kind: 'song-book', id: 'song-book', name: card.title, optionLabel: '12 pages', qty: 1, price: unitPrice, meta: { pages: 12 }, details, photos: { count: photos.length, files: photos, names: photos.map((file) => file.name), front: coverName(photos, input.frontId), back: coverName(photos, input.backId), frontId: input.frontId, backId: input.backId } }
  }
  throw new Error('This product is not available in the manual order form.')
}

function labelArea(area) { return area === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka' }
function bdShortDate(date = new Date()) {
  const { year, month, day } = dhakaNow(date)
  return `${year.slice(-2)}${month}${day}`
}
function firestoreDoc(data) { return { fields: encodeFields(data) } }

async function createOrder(env, order, project, orderId) {
  const collection = `${docsBase(project)}/orders?documentId=${encodeURIComponent(orderId)}`
  const response = await fetch(collection, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(firestoreDoc(order)) })
  if (response.ok) return { order, created: true }
  if (response.status === 409 || response.status === 400) {
    const existing = await fetch(`${docsBase(project)}/orders/${encodeURIComponent(orderId)}`)
    if (existing.ok) {
      const saved = decodeFields((await existing.json()).fields ?? {})
      if (saved.submissionKey === order.submissionKey) return { order: saved, created: false }
    }
  }
  const problem = await response.json().catch(() => null)
  console.error('Guest order save failed', response.status, problem?.error?.status)
  throw new Error('We could not save your order right now. Please retry in a moment.')
}

export async function handleGuestOrder(request, env, cors) {
  const contentLength = Number(request.headers.get('Content-Length') || 0)
  if (contentLength > 1024 * 1024) return json({ error: 'The order details are too large.' }, 413, cors)
  let input
  try { input = await request.json() } catch { return json({ error: 'Order details are not valid JSON.' }, 400, cors) }
  const submissionKey = String(input.submissionKey ?? '')
  if (!SAFE_ID.test(submissionKey)) return json({ error: 'Please refresh the order form and try again.' }, 400, cors)
  try {
    const customerInput = input.customer ?? {}
    const deliveryInput = input.delivery ?? {}
    const orderName = text(customerInput.name, 100)
    const instagram = text(customerInput.instagram, 30).replace(/^@+/, '')
    const whatsapp = text(customerInput.whatsapp, 40)
    const recipient = text(deliveryInput.recipient, 100)
    const phone = text(deliveryInput.phone, 40)
    const address = text(deliveryInput.address, 500)
    const city = text(deliveryInput.city, 100)
    const area = deliveryInput.area === 'inside' || deliveryInput.area === 'outside' ? deliveryInput.area : ''
    const date = text(deliveryInput.date, 10)
    if (!orderName || !recipient || !address || !city || !area || !/^[A-Za-z0-9._]{1,30}$/.test(instagram)
      || !/^(?:\+?88)?01[3-9]\d{8}$/.test(phone.replace(/[\s()-]/g, ''))
      || !/^(?:\+?88)?01[3-9]\d{8}$/.test(whatsapp.replace(/[\s()-]/g, ''))) throw new Error('Check the required contact and delivery details.')
    const now = new Date()
    const offset = dateOffsetFromDhaka(date, now)
    if (!Number.isInteger(offset) || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 80) throw new Error('Choose a valid delivery date and at least one product.')
    const project = String(env.FIREBASE_PROJECT_ID || '')
    if (!project) throw new Error('Order storage is not configured. Please contact us on WhatsApp.')
    const config = await trustedCatalog(project)
    if (offset < minimumDeliveryOffset({ area, now })) throw new Error('The selected delivery date is too soon for these products. Choose a later date.')
    const mediaRows = []
    const orderItems = []
    const itemCounts = new Map()
    for (const item of input.items) {
      const cardId = MANUAL_ORDER_TYPE_TO_CARD[item.type]
      const card = cardId ? config.manualOrderCatalog[cardId] : null
      const itemCount = (itemCounts.get(cardId) || 0) + 1
      if (!card?.enabled || itemCount > Number(card.maxItems || 20)) throw new Error('One of the selected products is unavailable or has too many items. Please update your order.')
      itemCounts.set(cardId, itemCount)
      const photos = await verifyMedia(env, submissionKey, item.photos ?? [], item.type === 'polaroids' ? false : false)
      const reference = await verifyReference(env, submissionKey, item.referenceFile)
      mediaRows.push(...photos, ...(reference ? [reference] : []))
      orderItems.push(buildItem(item, config, photos, reference))
    }
    const hasRush = orderItems.some((item) => item.kind === 'magazine' || item.kind === 'song-book')
    const rushCharge = expeditedSurcharge({ date, area, hasRushProducts: hasRush, now })
    if (rushCharge === null) throw new Error('The selected delivery date is unavailable. Choose a later date.')
    const standardCharge = area === 'inside' ? Number(config.deliverySettings.insideDhakaCharge) || 60 : Number(config.deliverySettings.outsideDhakaCharge) || 110
    const magazineTotal = orderItems.filter((item) => item.kind === 'magazine').reduce((sum, item) => sum + item.price * item.qty, 0)
    const otherTotal = orderItems.filter((item) => item.kind !== 'magazine').reduce((sum, item) => sum + item.price * item.qty, 0)
    const productSubtotal = magazineTotal + otherTotal
    const displayDate = new Date(`${date}T12:00:00+06:00`).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'long', year: 'numeric' })
    const idHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(submissionKey)))].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 10).toUpperCase()
    const id = `PB-${bdShortDate()}-${idHash}`
    const createdAt = new Date().toISOString()
    const order = {
      id, createdAt, status: 'New', source: 'Manual guest order', submissionKey,
      customer: {
        name: orderName, phone: whatsapp, whatsapp, instagram: `@${instagram}`,
        address: `${address}, ${city}`, recipient, deliveryPhone: phone,
        deliveryAddress: address, ordererName: orderName,
      },
      items: orderItems, magazineTotal, addonTotal: 0, otherTotal,
      delivery: `${labelArea(area)} · ${displayDate}`,
      deliveryInfo: { location: area, locationLabel: labelArea(area), city, date, phone, recipient, address, daysAhead: offset, standardCharge, rushCharge },
      deliveryCharge: standardCharge, rushCharge, total: productSubtotal + standardCharge + rushCharge,
      orderType: 'manual-multi-product',
    }
    const saved = await createOrder(env, order, project, id)
    return json({ order: saved.order }, saved.created ? 201 : 200, cors)
  } catch (error) {
    return json({ error: text(error.message || 'We could not validate this order.', 240) }, 400, cors)
  }
}

export async function handleGuestMedia(request, env, url, cors) {
  const route = url.pathname.match(/^\/guest-media\/([a-f0-9]{32})\/([a-f0-9]{32})$/i)
  if (request.method === 'PUT' && route) {
    const [, sessionKey, fileId] = route
    const type = request.headers.get('Content-Type')?.split(';')[0]?.trim() || ''
    const rawName = request.headers.get('X-File-Name') || 'order-photo'
    let name = 'order-photo'
    try { name = decodeURIComponent(rawName).slice(0, 180).replace(/[\u0000-\u001f]/g, '') || name } catch { return json({ error: 'The file name is invalid.' }, 400, cors) }
    if (!IMAGE_TYPES.has(type)) return json({ error: 'Use a supported image format.' }, 415, cors)
    const body = await readLimitedBody(request.body)
    if (!body) return json({ error: 'Each image must be 20 MB or smaller.' }, 413, cors)
    const ascii = (start, end) => new TextDecoder().decode(body.slice(start, end))
    const brand = ascii(8, 12)
    const signatureOk = type === 'image/jpeg' ? body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff
      : type === 'image/png' ? body[0] === 0x89 && ascii(1, 4) === 'PNG'
        : type === 'image/webp' ? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
          : type === 'image/gif' ? ascii(0, 3) === 'GIF'
            : type === 'image/bmp' ? ascii(0, 2) === 'BM'
              : type === 'image/tiff' ? (ascii(0, 2) === 'II' && body[2] === 42 && body[3] === 0) || (ascii(0, 2) === 'MM' && body[2] === 0 && body[3] === 42)
                : ['image/heic', 'image/heif', 'image/avif'].includes(type) && body.length >= 12 && ascii(4, 8) === 'ftyp'
                  && ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif', 'avis'].includes(brand)
    if (!signatureOk) return json({ error: 'This file does not appear to be a valid image.' }, 415, cors)
    const key = `manual-orders/${sessionKey}/${fileId}`
    await env.MEDIA_BUCKET.put(key, body, { httpMetadata: { contentType: type }, customMetadata: { originalName: name } })
    return json({ key, size: body.length, type }, 201, cors)
  }
  if (request.method === 'GET') {
    const key = url.searchParams.get('key') || ''
    if (!/^manual-orders\/[a-f0-9]{32}\/[a-f0-9]{32}$/i.test(key)) return json({ error: 'Photo not found.' }, 404, cors)
    const object = await env.MEDIA_BUCKET.get(key)
    if (!object) return json({ error: 'Photo not found.' }, 404, cors)
    const headers = new Headers(cors)
    object.writeHttpMetadata(headers)
    headers.set('Cache-Control', 'private, max-age=600')
    headers.set('Content-Disposition', 'inline')
    return new Response(object.body, { headers })
  }
  if (request.method === 'DELETE' && route) {
    await env.MEDIA_BUCKET.delete(`manual-orders/${route[1]}/${route[2]}`)
    return json({ ok: true }, 200, cors)
  }
  return json({ error: 'Unsupported photo action.' }, 405, cors)
}
