import { ABOUT } from '../../data/magazineMeta'
import { formatPrice } from '../../utils/format'

function Column({ title, items }) {
  return (
    <div>
      <h3 className="font-serif text-lg text-brand-dark">{title}</h3>
      <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[15px] text-ink/70 marker:text-brand">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

export default function ProductAbout({ size }) {
  const pages = `${size.pages} Pages (${size.sides} Sides)`
  const columns = [
    { title: "What's Included:", items: [pages, ...ABOUT.included] },
    { title: 'Things Required:', items: [`${size.photos} Photos`, ...ABOUT.required] },
    { title: 'Perfect For:', items: ABOUT.perfectFor },
    {
      title: 'Important Information:',
      items: [`Price: ${formatPrice(size.price)}`, pages, `${size.photos} Photos Required`, ...ABOUT.important],
    },
  ]

  return (
    <section className="rounded-3xl border border-sand bg-cream p-6 sm:p-10">
      <h2 className="font-serif text-3xl">About This Product</h2>
      <p className="mt-6 text-ink/70">{ABOUT.tagline}</p>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((c) => (
          <Column key={c.title} {...c} />
        ))}
      </div>
      <div className="mt-10 rounded-xl border-l-4 border-brand bg-white p-6 shadow-sm">
        <h3 className="font-serif text-lg">Privacy Policy</h3>
        <p className="mt-2 text-ink/70">{ABOUT.privacy}</p>
      </div>
    </section>
  )
}
