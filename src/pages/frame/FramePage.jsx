import { Link } from 'react-router-dom'
import Container from '../../shared/ui/Container'
import SmartImage from '../../shared/ui/SmartImage'
import useAsync from '../../shared/hooks/useAsync'
import { getFrameProducts } from '../../shared/services/contentService'
import { formatPrice } from '../../shared/utils/format'

export default function FramePage() {
  const { data = [], loading } = useAsync(getFrameProducts)
  return <div className="bg-cream py-12 sm:py-16"><Container>
    <h1 className="mb-12 text-center font-serif text-4xl sm:text-5xl">Frames</h1>
    {loading ? <p className="py-20 text-center text-ink/60">Loading frames…</p> : data.length ? <div className="mx-auto grid max-w-[1384px] grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-14 lg:gap-y-16">
      {data.map((frame) => <Link key={frame.id} to={`/frame/${frame.id}`} className="group block text-center"><div className="aspect-[4/5] overflow-hidden rounded-xl bg-white"><SmartImage src={frame.image} alt={frame.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" /></div><h2 className="mt-4 font-semibold">{frame.title}</h2><p className="mt-1 text-sm text-ink/65">{formatPrice(frame.price)}</p></Link>)}
    </div> : <p className="py-20 text-center text-ink/60">Frame designs are coming soon.</p>}
  </Container></div>
}
