import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import useAsync from '../shared/hooks/useAsync'
import { getOrderSettings, ordersApi } from '../shared/services/contentService'
import { uploadCatalogImage } from '../shared/services/catalogImageStore'
import { compressImage } from '../shared/utils/compressImage'
import { deliveryFee, dhakaToday, validBangladeshPhone } from '../shared/utils/manualOrderRules'
import { formatPrice } from '../shared/utils/format'
import { inputClass } from './classes'

// Orders that arrive by message (WhatsApp, Messenger, Instagram, phone) are typed in here by the team.
// `kind` / `id` decide which category tab, urgency rule and icon the order gets, same as website orders.
const PRODUCT_TYPES = [
  { id: 'magazine', label: 'Magazine', line: { kind: 'magazine', id: 'custom-magazine' } },
  { id: 'song-book', label: 'Song Book', line: { kind: 'song-book', id: 'song-book' } },
  { id: 'frame', label: 'Frame', line: { kind: 'frame', id: 'frame' } },
  { id: 'polaroids', label: 'Polaroids', line: { kind: 'polaroids', id: 'polaroids' } },
  { id: 'photo-strip', label: 'Photo Strip', line: { kind: 'product', id: 'photo-strip' } },
  { id: 'mini-magazine', label: 'Mini Pocket Magazine', line: { kind: 'mini-magazine', id: 'mini-magazine' } },
  { id: 'gift-card', label: 'Gift Card', line: { kind: 'gift-card', id: 'gift-card' } },
  { id: 'wish-card', label: 'Wish Card', line: { kind: 'wish-card', id: 'wish-card' } },
  { id: 'sticker', label: 'Sticker', line: { kind: 'product', id: 'sticker' } },
  { id: 'other', label: 'Other', line: { kind: 'product', id: 'other' } },
]
const CHANNELS = ['WhatsApp', 'Messenger', 'Instagram', 'Phone call', 'Other']
const newLine = () => ({ key: Math.random().toString(36).slice(2), type: 'magazine', name: '', details: '', qty: '1', price: '' })
const labelArea = (area) => (area === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka')
const Field = ({ label, required, children, hint }) => <label className="block text-sm font-medium">{label}{required && <span className="text-brand"> *</span>}<div className="mt-1">{children}</div>{hint && <span className="mt-1 block text-xs font-normal text-ink/50">{hint}</span>}</label>

export default function AddOrderPage() {
  const navigate = useNavigate()
  const settings = useAsync(getOrderSettings).data ?? {}
  const [channel, setChannel] = useState('WhatsApp')
  const [customer, setCustomer] = useState({ name: '', phone: '', instagram: '', address: '', city: '', area: 'inside', date: '', note: '' })
  const [lines, setLines] = useState([newLine()])
  const [charge, setCharge] = useState('')
  const [shots, setShots] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setC = (key) => (event) => setCustomer((current) => ({ ...current, [key]: event.target.value }))
  const setLine = (key, field, value) => setLines((list) => list.map((line) => line.key === key ? { ...line, [field]: value } : line))
  const subtotal = lines.reduce((sum, line) => sum + (Number(line.price) || 0) * (Math.max(1, Number(line.qty) || 1)), 0)
  const defaultCharge = deliveryFee(customer.area, settings)
  const deliveryCharge = charge === '' ? Number(defaultCharge) || 0 : Math.max(0, Number(charge) || 0)
  const total = subtotal + deliveryCharge

  const addShots = async (event) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    for (const file of picked) {
      const key = Math.random().toString(36).slice(2)
      setShots((list) => [...list, { key, name: file.name, dataUrl: '', pending: true }])
      try {
        const dataUrl = await compressImage(file, 2000, 0.9)
        setShots((list) => list.map((shot) => shot.key === key ? { ...shot, dataUrl, pending: false } : shot))
      } catch {
        setShots((list) => list.filter((shot) => shot.key !== key))
        setError(`Could not read ${file.name}.`)
      }
    }
  }

  const save = async () => {
    setError('')
    if (!customer.name.trim()) return setError('Enter the customer name.')
    if (!validBangladeshPhone(customer.phone)) return setError('Enter a valid phone / WhatsApp number (01XXXXXXXXX).')
    if (!customer.address.trim()) return setError('Enter the delivery address.')
    const filled = lines.filter((line) => line.name.trim() || line.details.trim() || line.price)
    if (!filled.length) return setError('Add at least one product.')
    if (filled.some((line) => !(Number(line.price) > 0))) return setError('Enter a price for every product.')
    if (shots.some((shot) => shot.pending)) return setError('Wait for the screenshots to finish loading.')
    setBusy(true)
    try {
      const screenshots = []
      for (const shot of shots) screenshots.push(await uploadCatalogImage(shot.dataUrl))
      const items = filled.map((line) => {
        const type = PRODUCT_TYPES.find((row) => row.id === line.type) ?? PRODUCT_TYPES.at(-1)
        const qty = Math.max(1, Math.floor(Number(line.qty) || 1))
        return { ...type.line, name: line.name.trim() || type.label, optionLabel: line.details.trim(), qty, price: Number(line.price) }
      })
      const isMagazine = (item) => item.kind === 'magazine'
      const magazineTotal = items.filter(isMagazine).reduce((sum, item) => sum + item.price * item.qty, 0)
      const otherTotal = items.filter((item) => !isMagazine(item)).reduce((sum, item) => sum + item.price * item.qty, 0)
      const today = dhakaToday()
      const id = `PB-${today.slice(2).replaceAll('-', '')}-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
      const phone = customer.phone.trim()
      const area = customer.area
      const date = customer.date
      const order = {
        id, createdAt: new Date().toISOString(), status: 'New', source: `Admin entry · ${channel}`, orderType: 'admin-entry',
        customer: {
          name: customer.name.trim(), phone, whatsapp: phone, instagram: customer.instagram.trim() ? `@${customer.instagram.trim().replace(/^@+/, '')}` : '',
          address: [customer.address.trim(), customer.city.trim()].filter(Boolean).join(', '), recipient: customer.name.trim(), deliveryPhone: phone,
          deliveryAddress: customer.address.trim(), ordererName: customer.name.trim(), ...(customer.note.trim() ? { note: customer.note.trim() } : {}),
        },
        items, magazineTotal, addonTotal: 0, otherTotal,
        delivery: [labelArea(area), date && new Date(`${date}T12:00:00+06:00`).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join(' · '),
        deliveryInfo: { location: area, locationLabel: labelArea(area), city: customer.city.trim(), date, phone, recipient: customer.name.trim(), address: customer.address.trim(), standardCharge: deliveryCharge, rushCharge: 0 },
        deliveryCharge, rushCharge: 0, total: subtotal + deliveryCharge,
        ...(screenshots.length ? { screenshots } : {}),
      }
      await ordersApi.save(order)
      navigate(`/admin/orders/${id}`)
    } catch (caught) {
      setError(caught?.message || 'Could not save the order. Try again.')
      setBusy(false)
    }
  }

  return <div className="pb-24">
    <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-2 text-sm text-ink/65 hover:text-brand"><ArrowLeft size={16} /> Orders</Link>
    <h1 className="font-serif text-3xl">Add order</h1>
    <p className="mt-1 text-sm text-ink/60">For orders that came by message. Enter what the customer sent and attach a screenshot of the chat.</p>

    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-sand bg-white p-5">
          <h2 className="mb-4 font-semibold">Customer & delivery</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" required><input className={inputClass} value={customer.name} onChange={setC('name')} /></Field>
            <Field label="Phone / WhatsApp" required><input className={inputClass} inputMode="tel" value={customer.phone} onChange={setC('phone')} placeholder="01XXXXXXXXX" /></Field>
            <Field label="Instagram (optional)"><input className={inputClass} value={customer.instagram} onChange={setC('instagram')} placeholder="username" /></Field>
            <Field label="Order came from"><select className={inputClass} value={channel} onChange={(event) => setChannel(event.target.value)}>{CHANNELS.map((name) => <option key={name}>{name}</option>)}</select></Field>
            <div className="sm:col-span-2"><Field label="Delivery address" required><textarea rows="2" className={inputClass} value={customer.address} onChange={setC('address')} /></Field></div>
            <Field label="City / district (optional)"><input className={inputClass} value={customer.city} onChange={setC('city')} /></Field>
            <Field label="Delivery area" required><select className={inputClass} value={customer.area} onChange={setC('area')}><option value="inside">Inside Dhaka</option><option value="outside">Outside Dhaka</option></select></Field>
            <Field label="Needed by (optional)" hint="Used for urgent / overdue marking."><input type="date" className={inputClass} value={customer.date} onChange={setC('date')} /></Field>
            <div className="sm:col-span-2"><Field label="Note (optional)"><textarea rows="2" className={inputClass} value={customer.note} onChange={setC('note')} /></Field></div>
          </div>
        </section>

        <section className="rounded-2xl border border-sand bg-white p-5">
          <h2 className="mb-4 font-semibold">Products</h2>
          <div className="space-y-4">{lines.map((line, index) => <div key={line.key} className="rounded-xl border border-sand bg-[#FFFEFC] p-4">
            <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Product #{index + 1}</p>{lines.length > 1 && <button type="button" aria-label="Remove product" onClick={() => setLines((list) => list.filter((row) => row.key !== line.key))} className="grid size-8 place-items-center rounded-full text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Product type"><select className={inputClass} value={line.type} onChange={(event) => setLine(line.key, 'type', event.target.value)}>{PRODUCT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></Field>
              <Field label="Product name (optional)"><input className={inputClass} value={line.name} onChange={(event) => setLine(line.key, 'name', event.target.value)} placeholder="e.g. A4 Birthday Magazine" /></Field>
              <div className="sm:col-span-2"><Field label="Details (size, names, design…)"><textarea rows="2" className={inputClass} value={line.details} onChange={(event) => setLine(line.key, 'details', event.target.value)} /></Field></div>
              <Field label="Quantity"><input type="number" min="1" className={inputClass} value={line.qty} onChange={(event) => setLine(line.key, 'qty', event.target.value)} /></Field>
              <Field label="Price each (৳)" required><input type="number" min="0" className={inputClass} value={line.price} onChange={(event) => setLine(line.key, 'price', event.target.value)} /></Field>
            </div>
          </div>)}</div>
          <button type="button" onClick={() => setLines((list) => [...list, newLine()])} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/25 px-4 text-sm font-semibold text-brand hover:bg-cream"><Plus size={16} /> Add another product</button>
        </section>

        <section className="rounded-2xl border border-sand bg-white p-5">
          <h2 className="font-semibold">Chat screenshots</h2>
          <p className="mb-3 mt-1 text-xs text-ink/55">Attach the customer's message so the team can check the order later.</p>
          <div className="flex flex-wrap gap-3">
            {shots.map((shot) => <div key={shot.key} className="relative size-24 overflow-hidden rounded-xl border border-sand bg-cream">
              {shot.dataUrl ? <img src={shot.dataUrl} alt={shot.name} className="size-full object-cover" /> : <span className="grid size-full place-items-center"><LoaderCircle className="animate-spin text-brand" size={18} /></span>}
              <button type="button" aria-label={`Remove ${shot.name}`} onClick={() => setShots((list) => list.filter((row) => row.key !== shot.key))} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/95 shadow"><Trash2 size={13} /></button>
            </div>)}
            <label className="grid size-24 cursor-pointer place-items-center rounded-xl border border-dashed border-brand/35 bg-[#FFFAF8] text-brand hover:bg-cream"><span className="grid justify-items-center gap-1"><ImagePlus size={20} /><span className="text-[11px] font-semibold">Add screenshot</span></span><input type="file" accept="image/*" multiple className="sr-only" onChange={addShots} /></label>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
        <section className="rounded-2xl border border-sand bg-white p-5">
          <h2 className="mb-3 font-semibold">Summary</h2>
          <dl className="space-y-2 text-sm"><div className="flex justify-between"><dt className="text-ink/65">Products</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-ink/65">Delivery ({labelArea(customer.area)})</dt><dd><input type="number" min="0" aria-label="Delivery charge" className={`${inputClass} !w-24 text-right`} value={charge} placeholder={String(Number(defaultCharge) || 0)} onChange={(event) => setCharge(event.target.value)} /></dd></div>
            <div className="flex justify-between border-t border-sand pt-3 text-base font-semibold"><dt>Total</dt><dd className="text-brand">{formatPrice(total)}</dd></div></dl>
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="button" disabled={busy} onClick={save} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? 'Saving…' : 'Save order'}</button>
        </section>
      </aside>
    </div>
  </div>
}
