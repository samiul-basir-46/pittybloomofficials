import { Link } from 'react-router-dom'
import Container from '../../shared/ui/Container'
import SmartImage from '../../shared/ui/SmartImage'
import ProductGrid from '../../shared/ui/ProductGrid'
import useAsync from '../../shared/hooks/useAsync'
import { getFrameProducts } from '../../shared/services/contentService'
import { formatPrice } from '../../shared/utils/format'

export default function FramePage() {
  const { data = [], loading } = useAsync(getFrameProducts)
  return <div className="bg-cream py-12 sm:py-16"><Container>
    <h1 className="mb-12 text-center font-serif text-4xl sm:text-5xl">Frames</h1>
    {loading ? <p className="py-20 text-center text-ink/60">Loading frames…</p> : data.length ? <ProductGrid items={data} renderItem={(frame) => <Link to={`/frame/${frame.id}`} className="group mx-auto block w-full max-w-[280px] text-center transition-transform duration-300 hover:-translate-y-1"><div className="aspect-[4/5] overflow-hidden rounded-xl bg-sand"><SmartImage src={frame.image} alt={frame.title} className="transition-transform duration-500 group-hover:scale-105" /></div><h2 className="mt-3 text-base font-semibold leading-snug">{frame.title}</h2><p className="mt-1 text-sm text-ink/65">{formatPrice(frame.price)}</p></Link>} /> : <p className="py-20 text-center text-ink/60">Frame designs are coming soon.</p>}
  </Container></div>
}
