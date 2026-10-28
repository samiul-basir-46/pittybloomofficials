import { Link } from 'react-router-dom'
import Container from '../../shared/ui/Container'
import SmartImage from '../../shared/ui/SmartImage'
import ProductGrid from '../../shared/ui/ProductGrid'
import useAsync from '../../shared/hooks/useAsync'
import { getPolaroidProducts } from '../../shared/services/contentService'
import { formatPrice } from '../../shared/utils/format'
import ProductPage from '../products/ProductPage'

// /polaroids lists every Polaroid added in Admin > Polaroid settings. Until one is added, the older single Polaroid page is shown.
export default function PolaroidsPage() {
  const { data, loading } = useAsync(getPolaroidProducts)
  if (loading) return <p className="py-32 text-center text-ink/60">Loading Polaroids…</p>
  if (!data?.length) return <ProductPage id="polaroids" />
  return <div className="bg-cream py-12 sm:py-16"><Container>
    <h1 className="mb-12 text-center font-serif text-4xl sm:text-5xl">Polaroids</h1>
    <ProductGrid items={data} renderItem={(item) => <Link to={`/polaroids/${item.id}`} className="group mx-auto block w-full max-w-[280px] text-center transition-transform duration-300 hover:-translate-y-1"><div className="aspect-[4/5] overflow-hidden rounded-xl bg-sand"><SmartImage src={item.image} alt={item.title} className="transition-transform duration-500 group-hover:scale-105" /></div><h2 className="mt-3 text-base font-semibold leading-snug">{item.title}</h2><p className="mt-1 text-sm text-ink/65">{formatPrice(Number(item.unitPrice))} per piece</p></Link>} />
  </Container></div>
}
