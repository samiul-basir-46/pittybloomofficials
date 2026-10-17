import { Link } from 'react-router-dom'
import SmartImage from '../../../shared/ui/SmartImage'
import { formatPrice } from '../../../shared/utils/format'

export default function MagazineMiniCard({ magazine }) {
  return (
    <article className="w-[170px] overflow-hidden rounded-xl border border-sand bg-white">
      <div className="relative aspect-[4/5]">
        <SmartImage src={magazine.image} alt={magazine.title} />
        {magazine.badge && (
          <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-heart px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            {magazine.badge}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-serif text-sm">{magazine.title}</h3>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-sm font-bold leading-tight text-brand">
            Price:
            <br />
            <span className="text-base">{formatPrice(magazine.price)}</span>
          </p>
          <Link to={`/magazines/${magazine.id}`} className="rounded border border-sand px-2.5 py-1 text-xs hover:bg-sand">
            View
          </Link>
        </div>
      </div>
    </article>
  )
}
