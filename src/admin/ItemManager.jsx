import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import Button from '../shared/ui/Button'
import SmartImage from '../shared/ui/SmartImage'
import Field from './Field'
import useAsync from '../shared/hooks/useAsync'
import { slugify } from '../shared/utils/text'
import { inputClass } from './classes'
import { uploadCatalogImage } from '../shared/services/catalogImageStore'

const parseEditableOptions = (text = '') => text.split('\n').map((line) => {
  const [label = '', price = '', mrp = '', tag = ''] = line.split('|').map((value) => value.trim())
  return { label, price, mrp, tag }
}).filter((option) => option.label || option.price || option.mrp || option.tag)

export default function ItemManager({ title, api, fields, blank, label, columns = [], makeId = (i) => slugify(label(i)), validate, note }) {
  const { data, loading, reload } = useAsync(api.list)
  const [form, setForm] = useState(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [problem, setProblem] = useState('')
  const items = data ?? []
  const imageKeys = fields.filter((f) => f.type === 'image').map((f) => f.name)
  const imageKey = imageKeys[0]
  const shown = items.filter((i) => label(i).toLowerCase().includes(query.trim().toLowerCase()))
  const updateFrameOptions = (options) => setForm((current) => ({ ...current, item: { ...current.item, options: options.map((option) => `${option.label} | ${option.price}${option.mrp ? ` | ${option.mrp}` : ''}${option.tag ? ` | ${option.tag}` : ''}`).join('\n') } }))

  useEffect(() => {
    if (!form) return
    const onKey = (e) => e.key === 'Escape' && !saving && setForm(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [form, saving])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const submit = async (e) => {
    e.preventDefault()
    let item = form.item
    // Sections can add their own rules (for example page limits). A message stops the save.
    const message = validate ? await validate(item, { items, isNew: form.isNew }) : ''
    if (message) {
      setProblem(message)
      return
    }
    if (item.id === 'frame') {
      const frameOptions = parseEditableOptions(item.options)
      if (!frameOptions.length || frameOptions.some((option) => !option.label.trim() || !Number.isFinite(Number(option.price)) || Number(option.price) < 1)) {
        setProblem('Each frame size needs a name and a price of at least ৳1.')
        return
      }
      if (new Set(frameOptions.map((option) => option.label.trim().toLowerCase())).size !== frameOptions.length) {
        setProblem('Each frame size must have a different name.')
        return
      }
    }
    if (item.id === 'polaroids' && (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 1 || !Number.isInteger(Number(item.minQuantity)) || Number(item.minQuantity) < 1)) {
      setProblem('Enter a per-piece price of at least ৳1 and a minimum quantity of at least 1.')
      return
    }
    setProblem('')
    if (form.isNew) {
      const id = makeId(item)
      item = { ...item, id: items.some((i) => i.id === id) ? `${id}-${Date.now()}` : id }
    }
    setSaving(true)
    try {
      const uploadedImages = await Promise.all(imageKeys.map(async (key) => {
        const image = item[key]
        return [key, typeof image === 'string' && image.startsWith('data:') ? await uploadCatalogImage(image) : image]
      }))
      item = { ...item, ...Object.fromEntries(uploadedImages) }
      await api.save(item)
      setForm(null)
      setToast(form.isNew ? 'Added' : 'Saved')
      reload()
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Could not save this item.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Delete "${label(item)}"?`)) return
    await api.remove(item.id)
    setToast('Deleted')
    reload()
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-ink/60">{items.length} item{items.length === 1 ? '' : 's'}</p>
          {note && <p className="mt-2 max-w-xl text-sm text-ink/60">{note}</p>}
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => {
            setProblem('')
            setForm({ isNew: true, item: blank })
          }}>
          <Plus size={16} /> Add new
        </Button>
      </div>

      {items.length > 5 && (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {loading && !data ? (
        <p className="py-10 text-center text-ink/60">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-sm">
          {shown.length === 0 && <p className="p-10 text-center text-ink/50">Nothing here yet.</p>}
          {shown.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 border-b border-sand p-4 transition-colors last:border-0 hover:bg-cream/60"
            >
              {imageKey && (
                <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-sand bg-sand/60">
                  <SmartImage src={item[imageKey]} alt={label(item)} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{label(item)}</p>
                {columns.length > 0 && (
                  <p className="truncate text-sm text-ink/60">
                    {columns
                      .map((c) => `${c.label}: ${item[c.key] ? (c.format ? c.format(item[c.key]) : item[c.key]) : '—'}`)
                      .join(' · ')}
                  </p>
                )}
              </div>
              <button
                aria-label="Edit"
                className="grid size-9 place-items-center rounded-lg hover:bg-sand/70"
                onClick={() => {
                  setProblem('')
                  setForm({ isNew: false, item })
                }}
              >
                <Pencil size={17} />
              </button>
              <button
                aria-label="Delete"
                className="grid size-9 place-items-center rounded-lg text-red-500 hover:bg-red-50"
                onClick={() => remove(item)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={submit}
            className="max-h-full w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">{form.isNew ? 'Add new' : 'Edit'}</h2>
              <button
                type="button"
                aria-label="Close"
                disabled={saving}
                className="grid size-9 place-items-center rounded-lg hover:bg-sand/70"
                onClick={() => setForm(null)}
              >
                <X size={20} />
              </button>
            </div>
            {fields.filter((field) => !(['frame', 'polaroids'].includes(form.item.id) && field.name === 'options')).map((f) => (
              <Field
                key={f.name}
                label={f.label}
                type={f.type}
                options={f.options}
                required={f.required}
                value={form.item[f.name]}
                onChange={(v) => setForm({ ...form, item: { ...form.item, [f.name]: v } })}
              />
            ))}
            {form.item.id === 'frame' && <div className="space-y-3 rounded-2xl border border-sand bg-cream/50 p-4">
              <div><h3 className="font-semibold">Frame sizes and prices</h3><p className="mt-1 text-xs leading-5 text-ink/60">These choices appear on the customer frame order page. Remove a size to stop offering it.</p></div>
              {parseEditableOptions(form.item.options).map((option, index, options) => <div key={`${index}-${option.label}`} className="grid gap-2 rounded-xl border border-sand bg-white p-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-ink/60">Size name<input aria-label={`Frame size ${index + 1}`} className={`${inputClass} mt-1`} value={option.label} onChange={(event) => updateFrameOptions(options.map((row, rowIndex) => rowIndex === index ? { ...row, label: event.target.value } : row))} /></label>
                <label className="text-xs font-medium text-ink/60">Price (BDT)<input aria-label={`Frame price ${index + 1}`} type="number" min="1" className={`${inputClass} mt-1`} value={option.price} onChange={(event) => updateFrameOptions(options.map((row, rowIndex) => rowIndex === index ? { ...row, price: event.target.value } : row))} /></label>
                <label className="text-xs font-medium text-ink/60">Original price (optional)<input aria-label={`Frame original price ${index + 1}`} type="number" min="0" className={`${inputClass} mt-1`} value={option.mrp || ''} onChange={(event) => updateFrameOptions(options.map((row, rowIndex) => rowIndex === index ? { ...row, mrp: event.target.value } : row))} /></label>
                <div className="flex items-end justify-between gap-2"><label className="min-w-0 flex-1 text-xs font-medium text-ink/60">Badge (optional)<input aria-label={`Frame badge ${index + 1}`} className={`${inputClass} mt-1`} value={option.tag || ''} onChange={(event) => updateFrameOptions(options.map((row, rowIndex) => rowIndex === index ? { ...row, tag: event.target.value } : row))} /></label><button type="button" aria-label={`Remove ${option.label}`} onClick={() => updateFrameOptions(options.filter((_, rowIndex) => rowIndex !== index))} className="grid size-11 shrink-0 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div>
              </div>)}
              <button type="button" onClick={() => updateFrameOptions([...parseEditableOptions(form.item.options), { label: 'New frame size', price: '1', mrp: '', tag: '' }])} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-brand/25 bg-white px-3 text-sm font-semibold text-brand hover:bg-cream"><Plus size={15} /> Add frame size</button>
            </div>}
            {form.item.id === 'polaroids' && <div className="space-y-3 rounded-2xl border border-sand bg-cream/50 p-4"><div><h3 className="font-semibold">Polaroid order settings</h3><p className="mt-1 text-xs text-ink/60">Customers upload one print photo per piece.</p></div><label className="block text-xs font-medium text-ink/60">Price per Polaroid (BDT)<input aria-label="Price per Polaroid" type="number" min="1" className={`${inputClass} mt-1`} value={form.item.unitPrice ?? 8} onChange={(event) => setForm({ ...form, item: { ...form.item, unitPrice: event.target.value } })} /></label><label className="block text-xs font-medium text-ink/60">Minimum quantity<input aria-label="Minimum Polaroid quantity" type="number" min="1" className={`${inputClass} mt-1`} value={form.item.minQuantity ?? 9} onChange={(event) => setForm({ ...form, item: { ...form.item, minQuantity: event.target.value } })} /></label></div>}
            {problem && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {problem}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t border-sand pt-4">
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lg">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  )
}
