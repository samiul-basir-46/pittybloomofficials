import { AlertCircle, Pencil } from 'lucide-react'
import { formatPrice } from '../../../shared/utils/format'
import { Card } from '../components/FormField'
import PriceSummary from '../components/PriceSummary'
import { copyTitle } from '../lib/copies'
import { photoStore } from '../lib/photoStore'
import { locationLabel } from '../lib/buildOrder'
import { longDate } from './DeliveryStep'

const Rows = ({ rows }) => (
  <dl className="divide-y divide-sand text-sm">
    {rows
      .filter((r) => r.value)
      .map((r) => (
        <div key={r.label} className="flex justify-between gap-6 py-2.5">
          <dt className="text-ink/60">{r.label}</dt>
          <dd className="text-right font-medium [overflow-wrap:anywhere]">{r.value}</dd>
        </div>
      ))}
  </dl>
)

function Section({ title, onEdit, children }) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl">{title}</h2>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-sand px-3.5 py-1.5 text-sm font-medium text-brand hover:bg-sand">
          <Pencil size={13} /> Edit
        </button>
      </div>
      {children}
    </Card>
  )
}

export default function ReviewStep({ ctx }) {
  const { copies, occasions, chosenAddons: addons, draft, totals, settings, goTo, submitError } = ctx
  const d = draft.delivery
  const c = draft.contact

  return (
    <div className="space-y-6">
      {submitError && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <p>{submitError}</p>
        </div>
      )}

      <Section title="Your magazines" onEdit={() => goTo(1)}>
        <ul className="divide-y divide-sand">
          {copies.map((copy) => {
            const custom = draft.customs[copy.key] ?? {}
            const occasion = occasions.find((o) => o.id === custom.occasionId)
            const photos = photoStore.list(copy.key)
            const meta = draft.photos[copy.key] ?? {}
            return (
              <li key={copy.key} className="py-4 first:pt-2 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{copyTitle(copy)}</p>
                  <p className="font-bold">{formatPrice(copy.size.price)}</p>
                </div>
                <Rows
                  rows={[
                    { label: 'Occasion', value: occasion && `${occasion.emoji} ${occasion.label}` },
                    ...(occasion?.fields ?? []).map((f) => ({ label: f.label, value: String(custom.values?.[f.id] ?? '').trim() })),
                    { label: settings.notesLabel, value: custom.notes?.trim() },
                    {
                      label: 'Photos',
                      value: `${photos.length} chosen${photos.find((p) => p.id === meta.front) ? ` · Front: ${photos.find((p) => p.id === meta.front).name}` : ''}${
                        photos.find((p) => p.id === meta.back) ? ` · Back: ${photos.find((p) => p.id === meta.back).name}` : ''
                      }`,
                    },
                  ]}
                />
                <div className="mt-2 flex gap-4 text-sm">
                  <button type="button" onClick={() => goTo(2)} className="font-medium text-brand hover:underline">
                    Edit details
                  </button>
                  <button type="button" onClick={() => goTo(3)} className="font-medium text-brand hover:underline">
                    Edit photos
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        {copies.every((cp) => photoStore.list(cp.key).length === 0) && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You have not added any photos. That is fine, but remember to send them to us on WhatsApp after placing your order.
          </p>
        )}
        {addons.length > 0 && (
          <div className="mt-4 border-t border-sand pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">Add-ons</p>
            <Rows rows={addons.map((a) => ({ label: a.name, value: a.price > 0 ? formatPrice(a.price) : 'Included' }))} />
          </div>
        )}
      </Section>

      <Section title="Delivery" onEdit={() => goTo(4)}>
        <Rows
          rows={[
            { label: 'Recipient', value: d.recipient },
            { label: 'Contact number', value: d.phone },
            { label: 'Address', value: `${d.address}, ${d.city}` },
            { label: 'Location', value: locationLabel(d.location) },
            { label: 'Needed by', value: d.date && longDate(d.date) },
          ]}
        />
      </Section>

      <Section title="Your details" onEdit={() => goTo(5)}>
        <Rows rows={[{ label: 'Name', value: c.name }, { label: 'Phone', value: c.phone }, { label: 'Email', value: c.email }, { label: 'Note', value: c.note }]} />
      </Section>

      <Card>
        <PriceSummary copies={copies} addons={addons} totals={totals} location={d.location} title="Price breakdown" />
        <div className="mt-4 space-y-2 text-sm leading-6 text-ink/70">
          <p>
            <strong>Delivery charge:</strong> {formatPrice(totals.deliveryCharge)} for {locationLabel(d.location)}.
          </p>
          {totals.rushCharge > 0 && (
            <p>
              <strong>Rush delivery:</strong> +{formatPrice(totals.rushCharge)} because you need it {totals.rushDays} day{totals.rushDays > 1 ? 's' : ''} after the order date. Choose a later date to avoid it.
            </p>
          )}
          {settings.deliveryNote && <p>{settings.deliveryNote}</p>}
        </div>
      </Card>
    </div>
  )
}
