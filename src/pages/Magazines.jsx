import Container from '../components/ui/Container'
import MagazineCard from '../components/product/MagazineCard'
import useAsync from '../hooks/useAsync'
import { getMagazines } from '../services/contentService'

export default function Magazines() {
  const { data, loading } = useAsync(getMagazines)

  return (
    <div className="bg-cream py-12 sm:py-16">
      <Container>
        <h1 className="mb-12 text-center font-serif text-4xl sm:text-5xl">Magazines</h1>
        {loading ? (
          <p className="py-20 text-center text-ink/60">Loading…</p>
        ) : (
          <div className="mx-auto grid max-w-[1384px] grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-14 lg:gap-y-16">
            {data.map((m) => (
              <MagazineCard key={m.id} magazine={m} />
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}
