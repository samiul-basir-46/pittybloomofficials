import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMagazineCategories } from '../shared/services/contentService'

// Pick which Magazines-page filters a magazine appears under. The filters themselves are edited in Admin → Magazine filters.
export default function CategoriesField({ value, onChange }) {
  const [categories, setCategories] = useState(null)
  useEffect(() => { getMagazineCategories().then(setCategories).catch(() => setCategories([])) }, [])
  const selected = Array.isArray(value) ? value : []
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  if (!categories) return <p className="text-sm text-ink/55">Loading filters…</p>
  return <div>
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const on = selected.includes(category.id)
        return <button key={category.id} type="button" aria-pressed={on} onClick={() => toggle(category.id)} className={`min-h-9 rounded-full border px-4 text-sm font-medium transition ${on ? 'border-brand bg-brand text-white' : 'border-sand bg-white text-ink/75 hover:bg-cream'}`}>{category.name}</button>
      })}
      {!categories.length && <p className="text-sm text-ink/55">No filters yet.</p>}
    </div>
    <p className="mt-2 text-xs text-ink/55">Tap to choose one or more. <Link to="/admin/magazine-filters" className="font-semibold text-brand underline">Add or rename filters</Link></p>
  </div>
}
