export const ORDER_STATUSES = ['New', 'Confirmed', 'In production', 'Shipped', 'Delivered', 'Cancelled']

// PB-YYMMDD-XXXX, checked against existing orders so two orders never share an id.
export const makeOrderId = (existing = []) => {
  const taken = new Set(existing.map((o) => o.id))
  const d = new Date()
  const day = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  for (;;) {
    const id = `PB-${day}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    if (!taken.has(id)) return id
  }
}

// Uploaded images are big data URLs; a few per order would fill browser storage, so oversized ones are
// dropped from the order. The admin page falls back to the product's current image.
export const slimImage = (src = '') => (src.startsWith('data:') && src.length > 40000 ? '' : src)

const sumOf = (items, test) => items.filter(test).reduce((sum, i) => sum + i.price * i.qty, 0)

// extras (optional, used by the magazine order form): delivery charges and the delivery details.
// Without extras this builds exactly the same order as before, so the cart checkout is unaffected.
export const buildOrder = ({ id, cartItems, customer, extras = {} }) => {
  const items = cartItems.map((i) => ({
    kind: i.kind,
    id: i.id,
    name: i.name,
    image: slimImage(i.image),
    optionLabel: i.optionLabel || '',
    qty: i.qty,
    price: i.price,
    note: i.note || '',
    meta: i.meta || null,
    ...(i.details ? { details: i.details } : {}),
    ...(i.photos ? { photos: i.photos } : {}),
  }))
  const magazineTotal = sumOf(items, (i) => i.kind === 'magazine')
  const addonTotal = sumOf(items, (i) => i.kind === 'addon')
  const otherTotal = sumOf(items, (i) => i.kind !== 'magazine' && i.kind !== 'addon')
  const deliveryCharge = Number(extras.deliveryCharge) || 0
  const rushCharge = Number(extras.rushCharge) || 0
  return {
    id,
    createdAt: new Date().toISOString(),
    status: 'New',
    customer,
    items,
    magazineTotal,
    addonTotal,
    otherTotal,
    total: magazineTotal + addonTotal + otherTotal + deliveryCharge + rushCharge,
    delivery: extras.deliveryLabel || 'To be confirmed',
    ...(extras.deliveryInfo ? { deliveryInfo: extras.deliveryInfo, deliveryCharge, rushCharge } : {}),
  }
}
