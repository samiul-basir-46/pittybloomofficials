import { Link } from 'react-router-dom'
import Container from '../../shared/ui/Container'
import SmartImage from '../../shared/ui/SmartImage'
import useAsync from '../../shared/hooks/useAsync'
import { getSongBooks } from '../../shared/services/contentService'

function SongBookCard({ book }) {
  return (
    <Link to={`/song-books/${book.id}`} data-motion-item className="group block text-center transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-sand">
        <SmartImage src={book.image} alt={book.title} className="transition-transform duration-500 group-hover:scale-105" />
        {book.badge && <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded-full bg-heart px-4 py-1.5 text-sm font-bold uppercase text-white">{book.badge}</span>}
      </div>
      <h2 className="mt-5 text-lg font-bold leading-snug">{book.title}</h2>
    </Link>
  )
}

export default function SongBookPage() {
  const { data = [], loading, error, reload } = useAsync(getSongBooks)

  return (
    <div className="bg-cream py-12 sm:py-16">
      <Container>
        <h1 className="mb-12 text-center font-serif text-4xl sm:text-5xl">Song Books</h1>
        {loading ? (
          <p className="py-20 text-center text-ink/60">Loading…</p>
        ) : error ? (
          <div className="py-20 text-center text-ink/60">
            <p>Song Books could not be loaded.</p>
            <button type="button" onClick={reload} className="mt-2 text-brand underline">Try again</button>
          </div>
        ) : data.length === 0 ? (
          <p className="py-20 text-center text-ink/60">There are no Song Books available right now.</p>
        ) : (
          <div className="mx-auto grid max-w-[1384px] grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-14 lg:gap-y-16">
            {data.map((book) => <SongBookCard key={book.id} book={book} />)}
          </div>
        )}
      </Container>
    </div>
  )
}
