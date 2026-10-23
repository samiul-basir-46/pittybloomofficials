import { Link } from 'react-router-dom'
import Container from '../../../shared/ui/Container'
import SmartImage from '../../../shared/ui/SmartImage'
import { useSettings } from '../../../shared/context/SettingsContext'
import useAsync from '../../../shared/hooks/useAsync'
import { getSongBooks } from '../../../shared/services/contentService'

function Tile({ item }) {
  return (
    <Link
      to={item.to || `/products/${item.id}`}
      data-motion-item
      className="group block w-[calc((100%_-_1.25rem)/2)] transition-[transform] duration-300 hover:-translate-y-1 lg:w-[calc((100%_-_7.5rem)/4)]"
    >
      <div className="aspect-square overflow-hidden rounded-xl">
        <SmartImage src={item.image} alt={item.name} className="transition-transform duration-500 group-hover:scale-105" />
      </div>
      <p className="mt-4 text-center font-bold">{item.name}</p>
    </Link>
  )
}

export default function MoreProducts({ items }) {
  const { settings } = useSettings()
  const { data } = useAsync(getSongBooks)
  const songBook = data?.[0]
  const products = items.some((item) => item.to === '/song-books') || !songBook
    ? items
    : [...items, { id: 'song-book', name: 'Song Books', image: songBook.image || '/images/products/song-book.jpg', to: '/song-books' }]

  return (
    <section className="bg-cream py-14 sm:py-20">
      <Container>
        <h2 className="text-center font-serif text-4xl sm:text-5xl">{settings.moreProductsTitle}</h2>
        <p className="mt-4 text-center text-sm uppercase tracking-wide text-ink/60">{settings.subtitle}</p>
        <div className="mx-auto mt-14 flex max-w-[1400px] flex-wrap justify-center gap-x-5 gap-y-10 lg:gap-x-10 lg:gap-y-14">
          {products.map((i) => (
            <Tile key={i.id} item={i} />
          ))}
        </div>
      </Container>
    </section>
  )
}
