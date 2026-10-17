import { Link } from 'react-router-dom'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'

export default function NotFoundPage() {
  return (
    <Container className="py-32 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">404</p>
      <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Page not found</h1>
      <p className="mt-4 text-ink/70">The page you are looking for does not exist.</p>
      <Button as={Link} to="/" className="mt-8">
        Back to Home
      </Button>
    </Container>
  )
}
