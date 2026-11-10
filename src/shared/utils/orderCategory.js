// Which product an order line belongs to. Uses the line's own kind/id first; names are only a fallback (and never the
// option text), so a frame design called "Polaroid style" is still a Frame.
const KIND_CATEGORY = { 'gift-card': 'gift-card', magazine: 'magazine', 'song-book': 'song-book', frame: 'frame', polaroids: 'polaroids', 'mini-magazine': 'mini-magazine' }
const PRODUCT_ID_CATEGORY = { polaroids: 'polaroids', sticker: 'sticker', 'photo-strip': 'photo-strip', frame: 'frame' }
const NAME_CATEGORIES = [['gift-card', /gift\s*card/i], ['mini-magazine', /mini.*magazine|magazine.*mini|pocket/i], ['song-book', /song\s*book/i], ['frame', /frame/i], ['polaroids', /polaroid/i], ['sticker', /sticker/i], ['photo-strip', /photo\s*strip/i], ['magazine', /magazine/i]]

export const itemCategory = (item) => {
  if (item?.kind === 'gift-card' || String(item?.optionId || '').startsWith('gift-card-')) return 'gift-card'
  if (item?.kind === 'mini-magazine' || item?.optionId === 'mini-pocket-magazine') return 'mini-magazine'
  if (KIND_CATEGORY[item?.kind]) return KIND_CATEGORY[item.kind]
  if (item?.kind === 'product' && PRODUCT_ID_CATEGORY[item.id]) return PRODUCT_ID_CATEGORY[item.id]
  return NAME_CATEGORIES.find(([, pattern]) => pattern.test(String(item?.name || '')))?.[0] ?? ''
}

// Magazines and song books are scheduled by the customer's delivery date. Frames, Polaroids, Mini Pocket Magazines,
// Photo Strips (and stickers) are always handled as urgent as soon as they are ordered.
const DATED = new Set(['magazine', 'song-book'])
export const hasAlwaysUrgentItem = (order) => (order?.items ?? []).some((item) => {
  if (item?.kind === 'addon') return false // add-ons ride along with the main product's delivery date
  const category = itemCategory(item)
  return Boolean(category) && !DATED.has(category)
})
