import { useSearchParams } from 'react-router-dom'
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
  const pill = (on) => `min-h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm sm:min-h-10 sm:px-5 font-medium transition ${on ? 'border-brand bg-brand text-white shadow-sm' : 'border-sand bg-white text-ink/75 hover:bg-sand/60'}`
  const { settings } = useSettings()

  return (
    <div className="bg-cream py-12 sm:py-16">
      <Container>
        <h1 className="mb-12 text-center font-serif text-4xl sm:text-5xl">{settings.magazinesTitle}</h1>
        {filters.length > 0 && <div role="group" aria-label="Filter magazines" className="-mx-4 -mt-6 mb-10 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
          <button type="button" aria-pressed={active === 'all'} onClick={() => choose('all')} className={pill(active === 'all')}>All</button>
          {filters.map((category) => <button key={category.id} type="button" aria-pressed={active === category.id} onClick={(e) => { e.currentTarget.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' }); choose(category.id) }} className={pill(active === category.id)}>{category.name}</button>)}
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
