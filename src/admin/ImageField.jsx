import { useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import SmartImage from '../shared/ui/SmartImage'
import { compressImage } from '../shared/utils/compressImage'
import { inputClass } from './classes'

export default function ImageField({ value, onChange }) {
  const [busy, setBusy] = useState(false)
  const uploaded = value?.startsWith('data:')

  const pick = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBusy(true)
    try {
      onChange(await compressImage(file))
    } catch {
      alert('Could not read this image. Try another file.')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex items-start gap-4">
      <div className="size-20 shrink-0 overflow-hidden rounded-xl border border-sand bg-sand/60">
        {value && <SmartImage src={value} alt="Preview" />}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <input
          className={inputClass}
          placeholder={uploaded ? 'Uploaded image' : '/images/... or https://...'}
          value={uploaded ? '' : (value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sand bg-white px-3 py-1.5 text-xs font-medium hover:bg-sand/60">
            <ImagePlus size={14} /> {busy ? 'Processing…' : 'Upload image'}
            <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={busy} />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
            >
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}