import { formatPrice } from '../../../shared/utils/format'

const Row = ({ label, value, muted, green, strong }) => (
  <div className={`flex justify-between gap-4 ${green ? 'text-green-700' : ''} ${strong ? 'font-semibold' : ''}`}>
    <dt className={muted ? 'text-ink/60' : ''}>{label}</dt>
    <dd className={muted ? 'text-right text-ink/60' : 'text-right font-semibold'}>{value}</dd>
  </div>
)

// The running price breakdown. Used in the side panel on every step and again in the final review.
export default function PriceSummary({ copies, addons, totals, location, title = 'Order summary' }) {
  // 2 copies of the same size are one line: "A4 Magazine · 8 Pages × 2"
  const groups = []
  copies.forEach((c) => {
    const found = groups.find((g) => g.size.id === c.size.id)
    if (found) found.qty += 1
    else groups.push({ size: c.size, format: c.format, qty: 1 })
  })

  return (
    <div>
      <h2 className="font-serif text-2xl">{title}</h2>
      <dl className="mt-4 space-y-2.5 text-sm">
        {groups.map((g) => (
          <Row key={g.size.id} label={`${g.format.label} · ${g.size.pages} Pages × ${g.qty}`} value={formatPrice(g.size.price * g.qty)} />
        ))}
        {totals.savings > 0 && <Row green label="You save" value={formatPrice(totals.savings)} />}
        {addons.map((a) => (
          <Row key={a.id} label={a.name} value={a.price > 0 ? formatPrice(a.price * (a.qty || 1)) : '—'} />
        ))}
        {location ? (
          <Row label={`Delivery (${location === 'inside' ? 'Inside' : 'Outside'} Dhaka)`} value={formatPrice(totals.deliveryCharge)} />
        ) : (
          <Row muted label="Delivery" value="Added at the delivery step" />
        )}
        {totals.rushCharge > 0 && (
          <Row label={`Rush delivery (${totals.rushDays} day${totals.rushDays > 1 ? 's' : ''})`} value={`+${formatPrice(totals.rushCharge)}`} />
        )}
        <div className="flex items-baseline justify-between border-t border-sand pt-3 text-lg">
          <dt className="font-semibold">Total</dt>
          <dd className="text-xl font-extrabold" aria-live="polite">
            {formatPrice(totals.total)}
          </dd>
        </div>
      </dl>
    </div>
  )
}
