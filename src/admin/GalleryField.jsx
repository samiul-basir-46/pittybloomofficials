import { useState } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react'
import SmartImage from '../shared/ui/SmartImage'
import { compressImage } from '../shared/utils/compressImage'
import { inputClass } from './classes'

const newId = () => `design-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const baseName = (file) => file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()

// A list of pictures, each with an optional name (used for the frame designs customers choose from).
// New pictures are kept as data URLs here and uploaded to Cloudflare when the item is saved.
export default function GalleryField({ value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const list = Array.isArray(value) ? value : []

  const add = async (event) => {
    const files = [...event.target.files]
    event.target.value = ''
    if (!files.length) return
    setBusy(true)
    setProblem('')
    const added = []
    let skipped = 0
    for (const file of files) {
      try {
        added.push({ id: newId(), name: baseName(file), image: await compressImage(file) })
      } catch {
        skipped += 1
      }
    }
    onChange([...list, ...added])
    if (skipped) setProblem(`${skipped} file${skipped === 1 ? ' was' : 's were'} skipped (not a readable JPG, PNG or WebP image).`)
    setBusy(false)
  }

  const update = (index, changes) => onChange(list.map((item, i) => (i === index ? { ...item, ...changes } : item)))
  const remove = (index) => onChange(list.filter((_, i) => i !== index))
  const move = (from, to) => {
    if (to < 0 || to >= list.length) return
    const next = [...list]
    next.splice(to, 0, next.splice(from, 1)[0])
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {list.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto pb-2">
          {list.map((item, index) => (
            <li key={item.id} className="w-28 shrink-0 overflow-hidden rounded-xl border border-sand bg-cream/50">
              <div className="aspect-square bg-sand/60"><SmartImage src={item.image} alt={item.name || `Design ${index + 1}`} /></div>
              <div className="space-y-1 p-1.5">
                <input aria-label={`Design ${index + 1} name`} className={`${inputClass} !py-1.5 text-xs`} placeholder="Design name (optional)" value={item.name ?? ''} onChange={(event) => update(index, { name: event.target.value })} />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button type="button" aria-label={`Move design ${index + 1} earlier`} onClick={() => move(index, index - 1)} disabled={index === 0} className="grid size-7 place-items-center rounded-md hover:bg-sand disabled:opacity-30"><ArrowLeft size={14} /></button>
                    <button type="button" aria-label={`Move design ${index + 1} later`} onClick={() => move(index, index + 1)} disabled={index === list.length - 1} className="grid size-7 place-items-center rounded-md hover:bg-sand disabled:opacity-30"><ArrowRight size={14} /></button>
                  </div>
                  <button type="button" aria-label={`Remove design ${index + 1}`} onClick={() => remove(index)} className="grid size-7 place-items-center rounded-md text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <label className={`inline-flex items-center gap-1.5 rounded-lg border border-sand bg-white px-3 py-1.5 text-xs font-medium ${busy ? 'cursor-wait opacity-70' : 'cursor-pointer hover:bg-sand/60'}`}>
        <ImagePlus size={14} /> {busy ? 'Processing…' : list.length ? 'Add more designs' : 'Upload designs'}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={add} disabled={busy} />
      </label>
      <p className="text-xs text-ink/50">Select many pictures at once. {list.length} design{list.length === 1 ? '' : 's'} added. Customers pick one of these for each frame they order. Add new designs here any time.</p>
      {problem && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{problem}</p>}
    </div>
  )
}
