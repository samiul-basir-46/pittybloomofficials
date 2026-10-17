import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Container from './Container'
import Button from './Button'

// Shared "Coming Soon" screen. Each unfinished page (frame, sticker, cart, ...) renders this
// from its own file under src/pages/, so a page can be redesigned without touching the others.
export default function ComingSoon({ title }) {
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
