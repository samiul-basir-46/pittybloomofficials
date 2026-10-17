import { Link } from 'react-router-dom'
import Container from '../../../shared/ui/Container'
import SmartImage from '../../../shared/ui/SmartImage'
import { useSettings } from '../../../shared/context/SettingsContext'

// Phone: 3 compact cards per row (like a product strip). Tablet/desktop: the original big 320px cards.
function Card({ item }) {
  return (
    <Link
      to={item.to || `/products/${item.id}`}
      className="flex w-[calc((100%_-_1.5rem)/3)] flex-col rounded-lg bg-linear-to-b from-white to-sand p-2 shadow-lg sm:w-[320px] sm:rounded-xl sm:p-5 sm:shadow-xl"
    >
      <div className="aspect-[4/5] overflow-hidden rounded-md shadow-md sm:rounded-lg">
        <SmartImage src={item.image} alt={item.name} />
      </div>
      <p className="px-1 py-2.5 text-center text-xs font-bold leading-tight text-warm sm:py-5 sm:text-xl">{item.name}</p>
    </Link>
  )
}

export default function BestSelling({ items }) {
  const { settings } = useSettings()

  return (
    <section className="bg-brand py-12 sm:py-24">
      <h2 className="text-center font-script text-5xl text-accent sm:text-8xl">{settings.bestSellingTitle}</h2>
      <Container className="mt-8 sm:mt-20">
        <div className="mx-auto flex max-w-[1040px] flex-wrap justify-center gap-3 sm:gap-10">
          {items.map((i) => (
            <Card key={i.id} item={i} />
          ))}
        </div>
      </Container>
    </section>
  )
}
