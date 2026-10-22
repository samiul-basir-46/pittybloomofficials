import { useReducer, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Card } from '../components/FormField'
import { copyTitle } from '../lib/copies'
import { parseRange } from '../lib/pricing'
import { photoStore } from '../lib/photoStore'

function PhotoPanel({ copy, ctx, refresh }) {
  const { occasions, draft, update } = ctx
  const input = useRef(null)
  const [message, setMessage] = useState('')
  const photos = photoStore.list(copy.key)
  const range = parseRange(copy.size.photos)
  const meta = draft.photos[copy.key] ?? {}
  const front = photos.find((p) => p.id === meta.front)?.id
  const back = photos.find((p) => p.id === meta.back)?.id
  const theme = occasions.find((o) => o.id === draft.customs[copy.key]?.occasionId)

  const setMeta = (patch) => update((d) => ({ ...d, photos: { ...d.photos, [copy.key]: { ...d.photos[copy.key], ...patch } } }))
  const syncFiles = () => update((d) => ({
    ...d,
    photos: {
      ...d.photos,
      [copy.key]: {
        ...d.photos[copy.key],
        files: photoStore.list(copy.key).map(({ id, name, size, type, storageKey }) => ({ id, name, size, type, storageKey })),
      },
    },
  }))
  const add = (e) => {
    const result = photoStore.add(copy.key, e.target.files)
    e.target.value = ''
    const notes = []
    if (result.rejected) notes.push(`${result.rejected} file${result.rejected > 1 ? 's were' : ' was'} not a picture and ${result.rejected > 1 ? 'were' : 'was'} skipped.`)
    if (result.tooLarge) notes.push(`${result.tooLarge} image${result.tooLarge > 1 ? 's are' : ' is'} larger than 20 MB and ${result.tooLarge > 1 ? 'were' : 'was'} skipped.`)
    if (result.skipped) notes.push(`${result.skipped} photo${result.skipped > 1 ? 's were' : ' was'} already added.`)
    setMessage(notes.join(' '))
    syncFiles()
    refresh()
  }
  const remove = (id) => {
    photoStore.remove(copy.key, id)
    if (meta.front === id) setMeta({ front: null })
    if (meta.back === id) setMeta({ back: null })
    syncFiles()
    refresh()
  }
  // A photo can be the front or the back, not both
  const pick = (slot, id) => {
    const other = slot === 'front' ? 'back' : 'front'
    setMeta({ [slot]: meta[slot] === id ? null : id, ...(meta[other] === id ? { [other]: null } : {}) })
  }

  const below = range && photos.length < range.min
  return (
    <Card aria-label={copyTitle(copy)}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-1 font-bold">{copyTitle(copy)}</h2>
        {theme && <span className="rounded-full border border-sand bg-cream px-3 py-1 text-xs font-medium">Theme: {theme.label}</span>}
        {range && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">Recommended: {copy.size.photos} photos</span>}
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800" aria-live="polite">
          {photos.length} photo{photos.length === 1 ? '' : 's'} added
        </span>
      </div>

      <input ref={input} type="file" accept="image/*" multiple hidden onChange={add} data-testid={`photo-input-${copy.key}`} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-cream px-4 py-6 font-semibold text-brand transition hover:border-brand hover:bg-sand"
      >
        <ImagePlus size={20} /> {photos.length ? 'Add more photos' : 'Choose photos'}
      </button>
      {message && <p className="mt-2 text-sm text-amber-800">{message}</p>}
      {below && photos.length > 0 && (
        <p className="mt-2 text-sm text-amber-800">
          {range.min - photos.length} more photo{range.min - photos.length === 1 ? '' : 's'} would fill your pages nicely, but you can still continue.
        </p>
      )}

      {photos.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-sm font-semibold">Pick the Front Page and Back Page photos</p>
          <ul className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((p) => (
              <li key={p.id} className="w-28 shrink-0 overflow-hidden rounded-xl border border-sand bg-white sm:w-32">
                <div className="relative aspect-square bg-sand">
                  {p.url ? (
                    <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full place-items-center p-2 text-center text-xs text-ink/50">{p.name}</span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => remove(p.id)}
                    className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/90 text-red-500 shadow hover:bg-white"
                  >
                    <Trash2 size={15} />
                  </button>
                  {(front === p.id || back === p.id) && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white">
                      {front === p.id ? 'Front page' : 'Back page'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 p-1.5">
                  {['front', 'back'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={meta[slot] === p.id}
                      aria-label={`Use ${p.name} as ${slot} page`}
                      onClick={() => pick(slot, p.id)}
                      className={`rounded-lg py-1.5 text-xs font-semibold capitalize transition ${
                        meta[slot] === p.id ? 'bg-brand text-white' : 'bg-sand text-brand hover:bg-mist'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

export default function PhotosStep({ ctx }) {
  const [, refresh] = useReducer((n) => n + 1, 0)
  return (
    <div className="space-y-6">
      {ctx.copies.map((copy) => (
        <PhotoPanel key={copy.key} copy={copy} ctx={ctx} refresh={refresh} />
      ))}
    </div>
  )
}
