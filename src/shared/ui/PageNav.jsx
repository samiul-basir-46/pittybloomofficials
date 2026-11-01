import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

// Breadcrumb (the Back button lives in the site header). `trail` is the path after Home, e.g. [{ label: 'Cart' }].
export default function PageNav({ trail = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-ink/60">
        <Link to="/" className="hover:text-brand">
          Home
        </Link>
        {trail.map((t, i) => (
          <span key={t.label} className="flex min-w-0 items-center gap-1.5">
            <ChevronRight size={14} className="shrink-0" />
            {t.to && i < trail.length - 1 ? (
              <Link to={t.to} className="hover:text-brand">
                {t.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-ink">{t.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  )
}
