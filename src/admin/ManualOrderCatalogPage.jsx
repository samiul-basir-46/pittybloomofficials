import { useEffect, useMemo, useState } from 'react'
import { Check, ImagePlus, Plus, Save, Trash2 } from 'lucide-react'
import Button from '../shared/ui/Button'
import useAsync from '../shared/hooks/useAsync'
import { inputClass } from './classes'
import { adminAuth } from '../shared/services/firebaseClient'
import { getManualOrderCatalog, manualOrderCatalogApi, productsApi, sizesApi } from '../shared/services/contentService'
import { mergeManualOrderCatalog } from '../pages/manual-order/catalog'
import { parseOptions } from '../shared/utils/options'

const MEDIA_API = import.meta.env.VITE_MEDIA_API_URL?.replace(/\/$/, '')
function Input({ label, value, onChange, type = 'text', min, max, hint }) {
  return <label className="block text-sm font-medium">
    {label}
    <input type={type} min={min} max={max} value={value ?? ''} onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} className={`${inputClass} mt-1.5`} />
    {hint && <span className="mt-1 block text-xs font-normal text-ink/55">{hint}</span>}
  </label>
}

function CardImage({ card, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')
  const imageUrl = MEDIA_API && card.imageUpdatedAt ? `${MEDIA_API}/manual-order-cards/${encodeURIComponent(card.id)}?v=${card.imageUpdatedAt}` : ''
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image up to 10 MB.')
      return
    }
    if (!MEDIA_API || !adminAuth?.currentUser) {
      setError('Sign in to the admin account and try again.')
      return
    }
    setError('')
    setBusy(true)
    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)
    try {
      const token = await adminAuth.currentUser.getIdToken()
      const response = await fetch(`${MEDIA_API}/manual-order-cards/${encodeURIComponent(card.id)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
        body: file,
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Cloudflare could not save the card image.')
      onChange({ ...card, imageUpdatedAt: Date.now() })
      setPreview('')
      URL.revokeObjectURL(localPreview)
    } catch (cause) {
      setError(cause.message || 'Could not upload this image.')
      setPreview('')
      URL.revokeObjectURL(localPreview)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!MEDIA_API || !adminAuth?.currentUser) { onChange({ ...card, imageUpdatedAt: 0 }); return }
    setBusy(true)
    setError('')
    try {
      const token = await adminAuth.currentUser.getIdToken()
      const response = await fetch(`${MEDIA_API}/manual-order-cards/${encodeURIComponent(card.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Could not remove the Cloudflare image.')
      onChange({ ...card, imageUpdatedAt: 0 })
    } catch (cause) {
      setError(cause.message || 'Could not remove this image.')
    } finally { setBusy(false) }
  }

  return <div>
    <div className="relative aspect-[1.7/1] overflow-hidden rounded-xl border border-sand bg-cream">
      {(preview || imageUrl) ? <img src={preview || imageUrl} alt={`${card.title} card preview`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-ink/35"><ImagePlus size={27} /></div>}
      {busy && <div className="absolute inset-0 grid place-items-center bg-white/75 text-sm font-medium">Saving image…</div>}
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-sand px-3 text-xs font-medium hover:bg-cream"><ImagePlus size={14} /> Upload to Cloudflare<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={upload} /></label>
      {card.imageUpdatedAt > 0 && <button type="button" disabled={busy} onClick={remove} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 size={14} /> Remove</button>}
    </div>
    {error && <p role="alert" className="mt-1.5 text-xs text-red-700">{error}</p>}
  </div>
}

export default function ManualOrderCatalogPage() {
  const { data, loading, error: loadError, reload } = useAsync(async () => {
    const [catalog, products, sizes] = await Promise.all([getManualOrderCatalog(), productsApi.list(), sizesApi.list()])
    return { catalog: mergeManualOrderCatalog(catalog), products, sizes }
  })
  const [catalog, setCatalog] = useState(null)
  const [frameProduct, setFrameProduct] = useState(null)
  const [sizes, setSizes] = useState([])
  const [initial, setInitial] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [frameDraft, setFrameDraft] = useState({ label: '', price: '' })

  useEffect(() => {
    if (!data) return
    setCatalog(data.catalog)
    setFrameProduct(data.products.find((product) => product.id === 'frame') ?? null)
    setSizes(data.sizes)
    setInitial(JSON.stringify({ catalog: data.catalog, frame: data.products.find((product) => product.id === 'frame')?.options ?? '', sizes: data.sizes }))
  }, [data])

  const cards = useMemo(() => catalog ? Object.values(catalog).sort((a, b) => Number(a.order) - Number(b.order)) : [], [catalog])
  if (loading || !catalog || !frameProduct) return <div className="py-10 text-center text-sm text-ink/60">{loadError ? 'Could not load manual order settings.' : 'Loading manual order settings…'}{loadError && <button type="button" onClick={reload} className="ml-2 underline">Retry</button>}</div>

  const initialValue = initial
  const current = JSON.stringify({ catalog, frame: frameProduct.options, sizes })
  const dirty = current !== initialValue
  const updateCard = (id, values) => { setMessage(''); setCatalog((rows) => ({ ...rows, [id]: { ...rows[id], ...values } })) }
  const updateSize = (id, values) => { setMessage(''); setSizes((rows) => rows.map((size) => size.id === id ? { ...size, ...values } : size)) }
  const frameOptions = parseOptions(frameProduct.options)
  const setFrameOptions = (options) => { setMessage(''); setFrameProduct((product) => ({ ...product, options: options.map((row) => `${row.label} | ${Number(row.price) || 0}${row.mrp ? ` | ${row.mrp}` : ''}${row.tag ? ` | ${row.tag}` : ''}`).join('\n') })) }

  const save = async (event) => {
    event.preventDefault()
    const enabled = Object.values(catalog).filter((card) => card.enabled)
    if (!enabled.length) { setMessage('Keep at least one product available.'); return }
    if (Object.values(catalog).some((card) => !card.title.trim() || !Number.isInteger(Number(card.order)) || Number(card.order) < 1 || !Number.isInteger(Number(card.maxItems)) || Number(card.maxItems) < 1 || Number(card.maxItems) > 80)) {
      setMessage('Add a title, card position, and an item limit from 1 to 80 for each product.')
      return
    }
    if (Object.values(catalog).some((card) => ['polaroids', 'miniMagazines', 'songBooks'].includes(card.id) && (!Number.isFinite(Number(card.unitPrice)) || Number(card.unitPrice) < 1))) {
      setMessage('Product prices must be at least ৳1.')
      return
    }
    if (Object.values(catalog).some((card) => card.id === 'frames' && (!Number.isInteger(Number(card.maxQuantity)) || Number(card.maxQuantity) < 1 || Number(card.maxQuantity) > 80))) {
      setMessage('Maximum frame quantity must be from 1 to 80.')
      return
    }
    if (parseOptions(frameProduct.options).length < 1) { setMessage('Add at least one frame size with a price.'); return }
    setBusy(true)
    setMessage('')
    try {
      await Promise.all([
        manualOrderCatalogApi.save(catalog),
        productsApi.save(frameProduct),
        sizesApi.saveAll(sizes),
      ])
      setInitial(JSON.stringify({ catalog, frame: frameProduct.options, sizes }))
      setMessage('Saved. These images and prices now appear in the customer order form.')
    } catch (cause) {
      setMessage(cause.message || 'Could not save all manual order settings. Try again.')
    } finally { setBusy(false) }
  }

  const addFrameSize = () => {
    const label = frameDraft.label.trim()
    const price = Number(frameDraft.price)
    if (!label || !Number.isFinite(price) || price < 1 || frameOptions.some((option) => option.label.toLowerCase() === label.toLowerCase())) return
    setFrameOptions([...frameOptions, { label, price }])
    setFrameDraft({ label: '', price: '' })
  }

  return <form onSubmit={save} className="space-y-6 pb-24">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Order setup</p>
      <h1 className="mt-1 font-serif text-3xl">Manual order products</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">Change the product cards customers see, upload card photos to Cloudflare, control which products are available, and manage prices and item limits.</p>
    </div>

    {cards.map((card) => <section key={card.id} className="rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-serif text-xl">{card.title}</h2><p className="mt-1 text-xs text-ink/55">Card position {card.order} · {card.enabled ? 'Shown to customers' : 'Hidden from customers'}</p></div>
        <label className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cream px-3 text-sm font-medium"><input type="checkbox" checked={Boolean(card.enabled)} onChange={(event) => updateCard(card.id, { enabled: event.target.checked })} /> Available</label>
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(220px,0.8fr)_1.2fr]">
        <CardImage card={card} onChange={(next) => updateCard(card.id, next)} />
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Input label="Card title" value={card.title} onChange={(title) => updateCard(card.id, { title })} />
          <Input label="Card position" type="number" min="1" max="5" value={card.order} onChange={(order) => updateCard(card.id, { order })} />
          <Input label="Short description" value={card.description} onChange={(description) => updateCard(card.id, { description })} />
          <Input label="Maximum separate items per order" type="number" min="1" max="80" value={card.maxItems} onChange={(maxItems) => updateCard(card.id, { maxItems })} hint="For repeated items such as magazines and song books." />
          {['polaroids', 'miniMagazines', 'songBooks'].includes(card.id) && <Input label={card.id === 'polaroids' ? 'Price per Polaroid' : 'Price per item'} type="number" min="1" value={card.unitPrice} onChange={(unitPrice) => updateCard(card.id, { unitPrice })} />}
          {card.id === 'frames' && <Input label="Maximum quantity per frame size" type="number" min="1" max="80" value={card.maxQuantity} onChange={(maxQuantity) => updateCard(card.id, { maxQuantity })} />}
        </div>
      </div>
      {card.id === 'polaroids' && <p className="mt-4 rounded-xl bg-cream p-3 text-xs text-ink/60">Minimum quantity remains 9 Polaroids. Customers see the updated per-piece price and subtotal.</p>}
      {card.id === 'frames' && <div className="mt-6 border-t border-sand pt-5">
        <div className="mb-3"><h3 className="font-semibold">Frame sizes and prices</h3><p className="mt-1 text-xs text-ink/55">Add, remove, or change the available frame choices.</p></div>
        <div className="space-y-2">{frameOptions.map((option, index) => <div key={`${option.id}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
          <input aria-label={`Frame size ${index + 1}`} className={inputClass} value={option.label} onChange={(event) => setFrameOptions(frameOptions.map((row, rowIndex) => rowIndex === index ? { ...row, label: event.target.value } : row))} />
          <input aria-label={`Frame price ${index + 1}`} type="number" min="1" className={inputClass} value={option.price} onChange={(event) => setFrameOptions(frameOptions.map((row, rowIndex) => rowIndex === index ? { ...row, price: Number(event.target.value) } : row))} />
          <button type="button" aria-label={`Remove ${option.label}`} onClick={() => setFrameOptions(frameOptions.filter((_, rowIndex) => rowIndex !== index))} className="grid min-h-11 place-items-center rounded-xl border border-red-100 px-3 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
        </div>)}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
          <input aria-label="New frame size name" className={inputClass} placeholder="New size name" value={frameDraft.label} onChange={(event) => setFrameDraft({ ...frameDraft, label: event.target.value })} />
          <input aria-label="New frame size price" type="number" min="1" className={inputClass} placeholder="Price ৳" value={frameDraft.price} onChange={(event) => setFrameDraft({ ...frameDraft, price: event.target.value })} />
          <button type="button" onClick={addFrameSize} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-brand/25 px-3 text-sm font-semibold text-brand hover:bg-cream"><Plus size={16} /> Add size</button>
        </div>
      </div>}
      {card.id === 'magazines' && <div className="mt-6 border-t border-sand pt-5">
        <div className="mb-3"><h3 className="font-semibold">Magazine page prices</h3><p className="mt-1 text-xs text-ink/55">Set a price for each supported page count. Set a price to 0 to hide that option.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[...sizes].sort((a, b) => a.format.localeCompare(b.format) || a.pages - b.pages).map((size) => <label key={size.id} className="rounded-xl border border-sand p-3 text-sm">
          <span className="mb-1.5 block font-medium">{size.format} · {size.pages} pages</span>
          <span className="relative"><span className="absolute left-3 top-2.5 text-ink/45">৳</span><input type="number" min="0" aria-label={`${size.format} ${size.pages} pages price`} value={size.price} onChange={(event) => updateSize(size.id, { price: Number(event.target.value) })} className={`${inputClass} pl-8`} /></span>
        </label>)}</div>
      </div>}
      {card.id === 'miniMagazines' && <p className="mt-4 rounded-xl bg-cream p-3 text-xs text-ink/60">Each Mini Pocket Magazine still allows up to 8 photos. The price above is applied once to every separate magazine.</p>}
      {card.id === 'songBooks' && <p className="mt-4 rounded-xl bg-cream p-3 text-xs text-ink/60">Each Song Book remains 12 pages. The price above is applied once to every separate book.</p>}
    </section>)}

    {message && <p role="status" className={`rounded-xl p-3 text-sm ${message.startsWith('Saved.') ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`}>{message}</p>}
    {loadError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Could not load all current settings.</p>}
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-white/95 px-4 py-3 backdrop-blur md:left-64">
      <div className="mx-auto flex max-w-5xl items-center gap-3"><Button type="submit" disabled={busy || !dirty} className="gap-2"><Save size={16} /> {busy ? 'Saving…' : 'Save manual order settings'}</Button>{dirty && !message && <span className="text-xs text-amber-700">Unsaved changes</span>}{message.startsWith('Saved.') && <span className="inline-flex items-center gap-1 text-xs text-green-700"><Check size={15} /> Saved</span>}</div>
    </div>
  </form>
}
