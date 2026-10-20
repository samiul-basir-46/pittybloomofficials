import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useAsync from '../shared/hooks/useAsync'
import { getActiveAddons, getMagazine, getOccasions, getOrderSettings, getSizes } from '../shared/services/contentService'
import { savedDrafts } from '../pages/order/lib/savedDrafts'
import { copyTitle, getFormats, withFields } from '../pages/order/lib/copies'
import { formatPrice } from '../shared/utils/format'
import { PhotoGallery } from './OrderDetailPage'

const Card = ({ title, children }) => <section className="rounded-2xl border border-sand bg-white p-5 sm:p-6">
  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand">{title}</h2>{children}
</section>
const Rows = ({ rows }) => <dl className="divide-y divide-sand text-sm">{rows.filter((r) => r.value).map((r) => <div key={r.label} className="flex justify-between gap-6 py-2.5"><dt className="text-ink/60">{r.label}</dt><dd className="text-right font-medium [overflow-wrap:anywhere]">{r.value}</dd></div>)}</dl>

export default function DraftDetailPage() {
  const { id } = useParams()
  const draftData = useAsync(() => savedDrafts.get(id), [id])
  const magazines = useAsync(() => getMagazine(draftData.data?.magazineId), [draftData.data?.magazineId])
  const sizes = useAsync(getSizes)
  const occasions = useAsync(getOccasions)
  const addons = useAsync(getActiveAddons)
  const settings = useAsync(getOrderSettings)
  const back = <Link to="/admin/orders" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"><ArrowLeft size={16} /> All orders</Link>

  if (draftData.loading) return <p className="py-10 text-center text-ink/60">Loading draft…</p>
  const entry = draftData.data
  if (!entry) return <div>{back}<p className="rounded-xl border border-sand bg-white p-8 text-center">Draft not found.</p></div>
  if (magazines.loading || sizes.loading || occasions.loading || addons.loading || settings.loading) return <p className="py-10 text-center text-ink/60">Loading draft details…</p>
  const d = entry.draft ?? {}
  const contact = d.contact ?? {}
  const delivery = d.delivery ?? {}
  const formatInfo = settings.data ? getFormats(settings.data) : []
  const copies = formatInfo.flatMap((format) => {
    const pick = d.picks?.[format.id]
    const size = sizes.data?.find((item) => item.id === pick?.sizeId)
    return pick && size ? Array.from({ length: pick.qty }, (_, index) => ({ key: `${format.id}:${index + 1}`, format, size, number: index + 1 })) : []
  })
  const occasionList = (occasions.data ?? []).map(withFields)
  const selectedAddons = (addons.data ?? []).filter((addon) => d.addons?.includes(addon.id))

  return <div>
    {back}
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="font-serif text-3xl">{entry.magazineTitle || magazines.data?.title || 'Magazine'} draft</h1><p className="mt-1 text-sm text-ink/60">Saved {new Date(entry.updatedAt).toLocaleString()}</p></div>
      <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">Incomplete · not submitted</span>
    </div>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <Card title={`Progress · Step ${entry.step} of ${entry.totalSteps}`}>
          <p className="font-semibold">{entry.stepLabel}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(entry.step / entry.totalSteps * 100)}%` }} /></div>
        </Card>
        <Card title="Customer information"><Rows rows={[
          { label: 'Google account', value: d.account?.email },
          { label: 'Account UID', value: d.account?.uid },
          { label: 'Name', value: contact.name }, { label: 'WhatsApp', value: contact.phone },
          { label: 'Instagram', value: contact.instagram }, { label: 'Email', value: contact.email }, { label: 'Note', value: contact.note },
        ]} /></Card>
        <Card title="Delivery information"><Rows rows={[
          { label: 'Recipient', value: delivery.recipient }, { label: 'Phone', value: delivery.phone },
          { label: 'Address', value: [delivery.address, delivery.city].filter(Boolean).join(', ') },
          { label: 'Area', value: delivery.location }, { label: 'Needed by', value: delivery.date },
        ]} /></Card>
        {selectedAddons.length > 0 && <Card title="Selected add-ons"><Rows rows={selectedAddons.map((addon) => ({ label: addon.name, value: 'Selected' }))} /></Card>}
      </div>
      <div className="space-y-5">
        <Card title="Magazine selection">
          {copies.length ? <ul className="divide-y divide-sand">{copies.map((copy, index) => {
            const title = copyTitle({ ...copy, number: index + 1 })
            const meta = d.photos?.[copy.key] ?? {}
            const custom = d.customs?.[copy.key] ?? {}
            const occasion = occasionList.find((item) => item.id === custom.occasionId)
            const details = [
              { label: 'Occasion', value: occasion?.label },
              ...(occasion?.fields ?? []).map((field) => ({ label: field.label, value: custom.values?.[field.id] })),
              { label: settings.data?.notesLabel || 'Notes', value: custom.notes },
            ]
            return <li key={copy.key} className="py-4 first:pt-0 last:pb-0">
              <p className="font-semibold">{title} · Current price {formatPrice(copy.size.price)}</p>
              <Rows rows={details} />
              {meta.files?.length ? <PhotoGallery photos={{ count: meta.files.length, copy: title, frontId: meta.front, backId: meta.back, files: meta.files }} /> : <p className="mt-2 text-sm text-ink/50">No uploaded photos on this copy.</p>}
            </li>
          })}</ul> : <p className="text-sm text-ink/60">No magazine size has been selected yet.</p>}
        </Card>
      </div>
    </div>
  </div>
}
