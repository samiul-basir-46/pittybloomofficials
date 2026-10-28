// Valid offer packs for a Polaroid item, cheapest quantity first.
export const validPacks = (item) => (Array.isArray(item?.packs) ? item.packs : [])
  .map((pack) => ({ id: pack.id || `pack-${pack.pieces}`, pieces: Math.floor(Number(pack.pieces)), price: Number(pack.price), tag: String(pack.tag || '') }))
  .filter((pack) => pack.pieces >= 1 && Number.isFinite(pack.price) && pack.price >= 1)
  .sort((a, b) => a.pieces - b.pieces)

// Price for `qty` pieces. Customers can order any quantity; reaching an offer's piece count gives that offer's
// per-piece rate on every piece, and the price never exceeds that of a larger offer that already covers the quantity.
export const polaroidPricing = (item, qty) => {
  const pieces = Math.max(0, Math.floor(Number(qty)) || 0)
  const base = Number(item?.unitPrice) || 0
  const packs = validPacks(item)
  const regular = Math.round(base * pieces)
  const reached = [...packs].reverse().find((pack) => pack.pieces <= pieces) ?? null
  const covering = packs.find((pack) => pack.pieces >= pieces) ?? null
  let total = regular
  let applied = null
  if (reached && Math.round((reached.price / reached.pieces) * pieces) < total) { total = Math.round((reached.price / reached.pieces) * pieces); applied = reached }
  if (covering && covering.price < total) { total = covering.price; applied = covering }
  return { pieces, total, regular, saving: Math.max(0, regular - total), applied }
}
