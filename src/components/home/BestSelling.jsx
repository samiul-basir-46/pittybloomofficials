import { Link } from 'react-router-dom'
import Container from '../ui/Container'
import SmartImage from '../ui/SmartImage'
import { useSettings } from '../../context/SettingsContext'

function Card({ item }) {
  return (
    <Link
      to={item.to || `/products/${item.id}`}
      className="flex w-full max-w-[320px] flex-col rounded-xl bg-linear-to-b from-white to-sand p-5 shadow-xl sm:w-[320px]"
    >
      <div className="aspect-[4/5] overflow-hidden rounded-lg shadow-md">
        <SmartImage src={item.image} alt={item.name} />
      </div>
      <p className="py-5 text-center text-xl font-bold text-warm">{item.name}</p>
    </Link>
  )
}

export default function BestSelling({ items }) {
  const { settings } = useSettings()

  return (
    <section className="bg-brand py-16 sm:py-24">
      <h2 className="text-center font-script text-6xl text-accent sm:text-8xl">{settings.bestSellingTitle}</h2>
      <Container className="mt-12 sm:mt-20">
        <div className="mx-auto flex max-w-[1040px] flex-wrap justify-center gap-8 sm:gap-10">
          {items.map((i) => (
            <Card key={i.id} item={i} />
          ))}
        </div>
      </Container>
    </section>
  )
}