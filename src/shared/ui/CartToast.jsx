import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { useCart } from '../context/CartContext'

// Small confirmation shown after "Add to Cart", on every page.
export default function CartToast() {
  const { notice, dismissNotice } = useCart()
  if (!notice) return null

  return (
    <div
      key={notice.id}
      role="status"
      className="fixed inset-x-4 bottom-5 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-2xl motion-safe:animate-page-in"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-green-500">
        <Check size={16} />
      </span>
      <p className="min-w-0 flex-1 truncate">
        <span className="font-semibold">{notice.name}</span> added to cart
      </p>
      <Link to="/cart" onClick={dismissNotice} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand hover:bg-sand">
        View cart
      </Link>
      <button aria-label="Dismiss" onClick={dismissNotice} className="shrink-0 text-white/60 hover:text-white">
        <X size={16} />
      </button>
    </div>
  )
}
