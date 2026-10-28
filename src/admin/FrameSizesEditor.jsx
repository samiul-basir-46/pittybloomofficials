import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Button from '../shared/ui/Button'
import { inputClass } from './classes'
import { productsApi } from '../shared/services/contentService'

// The one place where frame sizes and prices are managed. Everything else (customer frame order page, add-on frame,
// manual order form, frame galleries below) reads the same list.
const parse = (text = '') => String(text).split('\n').map((line) => {
  const [label = '', price = '', mrp = '', tag = ''] = line.split('|').map((part) => part.trim())
  return { label, price, mrp, tag }
}).filter((row) => row.label || row.price)
const serialize = (rows) => rows.map((row) => `${row.label.trim()} | ${Number(row.price) || 0}${row.mrp ? ` | ${row.mrp}` : ''}${row.tag ? ` | ${row.tag}` : ''}`).join('\n')

export default function FrameSizesEditor({ product, onSaved }) {
  const [rows, setRows] = useState(() => parse(product?.options))
  const [saved, setSaved] = useState(() => serialize(parse(product?.options)))
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { const next = parse(product?.options); setRows(next); setSaved(serialize(next)) }, [product?.options])
  const dirty = serialize(rows) !== saved
  const change = (index, patch) => { setStatus(''); setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row))) }

  const save = async () => {
    const names = rows.map((row) => row.label.trim().toLowerCase())
    if (!rows.length || rows.some((row) => !row.label.trim() || !Number.isFinite(Number(row.price)) || Number(row.price) < 1)) { setStatus('Each size needs a name and a price of at least ৳1.'); return }
    if (new Set(names).size !== names.length) { setStatus('Each size must have a different name.'); return }
    setSaving(true)
    try {
      // Re-read the product right before writing so nothing else saved meanwhile is overwritten.
      const latest = (await productsApi.list()).find((item) => item.id === 'frame') ?? product
      const next = { ...latest, options: serialize(rows) }
      await productsApi.save(next)
      setSaved(serialize(rows))
      setStatus('Saved. Sizes are updated everywhere.')
      onSaved?.(next)
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not save the sizes.') }
    finally { setSaving(false) }
  }

  return <section className="motion-visible mb-6 space-y-3 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-5">
    <div><h2 className="font-serif text-xl">Frame sizes and prices</h2><p className="mt-1 text-xs leading-5 text-ink/60">Add each size once. The frame order pages, add-ons and manual order form all use this list. Choose one of these sizes for every frame gallery below.</p></div>
    {rows.map((row, index) => <div key={index} className="grid gap-2 rounded-xl border border-sand bg-cream/40 p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
      <label className="text-xs font-medium text-ink/60">Size name<input aria-label={`Frame size ${index + 1}`} className={`${inputClass} mt-1`} value={row.label} onChange={(event) => change(index, { label: event.target.value })} /></label>
      <label className="text-xs font-medium text-ink/60">Price (BDT)<input aria-label={`Frame price ${index + 1}`} type="number" min="1" className={`${inputClass} mt-1`} value={row.price} onChange={(event) => change(index, { price: event.target.value })} /></label>
      <label className="text-xs font-medium text-ink/60">Original price<input aria-label={`Frame original price ${index + 1}`} type="number" min="0" className={`${inputClass} mt-1`} value={row.mrp} onChange={(event) => change(index, { mrp: event.target.value })} /></label>
      <label className="text-xs font-medium text-ink/60">Badge<input aria-label={`Frame badge ${index + 1}`} className={`${inputClass} mt-1`} value={row.tag} onChange={(event) => change(index, { tag: event.target.value })} /></label>
      <div className="flex items-end"><button type="button" aria-label={`Remove ${row.label || 'size'}`} onClick={() => { setStatus(''); setRows((current) => current.filter((_, i) => i !== index)) }} className="grid min-h-11 place-items-center rounded-xl border border-red-100 px-3 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div>
    </div>)}
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => { setStatus(''); setRows((current) => [...current, { label: '', price: '', mrp: '', tag: '' }]) }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-brand/25 px-4 text-sm font-semibold text-brand hover:bg-cream"><Plus size={16} /> Add frame size</button>
      <Button type="button" size="sm" disabled={saving || !dirty} onClick={save}>{saving ? 'Saving…' : 'Save sizes'}</Button>
      {status && <p role="status" className={`text-sm ${status.startsWith('Saved') ? 'text-green-700' : 'text-red-700'}`}>{status}</p>}
    </div>
  </section>
}
