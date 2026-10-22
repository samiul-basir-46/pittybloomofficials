import { useEffect, useState } from 'react'
import { Check, Plus, Save, Trash2 } from 'lucide-react'
import Button from '../shared/ui/Button'
import Field from './Field'
import useAsync from '../shared/hooks/useAsync'
import { productsApi } from '../shared/services/contentService'
import { parseOptions } from '../shared/utils/options'
import { uploadCatalogImage } from '../shared/services/catalogImageStore'
import { inputClass } from './classes'

export default function FrameSettingsPage() {
  const { data, loading, error: loadError, reload } = useAsync(() => productsApi.list().then((products) => products.find((product) => product.id === 'frame') ?? null))
  const [frame, setFrame] = useState(null)
  const [sizes, setSizes] = useState([])
  const [initial, setInitial] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!data) return
    const parsed = parseOptions(data.options).map(({ id, label, price, mrp, tag }) => ({ id, label, price: String(price), mrp: mrp ? String(mrp) : '', tag: tag || '' }))
    setFrame(data)
    setSizes(parsed)
    setInitial(JSON.stringify({ frame: data, sizes: parsed }))
  }, [data])

  if (loading || !frame) return <div className="py-10 text-center text-sm text-ink/60">{loadError ? <>Could not load frame settings. <button type="button" onClick={reload} className="underline">Retry</button></> : 'Loading frame settings…'}</div>

  const current = JSON.stringify({ frame, sizes })
  const dirty = current !== initial
  const changeSize = (index, updates) => setSizes((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...updates } : row))
  const save = async (event) => {
    event.preventDefault()
    setMessage('')
    if (!frame.name.trim() || !sizes.length || sizes.some((size) => !size.label.trim() || !Number.isFinite(Number(size.price)) || Number(size.price) < 1)) {
      setMessage('Add a frame name and make sure every size has a name and price of at least ৳1.')
      return
    }
    if (new Set(sizes.map((size) => size.label.trim().toLowerCase())).size !== sizes.length) {
      setMessage('Each frame size needs a different name.')
      return
    }
    setSaving(true)
    try {
      const image = frame.image?.startsWith('data:') ? await uploadCatalogImage(frame.image) : frame.image
      const savedFrame = {
        ...frame,
        image,
        options: sizes.map((size) => `${size.label.trim()} | ${Number(size.price)}${size.mrp ? ` | ${Number(size.mrp)}` : ''}${size.tag.trim() ? ` | ${size.tag.trim()}` : ''}`).join('\n'),
      }
      await productsApi.save(savedFrame)
      const savedSizes = sizes.map((size) => ({ ...size, price: String(size.price), mrp: String(size.mrp || '') }))
      setFrame(savedFrame)
      setSizes(savedSizes)
      setInitial(JSON.stringify({ frame: savedFrame, sizes: savedSizes }))
      setMessage('Saved. These settings now appear on the customer Frame page.')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not save frame settings.')
    } finally { setSaving(false) }
  }

  return <form onSubmit={save} className="space-y-6 pb-24">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Catalog</p>
      <h1 className="mt-1 font-serif text-3xl">Frame settings</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Manage the photo shown on the Frame page, the product description, and every available frame size and price.</p>
    </div>

    <section className="rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-5 font-serif text-xl">Frame page content</h2>
      <div className="grid gap-5 md:grid-cols-[minmax(240px,.8fr)_1.2fr]">
        <Field label="Frame picture" type="image" value={frame.image} onChange={(image) => setFrame({ ...frame, image })} />
        <div className="grid content-start gap-4">
          <Field label="Product name" required value={frame.name} onChange={(name) => setFrame({ ...frame, name })} />
          <Field label="Short line" value={frame.tagline} onChange={(tagline) => setFrame({ ...frame, tagline })} />
          <Field label="Description" type="textarea" rows={4} value={frame.description} onChange={(description) => setFrame({ ...frame, description })} />
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5"><h2 className="font-serif text-xl">Frame sizes and prices</h2><p className="mt-1 text-sm text-ink/60">These are the size choices customers can select. Remove a size to stop offering it.</p></div>
      <div className="space-y-3">
        {sizes.map((size, index) => <div key={`${index}-${size.id}`} className="grid gap-3 rounded-xl border border-sand bg-cream/40 p-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
          <label className="text-xs font-medium text-ink/60">Size name<input className={`${inputClass} mt-1`} value={size.label} onChange={(event) => changeSize(index, { label: event.target.value })} /></label>
          <label className="text-xs font-medium text-ink/60">Price (BDT)<input type="number" min="1" className={`${inputClass} mt-1`} value={size.price} onChange={(event) => changeSize(index, { price: event.target.value })} /></label>
          <label className="text-xs font-medium text-ink/60">Old price (optional)<input type="number" min="0" className={`${inputClass} mt-1`} value={size.mrp} onChange={(event) => changeSize(index, { mrp: event.target.value })} /></label>
          <label className="text-xs font-medium text-ink/60">Badge (optional)<input className={`${inputClass} mt-1`} value={size.tag} onChange={(event) => changeSize(index, { tag: event.target.value })} /></label>
          <button type="button" aria-label={`Remove ${size.label}`} onClick={() => setSizes((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="grid size-11 place-self-end place-items-center rounded-xl border border-red-100 bg-white text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
        </div>)}
      </div>
      <button type="button" onClick={() => setSizes((rows) => [...rows, { id: `new-${Date.now()}`, label: 'New size', price: '1', mrp: '', tag: '' }])} className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-brand/25 px-3 text-sm font-semibold text-brand hover:bg-cream"><Plus size={16} /> Add frame size</button>
    </section>

    {message && <p role="status" className={`rounded-xl p-3 text-sm ${message.startsWith('Saved.') ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`}>{message}</p>}
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-white/95 px-4 py-3 backdrop-blur md:left-64">
      <div className="mx-auto flex max-w-5xl items-center gap-3"><Button type="submit" disabled={saving || !dirty} className="gap-2"><Save size={16} /> {saving ? 'Saving…' : 'Save frame settings'}</Button>{dirty && !message && <span className="text-xs text-amber-700">Unsaved changes</span>}{message.startsWith('Saved.') && <span className="inline-flex items-center gap-1 text-xs text-green-700"><Check size={15} /> Saved</span>}</div>
    </div>
  </form>
}
