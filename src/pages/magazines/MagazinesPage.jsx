import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Container from '../../shared/ui/Container'
import MagazineCard from './components/MagazineCard'
import useAsync from '../../shared/hooks/useAsync'
import { useSettings } from '../../shared/context/SettingsContext'
import { getMagazineCategories, getMagazines, magazineCategoryIds } from '../../shared/services/contentService'
import ProductGrid from '../../shared/ui/ProductGrid'

export default function Magazines() {
  const { data, loading } = useAsync(getMagazines)
  const categoriesData = useAsync(getMagazineCategories)
  const [params, setParams] = useSearchParams()
  const categories = categoriesData.data ?? []
  const magazines = data ?? []
  // Only show filters that have at least one magazine.
  const filters = categories.filter((category) => magazines.some((magazine) => magazineCategoryIds(magazine, categories).includes(category.id)))
  const active = filters.some((category) => category.id === params.get('filter')) ? params.get('filter') : 'all'
  const visible = active === 'all' ? magazines : magazines.filter((magazine) => magazineCategoryIds(magazine, categories).includes(active))
  const choose = (id) => setParams((current) => { const next = new URLSearchParams(current); if (id === 'all') next.delete('filter'); else next.set('filter', id); return next }, { replace: true })
  const pill = (on) => `min-h-10 shrink-0 rounded-full border px-5 text-sm font-medium transition ${on ? 'border-brand bg-brand text-white shadow-sm' : 'border-sand bg-white text-ink/75 hover:bg-sand/60'}`
  const { settings } = useSettings()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="bg-cream py-12 sm:py-16">
      <Container>
        <button type="button" onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))} className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-sand bg-white px-4 text-sm font-medium shadow-sm transition-colors hover:bg-sand"><ArrowLeft size={16} /> Back</button>
        <h1 className="mb-12 text-center font-serif text-4xl sm:text-5xl">{settings.magazinesTitle}</h1>
        {filters.length > 0 && <div role="group" aria-label="Filter magazines" className="-mt-6 mb-10 flex flex-wrap justify-center gap-2">
          <button type="button" aria-pressed={active === 'all'} onClick={() => choose('all')} className={pill(active === 'all')}>All</button>
          {filters.map((category) => <button key={category.id} type="button" aria-pressed={active === category.id} onClick={() => choose(category.id)} className={pill(active === category.id)}>{category.name}</button>)}
        </div>}
        {loading ? (
          <p className="py-20 text-center text-ink/60">Loading…</p>
        ) : visible.length ? (
          <ProductGrid items={visible} renderItem={(magazine) => <MagazineCard magazine={magazine} />} />
        ) : (
          <p className="py-20 text-center text-ink/60">No magazines in this filter yet.</p>
        )}
      </Container>
    </div>
  )
}
