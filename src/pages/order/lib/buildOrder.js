import { buildOrder } from '../../../shared/utils/orders'
import { photoStore } from './photoStore'
import { checkDate } from './pricing'
import { cleanInstagram } from './validation'
import { copyTitle } from './copies'

const LOCATION_LABEL = { inside: 'Inside Dhaka', outside: 'Outside Dhaka' }
export const locationLabel = (id) => LOCATION_LABEL[id] ?? ''

// Turns the finished form into the same order record the cart makes, so the Admin Orders page needs no changes
// to list it. Magazine copies are one line each (qty 1) because every copy has its own details.
export function buildMagazineOrder({ id, draft, copies, occasions, addons, magazine, totals, settings, now, longDate }) {
  const d = draft.delivery
  const cartItems = copies.map((copy) => {
    const custom = draft.customs[copy.key] ?? {}
    const occasion = occasions.find((o) => o.id === custom.occasionId)
    const photos = photoStore.list(copy.key)
    const meta = draft.photos[copy.key] ?? {}
    const nameOf = (pid) => photos.find((p) => p.id === pid)?.name
    const details = [
      ...(occasion ? [{ label: 'Occasion', value: `${occasion.emoji} ${occasion.label}`.trim() }] : []),
      ...(occasion?.fields ?? [])
        .map((f) => ({ label: f.label, value: String(custom.values?.[f.id] ?? '').trim() }))
        .filter((r) => r.value),
      ...(custom.notes?.trim() ? [{ label: settings.notesLabel, value: custom.notes.trim() }] : []),
    ]
    return {
      kind: 'magazine',
      id: magazine.id,
      name: magazine.title,
      image: magazine.image,
      optionLabel: `${copy.format.label} · ${copy.size.pages} Pages`,
      qty: 1,
      price: copy.size.price,
      meta: { pages: copy.size.pages, photos: copy.size.photos, format: copy.size.format },
      details,
      photos: {
        count: photos.length,
        front: nameOf(meta.front) ?? '',
        back: nameOf(meta.back) ?? '',
        names: photos.map((p) => p.name),
        copy: copyTitle(copy),
        frontId: meta.front ?? '',
        backId: meta.back ?? '',
        files: photos.map(({ id, name, size, type, storageKey }) => ({ id, name, size, type, storageKey })),
      },
    }
  })
  addons.forEach((a) => {
    const photos = photoStore.list(a.photoKey)
    const reference = photoStore.list(a.referenceKey)[0]
    cartItems.push({
      kind: 'addon', id: a.id, name: a.name, image: a.image,
      optionLabel: [a.optionLabel, a.design?.name].filter(Boolean).join(' · ') || 'Add-on', qty: a.qty || 1, price: a.price,
      ...(a.design ? { design: { id: a.design.id, name: a.design.name || '', image: a.design.image } } : {}),
      photos: {
        count: photos.length,
        files: photos.map(({ id, name, size, type, storageKey }) => ({ id, name, size, type, storageKey })),
        ...(reference ? { reference: { id: reference.id, name: reference.name, size: reference.size, type: reference.type, storageKey: reference.storageKey } } : {}),
      },
    })
  })

  const info = d.date && d.location ? checkDate(d.date, d.location, settings, now) : null
  return buildOrder({
    id,
    cartItems,
    customer: {
      name: draft.contact.name.trim(),
      phone: draft.contact.phone.trim(),
      instagram: cleanInstagram(draft.contact.instagram),
      email: draft.contact.email.trim(),
      address: `${d.address.trim()}, ${d.city.trim()}`,
      note: draft.contact.note.trim(),
      recipient: d.recipient.trim(),
      deliveryPhone: d.phone.trim(),
    },
    extras: {
      deliveryCharge: totals.deliveryCharge,
      rushCharge: totals.rushCharge,
      deliveryLabel: `${locationLabel(d.location)} · ${longDate(d.date)}`,
      deliveryInfo: {
        location: d.location,
        locationLabel: locationLabel(d.location),
        date: d.date,
        daysAhead: info?.ahead ?? null,
        city: d.city.trim(),
      },
    },
  })
}
