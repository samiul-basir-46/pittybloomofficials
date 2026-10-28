// Valid offer packs for a Polaroid item, cheapest quantity first.
export const validPacks = (item) => (Array.isArray(item?.packs) ? item.packs : [])
  .map((pack) => ({ id: pack.id || `pack-${pack.pieces}`, pieces: Math.floor(Number(pack.pieces)), price: Number(pack.price), tag: String(pack.tag || '') }))
  .filter((pack) => pack.pieces >= 1 && Number.isFinite(pack.price) && pack.price >= 1)
  .sort((a, b) => a.pieces - b.pieces)
