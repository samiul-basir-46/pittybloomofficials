export const MANUAL_ORDER_CATALOG_DEFAULTS = {
  polaroids: {
    id: 'polaroids', title: 'Polaroids', description: 'Your favourite photos as classic instant prints.',
    enabled: true, order: 1, imageUpdatedAt: 0, unitPrice: 8, minQuantity: 9, maxItems: 1,
  },
  frames: {
    id: 'frames', title: 'Frames', description: 'A favourite memory, ready to display.',
    enabled: true, order: 2, imageUpdatedAt: 0, maxQuantity: 20, maxItems: 20,
  },
  miniMagazines: {
    id: 'miniMagazines', title: 'Mini Pocket Magazine', description: 'A little story you can carry anywhere.',
    enabled: true, order: 3, imageUpdatedAt: 0, unitPrice: 150, maxItems: 20,
  },
  magazines: {
    id: 'magazines', title: 'Magazine', description: 'A custom magazine made around your story.',
    enabled: true, order: 4, imageUpdatedAt: 0, maxItems: 20,
  },
  songBooks: {
    id: 'songBooks', title: 'Song Book', description: 'A song, your lyrics, and your memories in print.',
    enabled: true, order: 5, imageUpdatedAt: 0, unitPrice: 849, maxItems: 20,
  },
}

export const MANUAL_ORDER_TYPE_TO_CARD = {
  polaroids: 'polaroids',
  frame: 'frames',
  'mini-magazine': 'miniMagazines',
  magazine: 'magazines',
  'song-book': 'songBooks',
}

export const mergeManualOrderCatalog = (value = {}) => Object.fromEntries(
  Object.entries(MANUAL_ORDER_CATALOG_DEFAULTS).map(([id, defaults]) => [id, { ...defaults, ...(value?.[id] ?? {}) }]),
)
