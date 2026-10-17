import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'

// Back button + breadcrumb. `trail` is the path after Home, e.g. [{ label: 'Cart' }].
export default function PageNav({ trail = [] }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <button
        // location.key is "default" when the page was opened directly, so there is nothing to go back to
        onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-sand"
      >
        <ArrowLeft size={16} /> Back
      </button>
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
