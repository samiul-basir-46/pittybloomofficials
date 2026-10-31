import { Plus, Trash2 } from 'lucide-react'
import { inputClass } from './classes'

const readRows = (value = '') => {
  const rows = String(value).split('\n').filter((line) => line.trim()).map((line) => {
    const [name = '', price = '', mrp = '', tag = ''] = line.split('|').map((part) => part.trim())
    return { name, price, mrp, tag }
  })
  return rows.length ? rows : [{ name: '', price: '', mrp: '', tag: '' }]
}

const writeRows = (rows) => rows
  .map(({ name, price, mrp, tag }) => [name, price, mrp, tag].join(' | '))
  .join('\n')

export default function OptionsEditor({ label, value, onChange, required }) {
  const rows = readRows(value)
  const update = (index, key, next) => onChange(writeRows(rows.map((row, i) => i === index ? { ...row, [key]: next } : row)))
  const remove = (index) => onChange(writeRows(rows.filter((_, i) => i !== index)))

  return (
    <section className="space-y-3" aria-label={label}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{label}{required && <span className="text-red-500"> *</span>}</h3>
          <p className="mt-1 text-xs text-ink/55">Set the option name and price. MRP and tag are optional.</p>
        </div>
        <button type="button" onClick={() => onChange(writeRows([...rows, { name: '', price: '', mrp: '', tag: '' }]))}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sand px-3 text-sm font-medium text-ink hover:bg-cream">
          <Plus size={15} /> Add option
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="rounded-xl border border-sand bg-cream/30 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink/55">Option {index + 1}</span>
              <button type="button" aria-label={`Remove option ${index + 1}`} disabled={rows.length === 1}
                onClick={() => remove(index)} className="grid size-8 place-items-center rounded-lg text-ink/50 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs font-medium text-ink/65">Option name<input className={`${inputClass} mt-1`} value={row.name} placeholder="e.g. 3 Strips" onChange={(e) => update(index, 'name', e.target.value)} /></label>
              <label className="block text-xs font-medium text-ink/65">Price (৳)<input className={`${inputClass} mt-1`} type="number" min="0" step="1" value={row.price} placeholder="100" onChange={(e) => update(index, 'price', e.target.value)} /></label>
              <label className="block text-xs font-medium text-ink/65">MRP (optional)<input className={`${inputClass} mt-1`} type="number" min="0" step="1" value={row.mrp} placeholder="Leave blank if none" onChange={(e) => update(index, 'mrp', e.target.value)} /></label>
              <label className="block text-xs font-medium text-ink/65">Tag (optional)<input className={`${inputClass} mt-1`} value={row.tag} placeholder="e.g. Best Value" onChange={(e) => update(index, 'tag', e.target.value)} /></label>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
