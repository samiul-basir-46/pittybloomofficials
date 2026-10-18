import { slugify } from '../../../shared/utils/text'

// "Label | Placeholder | required or optional | text, number or date", one question per line.
export const parseFields = (text = '') =>
  text
    .split('\n')
    .map((line) => {
      const [label = '', placeholder = '', req = 'required', type = 'text'] = line.split('|').map((s) => s.trim())
      return {
        id: slugify(label),
        label,
        placeholder,
        required: req.toLowerCase() !== 'optional',
        type: ['number', 'date'].includes(type.toLowerCase()) ? type.toLowerCase() : 'text',
      }
    })
    .filter((f) => f.label)

export const withFields = (occasion) => ({ ...occasion, fields: parseFields(occasion.fields) })

export const getFormats = (settings) => [
  { id: 'A4', label: settings.a4Label, note: settings.a4Note, maxPages: Number(settings.a4MaxPages) },
  { id: 'A5', label: settings.a5Label, note: settings.a5Note, maxPages: Number(settings.a5MaxPages) },
]

// One entry per physical magazine: 2 × A4 and 1 × A5 gives three copies, each customised on its own.
export const buildCopies = (draft, sizes, formats) => {
  const copies = []
  formats.forEach((format) => {
    const pick = draft.picks[format.id]
    const size = pick && sizes.find((s) => s.id === pick.sizeId)
    if (!size) return
    for (let n = 1; n <= pick.qty; n++) {
      copies.push({ key: `${format.id}:${n}`, number: copies.length + 1, format, size })
    }
  })
  return copies
}

export const copyTitle = (c) => `Book #${c.number}: ${c.format.label} (${c.size.pages} Pages)`

// Priced sizes of one format that fit its page limit (A5 is capped, set in Admin → Order Settings).
export const sizesFor = (sizes, format) =>
  sizes.filter((s) => s.format === format.id && s.price > 0 && (!format.maxPages || s.pages <= format.maxPages))

export const defaultSizeFor = (sizes, format) => {
  const list = sizesFor(sizes, format)
  return list.find((s) => s.pages === 8) ?? list[0] ?? null
}
