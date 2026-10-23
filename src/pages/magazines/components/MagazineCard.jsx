import { Link } from 'react-router-dom'
import SmartImage from '../../../shared/ui/SmartImage'

export default function MagazineCard({ magazine }) {
  return (
    <Link to={`/magazines/${magazine.id}`} data-motion-item className="group mx-auto block w-full max-w-[280px] text-center transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-sand">
        <SmartImage src={magazine.image} alt={magazine.title} className="transition-transform duration-500 group-hover:scale-105" />
        {magazine.badge && (
          <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded-full bg-heart px-4 py-1.5 text-sm font-bold uppercase text-white">
            {magazine.badge}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug">{magazine.title}</h3>
    </Link>
  )
}
