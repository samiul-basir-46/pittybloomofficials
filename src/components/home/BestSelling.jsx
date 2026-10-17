import { Link } from 'react-router-dom'
import Container from '../ui/Container'
import SmartImage from '../ui/SmartImage'

function Card({ item }) {
  const Tag = item.to ? Link : 'div'
  return (
    <Tag
      to={item.to || undefined}
      className="flex w-full max-w-[320px] flex-col rounded-xl bg-linear-to-b from-white to-sand p-5 shadow-xl sm:w-[320px]"
    >
      <div className="aspect-[4/5] overflow-hidden rounded-lg shadow-md">
        <SmartImage src={item.image} alt={item.name} />
      </div>
      <p className="py-5 text-center text-xl font-bold text-warm">{item.name}</p>
    </Tag>
  )
}

export default function BestSelling({ items }) {
  return (
    <section className="bg-brand py-16 sm:py-24">
      <h2 className="text-center font-script text-6xl text-accent sm:text-8xl">Best Selling</h2>
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
