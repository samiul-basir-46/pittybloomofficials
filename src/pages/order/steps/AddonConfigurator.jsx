import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import QtyStepper from '../../../shared/ui/QtyStepper'
import { formatPrice } from '../../../shared/utils/format'
import { parseOptions } from '../../../shared/utils/options'
import { photoStore } from '../lib/photoStore'

const newKey = (label) => `${label}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`

export function createAddonDetails(addon, product) {
  const options = parseOptions(product?.options)
  const minQuantity = addon.id === 'polaroids' ? Math.max(1, Number(product?.minQuantity) || 9) : 1
  return {
    qty: minQuantity,
    optionId: options[0]?.id ?? '',
    photoKey: newKey(`magazine-addon-${addon.id}-photos`),
    referenceKey: newKey(`magazine-addon-${addon.id}-reference`),
  }
}

export default function AddonConfigurator({ addon, product, details, onChange, error }) {
  const [photos, setPhotos] = useState(() => photoStore.list(details.photoKey))
  const [reference, setReference] = useState(() => photoStore.list(details.referenceKey)[0] ?? null)
  const photosInput = useRef(null)
  const referenceInput = useRef(null)
  const options = parseOptions(product?.options)
  const selectedOption = options.find((option) => option.id === details.optionId) ?? options[0]
  const isPolaroids = addon.id === 'polaroids'
  const isFrame = addon.id === 'frame'
  const needsOnePhotoPerItem = isPolaroids
  const minimumQty = isPolaroids ? Math.max(1, Number(product?.minQuantity) || 9) : 1
  const price = isPolaroids ? Number(product?.unitPrice) || 8 : (selectedOption?.price ?? Number(addon.price)) || 0
  const photoMetadata = (key) => photoStore.list(key).map(({ id, name, size, type, storageKey }) => ({ id, name, size, type, storageKey }))

  const addPhotos = (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    const result = photoStore.add(details.photoKey, files, { allowDuplicates: true })
    setPhotos(photoStore.list(details.photoKey))
    onChange({ files: photoMetadata(details.photoKey) })
    if (result.rejected || result.tooLarge) onChange({ uploadMessage: `${result.rejected + result.tooLarge} file${result.rejected + result.tooLarge === 1 ? '' : 's'} skipped. Use image files under 100 MB.` })
    else onChange({ uploadMessage: '' })
  }
  const addReference = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const previous = photoStore.list(details.referenceKey)[0]
    if (previous) photoStore.remove(details.referenceKey, previous.id)
    const result = photoStore.add(details.referenceKey, [file], { allowDuplicates: true })
    if (!result.added.length) { onChange({ uploadMessage: 'Choose an image under 100 MB for the reference.' }); return }
    setReference(result.added[0])
    onChange({ referenceFile: photoMetadata(details.referenceKey)[0] })
    onChange({ uploadMessage: '' })
  }

  return <div data-field={`addon.${addon.id}`} className="mt-4 rounded-2xl border border-sand bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0"><h3 className="font-semibold">{addon.name} details</h3><p className="mt-1 text-sm text-ink/60">{formatPrice(price)}{isPolaroids ? ' per Polaroid' : selectedOption ? ` · ${selectedOption.label}` : ''}</p></div>
      <div className="flex shrink-0 items-center gap-2"><span className="text-sm font-medium">Qty</span><QtyStepper value={Math.max(Number(details.qty) || minimumQty, minimumQty)} min={minimumQty} max={999} onChange={(qty) => onChange({ qty })} /></div>
    </div>
    {options.length > 0 && !isPolaroids && <label className="mt-4 block text-sm font-medium">{addon.id === 'frame' ? 'Frame size' : 'Choose option'}<select className="mt-1 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm" value={selectedOption?.id ?? ''} onChange={(event) => onChange({ optionId: event.target.value })}>{options.map((option) => <option key={option.id} value={option.id}>{option.label} · {formatPrice(option.price)}</option>)}</select></label>}
    <input ref={photosInput} type="file" accept="image/*" multiple className="sr-only" onChange={addPhotos} />
    <section className="mt-4 rounded-xl bg-cream/70 p-3 sm:p-4" aria-label={`${addon.name} print photos`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h4 className="text-sm font-semibold">Print photos <span className="text-red-600">*</span></h4><p className="mt-1 text-xs leading-5 text-ink/60">{isPolaroids ? `Add one photo for each Polaroid (${minimumQty} pieces minimum).` : isFrame ? 'Upload all the pictures you want us to print and place in your frame. There is no photo count limit.' : 'Add the photos you want us to use for this item.'}</p></div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${needsOnePhotoPerItem && photos.length !== Number(details.qty || minimumQty) ? 'bg-amber-100 text-amber-900' : 'bg-white text-ink/65'}`}>
          {needsOnePhotoPerItem ? `${photos.length} / ${Number(details.qty || minimumQty)} added` : `${photos.length} added`}
        </span>
      </div>
      {photos.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{photos.map((photo, index) => <div key={photo.id} className="relative w-24 shrink-0 overflow-hidden rounded-lg border border-sand bg-white sm:w-28"><div className="aspect-square bg-sand">{photo.url ? <img src={photo.url} alt={photo.name} className="size-full object-cover" /> : <div className="grid size-full place-items-center p-2 text-center text-[10px] text-ink/50">{photo.name}</div>}</div><span className="block truncate px-2 py-1 text-[10px] text-ink/65">{index + 1}. {photo.name}</span><button type="button" aria-label={`Remove ${photo.name}`} onClick={() => { photoStore.remove(details.photoKey, photo.id); setPhotos(photoStore.list(details.photoKey)); onChange({ files: photoMetadata(details.photoKey) }) }} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/95 text-red-600 shadow"><Trash2 size={13} /></button></div>)}</div>}
      <button type="button" onClick={() => photosInput.current?.click()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand/35 bg-white px-3 text-sm font-semibold text-brand transition hover:border-brand hover:bg-cream"><ImagePlus size={16} /> {photos.length ? 'Add more print photos' : 'Choose print photos'}</button>
    </section>
    <input ref={referenceInput} type="file" accept="image/*" className="sr-only" onChange={addReference} />
    <section className="mt-3 flex flex-col gap-3 rounded-xl border border-sand p-3 sm:flex-row sm:items-center sm:p-4" aria-label={`${addon.name} reference picture`}>
      {reference ? <div className="flex min-w-0 flex-1 items-center gap-3"><div className="size-16 shrink-0 overflow-hidden rounded-lg bg-sand">{reference.url && <img src={reference.url} alt={reference.name} className="size-full object-cover" />}</div><div className="min-w-0"><p className="text-sm font-semibold">Reference picture</p><p className="truncate text-xs text-ink/55">{reference.name}</p></div><button type="button" onClick={() => { photoStore.remove(details.referenceKey, reference.id); setReference(null); onChange({ referenceFile: null }) }} className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</button></div> : <><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Reference picture <span className="font-normal text-ink/50">(optional)</span></p><p className="mt-1 text-xs text-ink/55">Share an example for the frame style, layout, or print finish.</p></div><button type="button" onClick={() => referenceInput.current?.click()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-sand bg-white px-3 text-sm font-semibold text-brand hover:bg-cream"><ImagePlus size={15} /> Add reference</button></>}
    </section>
    {details.uploadMessage && <p className="mt-2 text-xs text-red-600">{details.uploadMessage}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
}
