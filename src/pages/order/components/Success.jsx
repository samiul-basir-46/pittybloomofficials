import { CheckCircle2 } from 'lucide-react'

// Shown only after the order has been saved. Nothing else is on this screen on purpose.
export default function Success({ orderId }) {
  return (
    <div role="status" className="mx-auto max-w-xl rounded-3xl border border-sand bg-white p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-green-50 text-green-600">
        <CheckCircle2 size={40} />
      </span>
      <h1 className="mt-6 font-serif text-3xl sm:text-4xl">The order has been placed</h1>
      <p className="mt-3 text-ink/70">
        Order ID: <strong className="text-ink">{orderId}</strong>
      </p>
    </div>
  )
}
