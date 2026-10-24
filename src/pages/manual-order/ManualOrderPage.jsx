import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Eye, Frame, ImagePlus, Loader2, Music2, Plus, Sparkles, Trash2 } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import useAsync from '../../shared/hooks/useAsync'
import { getManualOrderCatalog, getOrderSettings, getProducts, getSizes } from '../../shared/services/contentService'
import { parseOptions } from '../../shared/utils/options'
import { formatPrice } from '../../shared/utils/format'
import { deliveryFee, detectOrderImageType, dhakaToday, expeditedSurcharge, minimumDeliveryDate, orderImageType, validBangladeshPhone, validUpload } from '../../shared/utils/manualOrderRules'
import { inputClass } from '../../admin/classes'
import { MANUAL_ORDER_CATALOG_DEFAULTS, mergeManualOrderCatalog } from './catalog'
import MagazineSizePreview from './MagazineSizePreview'

const MEDIA_API = import.meta.env.VITE_MEDIA_API_URL?.replace(/\/$/, '')
const CATEGORIES = ['Birthday', 'Couple', 'Anniversary', 'Personal', 'Parents', 'Marriage', 'Special Day', 'Farewell', 'Best Friends', 'Other']
const PRODUCT_META = [
  { id: 'polaroids', icon: ImagePlus, tint: 'bg-[#FCE8E8]' },
  { id: 'frames', icon: Frame, tint: 'bg-[#F2E9DC]' },
  { id: 'miniMagazines', icon: BookOpen, tint: 'bg-[#EDE8F5]' },
  { id: 'magazines', icon: BookOpen, tint: 'bg-[#E6EDF5]' },
  { id: 'songBooks', icon: Music2, tint: 'bg-[#F8EED9]' },
]
const newId = () => {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID().replaceAll('-', '')
  if (cryptoApi?.getRandomValues) return Array.from(cryptoApi.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, '0')).join('')
  return `${Date.now()}${Math.random().toString(16).slice(2)}`
}
const makeItem = (type) => ({ key: newId(), type, quantity: 1, optionId: '', sizeId: '', category: 'Birthday', custom: {}, notes: '', photos: [], reference: null, frontId: '', backId: '', songName: '', lyrics: '' })
const field = (label, value, onChange, { type = 'text', required = false, placeholder = '', error = '', className = '' } = {}) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-sm font-medium text-ink">{label}{required && <span className="text-brand"> *</span>}</span>
    <input type={type} required={required} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
  </label>
)

function UploadPicker({ title, files = [], onChange, multiple = true, max = Infinity, help = '', error = '', frontId, backId, onCoverChange }) {
  const [uploadError, setUploadError] = useState('')
  const [previews, setPreviews] = useState([])
  useEffect(() => {
    const next = files.map((entry) => ({ ...entry, url: URL.createObjectURL(new Blob([entry.file], { type: entry.type || orderImageType(entry.file) })) }))
    setPreviews(next)
    return () => next.forEach((preview) => URL.revokeObjectURL(preview.url))
  }, [files])
  const acceptFiles = async (incoming) => {
    const list = Array.from(incoming || [])
    const analyzed = await Promise.all(list.map(async (file) => ({ file, type: await detectOrderImageType(file) })))
    const invalid = analyzed.some(({ file, type }) => !validUpload(file) || !type)
    const fresh = analyzed.filter(({ file, type }) => validUpload(file) && type).map(({ file, type }) => ({ id: newId(), file, type }))
    setUploadError(invalid ? 'Choose a supported image format up to 20 MB.' : '')
    if (!fresh.length) return
    const next = multiple ? [...files, ...fresh].slice(0, max) : fresh.slice(0, 1)
    if (multiple && Number.isFinite(max) && files.length + fresh.length > max) setUploadError(`You can add up to ${max} images here.`)
    onChange(next)
  }
  return <div>
    <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
      <div><p className="text-sm font-semibold">{title}</p>{help && <p className="mt-0.5 text-xs leading-5 text-ink/55">{help}</p>}</div>
      {multiple && <span className="text-xs text-ink/55">{files.length}{Number.isFinite(max) ? ` of ${max}` : ''} selected</span>}
    </div>
    <div className="flex flex-wrap gap-2.5">
      {previews.map((preview) => <div key={preview.id} className={`relative ${onCoverChange ? 'w-28 shrink-0' : 'size-[76px]'} overflow-hidden rounded-xl border border-sand bg-white`}>
        <div className={`${onCoverChange ? 'mx-auto' : ''} relative size-[76px] overflow-hidden rounded-xl bg-cream`}>
          <img src={preview.url} alt={preview.file.name} onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling.hidden = false }} className="h-full w-full object-cover" />
          <span hidden className="absolute inset-0 grid place-items-center px-2 text-center text-[10px] text-ink/50">Preview unavailable</span>
          <button type="button" aria-label={`Remove ${preview.file.name}`} onClick={() => onChange(files.filter((item) => item.id !== preview.id))} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/95 text-ink shadow"><Trash2 size={13} /></button>
        </div>
        {onCoverChange && <div className="flex gap-1 p-1.5">
          {['frontId', 'backId'].map((coverKey) => {
            const selectedCover = (coverKey === 'frontId' ? frontId : backId) === preview.id
            const label = coverKey === 'frontId' ? 'Front' : 'Back'
            return <button key={coverKey} type="button" aria-label={`Use ${preview.file.name} for ${label.toLowerCase()} cover`} aria-pressed={selectedCover} onClick={() => onCoverChange(coverKey, selectedCover ? '' : preview.id)} className={`min-h-8 min-w-0 flex-1 rounded-md border px-1 text-[11px] font-semibold transition ${selectedCover ? 'border-brand bg-brand text-white' : 'border-sand text-ink hover:border-brand hover:text-brand'}`}>{selectedCover ? 'âœ“ ' : ''}{label}</button>
          })}
        </div>}
      </div>)}
      {(multiple ? files.length < max : files.length === 0) && <label className="grid size-[76px] cursor-pointer place-items-center rounded-xl border border-dashed border-brand/35 bg-[#FFFAF8] text-brand transition hover:bg-cream">
        <span className="grid justify-items-center gap-1"><Plus size={20} /><span className="text-[10px] font-semibold">Add photo</span></span>
        <input type="file" accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.gif" multiple={multiple} className="sr-only" onChange={(event) => { acceptFiles(event.target.files); event.target.value = '' }} />
      </label>}
    </div>
    {(uploadError || error) && <p className="mt-2 text-xs text-red-700">{error || uploadError}</p>}
  </div>
}

function ReviewPhotoGallery({ photos = [], frontId, backId }) {
  const [previews, setPreviews] = useState([])
  useEffect(() => {
    const next = photos.map((photo) => ({ id: photo.id, name: photo.file.name, url: URL.createObjectURL(new Blob([photo.file], { type: photo.type || orderImageType(photo.file) })) }))
    setPreviews(next)
    return () => next.forEach((preview) => URL.revokeObjectURL(preview.url))
  }, [photos])
  if (!previews.length) return null
  return <div className="mt-3 flex flex-wrap gap-3">
    {previews.map((photo) => {
      const labels = [photo.id === frontId && 'Front cover', photo.id === backId && 'Back cover'].filter(Boolean)
      return <figure key={photo.id} className="w-28 overflow-hidden rounded-xl border border-sand bg-white">
        <img src={photo.url} alt={photo.name} onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling.hidden = false }} className="aspect-square w-full object-cover" />
        <div hidden className="grid aspect-square place-items-center bg-cream px-2 text-center text-xs text-ink/55">Preview unavailable</div>
        <figcaption className="p-2">
          <p className="truncate text-[11px] text-ink/55" title={photo.name}>{photo.name}</p>
          <p className={`mt-1 text-[11px] font-semibold ${labels.length ? 'text-brand' : 'text-ink/45'}`}>{labels.join(' · ') || 'Uploaded photo'}</p>
        </figcaption>
      </figure>
    })}
  </div>
}

function DeliveryCalendar({ value, minDate, disabled, area, hasRushProducts, error, onChange }) {
  const initialMonth = (minDate || dhakaToday()).slice(0, 7)
  const [month, setMonth] = useState(initialMonth)
  useEffect(() => {
    const selectedMonth = value?.slice(0, 7)
    setMonth(selectedMonth && selectedMonth >= initialMonth ? selectedMonth : initialMonth)
  }, [initialMonth, value])

  const [year, monthNumber] = month.split('-').map(Number)
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const days = Array.from({ length: firstWeekday }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) days.push(`${month}-${String(day).padStart(2, '0')}`)
  const canGoBack = month > initialMonth
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, monthNumber - 1, 1)))
  const selectedLabel = value ? new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : ''
  const moveMonth = (amount) => {
    const next = new Date(Date.UTC(year, monthNumber - 1 + amount, 1))
    setMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`)
  }

  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-semibold">Select your preferred date <span className="text-brand">*</span></p><p className="mt-1 text-xs text-ink/55">Dates before {minDate || 'choosing an area'} are unavailable. Times use Bangladesh Standard Time.</p></div>
      {minDate && <span className="rounded-full bg-cream px-3 py-1.5 text-xs font-medium text-brand">Earliest: {new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${minDate}T00:00:00Z`))}</span>}
    </div>
    <div className="rounded-2xl border border-sand bg-[#FFFEFC] p-3 sm:p-5">
      {disabled ? <div className="grid min-h-36 place-items-center text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-full bg-cream text-brand"><CalendarDays size={20} /></span><p className="mt-3 text-sm font-semibold">Choose your delivery area first</p><p className="mt-1 text-xs text-ink/55">We’ll show the dates available for your location.</p></div></div> : <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} disabled={!canGoBack} className="grid size-10 place-items-center rounded-xl border border-sand text-brand transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft size={18} /></button>
        <h3 className="font-serif text-lg text-brand">{monthLabel}</h3>
        <button type="button" aria-label="Next month" onClick={() => moveMonth(1)} className="grid size-10 place-items-center rounded-xl border border-sand text-brand transition hover:bg-cream"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Delivery date calendar">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-1 text-center text-[11px] font-semibold text-ink/45">{day}</div>)}
        {days.map((date, index) => {
          if (!date) return <div key={`blank-${index}`} />
          const isUnavailable = disabled || date < (minDate || '9999-99-99')
          const isSelected = date === value
          const rush = hasRushProducts ? expeditedSurcharge({ date, area, hasRushProducts: true }) : 0
          return <button key={date} type="button" aria-label={`Select ${date}${isUnavailable ? ', unavailable' : ''}`} aria-pressed={isSelected} disabled={isUnavailable} onClick={() => onChange(date)} className={`flex min-h-[54px] flex-col items-center justify-center rounded-xl border text-sm transition sm:min-h-[64px] ${isSelected ? 'border-brand bg-brand font-semibold text-white shadow-sm' : isUnavailable ? 'cursor-not-allowed border-transparent bg-[#F5F2EE] text-ink/25 line-through' : 'border-sand bg-white text-ink hover:border-brand hover:bg-[#FFFAF8]'}`}>
            <span>{Number(date.slice(-2))}</span>
            {hasRushProducts && !isUnavailable && <span className={`mt-0.5 text-[9px] leading-none ${isSelected ? 'text-white/75' : 'text-ink/45'}`}>{rush ? `+৳${rush}` : 'No extra'}</span>}
          </button>
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink/55"><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-brand" /> Selected date</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-[#F5F2EE]" /> Too early</span>{hasRushProducts && <span>First available day +৳100 · next available day +৳50 · later dates no extra</span>}</div>
      </>}
    </div>
    {value && <div className="mt-3 flex items-center gap-2 rounded-xl bg-cream px-4 py-3 text-sm"><CalendarDays size={17} className="shrink-0 text-brand" /><span>Selected delivery: <strong>{selectedLabel}</strong>{hasRushProducts && <span className="text-ink/60"> · express fee {formatPrice(expeditedSurcharge({ date: value, area, hasRushProducts }))}</span>}</span></div>}
    {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
  </div>
}

const CATEGORY_FIELDS = {
  Birthday: [['name', "Birthday person's name", true], ['age', 'Age', true], ['date', 'Birthday date', true, 'date']],
  Couple: [['names', 'Names of the couple', true]],
  Anniversary: [['names', 'Names of the couple', true], ['date', 'Anniversary date', true, 'date'], ['year', 'Anniversary year', true]],
  Personal: [['name', 'Name of the person', true]],
  Parents: [['names', "Parents' names", true]],
  Marriage: [['names', 'Names of the couple', true], ['date', 'Marriage date', true, 'date']],
  'Special Day': [['name', 'Name of the person or people', true], ['date', 'Date of the special occasion', false, 'date']],
  Farewell: [['name', 'Name of the person', true], ['date', 'Farewell date', false, 'date']],
  'Best Friends': [['names', 'Names of the friends', true]],
  Other: [['occasion', 'What is the occasion or category?', true]],
}

function SectionCard({ title, subtitle, children, className = '' }) {
  return <section className={`rounded-2xl border border-sand bg-white p-5 shadow-sm sm:p-7 ${className}`}>
    {(title || subtitle) && <div className="mb-5"><h2 className="font-serif text-2xl text-brand">{title}</h2>{subtitle && <p className="mt-1 text-sm leading-6 text-ink/60">{subtitle}</p>}</div>}
    {children}
  </section>
}

function ProductSectionCard({ id, title, subtitle, expanded, onToggle, children }) {
  return <section id={`config-${id}`} className="scroll-mt-4 overflow-hidden rounded-2xl border border-sand bg-white shadow-sm">
    <button type="button" aria-expanded={expanded} onClick={onToggle} className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-[#FFFEFC] sm:px-7">
      <span className="min-w-0"><span className="block font-serif text-xl text-brand sm:text-2xl">{title}</span><span className="mt-1 block text-xs leading-5 text-ink/60 sm:text-sm">{subtitle}</span>{!expanded && <span className="mt-1 block text-[11px] font-medium text-brand sm:hidden">Tap to customize</span>}</span>
      <ChevronDown size={19} className={`shrink-0 text-brand transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </button>
    <div className={`border-t border-sand p-4 sm:p-7 ${expanded ? 'block' : 'hidden sm:block'}`}>{children}</div>
  </section>
}

function ItemHeader({ title, onRemove, removable = true }) {
  return <div className="mb-5 flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3>{removable && <button type="button" onClick={onRemove} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ink/55 hover:bg-red-50 hover:text-red-700"><Trash2 size={14} /> Remove</button>}</div>
}

function ProductThumbnail({ Icon, tint }) {
  return <div className={`grid size-10 shrink-0 place-items-center rounded-xl sm:size-12 sm:rounded-2xl ${tint} text-brand`}><Icon size={20} strokeWidth={1.8} /></div>
}

function priceLabel(value) { return Number.isFinite(value) && value > 0 ? formatPrice(value) : 'Price not set' }

export default function ManualOrderPage() {
  const productsData = useAsync(getProducts)
  const sizesData = useAsync(getSizes)
  const settingsData = useAsync(getOrderSettings)
  const manualCatalogData = useAsync(getManualOrderCatalog)
  const [selected, setSelected] = useState({})
  const [polaroid, setPolaroid] = useState({ quantity: 9, photos: [], reference: null })
  const [frames, setFrames] = useState([])
  const [miniBooks, setMiniBooks] = useState([])
  const [magazines, setMagazines] = useState([])
  const [songBooks, setSongBooks] = useState([])
  const [delivery, setDelivery] = useState({ recipient: '', phone: '', address: '', city: '', area: '', date: '' })
  const [customer, setCustomer] = useState({ name: '', instagram: '', whatsapp: '' })
  const [step, setStep] = useState(0)
  const [expandedProduct, setExpandedProduct] = useState(null)
  const [magazineSizePreviewOpen, setMagazineSizePreviewOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState('')
  const [uploadStatus, setUploadStatus] = useState({ completed: 0, total: 0 })
  const [success, setSuccess] = useState(null)
  const requestKey = useRef(newId())
  const uploaded = useRef(new Map())

  useEffect(() => {
    if (!submitting) return undefined
    const warnBeforeLeave = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [submitting])

  const productCatalog = productsData.data ?? []
  const frameProduct = productCatalog.find((product) => product.id === 'frame')
  const frameOptions = useMemo(() => parseOptions(frameProduct?.options), [frameProduct?.options])
  const sizes = sizesData.data ?? []
  const manualCatalog = mergeManualOrderCatalog(manualCatalogData.data ?? MANUAL_ORDER_CATALOG_DEFAULTS)
  const manualCards = PRODUCT_META.map((meta) => ({ ...manualCatalog[meta.id], ...meta })).filter((card) => card.enabled).sort((a, b) => Number(a.order) - Number(b.order))
  const a4Sizes = sizes.filter((size) => size.format === 'A4' && size.price > 0 && size.pages >= 4 && size.pages <= 40 && size.pages % 4 === 0).sort((a, b) => a.pages - b.pages)
  const a5Sizes = sizes.filter((size) => size.format === 'A5' && [4, 8].includes(size.pages) && size.price > 0).sort((a, b) => a.pages - b.pages)
  const magazineOptions = [...a4Sizes, ...a5Sizes]
  const loading = productsData.loading || sizesData.loading || settingsData.loading || manualCatalogData.loading
  const loadError = productsData.error || sizesData.error || settingsData.error || manualCatalogData.error
  const items = [
    ...(selected.polaroids ? [{ key: 'polaroids', type: 'polaroids', qty: Number(polaroid.quantity) || 0, price: Number(manualCatalog.polaroids.unitPrice), photos: polaroid.photos, reference: polaroid.reference }] : []),
    ...(selected.frames ? frames.map((item) => ({ ...item, type: 'frame', price: frameOptions.find((option) => option.id === item.optionId)?.price || 0 })) : []),
    ...(selected.miniMagazines ? miniBooks.map((item) => ({ ...item, type: 'mini-magazine', price: Number(manualCatalog.miniMagazines.unitPrice) })) : []),
    ...(selected.magazines ? magazines.map((item) => ({ ...item, type: 'magazine', price: magazineOptions.find((option) => option.id === item.sizeId)?.price || 0 })) : []),
    ...(selected.songBooks ? songBooks.map((item) => ({ ...item, type: 'song-book', price: Number(manualCatalog.songBooks.unitPrice) })) : []),
  ]
  const productSubtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty ?? item.quantity) || 0), 0)
  const hasPolaroids = Boolean(selected.polaroids)
  const hasRushProducts = Boolean(selected.magazines || selected.songBooks)
  const earliest = delivery.area ? minimumDeliveryDate({ area: delivery.area, hasPolaroids }) : ''
  const surcharge = delivery.date ? expeditedSurcharge({ date: delivery.date, area: delivery.area, hasRushProducts }) : 0
  const shipping = deliveryFee(delivery.area)
  const total = productSubtotal + shipping + (surcharge || 0)

  const setItemList = (setter, key, fieldName, value) => setter((list) => list.map((item) => item.key === key ? { ...item, [fieldName]: value } : item))
  const addItem = (setter, type, initial = {}) => setter((list) => [...list, { ...makeItem(type), ...initial }])
  const removeProductItem = (setter, list, productId, itemKey) => {
    const remaining = list.filter((item) => item.key !== itemKey)
    setter(remaining)
    if (!remaining.length) {
      setSelected((current) => ({ ...current, [productId]: false }))
      setExpandedProduct((current) => current === productId ? null : current)
    }
  }
  const toggleProduct = (id) => {
    const enabling = !selected[id]
    setErrors((current) => {
      if (!current.products) return current
      const { products: _products, ...remaining } = current
      return remaining
    })
    if (enabling) {
      setExpandedProduct(id)
      if (id === 'frames' && !frames.length) setFrames([makeItem('frame')])
      if (id === 'miniMagazines' && !miniBooks.length) setMiniBooks([makeItem('mini-magazine')])
      if (id === 'magazines' && !magazines.length) setMagazines([makeItem('magazine')])
      if (id === 'songBooks' && !songBooks.length) setSongBooks([makeItem('song-book')])
    } else if (expandedProduct === id) setExpandedProduct(null)
    setSelected((current) => ({ ...current, [id]: !current[id] }))
  }
  useEffect(() => {
    if (step !== 1 || !expandedProduct || window.innerWidth >= 640) return
    const panel = document.getElementById(`config-${expandedProduct}`)
    if (panel && typeof panel.scrollIntoView === 'function') panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [expandedProduct, step])
  useEffect(() => {
    if (!Object.keys(errors).length) return undefined
    const frame = window.requestAnimationFrame(() => {
      const errorMessage = [...document.querySelectorAll('.text-red-700')]
        .find((element) => element.getClientRects().length > 0)
      if (!errorMessage) return
      const fieldControl = errorMessage.closest('label')?.querySelector('input:not([type="hidden"]), select, textarea')
      const target = fieldControl || errorMessage
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (fieldControl && !fieldControl.disabled) fieldControl.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [errors, step])
  const cardStartingPrice = (id) => {
    if (id === 'polaroids') return Number(manualCatalog.polaroids.unitPrice) * Number(manualCatalog.polaroids.minQuantity || 9)
    if (id === 'frames') return Math.min(...frameOptions.map((option) => option.price).filter((price) => price > 0), Infinity)
    if (id === 'miniMagazines') return Number(manualCatalog.miniMagazines.unitPrice)
    if (id === 'magazines') return Math.min(...magazineOptions.map((option) => option.price).filter((price) => price > 0), Infinity)
    return Number(manualCatalog.songBooks.unitPrice)
  }
  const cardImageUrl = (card) => MEDIA_API && card.imageUpdatedAt ? `${MEDIA_API}/manual-order-cards/${encodeURIComponent(card.id)}?v=${card.imageUpdatedAt}` : ''
  const canAddItems = (id, count) => count < Number(manualCatalog[id]?.maxItems || 20)

  const productSelectionErrors = () => items.length ? {} : { products: 'Choose at least one product to continue.' }
  const productErrors = () => {
    const next = {}
    if (!items.length) next.products = 'Choose at least one product to continue.'
    if (selected.frames && !frames.length) next.framesEmpty = 'Add at least one frame or unselect Frames.'
    if (selected.miniMagazines && !miniBooks.length) next.miniEmpty = 'Add at least one Mini Magazine or unselect it.'
    if (selected.magazines && !magazines.length) next.magazinesEmpty = 'Add at least one Magazine or unselect it.'
    if (selected.songBooks && !songBooks.length) next.songBooksEmpty = 'Add at least one Song Book or unselect it.'
    if (selected.polaroids) {
      if (Number(polaroid.quantity) < Number(manualCatalog.polaroids.minQuantity || 9)) next.polaroidQuantity = `The minimum Polaroid order is ${Number(manualCatalog.polaroids.minQuantity || 9)} pieces.`
      if (polaroid.photos.length !== Number(polaroid.quantity)) next.polaroidPhotos = `Upload exactly ${Number(polaroid.quantity) || 0} photos, one for each Polaroid.`
    }
    selected.frames && frames.forEach((item, index) => {
      if (!frameOptions.some((option) => option.id === item.optionId)) next[`frame-${item.key}-option`] = `Choose an available size for Frame #${index + 1}.`
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > Number(manualCatalog.frames.maxQuantity || 20)) next[`frame-${item.key}-quantity`] = `Choose a quantity from 1 to ${Number(manualCatalog.frames.maxQuantity || 20)}.`
      if (!item.photos.length) next[`frame-${item.key}-photos`] = `Add at least one print photo for Frame #${index + 1}.`
    })
    selected.miniMagazines && miniBooks.forEach((item, index) => {
      if (item.photos.length < 2 || item.photos.length > 8) next[`mini-${item.key}-photos`] = `Mini Magazine #${index + 1} needs 2–8 photos so you can choose both covers.`
      if (!item.photos.some((photo) => photo.id === item.frontId)) next[`mini-${item.key}-front`] = 'Choose a front cover photo.'
      if (!item.photos.some((photo) => photo.id === item.backId)) next[`mini-${item.key}-back`] = 'Choose a back cover photo.'
    })
    selected.magazines && magazines.forEach((item, index) => {
      const size = magazineOptions.find((option) => option.id === item.sizeId)
      if (!size) next[`mag-${item.key}-size`] = `Choose an available size and page count for Magazine #${index + 1}.`
      for (const [id, label, required] of CATEGORY_FIELDS[item.category] ?? []) if (required && !String(item.custom[id] ?? '').trim()) next[`mag-${item.key}-${id}`] = `${label} is required.`
      if (item.photos.length < 2) next[`mag-${item.key}-photos`] = 'Add at least two photos to choose both covers.'
      if (!item.photos.some((photo) => photo.id === item.frontId)) next[`mag-${item.key}-front`] = 'Choose a front cover photo.'
      if (!item.photos.some((photo) => photo.id === item.backId)) next[`mag-${item.key}-back`] = 'Choose a back cover photo.'
    })
    selected.songBooks && songBooks.forEach((item, index) => {
      if (!item.songName.trim()) next[`song-${item.key}-name`] = `Add the song name for Song Book #${index + 1}.`
      if (!item.lyrics.trim()) next[`song-${item.key}-lyrics`] = `Add the lyrics for Song Book #${index + 1}.`
      if (item.photos.length < 2) next[`song-${item.key}-photos`] = 'Add at least two photos to choose both covers.'
      if (!item.photos.some((photo) => photo.id === item.frontId)) next[`song-${item.key}-front`] = 'Choose a front cover photo.'
      if (!item.photos.some((photo) => photo.id === item.backId)) next[`song-${item.key}-back`] = 'Choose a back cover photo.'
    })
    if (selected.frames && frames.length > Number(manualCatalog.frames.maxItems || 20)) next.framesEmpty = `You can add up to ${manualCatalog.frames.maxItems} frame sizes to one order.`
    if (selected.miniMagazines && miniBooks.length > Number(manualCatalog.miniMagazines.maxItems || 20)) next.miniEmpty = `You can add up to ${manualCatalog.miniMagazines.maxItems} Mini Pocket Magazines to one order.`
    if (selected.magazines && magazines.length > Number(manualCatalog.magazines.maxItems || 20)) next.magazinesEmpty = `You can add up to ${manualCatalog.magazines.maxItems} magazines to one order.`
    if (selected.songBooks && songBooks.length > Number(manualCatalog.songBooks.maxItems || 20)) next.songBooksEmpty = `You can add up to ${manualCatalog.songBooks.maxItems} Song Books to one order.`
    return next
  }
  const deliveryErrors = () => {
    const next = {}
    if (!delivery.recipient.trim()) next.recipient = 'Enter the recipient’s name.'
    if (!validBangladeshPhone(delivery.phone)) next.deliveryPhone = 'Enter a valid Bangladesh mobile number.'
    if (!delivery.address.trim()) next.address = 'Enter the full delivery address.'
    if (!delivery.city.trim()) next.city = 'Enter the city or district.'
    if (!delivery.area) next.area = 'Choose the delivery area.'
    if (!delivery.date) next.date = 'Choose a preferred delivery date.'
    else if (delivery.area && delivery.date < minimumDeliveryDate({ area: delivery.area, hasPolaroids })) next.date = `Choose ${earliest} or a later date for the selected products.`
    return next
  }
  const customerErrors = () => {
    const next = {}
    if (!customer.name.trim()) next.name = 'Enter your name.'
    if (!customer.instagram.trim() || !/^[A-Za-z0-9._]{1,30}$/.test(customer.instagram.replace(/^@/, '').trim())) next.instagram = 'Enter your Instagram username only.'
    if (!validBangladeshPhone(customer.whatsapp)) next.whatsapp = 'Enter a valid Bangladesh WhatsApp number.'
    return next
  }
  const advance = () => {
    const next = step === 0 ? productSelectionErrors() : step === 1 ? productErrors() : step === 2 ? deliveryErrors() : customerErrors()
    setErrors(next)
    if (Object.keys(next).length) {
      if (step === 1) {
        const firstError = Object.keys(next).find((key) => /^(polaroid|frame-|mini-|mag-|song-)/.test(key))
        const productId = firstError?.startsWith('frame-') ? 'frames'
          : firstError?.startsWith('mini-') ? 'miniMagazines'
            : firstError?.startsWith('mag-') ? 'magazines'
              : firstError?.startsWith('song-') ? 'songBooks'
                : firstError?.startsWith('polaroid') ? 'polaroids' : null
        if (productId) setExpandedProduct(productId)
      }
      return
    }
    setStep((current) => Math.min(4, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goBack = () => { setErrors({}); setStep((current) => Math.max(0, current - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const filePayload = async (fileItems) => Promise.all((fileItems ?? []).map(async (photo) => {
    const { id, file } = photo
    if (uploaded.current.has(id)) {
      setUploadStatus((current) => ({ ...current, completed: current.completed + 1 }))
      return uploaded.current.get(id)
    }
    setProgress(`Uploading ${file.name}…`)
    const response = await fetch(`${MEDIA_API}/guest-media/${requestKey.current}/${id}`, {
      method: 'PUT', headers: { 'Content-Type': photo.type || orderImageType(file), 'X-File-Name': encodeURIComponent(file.name) }, body: file,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.error || `Could not upload ${file.name}.`)
    const saved = { id, name: file.name, size: file.size, type: photo.type || orderImageType(file), storageKey: result.key }
    uploaded.current.set(id, saved)
    setUploadStatus((current) => ({ ...current, completed: current.completed + 1 }))
    return saved
  }))

  const prepareItems = async () => {
    const rows = []
    if (selected.polaroids) rows.push({ type: 'polaroids', item: polaroid })
    if (selected.frames) rows.push(...frames.map((item) => ({ type: 'frame', item })))
    if (selected.miniMagazines) rows.push(...miniBooks.map((item) => ({ type: 'mini-magazine', item })))
    if (selected.magazines) rows.push(...magazines.map((item) => ({ type: 'magazine', item })))
    if (selected.songBooks) rows.push(...songBooks.map((item) => ({ type: 'song-book', item })))
    let completed = 0
    const prepared = []
    for (const { type, item } of rows) {
      setProgress(`Preparing photos ${++completed} of ${rows.length} items…`)
      const files = await filePayload(item.photos)
      const references = await filePayload(item.reference ? [item.reference] : [])
      prepared.push({ ...item, type, files, referenceFile: references[0] ?? null })
    }
    return prepared
  }

  const submitOrder = async () => {
    const allErrors = { ...productErrors(), ...deliveryErrors(), ...customerErrors() }
    setErrors(allErrors)
    if (Object.keys(allErrors).length) {
      const productIssues = productErrors()
      const deliveryIssues = deliveryErrors()
      setStep(Object.keys(productIssues).length ? (items.length ? 1 : 0) : Object.keys(deliveryIssues).length ? 2 : 3)
      return
    }
    if (!MEDIA_API) { setSubmitError('Photo and order storage is not configured yet. Please contact us on WhatsApp.'); return }
    const photoTotal = items.reduce((count, item) => count + (item.photos?.length ?? 0) + (item.reference ? 1 : 0), 0)
    setSubmitting(true); setSubmitError(''); setProgress('Preparing your order…'); setUploadStatus({ completed: 0, total: photoTotal })
    try {
      const preparedItems = await prepareItems()
      setProgress('Checking prices and saving your order…')
      const response = await fetch(`${MEDIA_API}/guest-orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: requestKey.current,
          items: preparedItems.map((item) => ({
            type: item.type, key: item.key, quantity: Number(item.quantity ?? item.qty ?? 1), optionId: item.optionId || '', sizeId: item.sizeId || '',
            category: item.category || '', custom: item.custom || {}, notes: item.notes || '', songName: item.songName || '', lyrics: item.lyrics || '',
            photos: item.files, referenceFile: item.referenceFile, frontId: item.frontId || '', backId: item.backId || '',
          })),
          delivery: { ...delivery },
          customer: { name: customer.name.trim(), instagram: customer.instagram.trim().replace(/^@+/, ''), whatsapp: customer.whatsapp.trim() },
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'We could not place your order. Please try again.')
      setSuccess(result.order)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitError(error.message || 'We could not place your order. Please try again.')
    } finally { setSubmitting(false); setProgress('') }
  }

  if (loading) return <Container className="py-24 text-center text-ink/60">Loading your order options…</Container>
  if (loadError) return <Container className="py-24 text-center"><p>We could not load product options.</p><button type="button" onClick={() => [productsData.reload(), sizesData.reload(), settingsData.reload()]} className="mt-3 text-brand underline">Try again</button></Container>

  if (success) return <Container className="py-12 sm:py-20">
    <div className="mx-auto max-w-2xl rounded-3xl border border-sand bg-white p-6 text-center shadow-lg sm:p-10">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-green-50 text-green-700"><CheckCircle2 size={34} /></span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[.18em] text-brand">Order received</p>
      <h1 className="mt-2 font-serif text-4xl">Thank you, {success.customer?.name}!</h1>
      <div className="mt-7 rounded-2xl bg-cream p-5 text-left">
        <div className="flex items-center justify-between gap-4 border-b border-sand pb-3"><span className="text-sm text-ink/60">Order number</span><strong>{success.id}</strong></div>
        <div className="mt-3 flex items-center justify-between gap-4"><span className="text-sm text-ink/60">Total</span><strong className="text-xl text-brand">{formatPrice(success.total)}</strong></div>
        <p className="mt-2 text-xs leading-5 text-ink/55">Delivery: {success.delivery} · {success.deliveryInfo?.date}</p>
      </div>
      <p className="mt-5 text-xs leading-5 text-ink/55">Please keep your order number. Our team will follow up using the contact details you provided.</p>
      <Link to="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-sand px-5 text-sm font-medium text-brand transition hover:bg-cream">Visit homepage</Link>
    </div>
  </Container>

  const updateList = (setter, key, fieldName, value) => setItemList(setter, key, fieldName, value)
  const galleryErrors = (prefix, item) => ({ photos: errors[`${prefix}-${item.key}-photos`], front: errors[`${prefix}-${item.key}-front`], back: errors[`${prefix}-${item.key}-back`] })

  return <>
  <Container className="pb-36 pt-4 sm:pb-16 sm:pt-10">
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 text-center sm:mb-8">
        <Link to="/" className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-cream sm:mb-3 sm:py-2 sm:text-sm"><ArrowLeft size={15} /> Visit homepage</Link>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-brand">Personalised gifts, made for you</p>
        <h1 className="mt-1.5 font-serif text-3xl sm:mt-2 sm:text-5xl">Order Form</h1>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-ink/60 sm:mt-3 sm:text-sm sm:leading-6">Choose a few favourites, personalise each one, and send your order without creating an account.</p>
      </div>
        <div className="mb-5 grid grid-cols-5 gap-1 rounded-xl border border-sand bg-white p-1 sm:mb-8 sm:gap-2 sm:rounded-2xl sm:p-2">
        {['Choose products', 'Product details', 'Delivery details', 'Your information', 'Review order'].map((label, index) => <button key={label} type="button" aria-current={step === index ? 'step' : undefined} disabled={index > step} onClick={() => { if (index < step) { setErrors({}); setStep(index); window.scrollTo({ top: 0, behavior: 'smooth' }) } }} className={`flex flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-2 text-center text-[10px] font-semibold sm:flex-row sm:gap-2 sm:rounded-xl sm:px-2 sm:py-3 sm:text-sm ${step === index ? 'bg-brand text-white' : step > index ? 'bg-[#F2EDE4] text-brand hover:bg-[#E9E0D3]' : 'cursor-not-allowed text-ink/45'}`}><span className="grid size-5 shrink-0 place-items-center rounded-full border border-current text-[9px] sm:size-6 sm:text-[10px]">{step > index ? <Check size={12} /> : index + 1}</span><span className="sm:hidden">{['Products', 'Details', 'Delivery', 'Your info', 'Review'][index]}</span><span className="hidden sm:inline">{label}</span></button>)}
      </div>

      {step === 0 && <div className="space-y-7">
        <SectionCard title="Pick your products" subtitle="Select one or more gift types. You can add multiple sizes and personalised items to the same order.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-5">
            {manualCards.map(({ id, title, icon: Icon, tint, ...card }) => {
              const active = Boolean(selected[id]); const start = cardStartingPrice(id)
              const image = cardImageUrl({ id, ...card })
              return <button key={id} type="button" aria-pressed={active} onClick={() => toggleProduct(id)} className={`group relative overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg ${active ? 'border-brand bg-[#FFFAF8] ring-2 ring-brand/15' : 'border-sand bg-white hover:border-brand/35'}`}>
                <span className="relative block aspect-[1.55/1] overflow-hidden bg-cream">
                  {image ? <img src={image} alt="" loading="lazy" decoding="async" fetchPriority="low" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <span className={`grid h-full place-items-center ${tint} text-brand`}><Icon size={30} strokeWidth={1.7} /></span>}
                  <span className={`absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full shadow-sm sm:right-3 sm:top-3 sm:size-7 ${active ? 'bg-brand text-white' : 'border border-sand/80 bg-white/95 text-transparent'}`}><Check size={13} /></span>
                </span>
                <span className="block p-3 sm:p-4"><span className="block text-sm font-semibold leading-5 sm:text-base">{title}</span>
                  {card.description && <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-ink/55 sm:text-xs">{card.description}</span>}
                  <span className="mt-1 block text-[10px] leading-4 text-ink/55 sm:text-xs">Starting from <strong className="text-xs text-brand sm:text-sm">{Number.isFinite(start) ? priceLabel(start) : 'Price not set'}</strong></span>
                </span>
              </button>
            })}
          </div>
          {errors.products && <p className="mt-3 text-sm text-red-700">{errors.products}</p>}
        </SectionCard>

        <div className="hidden justify-end sm:flex"><Button onClick={advance} className="min-h-12 gap-2 px-6">Continue to product details <ArrowRight size={17} /></Button></div>
      </div>}

      {step === 1 && <div className="space-y-7">
        {selected.polaroids && <ProductSectionCard id="polaroids" title={manualCatalog.polaroids.title} subtitle={`Classic photo prints · ${formatPrice(manualCatalog.polaroids.unitPrice)} each · minimum ${manualCatalog.polaroids.minQuantity || 9}`} expanded={expandedProduct === 'polaroids'} onToggle={() => setExpandedProduct((current) => current === 'polaroids' ? null : 'polaroids')}>
          <div className="grid gap-5 sm:grid-cols-[1fr_2fr] sm:items-end">
            {field('How many Polaroids?', polaroid.quantity, (value) => setPolaroid((current) => ({ ...current, quantity: value, photos: Number(value) > 0 ? current.photos.slice(0, Number(value)) : current.photos })), { type: 'number', required: true, error: errors.polaroidQuantity })}
            <div className="rounded-xl bg-cream px-4 py-3 text-sm">{formatPrice((Number(polaroid.quantity) || 0) * Number(manualCatalog.polaroids.unitPrice))} <span className="text-ink/55">· {Number(polaroid.quantity) || 0} prints Ã— {formatPrice(manualCatalog.polaroids.unitPrice)}</span></div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <UploadPicker title="Photos for your Polaroids" files={polaroid.photos} onChange={(photos) => setPolaroid({ ...polaroid, photos })} max={Math.max(1, Number(polaroid.quantity) || 1)} help={`Add exactly one photo for each Polaroid (${Number(polaroid.quantity) || 0} pieces).`} error={errors.polaroidPhotos} />
            <UploadPicker title="Polaroid design reference (optional)" files={polaroid.reference ? [polaroid.reference] : []} onChange={(reference) => setPolaroid({ ...polaroid, reference: reference[0] ?? null })} multiple={false} help="A screenshot or sample style you would like us to follow." />
          </div>
          <label className="mt-5 block"><span className="mb-1.5 block text-sm font-medium">Print notes (optional)</span><textarea rows="2" value={polaroid.notes || ''} onChange={(event) => setPolaroid({ ...polaroid, notes: event.target.value })} className={inputClass} placeholder="Captions, order of photos, or any special request" /></label>
        </ProductSectionCard>}

        {selected.frames && <ProductSectionCard id="frames" title={manualCatalog.frames.title} subtitle="Separate size and photo for each frame · catalog pricing" expanded={expandedProduct === 'frames'} onToggle={() => setExpandedProduct((current) => current === 'frames' ? null : 'frames')}>
          <div className="space-y-4">{frames.map((item, index) => {
            const option = frameOptions.find((row) => row.id === item.optionId)
            return <div key={item.key} className="rounded-2xl border border-sand bg-[#FFFEFC] p-4 sm:p-5">
              <ItemHeader title={`Frame #${index + 1}`} onRemove={() => removeProductItem(setFrames, frames, 'frames', item.key)} />
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block"><span className="mb-1.5 block text-sm font-medium">Frame size</span><select value={item.optionId} onChange={(event) => updateList(setFrames, item.key, 'optionId', event.target.value)} className={inputClass}><option value="">Choose a size</option>{frameOptions.map((row) => <option key={row.id} value={row.id}>{row.label} · {formatPrice(row.price)}</option>)}</select>{errors[`frame-${item.key}-option`] && <span className="mt-1 block text-xs text-red-700">{errors[`frame-${item.key}-option`]}</span>}</label>
                {field('Quantity', item.quantity, (value) => updateList(setFrames, item.key, 'quantity', value), { type: 'number', error: errors[`frame-${item.key}-quantity`] })}
                <div className="rounded-xl bg-cream px-4 py-3 text-sm"><span className="text-xs text-ink/55">Frame subtotal</span><p className="mt-1 font-semibold text-brand">{formatPrice((option?.price || 0) * (Number(item.quantity) || 0))}</p></div>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2"><UploadPicker title="Print photos" files={item.photos} onChange={(photos) => updateList(setFrames, item.key, 'photos', photos)} help="Upload the photos you want printed and placed in your frame." error={errors[`frame-${item.key}-photos`]} /><UploadPicker title="Frame design reference (optional)" files={item.reference ? [item.reference] : []} onChange={(files) => updateList(setFrames, item.key, 'reference', files[0] ?? null)} multiple={false} help="A sample showing the frame style you prefer." /></div>
              <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">Notes (optional)</span><textarea rows="2" value={item.notes} onChange={(event) => updateList(setFrames, item.key, 'notes', event.target.value)} className={inputClass} /></label>
            </div>
          })}</div>
          <button type="button" disabled={!canAddItems('frames', frames.length)} onClick={() => addItem(setFrames, 'frame')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/25 px-4 text-sm font-semibold text-brand hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> {canAddItems('frames', frames.length) ? 'Add another frame' : 'Frame item limit reached'}</button>
        </ProductSectionCard>}

        {selected.miniMagazines && <ProductSectionCard id="miniMagazines" title={`${manualCatalog.miniMagazines.title}s`} subtitle={`${formatPrice(manualCatalog.miniMagazines.unitPrice)} each · up to 8 photos per item`} expanded={expandedProduct === 'miniMagazines'} onToggle={() => setExpandedProduct((current) => current === 'miniMagazines' ? null : 'miniMagazines')}>
          <div className="space-y-4">{miniBooks.map((item, index) => {
            const photoErrors = galleryErrors('mini', item)
            return <div key={item.key} className="rounded-2xl border border-sand bg-[#FFFEFC] p-4 sm:p-5">
              <ItemHeader title={`Mini Magazine #${index + 1}`} onRemove={() => removeProductItem(setMiniBooks, miniBooks, 'miniMagazines', item.key)} />
              <UploadPicker title="Photos for this mini magazine" files={item.photos} onChange={(photos) => setMiniBooks((list) => list.map((row) => row.key === item.key ? { ...row, photos, frontId: photos.some((photo) => photo.id === row.frontId) ? row.frontId : '', backId: photos.some((photo) => photo.id === row.backId) ? row.backId : '' } : row))} max={8} help="Choose front and back directly under each photo." error={photoErrors.photos || photoErrors.front || photoErrors.back} frontId={item.frontId} backId={item.backId} onCoverChange={(key, value) => updateList(setMiniBooks, item.key, key, value)} />
              <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">Notes (optional)</span><textarea rows="2" value={item.notes} onChange={(event) => updateList(setMiniBooks, item.key, 'notes', event.target.value)} className={inputClass} /></label>
            </div>
          })}</div>
          <button type="button" disabled={!canAddItems('miniMagazines', miniBooks.length)} onClick={() => addItem(setMiniBooks, 'mini-magazine')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/25 px-4 text-sm font-semibold text-brand hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> {canAddItems('miniMagazines', miniBooks.length) ? 'Add another Mini Magazine' : 'Mini Magazine item limit reached'}</button>
        </ProductSectionCard>}

        {selected.magazines && <ProductSectionCard id="magazines" title={`${manualCatalog.magazines.title}s`} subtitle="A4/A5 · page count, category, and photos per item" expanded={expandedProduct === 'magazines'} onToggle={() => setExpandedProduct((current) => current === 'magazines' ? null : 'magazines')}>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink/55"><span className="rounded-full bg-cream px-3 py-1.5">A4 - 21 x 29.7 cm</span><span className="rounded-full bg-cream px-3 py-1.5">A5 - 14.8 x 21 cm</span><button type="button" onClick={() => setMagazineSizePreviewOpen(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brand/20 bg-white px-3 py-1.5 font-semibold text-brand transition-colors hover:bg-cream"><Eye size={14} /> Preview size difference</button></div>
          <div className="space-y-4">{magazines.map((item, index) => {
            const size = magazineOptions.find((option) => option.id === item.sizeId)
            const photoErrors = galleryErrors('mag', item)
            const categoryFields = CATEGORY_FIELDS[item.category] ?? []
            return <div key={item.key} className="rounded-2xl border border-sand bg-[#FFFEFC] p-4 sm:p-5">
              <ItemHeader title={`Magazine #${index + 1}`} onRemove={() => removeProductItem(setMagazines, magazines, 'magazines', item.key)} />
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Size and page count</span><select value={item.sizeId} onChange={(event) => updateList(setMagazines, item.key, 'sizeId', event.target.value)} className={inputClass}><option value="">Choose size and pages</option>{a4Sizes.length > 0 && <optgroup label="A4 · 21 Ã— 29.7 cm">{a4Sizes.map((option) => <option key={option.id} value={option.id}>{option.pages} pages · {formatPrice(option.price)}</option>)}</optgroup>}{a5Sizes.length > 0 && <optgroup label="A5 · 14.8 Ã— 21 cm">{a5Sizes.map((option) => <option key={option.id} value={option.id}>{option.pages} pages · {formatPrice(option.price)}</option>)}</optgroup>}</select>{errors[`mag-${item.key}-size`] && <span className="mt-1 block text-xs text-red-700">{errors[`mag-${item.key}-size`]}</span>}</label>
                <div className="rounded-xl bg-cream px-4 py-3"><span className="text-xs text-ink/55">Magazine price</span><p className="mt-1 font-semibold text-brand">{formatPrice(size?.price || 0)}</p></div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-sm font-medium">Category</span><select value={item.category} onChange={(event) => setMagazines((list) => list.map((row) => row.key === item.key ? { ...row, category: event.target.value, custom: {} } : row))} className={inputClass}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                {categoryFields.map(([id, label, required, type]) => <div key={`${item.key}-${id}`}>{field(label, item.custom[id], (value) => setMagazines((list) => list.map((row) => row.key === item.key ? { ...row, custom: { ...row.custom, [id]: value } } : row)), { type: type || 'text', required, placeholder: id === 'year' ? 'e.g. 1st anniversary' : '', error: errors[`mag-${item.key}-${id}`] })}</div>)}
              </div>
              <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">Additional notes (optional)</span><textarea rows="2" value={item.notes} onChange={(event) => updateList(setMagazines, item.key, 'notes', event.target.value)} className={inputClass} placeholder="Messages, captions, colour ideas…" /></label>
              <div className="mt-5"><UploadPicker title="Photos for this magazine" files={item.photos} onChange={(photos) => setMagazines((list) => list.map((row) => row.key === item.key ? { ...row, photos, frontId: photos.some((photo) => photo.id === row.frontId) ? row.frontId : '', backId: photos.some((photo) => photo.id === row.backId) ? row.backId : '' } : row))} help="Choose front and back directly under each photo." error={photoErrors.photos || photoErrors.front || photoErrors.back} frontId={item.frontId} backId={item.backId} onCoverChange={(key, value) => updateList(setMagazines, item.key, key, value)} /></div>
            </div>
          })}</div>
          <button type="button" disabled={!canAddItems('magazines', magazines.length)} onClick={() => addItem(setMagazines, 'magazine', { sizeId: a4Sizes.find((size) => size.pages === 8)?.id || a4Sizes[0]?.id || '' })} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/25 px-4 text-sm font-semibold text-brand hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> {canAddItems('magazines', magazines.length) ? 'Add another Magazine' : 'Magazine item limit reached'}</button>
        </ProductSectionCard>}

        {selected.songBooks && <ProductSectionCard id="songBooks" title={`${manualCatalog.songBooks.title}s`} subtitle={`12 pages · ${formatPrice(manualCatalog.songBooks.unitPrice)} each · song and photos per book`} expanded={expandedProduct === 'songBooks'} onToggle={() => setExpandedProduct((current) => current === 'songBooks' ? null : 'songBooks')}>
          <div className="space-y-4">{songBooks.map((item, index) => {
            const photoErrors = galleryErrors('song', item)
            return <div key={item.key} className="rounded-2xl border border-sand bg-[#FFFEFC] p-4 sm:p-5">
              <ItemHeader title={`Song Book #${index + 1}`} onRemove={() => removeProductItem(setSongBooks, songBooks, 'songBooks', item.key)} />
              <div className="mb-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-cream px-3 py-1.5">12 pages</span><span className="rounded-full bg-cream px-3 py-1.5">{formatPrice(manualCatalog.songBooks.unitPrice)}</span></div>
              {field('Song name', item.songName, (value) => updateList(setSongBooks, item.key, 'songName', value), { required: true, error: errors[`song-${item.key}-name`] })}
              <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">Song lyrics <span className="text-brand">*</span></span><textarea rows="6" value={item.lyrics} onChange={(event) => updateList(setSongBooks, item.key, 'lyrics', event.target.value)} className={inputClass} placeholder="Paste the lyrics for this song" /><span className="mt-1 block text-xs text-ink/50">Around 60–80 words works well in the layout. Longer lyrics are welcome too.</span>{errors[`song-${item.key}-lyrics`] && <span className="mt-1 block text-xs text-red-700">{errors[`song-${item.key}-lyrics`]}</span>}</label>
              <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">Additional notes (optional)</span><textarea rows="2" value={item.notes} onChange={(event) => updateList(setSongBooks, item.key, 'notes', event.target.value)} className={inputClass} /></label>
              <div className="mt-5"><UploadPicker title="Photos for this Song Book" files={item.photos} onChange={(photos) => setSongBooks((list) => list.map((row) => row.key === item.key ? { ...row, photos, frontId: photos.some((photo) => photo.id === row.frontId) ? row.frontId : '', backId: photos.some((photo) => photo.id === row.backId) ? row.backId : '' } : row))} help="Choose front and back directly under each photo." error={photoErrors.photos || photoErrors.front || photoErrors.back} frontId={item.frontId} backId={item.backId} onCoverChange={(key, value) => updateList(setSongBooks, item.key, key, value)} /></div>
            </div>
          })}</div>
          <button type="button" disabled={!canAddItems('songBooks', songBooks.length)} onClick={() => addItem(setSongBooks, 'song-book')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/25 px-4 text-sm font-semibold text-brand hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> {canAddItems('songBooks', songBooks.length) ? 'Add another Song Book' : 'Song Book item limit reached'}</button>
        </ProductSectionCard>}
        {(errors.framesEmpty || errors.miniEmpty || errors.magazinesEmpty || errors.songBooksEmpty) && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errors.framesEmpty || errors.miniEmpty || errors.magazinesEmpty || errors.songBooksEmpty}</p>}
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-brand px-5 py-4 text-white"><span className="text-sm text-white/75">Current product subtotal</span><strong className="text-xl">{formatPrice(productSubtotal)}</strong></div>
        <div className="hidden justify-between gap-4 sm:flex"><Button variant="outline" onClick={goBack} className="min-h-12 gap-2"><ArrowLeft size={17} /> Back to products</Button><Button onClick={advance} className="min-h-12 gap-2 px-6">Continue to delivery <ArrowRight size={17} /></Button></div>
      </div>}

      {step === 2 && <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <SectionCard title="Delivery information" subtitle="Tell us where this order should arrive. We use Bangladesh time to calculate the earliest available date.">
            <div className="grid gap-4 sm:grid-cols-2">
              {field("Recipient's full name", delivery.recipient, (value) => setDelivery({ ...delivery, recipient: value }), { required: true, error: errors.recipient })}
              {field("Recipient's phone number", delivery.phone, (value) => setDelivery({ ...delivery, phone: value }), { type: 'tel', required: true, placeholder: '01XXXXXXXXX', error: errors.deliveryPhone })}
              <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Full delivery address <span className="text-brand">*</span></span><textarea rows="3" value={delivery.address} onChange={(event) => setDelivery({ ...delivery, address: event.target.value })} className={inputClass} placeholder="House, road, area, landmark" />{errors.address && <span className="mt-1 block text-xs text-red-700">{errors.address}</span>}</label>
              {field('City or district', delivery.city, (value) => setDelivery({ ...delivery, city: value }), { required: true, error: errors.city })}
              <label className="block"><span className="mb-1.5 block text-sm font-medium">Delivery area <span className="text-brand">*</span></span><select value={delivery.area} onChange={(event) => setDelivery({ ...delivery, area: event.target.value, date: '' })} className={inputClass}><option value="">Choose area</option><option value="inside">Inside Dhaka · ৳60 delivery</option><option value="outside">Outside Dhaka · ৳110 delivery</option></select>{errors.area && <span className="mt-1 block text-xs text-red-700">{errors.area}</span>}</label>
            </div>
          </SectionCard>
          <SectionCard title="Choose a delivery date" subtitle="Unavailable dates are disabled. Select an available date to see any express fee before you continue.">
            <DeliveryCalendar value={delivery.date} minDate={delivery.area ? earliest : ''} disabled={!delivery.area} area={delivery.area} hasRushProducts={hasRushProducts} error={errors.date} onChange={(date) => setDelivery({ ...delivery, date })} />
            {hasRushProducts && <p className="mt-4 rounded-xl border border-[#EED7A6] bg-[#FFFAEC] p-4 text-xs leading-5 text-ink/65"><strong className="text-ink">Magazine and Song Book express delivery:</strong> first available day +৳100, the next available day +৳50, and later dates no extra charge. This fee is applied once to the order.</p>}
          </SectionCard>
        </div>
        <aside className="hidden rounded-2xl border border-sand bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:block">
          <h2 className="font-serif text-xl">Price estimate</h2>
          <div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-ink/60">Products</span><span>{formatPrice(productSubtotal)}</span></div><div className="flex justify-between gap-3"><span className="text-ink/60">Standard delivery</span><span>{formatPrice(shipping)}</span></div>{hasRushProducts && delivery.date && <div className="flex justify-between gap-3"><span className="text-ink/60">Express surcharge</span><span>{formatPrice(surcharge || 0)}</span></div>}<div className="border-t border-sand pt-3"><div className="flex justify-between gap-3 text-base font-semibold"><span>Estimated total</span><span className="text-brand">{formatPrice(total)}</span></div></div></div>
          <p className="mt-4 rounded-xl bg-cream p-3 text-xs leading-5 text-ink/60">We’ll confirm your order and delivery plan on WhatsApp before production.</p>
        </aside>
        <div className="hidden justify-between gap-4 lg:col-span-2 sm:flex"><Button variant="outline" onClick={goBack} className="min-h-12 gap-2"><ArrowLeft size={17} /> Back</Button><Button onClick={advance} className="min-h-12 gap-2 px-6">Continue to your information <ArrowRight size={17} /></Button></div>
      </div>}

      {step === 3 && <div className="mx-auto max-w-4xl space-y-6">
        <SectionCard title="Your information" subtitle="Enter your own contact details as the person placing this order. These can be different from the delivery recipient.">
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Your name', customer.name, (value) => setCustomer({ ...customer, name: value }), { required: true, error: errors.name })}
            {field('Your Instagram username', customer.instagram, (value) => setCustomer({ ...customer, instagram: value }), { required: true, placeholder: '@username or username', error: errors.instagram })}
            {field('Your WhatsApp number', customer.whatsapp, (value) => setCustomer({ ...customer, whatsapp: value }), { type: 'tel', required: true, placeholder: '01XXXXXXXXX', error: errors.whatsapp })}
          </div>
        </SectionCard>
        <div className="hidden justify-between gap-4 sm:flex"><Button variant="outline" onClick={goBack} className="min-h-12 gap-2"><ArrowLeft size={17} /> Back</Button><Button onClick={advance} className="min-h-12 gap-2 px-6">Review order <ArrowRight size={17} /></Button></div>
      </div>}

      {step === 4 && <div className="mx-auto max-w-4xl space-y-6">
        <SectionCard title="Review your order" subtitle="Check every item, customization, and delivery charge before sending it to our team.">
          <div className="divide-y divide-sand">{items.map((item, index) => {
            let title = ''; let option = ''; let unitPrice = item.price || 0; let quantity = Number(item.quantity ?? item.qty ?? 1)
            if (item.type === 'polaroids') { title = manualCatalog.polaroids.title; option = `${quantity} prints · ${formatPrice(manualCatalog.polaroids.unitPrice)} each` }
            if (item.type === 'frame') { title = `Frame #${index + 1}`; option = item.optionId; unitPrice = frameOptions.find((row) => row.id === item.optionId)?.price || 0 }
            if (item.type === 'mini-magazine') { title = manualCatalog.miniMagazines.title; option = '8 pages' }
            if (item.type === 'magazine') { title = `${manualCatalog.magazines.title} #${index + 1}`; const size = magazineOptions.find((row) => row.id === item.sizeId); option = size ? `${size.format} · ${size.pages} pages · ${item.category}` : item.category; unitPrice = size?.price || 0 }
            if (item.type === 'song-book') { title = `${manualCatalog.songBooks.title} #${index + 1}`; option = `12 pages · ${item.songName}` }
            return <div key={item.key} className="py-4 first:pt-0 last:pb-0"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-ink/55">{option}</p>{item.type === 'magazine' && <p className="mt-1 text-xs text-ink/60">{Object.entries(item.custom).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>}{item.type === 'song-book' && <p className="mt-1 line-clamp-2 text-xs text-ink/60">{item.lyrics}</p>}<ReviewPhotoGallery photos={item.photos} frontId={item.frontId} backId={item.backId} />{item.reference && <p className="mt-2 text-xs text-ink/55">Design reference: {item.reference.file.name}</p>}</div><p className="shrink-0 font-semibold">{formatPrice(unitPrice * quantity)}</p></div></div>
          })}</div>
        </SectionCard>
        <SectionCard title="Delivery & contact">
          <div className="grid gap-4 sm:grid-cols-2 text-sm"><div><p className="text-xs text-ink/50">Recipient</p><p className="mt-1 font-medium">{delivery.recipient} · {delivery.phone}</p><p className="text-ink/65">{delivery.address}, {delivery.city}</p><p className="text-ink/65">{delivery.area === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'} · {delivery.date}</p></div><div><p className="text-xs text-ink/50">Order placed by</p><p className="mt-1 font-medium">{customer.name}</p><p className="text-ink/65">@{customer.instagram.replace(/^@/, '')}</p><p className="text-ink/65">WhatsApp {customer.whatsapp}</p></div></div>
        </SectionCard>
        <SectionCard title="Total">
          <div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-ink/60">Product subtotal</span><span>{formatPrice(productSubtotal)}</span></div><div className="flex justify-between"><span className="text-ink/60">Standard delivery ({delivery.area === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'})</span><span>{formatPrice(shipping)}</span></div>{hasRushProducts && <div className="flex justify-between"><span className="text-ink/60">Magazine/Song Book express surcharge</span><span>{formatPrice(surcharge || 0)}</span></div>}<div className="flex justify-between border-t border-sand pt-4 text-lg font-bold"><span>Grand total</span><span className="text-brand">{formatPrice(total)}</span></div></div>
        </SectionCard>
        {submitError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{submitError}</div>}
        <div className="hidden flex-col-reverse justify-between gap-3 sm:flex sm:flex-row"><Button variant="outline" onClick={goBack} disabled={submitting} className="min-h-12 gap-2"><ArrowLeft size={17} /> Back and edit</Button><Button onClick={submitOrder} disabled={submitting} className="min-h-12 gap-2 px-6">{submitting ? 'Sending order…' : 'Place order'} <Sparkles size={17} /></Button></div>
      </div>}
    </div>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+.75rem)] pt-3 shadow-[0_-8px_24px_rgba(52,43,41,.08)] backdrop-blur sm:hidden">
      <div className="mx-auto max-w-6xl">
        <div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs text-ink/60">{step < 2 ? 'Product subtotal' : step === 4 ? 'Grand total' : 'Estimated total'}</span><strong className="text-sm text-brand">{formatPrice(step < 2 ? productSubtotal : total)}</strong></div>
        <div className="flex gap-2">
          {step > 0 && <Button variant="outline" onClick={goBack} disabled={submitting} aria-label="Go back" className="min-h-11 shrink-0 gap-1.5 px-3"><ArrowLeft size={16} /><span>Back</span></Button>}
          <Button onClick={step === 4 ? submitOrder : advance} disabled={submitting} className="min-h-11 flex-1 gap-2">{step === 0 ? 'Choose product details' : step === 1 ? 'Continue to delivery' : step === 2 ? 'Continue to your information' : step === 3 ? 'Review order' : submitting ? 'Sending order…' : 'Place order'}{step === 4 ? <Sparkles size={16} /> : <ArrowRight size={16} />}</Button>
        </div>
      </div>
    </div>
  </Container>
  {magazineSizePreviewOpen && <MagazineSizePreview onClose={() => setMagazineSizePreviewOpen(false)} />}
  {submitting && <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="order-upload-title" aria-describedby="order-upload-description" className="w-full max-w-md rounded-2xl border border-sand bg-white p-6 shadow-2xl sm:p-8">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-cream text-brand"><Loader2 size={27} className="animate-spin" /></div>
      <h2 id="order-upload-title" className="mt-4 text-center font-serif text-2xl">{uploadStatus.total > uploadStatus.completed ? 'Uploading your photos' : 'Saving your order'}</h2>
      <p id="order-upload-description" className="mt-2 text-center text-sm leading-6 text-ink/65">Please keep this page open. Don’t close or refresh it until your photos finish uploading and your order is confirmed.</p>
      {uploadStatus.total > 0 && <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs font-medium text-ink/60"><span>{uploadStatus.completed < uploadStatus.total ? 'Photos uploaded' : 'Photos uploaded'}</span><span>{uploadStatus.completed} / {uploadStatus.total}</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${Math.min(100, Math.round(uploadStatus.completed / uploadStatus.total * 100))}%` }} /></div>
      </div>}
      <p role="status" aria-live="polite" className="mt-4 text-center text-xs text-ink/55">{progress}</p>
    </section>
  </div>}
  </>
}
