import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownToLine, ArrowLeft, Check, Copy, ExternalLink, Instagram, Mail, MapPin, MessageCircle, Package, Pencil, Send, Trash2, UserRound } from 'lucide-react'
import SmartImage from '../shared/ui/SmartImage'
import useAsync from '../shared/hooks/useAsync'
import { addonsApi, getMagazines, getOrderSettings, ordersApi } from '../shared/services/contentService'
import { formatPrice } from '../shared/utils/format'
import { getUrgency } from '../shared/utils/urgency'
import { inputClass } from './classes'
import { LEVEL_STYLE, StatusBadge, UrgencyPill, when } from './orderUi'
import { cityText, formatOrderSummary } from './orderSummary'
import { photoStore } from '../pages/order/lib/photoStore'
import { adminAuth } from '../shared/services/firebaseClient'
import { useAdminAuth } from './AdminAuthContext'
import { longDate } from '../pages/order/lib/pricing'
import { createSteadfastConsignment } from './steadfastApi'
import { downloadPhotoZip } from './photoZip'

const Card = ({ title, aside, children, className = '' }) => (
  <section className={`rounded-2xl border border-sand bg-white p-5 shadow-sm sm:p-6 ${className}`}>
    {(title || aside) && <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xs font-semibold uppercase tracking-[.12em] text-ink/60">{title}</h2>{aside}</div>}
    {children}
  </section>
)

const LabelValue = ({ label, children, className = '' }) => children ? <div className={className}><p className="text-xs text-ink/55">{label}</p><div className="mt-0.5 break-words text-sm font-medium">{children}</div></div> : null
const EMPTY_PHOTO_FILES = []
const safeFilenamePart = (value) => String(value || '').normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim().replace(/\s+/g, '-').slice(0, 60)
const isSteadfastUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['steadfast.com.bd', 'www.steadfast.com.bd'].includes(url.hostname)
  } catch { return false }
}

export function PhotoGallery({ photos }) {
  const { user } = useAdminAuth()
  const pageSize = 12
  const [urls, setUrls] = useState({})
  const [preview, setPreview] = useState(null)
  const [page, setPage] = useState(0)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [retry, setRetry] = useState(0)
  const files = photos?.files ?? EMPTY_PHOTO_FILES
  const pageCount = Math.ceil(files.length / pageSize)
  const visibleFiles = useMemo(() => files.slice(page * pageSize, (page + 1) * pageSize), [files, page])
  useEffect(() => setPage(0), [files])
  useEffect(() => {
    if (!user) {
      setUrls({})
      setPhotoError('Sign in with the admin account to view order photos.')
      return undefined
    }
    let active = true
    setLoadingPhotos(true)
    setPhotoError('')
    Promise.all(visibleFiles.map(async (file) => [file.id, await photoStore.getUrl(file.id, file.storageKey, adminAuth)]))
      .then((entries) => {
        if (!active) return
        setUrls((current) => ({ ...current, ...Object.fromEntries(entries) }))
        if (entries.some(([, url]) => !url)) setPhotoError('Some photos could not load. Check the admin account and try again.')
      })
      .catch((error) => { if (active) setPhotoError(`${error instanceof Error ? error.message : 'Photos could not load.'} Check the admin account and try again.`) })
      .finally(() => { if (active) setLoadingPhotos(false) })
    return () => { active = false }
  }, [visibleFiles, user?.uid, retry])
  if (!files.length) return photos?.count ? <p className="mt-3 text-xs text-ink/55">{photos.count} photo{photos.count === 1 ? '' : 's'} selected; files are unavailable on this device.</p> : null
  const download = (file) => {
    if (!urls[file.id]) return
    const anchor = document.createElement('a')
    anchor.href = urls[file.id]
    anchor.download = file.name || 'order-photo'
    anchor.click()
  }
  return <>
    {photoError && <div role={user ? 'alert' : 'status'} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand bg-[#FFFAF8] p-3 text-xs text-ink/70">
      <span>{photoError}{loadingPhotos && ' Loading…'}</span>
      {user && <button type="button" onClick={() => setRetry((current) => current + 1)} className="min-h-9 rounded-lg border border-sand bg-white px-3 font-semibold text-brand">Try again</button>}
    </div>}
    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 xl:grid-cols-6">
      {visibleFiles.map((file) => <div key={file.id} className="min-w-0">
        <button type="button" onClick={() => urls[file.id] && setPreview({ ...file, url: urls[file.id] })} className="block aspect-square w-full overflow-hidden rounded-xl border border-sand bg-cream text-left">
          {urls[file.id] ? <img src={urls[file.id]} alt={file.name} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center px-2 text-center text-xs text-ink/50">Preview unavailable</span>}
        </button>
        <div className="mt-1.5 flex items-center justify-between gap-2"><span className="truncate text-xs text-ink/65" title={file.name}>{file.name}</span><button type="button" aria-label={`Download ${file.name}`} disabled={!urls[file.id]} onClick={() => download(file)} className="grid size-8 shrink-0 place-items-center rounded-lg border border-sand text-brand hover:bg-cream disabled:opacity-40"><ArrowDownToLine size={15} /></button></div>
      </div>)}
    </div>
    {pageCount > 1 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-3">
      <span className="text-xs text-ink/55">Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, files.length)} of {files.length} photos</span>
      <div className="flex gap-2">
        <button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)} className="min-h-9 rounded-lg border border-sand px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
        <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage((current) => current + 1)} className="min-h-9 rounded-lg border border-sand px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40">Next</button>
      </div>
    </div>}
    {preview && <div role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`} onClick={() => setPreview(null)} className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4"><button type="button" onClick={() => setPreview(null)} className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 text-sm font-semibold">Close</button><img src={preview.url} alt={preview.name} className="max-h-[88vh] max-w-full rounded-xl object-contain" /></div>}
  </>
}

function OrderItem({ item, index, image, onDownloadPhotos, zipLoading }) {
  const label = item.kind === 'magazine' ? 'Magazine' : item.kind === 'addon' ? 'Add-on' : item.kind || 'Product'
  const magazine = item.kind === 'magazine'
  return <article className="overflow-hidden rounded-xl border border-sand bg-[#fffefa]">
    <div className="flex items-center gap-3 p-4 sm:px-5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-white">{index + 1}</span>
      <div className={`${magazine ? 'h-20 w-16' : 'size-12'} shrink-0 overflow-hidden rounded-lg bg-cream`}><SmartImage src={item.image || image} alt={item.name} /></div>
      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.name}</p><div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/60"><span className="rounded-full bg-sand/70 px-2 py-0.5">{label}</span>{item.optionLabel && <span>{item.optionLabel}</span>}</div></div>
      <div className="shrink-0 text-right"><p className="text-xs text-ink/55">Qty {item.qty}</p><p className="font-semibold">{formatPrice(item.price * item.qty)}</p></div>
    </div>
    {(item.details?.length > 0 || item.note || item.photos) && <div className="border-t border-sand px-4 pb-4 sm:px-5">
      {item.details?.length > 0 && <><h3 className="mb-2 mt-4 text-xs font-semibold text-ink/65">Personalization</h3><dl className="grid gap-2 sm:grid-cols-2">{item.details.map((row, n) => <LabelValue key={`${row.label}-${n}`} label={row.label}>{row.value}</LabelValue>)}</dl></>}
      {item.note && <div className="mt-4"><p className="mb-1 text-xs text-ink/55">Customer note</p><p className="rounded-lg bg-cream p-3 text-sm text-ink/80">{item.note}</p></div>}
      {item.photos && <><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-semibold text-ink/65">Item photos{item.photos.count ? ` · ${item.photos.count}` : ''}</h3>{item.photos.files?.length > 0 && <button type="button" disabled={zipLoading} onClick={onDownloadPhotos} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-sand bg-white px-3 text-xs font-medium hover:bg-cream disabled:opacity-50"><ArrowDownToLine size={14} />{zipLoading ? 'Preparing ZIP…' : 'Download photos (ZIP)'}</button>}</div>{(item.photos.front || item.photos.back) && <p className="mt-2 text-xs leading-5 text-ink/60">Front cover: {item.photos.front || 'not selected'} · Back cover: {item.photos.back || 'not selected'}</p>}<PhotoGallery photos={item.photos} />{item.photos.reference && <div className="mt-4"><h4 className="mb-2 text-xs font-semibold text-ink/65">Design reference</h4><PhotoGallery photos={{ count: 1, files: [item.photos.reference] }} /></div>}</>}
    </div>}
  </article>
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const orders = useAsync(ordersApi.list)
  const addons = useAsync(addonsApi.list)
  const magazines = useAsync(getMagazines)
  const settingsData = useAsync(getOrderSettings)
  const now = useMemo(() => new Date(), [])
  const [notice, setNotice] = useState({ type: '', text: '' })
  const [noteText, setNoteText] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [zipLoading, setZipLoading] = useState('')
  const [dispatchForm, setDispatchForm] = useState(null)
  const [dispatching, setDispatching] = useState(false)
  const order = orders.data?.find((o) => o.id === id)
  const back = <Link to="/admin/orders" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"><ArrowLeft size={16} /> All orders</Link>
  if (orders.loading && !orders.data) return <p className="py-10 text-center text-ink/60">Loading…</p>
  if (orders.error || !order) return <div>{back}<div className="rounded-2xl border border-dashed border-sand bg-white py-16 text-center"><p className="font-semibold">{orders.error ? 'The order could not be loaded.' : 'Order not found.'}</p><p className="mt-1 text-sm text-ink/60">{orders.error ? 'Please refresh the page.' : 'It may have been deleted.'}</p></div></div>

  const c = order.customer ?? {}
  const settings = settingsData.data ?? {}
  const urgency = getUrgency(order, settings, now)
  const allItems = order.items ?? []
  const itemCount = allItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
  const summary = formatOrderSummary(order, settings, now)
  const changeStatus = async (status) => {
    setNotice({ type: '', text: '' })
    try {
      const changedAt = new Date().toISOString()
      await ordersApi.updateStatus(order.id, status, { statusUpdatedAt: changedAt, ...(status === 'Delivered' ? { completedAt: changedAt } : {}) })
      await orders.reload()
      if (status === 'In production') {
        setNotice({ type: 'ok', text: 'Order marked as preparing. Customer tracking has been updated.' })
        return
      }
      const destination = status === 'Delivered'
        ? '/admin/completed-orders?date=all'
        : status === 'Cancelled'
          ? '/admin/cancelled-orders?date=all'
          : status === 'Shipped'
            ? '/admin/orders?status=dispatched&date=all'
            : '/admin/orders?date=all'
      navigate(destination)
    }
    catch { setNotice({ type: 'error', text: 'The status could not be saved. Please try again.' }) }
  }
  const saveNote = async () => {
    const text = noteText.trim()
    if (!text) return
    const notes = [...(order.adminNotes ?? []), { text, createdAt: new Date().toISOString(), author: 'Admin' }]
    try { await ordersApi.save({ ...order, adminNotes: notes }); await orders.reload(); setNoteText(''); setNotice({ type: 'ok', text: 'Admin note saved.' }) }
    catch { setNotice({ type: 'error', text: 'The note could not be saved. Please try again.' }) }
  }
  const saveEdit = async (event) => {
    event.preventDefault()
    try {
      const items = allItems.map((item, index) => ({ ...item, price: Math.max(0, Number(editForm.itemPrices[index]) || 0) }))
      const totals = items.reduce((sum, item) => {
        const key = item.kind === 'magazine' ? 'magazineTotal' : item.kind === 'addon' ? 'addonTotal' : 'otherTotal'
        sum[key] += item.price * (Number(item.qty) || 0)
        return sum
      }, { magazineTotal: 0, addonTotal: 0, otherTotal: 0 })
      const deliveryCharge = Math.max(0, Number(editForm.deliveryCharge) || 0)
      const rushCharge = Math.max(0, Number(editForm.rushCharge) || 0)
      const deliveryInfo = {
        ...(order.deliveryInfo ?? {}),
        locationLabel: editForm.locationLabel,
        city: editForm.city,
        date: editForm.deliveryDate,
      }
      const delivery = [editForm.locationLabel, editForm.deliveryDate ? longDate(editForm.deliveryDate) : '']
        .filter(Boolean).join(' · ') || order.delivery
      const trackingUrl = String(editForm.trackingUrl || '').trim()
      if (trackingUrl && !isSteadfastUrl(trackingUrl)) {
        setNotice({ type: 'error', text: 'Use the HTTPS tracking link from Steadfast.' })
        return
      }
      await ordersApi.save({
        ...order,
        trackingUrl,
        customer: {
          ...c,
          name: editForm.name,
          phone: editForm.phone,
          instagram: editForm.instagram,
          email: editForm.email,
          note: editForm.note,
          recipient: editForm.recipient,
          deliveryPhone: editForm.deliveryPhone,
          address: [editForm.address, editForm.city].filter(Boolean).join(', '),
        },
        items,
        ...totals,
        deliveryInfo,
        delivery,
        deliveryCharge,
        rushCharge,
        total: totals.magazineTotal + totals.addonTotal + totals.otherTotal + deliveryCharge + rushCharge,
      })
      await orders.reload(); setEditing(false); setNotice({ type: 'ok', text: 'Order details updated.' })
    } catch { setNotice({ type: 'error', text: 'Order details could not be saved.' }) }
  }
  const openEditor = () => {
    const city = order.deliveryInfo?.city ?? ''
    const fullAddress = c.address ?? ''
    const address = city && fullAddress.toLowerCase().endsWith(`, ${city}`.toLowerCase())
      ? fullAddress.slice(0, -(city.length + 2))
      : fullAddress
    setEditForm({
      name: c.name ?? '', phone: c.phone ?? '', instagram: c.instagram ?? '', email: c.email ?? '', note: c.note ?? '',
      recipient: c.recipient ?? '', deliveryPhone: c.deliveryPhone ?? c.phone ?? '', address, city,
      locationLabel: order.deliveryInfo?.locationLabel ?? order.delivery?.split(' · ')[0] ?? '',
      deliveryDate: order.deliveryInfo?.date ?? '',
      trackingUrl: order.trackingUrl ?? '',
      itemPrices: allItems.map((item) => String(item.price ?? 0)),
      deliveryCharge: String(order.deliveryCharge ?? 0), rushCharge: String(order.rushCharge ?? 0),
    })
    setEditing(true)
  }
  const openDispatch = () => {
    const phone = String(c.deliveryPhone || c.phone || '').replace(/\D/g, '')
    const localPhone = phone.startsWith('8801') ? phone.slice(2) : phone
    setDispatchForm({
      recipient_name: c.recipient || c.name || '',
      recipient_phone: localPhone,
      alternative_phone: c.phone && c.phone !== (c.deliveryPhone || c.phone) ? String(c.phone).replace(/\D/g, '').replace(/^880(?=1)/, '') : '',
      recipient_address: c.address || '',
      cod_amount: String(Number(order.total) || 0),
      item_description: allItems.map((item) => item.name).filter(Boolean).join(' + '),
      note: '',
    })
  }
  const submitDispatch = async (event) => {
    event.preventDefault()
    if (!dispatchForm || dispatching) return
    setDispatching(true)
    setNotice({ type: '', text: '' })
    try {
      const result = await createSteadfastConsignment({ invoice: order.id, ...dispatchForm, recipient_email: c.email || '' })
      if (!result.tracking_code) throw new Error('Steadfast created no tracking code. Check the courier panel before retrying.')
      const trackingNumber = String(result.tracking_code)
      const trackingUrl = String(result.consignment?.tracking_link || result.consignment?.tracking_url || result.tracking_link || result.tracking_url || result.public_tracking_url || result.customer_tracking_url || '')
      await ordersApi.save({
        ...order,
        status: 'Shipped',
        statusUpdatedAt: new Date().toISOString(),
        courierName: 'Steadfast Courier',
        trackingNumber,
        trackingUrl,
        tracking_link: trackingUrl,
        tracking_code: trackingNumber,
        steadfastTrackingCode: trackingNumber,
        consignmentId: String(result.consignment_id || ''),
        consignment_id: String(result.consignment_id || ''),
        steadfastConsignment: result.consignment,
        recipientName: dispatchForm.recipient_name,
        customerPhone: dispatchForm.recipient_phone,
        shippingAddress: dispatchForm.recipient_address,
        codAmount: Number(dispatchForm.cod_amount) || 0,
        ...(dispatchForm.note.trim() ? { deliveryNote: dispatchForm.note.trim() } : {}),
      })
      await orders.reload()
      setDispatchForm(null)
      navigate('/admin/orders?status=dispatched&date=all')
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Steadfast dispatch failed.' })
    } finally { setDispatching(false) }
  }
  const remove = async () => {
    if (!window.confirm(`Delete order ${order.id}? This cannot be undone.`)) return
    try { await ordersApi.remove(order.id); navigate('/admin/orders') }
    catch { setNotice({ type: 'error', text: 'The order could not be deleted. Please try again.' }) }
  }
  const addonImage = (item) => addons.data?.find((a) => a.id === item.id)?.image ?? ''
  const downloadPhotos = async (groups, key, filename) => {
    setZipLoading(key)
    setNotice({ type: '', text: '' })
    try {
      await downloadPhotoZip(groups.flatMap(({ photos, folder }) => photos.map((photo) => ({
        ...photo, folder,
        getBlob: () => photoStore.getBlob(photo.id, photo.storageKey, adminAuth),
      }))), filename)
      setNotice({ type: 'ok', text: 'Photo ZIP downloaded.' })
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Could not create the photo ZIP.' })
    } finally { setZipLoading('') }
  }
  const subtotal = (Number(order.magazineTotal) || 0) + (Number(order.addonTotal) || 0) + (Number(order.otherTotal) || 0)
  const copySummary = async () => {
    try { await navigator.clipboard.writeText(summary); setNotice({ type: 'ok', text: 'Production summary copied.' }) }
    catch { setNotice({ type: 'error', text: 'Could not copy the production summary.' }) }
  }

  return <div className="pb-8">
    {back}
    <header className="mb-5 flex items-start justify-between gap-2 sm:mb-7 sm:items-end sm:gap-4">
      <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><StatusBadge status={order.status} /><UrgencyPill urgency={urgency} /></div><h1 className="break-words font-serif text-[1.7rem] leading-tight sm:text-[2.1rem]">Order {order.id}</h1><div className="mt-1 flex items-baseline justify-between gap-2 sm:block"><p className="text-xs text-ink/60 sm:text-sm">Placed {when(order.createdAt)}</p><p className="shrink-0 font-serif text-xl font-semibold sm:hidden">{formatPrice(order.total)}</p></div></div>
      <div className="flex shrink-0 items-start gap-2 sm:items-end sm:gap-4"><button type="button" title="Copy production summary" aria-label="Copy production summary" onClick={copySummary} className="inline-flex size-10 items-center justify-center rounded-xl border border-sand bg-white text-brand transition hover:bg-cream sm:size-11"><Copy size={17} /></button><div className="hidden text-right sm:block"><p className="text-xs uppercase tracking-widest text-ink/50">Total amount</p><p className="font-serif text-3xl font-semibold">{formatPrice(order.total)}</p></div></div>
    </header>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="order-last space-y-5 xl:order-first">
        <Card title="Customer">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex min-w-0 gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-brand"><UserRound size={18} /></span><LabelValue label="Customer name">{c.name}</LabelValue></div>
            {c.phone && <div className="flex min-w-0 gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-brand"><MessageCircle size={18} /></span><LabelValue label="WhatsApp"><a href={`https://wa.me/${String(c.phone).replace(/\D/g, '')}`} className="text-brand hover:underline">{c.phone}</a></LabelValue></div>}
            {c.instagram && <div className="flex min-w-0 gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-brand"><Instagram size={18} /></span><LabelValue label="Instagram"><a href={`https://instagram.com/${String(c.instagram).replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">{c.instagram}</a></LabelValue></div>}
            {c.email && <div className="flex min-w-0 gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-brand"><Mail size={18} /></span><LabelValue label="Email"><a href={`mailto:${c.email}`} className="text-brand hover:underline">{c.email}</a></LabelValue></div>}
          </div>
          {c.note && <p className="mt-5 rounded-xl bg-cream p-3 text-sm text-ink/75">{c.note}</p>}
        </Card>

        <Card title={`Ordered items · ${allItems.length}`} aside={<span className="text-xs text-ink/55">{itemCount} units total</span>}>
          <div className="space-y-3">{allItems.map((item, index) => {
            const zipFilename = safeFilenamePart(c.name || c.recipient || 'Order')
            const image = item.kind === 'addon'
              ? addonImage(item)
              : item.kind === 'magazine'
                ? magazines.data?.find((magazine) => magazine.id === item.id)?.image ?? ''
                : ''
            return <OrderItem key={`${item.id}-${index}`} item={item} index={index} image={image} zipLoading={zipLoading === `item-${index + 1}`} onDownloadPhotos={() => downloadPhotos([{ photos: item.photos?.files ?? [], folder: '' }], `item-${index + 1}`, zipFilename)} />
          })}</div>
        </Card>

        <Card title="Admin notes" aside={<span className="text-xs text-ink/55">Internal only</span>}>
          <div className="space-y-2">
            {(order.adminNotes ?? []).map((note, index) => <div key={`${note.createdAt}-${index}`} className="rounded-xl bg-cream p-3"><p className="text-xs text-ink/55">{note.author || 'Admin'} · {when(note.createdAt)}</p><p className="mt-0.5 whitespace-pre-wrap text-sm">{note.text}</p></div>)}
            {!order.adminNotes?.length && <p className="text-sm text-ink/55">No internal notes yet.</p>}
          </div>
          <label htmlFor="admin-note" className="mb-1 mt-4 block text-xs text-ink/55">Add a note</label>
          <textarea id="admin-note" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write an internal note for the team..." rows={4} className="w-full resize-y rounded-xl border border-sand bg-white p-3 text-sm outline-none focus:border-brand" />
          <div className="mt-3 text-right"><button type="button" disabled={!noteText.trim()} onClick={saveNote} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-45"><Send size={15} /> Save note</button></div>
        </Card>

      </div>

      <aside className="order-first space-y-5 xl:sticky xl:top-5 xl:order-last">
        <Card title="Order actions">
          <div className="flex flex-col gap-2.5">
            {['New', 'Confirmed'].includes(order.status) && <button type="button" onClick={() => changeStatus('In production')} className="min-h-11 rounded-xl border border-[#D9C79A] bg-[#F7F0DC] px-4 text-sm font-semibold text-[#6B531A] hover:bg-[#F1E8CE]">Start preparing</button>}
            <button type="button" disabled={!['New', 'Confirmed', 'In production'].includes(order.status) || !!order.trackingNumber} onClick={openDispatch} className="min-h-11 rounded-xl border border-brand bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45">Dispatch order</button>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={openEditor} className="min-h-11 rounded-xl border border-sand bg-white px-4 text-sm font-medium hover:bg-cream"><Pencil size={14} className="mr-1.5 inline" />Edit</button>
              <button type="button" disabled={['Delivered', 'Cancelled'].includes(order.status)} onClick={() => changeStatus('Delivered')} className="min-h-11 rounded-xl border border-sand bg-white px-4 text-sm font-medium hover:bg-cream disabled:cursor-not-allowed disabled:opacity-45">Complete</button>
            </div>
            <button type="button" disabled={['Delivered', 'Cancelled'].includes(order.status)} onClick={() => { if (window.confirm(`Cancel order ${order.id}?`)) changeStatus('Cancelled') }} className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45">Cancel order</button>
          </div>
          {notice.text && <p role={notice.type === 'error' ? 'alert' : 'status'} className={`mt-3 flex items-center gap-1.5 text-sm ${notice.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>{notice.type === 'ok' && <Check size={15} />}{notice.text}</p>}
          <button type="button" onClick={remove} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100"><Trash2 size={16} /> Delete order</button>
        </Card>

        <Card title="Delivery">
          <div className="space-y-4">
            <LabelValue label="Recipient">{c.recipient || c.name}</LabelValue>
            <LabelValue label="Address">{c.address}</LabelValue>
            <LabelValue label="Phone">{c.deliveryPhone || c.phone ? <a href={`tel:${c.deliveryPhone || c.phone}`} className="text-brand hover:underline">{c.deliveryPhone || c.phone}</a> : ''}</LabelValue>
            <LabelValue label="Delivery date">{order.deliveryInfo?.date ? <span className="inline-flex items-center gap-1.5"><Package size={15} />{order.delivery.split(' · ').slice(1).join(' · ') || order.deliveryInfo.date}</span> : order.delivery}</LabelValue>
            {order.deliveryInfo?.locationLabel && <LabelValue label="Delivery area"><span className="inline-flex items-center gap-1.5"><MapPin size={15} />{order.deliveryInfo.locationLabel}{cityText(order) ? ` · ${cityText(order)}` : ''}</span></LabelValue>}
            {order.deliveryInfo?.date && <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${LEVEL_STYLE[urgency.level].pill}`}>{urgency.level === 'none' ? 'No longer open' : `${LEVEL_STYLE[urgency.level].title}: ${urgency.label}`}</div>}
            {order.trackingNumber && <div className="rounded-xl border border-sand bg-cream p-3"><p className="text-xs text-ink/55">{order.courierName || 'Courier'} tracking code</p><p className="mt-1 font-mono text-sm font-semibold">{order.trackingNumber}</p><a href={isSteadfastUrl(order.trackingUrl) ? order.trackingUrl : 'https://steadfast.com.bd/tracking'} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">{order.trackingUrl ? 'Open tracking link' : 'Open Steadfast tracking page'} <ExternalLink size={13} /></a>{!order.trackingUrl && <p className="mt-1 text-xs text-ink/55">Add the tracking link from the Steadfast SMS in Edit order details for direct tracking.</p>}{order.consignmentId && <p className="mt-1 text-xs text-ink/55">Consignment ID: {order.consignmentId}</p>}</div>}
          </div>
        </Card>

        <Card title="Payment summary">
          <dl className="space-y-0 text-sm">
            {allItems.map((item, index) => <div key={`${item.id}-${index}`} className="flex justify-between gap-3 border-b border-dashed border-sand py-2"><dt className="min-w-0 text-ink/65">{item.name} × {item.qty}</dt><dd className="shrink-0 font-medium">{formatPrice(item.price * item.qty)}</dd></div>)}
            <div className="flex justify-between gap-3 border-b border-dashed border-sand py-2"><dt className="font-semibold">Product price</dt><dd className="font-medium">{formatPrice(subtotal)}</dd></div>
            {order.deliveryInfo && <div className="flex justify-between gap-3 border-b border-dashed border-sand py-2"><dt className="text-ink/65">Delivery charge</dt><dd>{formatPrice(order.deliveryCharge || 0)}</dd></div>}
            {!!order.rushCharge && <div className="flex justify-between gap-3 py-2"><dt className="text-ink/65">Rush delivery</dt><dd>{formatPrice(order.rushCharge)}</dd></div>}
          </dl>
          <div className="mt-3 flex items-baseline justify-between gap-3 rounded-xl bg-brand px-4 py-3 text-white"><span className="text-sm">Total amount</span><span className="font-serif text-2xl font-semibold">{formatPrice(order.total)}</span></div>
        </Card>
      </aside>
    </div>
    {editing && editForm && <div role="dialog" aria-modal="true" aria-labelledby="edit-order-title" className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"><form onSubmit={saveEdit} className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl border border-sand bg-[#fdfcf9] p-5 shadow-xl sm:p-6">
      <div className="sticky top-0 flex items-center justify-between bg-[#fdfcf9] pb-2"><h2 id="edit-order-title" className="font-serif text-2xl">Edit order details</h2><button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-1 text-sm hover:bg-cream">Close</button></div>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/60">Customer</legend>
        {[['name','Customer name','text'],['phone','WhatsApp number','tel'],['instagram','Instagram','text'],['email','Email','email'],['recipient','Delivery recipient','text'],['deliveryPhone','Delivery phone number','tel'],['address','Delivery address','text'],['city','City / district','text']].map(([key,label,type]) => <label key={key} className="block text-xs text-ink/60">{label}<input type={type} className={`${inputClass} mt-1`} value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} /></label>)}
        <label className="block text-xs text-ink/60 sm:col-span-2">Customer note<textarea rows={3} className={`${inputClass} mt-1`} value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} /></label>
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/60">Delivery</legend>
        <label className="block text-xs text-ink/60">Delivery area<input className={`${inputClass} mt-1`} value={editForm.locationLabel} onChange={(e) => setEditForm({ ...editForm, locationLabel: e.target.value })} /></label>
        <label className="block text-xs text-ink/60">Delivery date<input type="date" className={`${inputClass} mt-1`} value={editForm.deliveryDate} onChange={(e) => setEditForm({ ...editForm, deliveryDate: e.target.value })} /></label>
        <label className="block text-xs text-ink/60 sm:col-span-2">Steadfast tracking link<input type="url" placeholder="Paste the tracking link from Steadfast SMS" className={`${inputClass} mt-1`} value={editForm.trackingUrl} onChange={(e) => setEditForm({ ...editForm, trackingUrl: e.target.value })} /><span className="mt-1 block text-[11px] text-ink/50">Customers can open this link directly from My Orders.</span></label>
      </fieldset>
      <fieldset className="space-y-3"><legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/60">Prices (৳)</legend>
        {allItems.map((item, index) => <label key={`${item.id}-${index}`} className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3 text-sm"><span className="min-w-0 truncate">{item.name} <span className="text-xs text-ink/55">× {item.qty}</span></span><input aria-label={`${item.name} unit price`} type="number" min="0" step="1" className={inputClass} value={editForm.itemPrices[index]} onChange={(e) => setEditForm({ ...editForm, itemPrices: editForm.itemPrices.map((price, i) => i === index ? e.target.value : price) })} /></label>)}
        <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs text-ink/60">Delivery charge<input type="number" min="0" step="1" className={`${inputClass} mt-1`} value={editForm.deliveryCharge} onChange={(e) => setEditForm({ ...editForm, deliveryCharge: e.target.value })} /></label><label className="block text-xs text-ink/60">Rush delivery charge<input type="number" min="0" step="1" className={`${inputClass} mt-1`} value={editForm.rushCharge} onChange={(e) => setEditForm({ ...editForm, rushCharge: e.target.value })} /></label></div>
      </fieldset>
      <div className="flex justify-end gap-2 border-t border-sand pt-4"><button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-xl border border-sand px-4 text-sm">Cancel</button><button type="submit" className="min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Save changes</button></div>
    </form></div>}
    {dispatchForm && <div role="dialog" aria-modal="true" aria-labelledby="steadfast-title" className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"><form onSubmit={submitDispatch} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-sand bg-[#fdfcf9] p-5 shadow-xl sm:p-6">
      <div className="flex items-center justify-between"><div><h2 id="steadfast-title" className="font-serif text-2xl">Steadfast dispatch</h2><p className="text-xs text-ink/55">Order {order.id} · Review courier details</p></div><button type="button" disabled={dispatching} onClick={() => setDispatchForm(null)} className="rounded-lg px-3 py-1 text-sm hover:bg-cream">Close</button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[['recipient_name','Recipient name','text'],['recipient_phone','Recipient phone','tel'],['alternative_phone','Alternative phone (optional)','tel'],['cod_amount','Cash on delivery amount (৳)','number'],['item_description','Parcel description','text']].map(([key,label,type]) => <label key={key} className={`block text-xs text-ink/60 ${key === 'item_description' ? 'sm:col-span-2' : ''}`}>{label}<input required={key !== 'alternative_phone'} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '1' : undefined} className={`${inputClass} mt-1`} type={type} value={dispatchForm[key]} onChange={(e) => setDispatchForm({ ...dispatchForm, [key]: e.target.value })} /></label>)}
        <label className="block text-xs text-ink/60 sm:col-span-2">Delivery address<textarea required rows={3} className={`${inputClass} mt-1`} value={dispatchForm.recipient_address} onChange={(e) => setDispatchForm({ ...dispatchForm, recipient_address: e.target.value })} /></label>
        <label className="block text-xs text-ink/60 sm:col-span-2">Courier rider note (optional)<textarea rows={2} placeholder="Leave blank if there is no rider note" className={`${inputClass} mt-1`} value={dispatchForm.note} onChange={(e) => setDispatchForm({ ...dispatchForm, note: e.target.value })} /></label>
      </div>
      <p className="rounded-xl bg-cream p-3 text-xs leading-relaxed text-ink/60">This will create a real Steadfast consignment and mark the order as Shipped after the courier confirms it.</p>
      <div className="flex justify-end gap-2 border-t border-sand pt-4"><button type="button" disabled={dispatching} onClick={() => setDispatchForm(null)} className="min-h-11 rounded-xl border border-sand px-4 text-sm">Cancel</button><button type="submit" disabled={dispatching} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{dispatching ? 'Dispatching…' : 'Confirm & dispatch'}</button></div>
    </form></div>}
  </div>
}
