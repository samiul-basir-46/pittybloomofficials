import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import Button from '../shared/ui/Button'
import SmartImage from '../shared/ui/SmartImage'
import Field from './Field'
import useAsync from '../shared/hooks/useAsync'
import { slugify } from '../shared/utils/text'
import { inputClass } from './classes'
import { uploadCatalogImage } from '../shared/services/catalogImageStore'

export default function ItemManager({ title, api, fields, blank, label, columns = [], makeId = (i) => slugify(label(i)), validate, note }) {
  const { data, loading, reload } = useAsync(api.list)
  const [form, setForm] = useState(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [problem, setProblem] = useState('')
  const items = data ?? []
  const imageKeys = fields.filter((f) => f.type === 'image').map((f) => f.name)
  // Forms with page or design pictures get a wider window so thumbnails are big enough to see.
  const wideForm = fields.some((f) => ['pdf', 'gallery'].includes(f.type))
  const galleryKeys = fields.filter((f) => f.type === 'gallery').map((f) => f.name)
  const imageKey = imageKeys[0]
  const shown = items.filter((i) => label(i).toLowerCase().includes(query.trim().toLowerCase()))

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
      // Gallery pictures (e.g. frame designs): upload the new ones, keep the ones already online.
      for (const key of galleryKeys) {
        const list = Array.isArray(item[key]) ? item[key] : []
        const uploaded = []
        for (const entry of list) {
          uploaded.push(typeof entry.image === 'string' && entry.image.startsWith('data:') ? { ...entry, image: await uploadCatalogImage(entry.image) } : entry)
        }
        item = { ...item, [key]: uploaded }
      }
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
            className={`max-h-full w-full ${wideForm ? 'max-w-3xl' : 'max-w-lg'} space-y-5 overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6`}
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
            {form.item.id === 'frame' && <div className="rounded-2xl border border-sand bg-cream/50 p-4 text-sm"><h3 className="font-semibold">Frame sizes and prices</h3><p className="mt-1 text-xs leading-5 text-ink/60">Frame sizes are managed in one place so they never go out of sync.</p><Link to="/admin/frame-settings" className="mt-2 inline-block text-sm font-semibold text-brand underline">Edit sizes in Frame settings</Link></div>}
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
