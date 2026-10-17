import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import Button from '../shared/ui/Button'
import SmartImage from '../shared/ui/SmartImage'
import Field from './Field'
import useAsync from '../shared/hooks/useAsync'
import { slugify } from '../shared/utils/text'
import { inputClass } from './classes'

export default function ItemManager({ title, api, fields, blank, label, columns = [], makeId = (i) => slugify(label(i)) }) {
  const { data, loading, reload } = useAsync(api.list)
  const [form, setForm] = useState(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const items = data ?? []
  const imageKey = fields.find((f) => f.type === 'image')?.name
  const shown = items.filter((i) => label(i).toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    if (!form) return
    const onKey = (e) => e.key === 'Escape' && setForm(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [form])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const submit = async (e) => {
    e.preventDefault()
    let item = form.item
    if (form.isNew) {
      const id = makeId(item)
      item = { ...item, id: items.some((i) => i.id === id) ? `${id}-${Date.now()}` : id }
    }
    setSaving(true)
    try {
      await api.save(item)
      setForm(null)
      setToast(form.isNew ? 'Added' : 'Saved')
      reload()
    } catch {
      alert('Could not save. The image may be too large for browser storage.')
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
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setForm({ isNew: true, item: blank })}>
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
                onClick={() => setForm({ isNew: false, item })}
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
          onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}
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
                className="grid size-9 place-items-center rounded-lg hover:bg-sand/70"
                onClick={() => setForm(null)}
              >
                <X size={20} />
              </button>
            </div>
            {fields.map((f) => (
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
            <div className="flex justify-end gap-3 border-t border-sand pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(null)}>
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