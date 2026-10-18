import { Link } from 'react-router-dom'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import Button from '../../../shared/ui/Button'
import { formatPrice } from '../../../shared/utils/format'
import { Notice } from './FormField'

export default function Success({ result, whatsapp, photosNote }) {
  const { order, url, saved, photoCount } = result
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-sand bg-white p-6 text-center shadow-sm sm:p-10">
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-green-50 text-green-600">
        <CheckCircle2 size={40} />
      </span>
      <h1 className="mt-6 font-serif text-3xl sm:text-4xl">Your order is almost done</h1>
      <p className="mt-3 text-ink/70">
        Your Order ID is <strong className="text-ink">{order.id}</strong>. Total: <strong className="text-ink">{formatPrice(order.total)}</strong>.
      </p>

      <div className="mt-6 rounded-2xl bg-cream p-5 text-left text-sm leading-6">
        <p className="font-semibold">What to do next</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-ink/80">
          <li>{whatsapp ? 'Send the WhatsApp message that just opened.' : 'Send the email that just opened.'} It has all your order details.</li>
          {photoCount > 0 && <li>Send us your {photoCount} photo{photoCount > 1 ? 's' : ''} on WhatsApp with your Order ID.</li>}
          <li>We will confirm the details and payment with you.</li>
        </ol>
      </div>
      {photoCount > 0 && (
        <div className="mt-4 text-left">
          <Notice tone="warn">{photosNote}</Notice>
        </div>
      )}
      {!saved && (
        <div className="mt-4 text-left">
          <Notice tone="warn">We could not keep a copy of this order on this device. Your message still has everything, so please make sure you send it.</Notice>
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button as="a" href={url} target="_blank" rel="noreferrer" className="gap-2 shadow-lg">
          <MessageCircle size={18} /> {whatsapp ? 'Open WhatsApp message' : 'Open email'}
        </Button>
        <Button as={Link} to="/magazines" variant="outline">
          Back to magazines
        </Button>
      </div>
    </div>
  )
}
