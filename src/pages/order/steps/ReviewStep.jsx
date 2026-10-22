import { AlertCircle, ArrowRight, ImagePlus, Pencil } from 'lucide-react'
import { formatPrice } from '../../../shared/utils/format'
import { Card } from '../components/FormField'
import PriceSummary from '../components/PriceSummary'
import { copyTitle } from '../lib/copies'
import { photoStore } from '../lib/photoStore'
import { locationLabel } from '../lib/buildOrder'
import { cleanInstagram } from '../lib/validation'
import { longDate } from './DeliveryStep'

function DetailRows({ rows }) {
  const visibleRows = rows.filter((row) => row.value)
  if (!visibleRows.length) return <p className="text-sm text-ink/55">No extra details added</p>

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {visibleRows.map((row) => (
        <div key={row.label} className="min-w-0 rounded-xl bg-cream/80 px-3.5 py-3">
          <dt className="text-xs font-medium text-ink/55">{row.label}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-ink [overflow-wrap:anywhere]">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function EditButton({ onClick, children, icon: Icon = Pencil, subtle = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${subtle ? 'border border-sand bg-white text-ink hover:bg-cream' : 'bg-brand text-white hover:bg-brand/90'}`}
    >
      <Icon size={14} /> {children} {subtle && <ArrowRight size={13} />}
    </button>
  )
}

function EditSection({ title, hint, onEdit, children }) {
  return (
    <Card>
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-sand pb-4">
        <div>
          <h2 className="font-serif text-xl text-ink">{title}</h2>
          {hint && <p className="mt-1 text-xs text-ink/55">{hint}</p>}
        </div>
        <EditButton onClick={onEdit} subtle>Edit</EditButton>
      </div>
      {children}
    </Card>
  )
}

function PhotoStrip({ photos, meta, copyTitleText }) {
  if (!photos.length) return null
  return (
    <div className="mt-4 rounded-2xl border border-sand bg-white p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Selected photos</p>
        <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-ink/65">{photos.length} photo{photos.length === 1 ? '' : 's'}</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1" aria-label={`${photos.length} selected photos for ${copyTitleText}`}>
        {photos.slice(0, 6).map((photo) => (
          <div key={photo.id} className="relative size-[68px] shrink-0 overflow-hidden rounded-xl border border-sand bg-cream" title={photo.name}>
            {photo.url ? <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center px-1 text-center text-[9px] leading-tight text-ink/55">{photo.name}</span>}
            {(meta.front === photo.id || meta.back === photo.id) && <span className="absolute inset-x-0 bottom-0 bg-brand/90 px-1 py-0.5 text-center text-[9px] font-semibold text-white">{meta.front === photo.id ? 'Front' : 'Back'}</span>}
          </div>
        ))}
        {photos.length > 6 && <span className="grid size-[68px] shrink-0 place-items-center rounded-xl border border-dashed border-sand bg-cream text-sm font-semibold text-ink/60">+{photos.length - 6}</span>}
      </div>
    </div>
  )
}

export default function ReviewStep({ ctx }) {
  const { copies, occasions, chosenAddons: addons, draft, totals, settings, editFromReview, submitError } = ctx
  const d = draft.delivery
  const c = draft.contact
  const noPhotos = copies.every((copy) => photoStore.list(copy.key).length === 0)

  return (
    <div className="space-y-5">
      {submitError && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <p>{submitError}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-cream/75 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Order review</p>
            <h2 className="mt-1 font-serif text-2xl">Your magazines</h2>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-brand">{copies.length}</p>
            <p className="text-xs text-ink/55">{copies.length === 1 ? 'book' : 'books'}</p>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          {copies.map((copy, index) => {
            const custom = draft.customs[copy.key] ?? {}
            const occasion = occasions.find((item) => item.id === custom.occasionId)
            const photos = photoStore.list(copy.key)
            const meta = draft.photos[copy.key] ?? {}
            const photoRows = [
              ...(occasion?.fields ?? []).map((field) => ({ label: field.label, value: String(custom.values?.[field.id] ?? '').trim() })),
              { label: settings.notesLabel || 'Notes', value: custom.notes?.trim() },
            ]

            return (
              <article key={copy.key} className="rounded-2xl border border-sand bg-[#fffdfa] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-sm font-semibold text-white">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{copyTitle(copy)}</p>
                      {occasion && <p className="mt-1 text-sm text-ink/60">{occasion.emoji} {occasion.label}</p>}
                    </div>
                  </div>
                  <p className="font-semibold text-brand">{formatPrice(copy.size.price)}</p>
                </div>

                {photoRows.some((row) => row.value) && <div className="mt-4"><DetailRows rows={photoRows} /></div>}
                <PhotoStrip photos={photos} meta={meta} copyTitleText={copyTitle(copy)} />

                <div className="mt-4 flex flex-wrap gap-2 border-t border-sand pt-4">
                  <EditButton onClick={() => editFromReview(2)} subtle>Edit details</EditButton>
                  <EditButton onClick={() => editFromReview(3)} icon={ImagePlus}>{photos.length ? 'Edit photos' : 'Add photos'}</EditButton>
                </div>
              </article>
            )
          })}

          {noPhotos && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">No photos added yet. You can add them now, or send them to us on WhatsApp after placing your order.</p>}

          {addons.length > 0 && (
            <div className="rounded-2xl border border-sand bg-white p-4 sm:p-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Add-ons</h3>
              <DetailRows rows={addons.map((addon) => ({ label: addon.name, value: addon.price > 0 ? formatPrice(addon.price) : 'Included' }))} />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <EditSection title="Delivery" hint="Where and when your order should arrive" onEdit={() => editFromReview(4)}>
          <DetailRows rows={[
            { label: 'Recipient', value: d.recipient },
            { label: 'Phone number', value: d.phone },
            { label: 'Delivery area', value: locationLabel(d.location) },
            { label: 'City / district', value: d.city },
            { label: 'Street address', value: d.address },
            { label: 'Needed by', value: d.date && longDate(d.date) },
          ]} />
        </EditSection>

        <EditSection title="Your information" hint="Contact details for order updates" onEdit={() => editFromReview(5)}>
          <DetailRows rows={[
            { label: 'Name', value: c.name },
            { label: 'WhatsApp', value: c.phone },
            { label: 'Instagram', value: cleanInstagram(c.instagram) },
            { label: 'Email', value: c.email },
            { label: 'Note', value: c.note },
          ]} />
        </EditSection>
      </div>

      <Card>
        <div className="rounded-2xl bg-cream/70 p-4 sm:p-5">
          <PriceSummary copies={copies} addons={addons} totals={totals} location={d.location} title="Price breakdown" />
        </div>
        <div className="mt-4 space-y-2 text-sm leading-6 text-ink/65">
          <p><strong className="text-ink">Delivery charge:</strong> {formatPrice(totals.deliveryCharge)} for {locationLabel(d.location)}.</p>
          {totals.rushCharge > 0 && <p><strong className="text-ink">Rush delivery:</strong> +{formatPrice(totals.rushCharge)} for your selected delivery date.</p>}
          {settings.deliveryNote && <p>{settings.deliveryNote}</p>}
        </div>
      </Card>
    </div>
  )
}
