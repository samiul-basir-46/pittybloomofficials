import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import useAsync from '../hooks/useAsync'
import { getBestSelling, getMoreProducts } from '../services/contentService'

// Placeholder page for anything that is not built yet (frames, polaroids, stickers, cart, ...).
// Design each one separately later and swap its route in src/App.jsx.
const SPECIAL = { cart: 'Cart', account: 'Account' }

const titleFromId = (id = '') =>
  id
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')

export default function ComingSoon({ page }) {
  const params = useParams()
  const id = page ?? params.id
  const best = useAsync(getBestSelling)
  const more = useAsync(getMoreProducts)

  const known = [...(best.data ?? []), ...(more.data ?? [])].find((i) => i.id === id)
  const title = SPECIAL[id] ?? known?.name ?? titleFromId(id)

  return (
    <div className="grid min-h-[60vh] place-items-center bg-cream py-20">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">{title}</p>
          <h1 className="mt-4 font-script text-6xl text-brand sm:text-8xl">Coming Soon</h1>
          <p className="mt-6 text-ink/70">
            We are working on something special here. Check back soon, or explore what is already available.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button as={Link} to="/" variant="outline" className="gap-2">
              <ArrowLeft size={16} /> Home
            </Button>
            <Button as={Link} to="/magazines">
              Browse Magazines
            </Button>
          </div>
        </div>
      </Container>
    </div>
  )
}
