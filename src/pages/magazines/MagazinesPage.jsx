import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import Container from '../../shared/ui/Container'
import MagazineCard from './components/MagazineCard'
import useAsync from '../../shared/hooks/useAsync'
import { useSettings } from '../../shared/context/SettingsContext'
import { getMagazines } from '../../shared/services/contentService'
import ProductGrid from '../../shared/ui/ProductGrid'

export default function Magazines() {
  const { data, loading } = useAsync(getMagazines)
  const { settings } = useSettings()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="bg-cream py-12 sm:py-16">
      <Container>
        <button type="button" onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))} className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-sand bg-white px-4 text-sm font-medium shadow-sm transition-colors hover:bg-sand"><ArrowLeft size={16} /> Back</button>
        <h1 className="mb-12 text-center font-serif text-4xl sm:text-5xl">{settings.magazinesTitle}</h1>
        {loading ? (
          <p className="py-20 text-center text-ink/60">Loading…</p>
        ) : (
          <ProductGrid items={data ?? []} renderItem={(magazine) => <MagazineCard magazine={magazine} />} />
        )}
      </Container>
    </div>
  )
}
