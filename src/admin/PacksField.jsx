import { Plus, Trash2 } from 'lucide-react'
import { inputClass } from './classes'

// Offer packs, e.g. "10 pieces for ৳80". Customers pick one of these instead of typing a quantity.
export default function PacksField({ value, onChange }) {
  const rows = Array.isArray(value) ? value : []
  const change = (index, patch) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  return <div className="space-y-3 rounded-2xl border border-sand bg-cream/50 p-4">
    <p className="text-xs leading-5 text-ink/60">Add offers such as 10 pieces for ৳80 or 20 pieces for ৳150. When at least one offer is added, customers choose an offer. With no offers, they pick any quantity at the per-piece price.</p>
    {rows.map((row, index) => <div key={row.id || index} className="grid gap-2 rounded-xl border border-sand bg-white p-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
      <label className="text-xs font-medium text-ink/60">Pieces<input aria-label={`Offer ${index + 1} pieces`} type="number" min="1" className={`${inputClass} mt-1`} value={row.pieces ?? ''} onChange={(event) => change(index, { pieces: event.target.value === '' ? '' : Number(event.target.value) })} /></label>
      <label className="text-xs font-medium text-ink/60">Total price (BDT)<input aria-label={`Offer ${index + 1} price`} type="number" min="1" className={`${inputClass} mt-1`} value={row.price ?? ''} onChange={(event) => change(index, { price: event.target.value === '' ? '' : Number(event.target.value) })} /></label>
      <label className="text-xs font-medium text-ink/60">Badge (optional)<input aria-label={`Offer ${index + 1} badge`} className={`${inputClass} mt-1`} placeholder="Best value" value={row.tag ?? ''} onChange={(event) => change(index, { tag: event.target.value })} /></label>
      <div className="flex items-end"><button type="button" aria-label={`Remove offer ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))} className="grid min-h-11 place-items-center rounded-xl border border-red-100 px-3 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div>
    </div>)}
    <button type="button" onClick={() => onChange([...rows, { id: `pack-${Date.now().toString(36)}-${rows.length}`, pieces: '', price: '', tag: '' }])} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-brand/25 px-4 text-sm font-semibold text-brand hover:bg-white"><Plus size={16} /> Add offer</button>
  </div>
}
