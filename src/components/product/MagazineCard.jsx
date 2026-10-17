import { Link } from 'react-router-dom'
import SmartImage from '../ui/SmartImage'

export default function MagazineCard({ magazine }) {
  return (
    <Link to={`/magazines/${magazine.id}`} className="block text-center">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
        <SmartImage src={magazine.image} alt={magazine.title} />
        {magazine.badge && (
          <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded-full bg-heart px-4 py-1.5 text-sm font-bold uppercase text-white">
            {magazine.badge}
          </span>
        )}
      </div>
      <h3 className="mt-5 text-lg font-bold leading-snug">{magazine.title}</h3>
    </Link>
  )
}
