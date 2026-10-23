import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, ShoppingCart } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import PageNav from '../../shared/ui/PageNav'
import Stepper from '../order/components/Stepper'
import PhotosStep from '../order/steps/PhotosStep'
import DeliveryStep from '../order/steps/DeliveryStep'
import ContactStep from '../order/steps/ContactStep'
import { Card, Input } from '../order/components/FormField'
import { emptyContact, emptyDelivery } from '../order/lib/orderDraft'
import { photoStore } from '../order/lib/photoStore'
import { calcTotals, checkDate, longDate, orderingDay } from '../order/lib/pricing'
import { cleanInstagram, validateCartDelivery, validateContact, validateDelivery } from '../order/lib/validation'
import { buildOrder } from '../../shared/utils/orders'
import { ordersApi, getSongBook, getOrderSettings } from '../../shared/services/contentService'
import { savedDrafts, newDraftId } from '../order/lib/savedDrafts'
import { useCart } from '../../shared/context/CartContext'
import useAsync from '../../shared/hooks/useAsync'
import { formatPrice } from '../../shared/utils/format'
import { useAuth } from '../../shared/context/AuthContext'

const STEPS = [
  { id: 'song', label: 'Customize' }, { id: 'photos', label: 'Photos' }, { id: 'delivery', label: 'Delivery' },
  { id: 'contact', label: 'Your info' }, { id: 'review', label: 'Review' },
]
const CATEGORIES = ['Personal', 'Couple', 'Best Friend']
const DRAFT_KEY = (id) => `pb:song-book-order-draft:${id}`
const makeKey = () => `song-book:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`
const freshDraft = (pages) => ({ key: makeKey(), pages: [12, 16].includes(pages) ? pages : 12, category: 'Personal', name: '', songName: '', lyrics: '', notes: '', reached: 1, photos: {}, customs: {}, delivery: { ...emptyDelivery }, contact: { ...emptyContact } })

function Summary({ book, pages, totals, delivery }) {
  return <aside className="rounded-2xl border border-sand bg-white p-5 shadow-sm lg:sticky lg:top-6"><h2 className="font-serif text-2xl">Order summary</h2><div className="mt-4 flex justify-between gap-3 text-sm"><span>{book.title} · {pages} pages × 1</span><strong>{formatPrice(totals.magazineTotal)}</strong></div><div className="mt-3 flex justify-between gap-3 text-sm text-ink/60"><span>Delivery</span><span>{delivery.location ? formatPrice(totals.deliveryCharge) : 'Added at delivery step'}</span></div>{totals.rushCharge > 0 && <div className="mt-2 flex justify-between text-sm"><span>Rush delivery</span><span>{formatPrice(totals.rushCharge)}</span></div>}<div className="mt-4 flex justify-between border-t border-sand pt-3 text-lg font-semibold"><span>Total</span><span>{formatPrice(totals.total)}</span></div></aside>
}

export default function SongBookOrderPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { items: cartItems, put: putCartItem, replace: replaceCartItem, remove: removeCartItem } = useCart()
  const bookQuery = useAsync(() => getSongBook(id), [id])
  const settingsQuery = useAsync(getOrderSettings)
  const book = bookQuery.data
  const settings = settingsQuery.data ?? {}
  const cartMode = params.get('mode') === 'cart'
  const cartItemKey = params.get('cartItemKey')
  const savedDraftId = params.get('draft')
  const resumeQuery = useAsync(() => savedDraftId ? savedDrafts.get(savedDraftId) : Promise.resolve(null), [savedDraftId])
  const pagesFromUrl = Number(params.get('pages'))
  const [draft, setDraft] = useState(() => {
    const cartItem = cartItems.find((item) => item.key === cartItemKey)
    try { return { ...freshDraft(pagesFromUrl || cartItem?.meta?.pages), ...JSON.parse(sessionStorage.getItem(DRAFT_KEY(id)) || '{}') } } catch { return freshDraft(pagesFromUrl || cartItem?.meta?.pages) }
  })
  const initialStep = Math.min(Math.max(1, Number(params.get('step')) || 1), Number(draft.reached) || 1, STEPS.length)
  const [step, setStep] = useState(initialStep)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(null)
  const [saveState, setSaveState] = useState(null)
  const [, refreshPhotos] = useReducer((count) => count + 1, 0)
  const requestKey = useRef(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
  const restored = useRef(false)
  const price = Number(draft.pages === 12 ? book?.price12 : book?.price16)
  const copy = useMemo(() => ({ key: draft.key, number: 1, format: { id: 'Song Book', label: 'Song Book' }, size: { id: `${draft.pages}-pages`, pages: draft.pages, price, mrp: 0, photos: '' } }), [draft.key, draft.pages, price])
  const copies = [copy]
  const now = useMemo(() => new Date(), [])
  useEffect(() => {
    if (resumeQuery.data?.draft && !restored.current) {
      setDraft({ ...freshDraft(pagesFromUrl), ...resumeQuery.data.draft })
      setStep(Math.min(Math.max(1, Number(resumeQuery.data.step) || 1), STEPS.length))
      restored.current = true
    }
  }, [resumeQuery.data, pagesFromUrl])
  useEffect(() => { void photoStore.hydrate(draft.key, draft.photos[draft.key]?.files ?? []).then(refreshPhotos) }, [draft.key])
  useEffect(() => { if (!success) { try { sessionStorage.setItem(DRAFT_KEY(id), JSON.stringify(draft)) } catch {} } }, [draft, success, id])
  const totals = calcTotals({ copies, location: draft.delivery.location, date: draft.delivery.date, settings, now })
  const update = (fn) => setDraft((current) => fn(current))
  const clear = (...keys) => setErrors((old) => Object.fromEntries(Object.entries(old).filter(([key]) => !keys.includes(key))))
  const edit = (next) => { setStep(next); setErrors({}); setSubmitError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const back = () => (step === 1 ? navigate(`/song-books/${id}`) : edit(step - 1))
  const validators = [
    () => ({
      ...(book.status === 'Inactive' ? { product: 'Song Book orders are not available right now.' } : {}),
      ...(!price || price < 1 ? { pages: 'This page count is currently unavailable.' } : {}),
      ...(!draft.name.trim() ? { name: 'Add a name for this Song Book.' } : {}),
      ...(!draft.songName.trim() ? { songName: 'Add the song name.' } : {}),
      ...(!draft.lyrics.trim() ? { lyrics: 'Add the song lyrics.' } : {}),
    }),
    () => ({}),
    () => cartMode ? validateCartDelivery({ delivery: draft.delivery, settings, now }) : validateDelivery({ delivery: draft.delivery, settings, now }),
    () => validateContact({ contact: draft.contact }),
    () => ({}),
  ]
  const saveToCart = async () => {
    if (!price || price < 1) { setErrors({ pages: 'This page count is currently unavailable.' }); setStep(1); return }
    setSaveState('saving')
    try {
      await photoStore.flush([draft.key])
      const photos = photoStore.list(draft.key)
      const savedId = draft.savedId ?? newDraftId()
      const files = photos.map(({ id, name, size, type, storageKey }) => ({ id, name, size, type, storageKey }))
      const saved = await savedDrafts.save({ id: savedId, productType: 'song-book', productId: book.id, productTitle: book.title, songBookId: book.id, songBookTitle: book.title, summary: `${draft.pages} pages · ${draft.category}${draft.songName ? ` · ${draft.songName}` : ''}`, step, stepLabel: STEPS[step - 1].label, totalSteps: STEPS.length, photoCount: photos.length, draft: { ...draft, savedId, photos: { ...draft.photos, [draft.key]: { ...(draft.photos[draft.key] ?? {}), files } } } })
      const item = { kind: 'song-book', id: book.id, name: book.title, image: book.image, optionId: `draft-${savedId}`, optionLabel: `${draft.pages} pages · order in progress`, price, mrp: price, qty: 1, meta: { draftId: savedId, draftStep: step, draftStepLabel: STEPS[step - 1].label, draftTotalSteps: STEPS.length, pages: draft.pages, category: draft.category }, photos: { count: photos.length, files }, details: [], to: `/song-books/${book.id}` }
      if (cartItemKey && cartItems.some((entry) => entry.key === cartItemKey)) replaceCartItem(cartItemKey, item)
      else putCartItem(item)
      setDraft((current) => ({ ...current, savedId: saved.id }))
      setSaveState('saved')
    } catch (error) { setSaveState(error?.message || 'Could not save this Song Book to your cart.') }
  }
  const advance = async () => {
    const issues = validators[step - 1]()
    if (Object.keys(issues).length) { setErrors(issues); return }
    if (step < STEPS.length) { setStep(step + 1); setDraft((current) => ({ ...current, reached: Math.max(current.reached, step + 1) })); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (busy) return
    setBusy(true); setSubmitError('')
    try {
      await photoStore.flush([draft.key])
      const photos = photoStore.list(draft.key)
      const front = draft.photos[draft.key]?.front
      const back = draft.photos[draft.key]?.back
      const info = checkDate(draft.delivery.date, draft.delivery.location, settings, now)
      const order = buildOrder({
        id: '',
        cartItems: [{
          kind: 'song-book', id: book.id, name: book.title, image: book.image, optionLabel: `${draft.pages} pages · ${draft.category}`,
          qty: 1, price, meta: { pages: draft.pages, category: draft.category },
          details: [
            { label: 'Pages', value: `${draft.pages} pages` },
            { label: 'Category', value: draft.category }, { label: draft.category === 'Personal' ? 'Name' : 'Names', value: draft.name.trim() },
            { label: 'Song name', value: draft.songName.trim() }, { label: 'Lyrics', value: draft.lyrics.trim() },
            ...(draft.notes.trim() ? [{ label: 'Additional notes', value: draft.notes.trim() }] : []),
          ],
          photos: { count: photos.length, files: photos.map(({ id, name, size, type, storageKey }) => ({ id, name, size, type, storageKey })), names: photos.map((photo) => photo.name), frontId: front ?? '', backId: back ?? '', front: photos.find((photo) => photo.id === front)?.name ?? '', back: photos.find((photo) => photo.id === back)?.name ?? '' },
        }],
        customer: { name: draft.contact.name.trim(), phone: draft.contact.phone.trim(), instagram: cleanInstagram(draft.contact.instagram), email: draft.contact.email.trim(), address: `${draft.delivery.address.trim()}, ${draft.delivery.city.trim()}`, note: draft.contact.note.trim(), recipient: draft.delivery.recipient.trim(), deliveryPhone: draft.delivery.phone.trim(), uid: user?.uid },
        extras: { deliveryCharge: totals.deliveryCharge, rushCharge: totals.rushCharge, deliveryLabel: `${draft.delivery.location === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'} · ${longDate(draft.delivery.date)}`, deliveryInfo: { location: draft.delivery.location, locationLabel: draft.delivery.location === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka', date: draft.delivery.date, daysAhead: info.ahead, city: draft.delivery.city.trim() } },
      })
      if (cartMode) {
        const configured = { ...order.items[0], optionId: `configured-${draft.savedId ?? requestKey.current}`, mrp: price, to: `/song-books/${book.id}`, meta: { ...order.items[0].meta, cartDelivery: { customer: order.customer, deliveryCharge: totals.deliveryCharge, rushCharge: totals.rushCharge, deliveryLabel: order.delivery, deliveryInfo: order.deliveryInfo } } }
        if (cartItemKey && cartItems.some((item) => item.key === cartItemKey)) replaceCartItem(cartItemKey, configured)
        else putCartItem(configured)
        if (draft.savedId) await savedDrafts.remove(draft.savedId)
        photos.forEach((photo) => photoStore.remove(draft.key, photo.id))
        sessionStorage.removeItem(DRAFT_KEY(id))
        navigate('/cart')
        return
      }
      const saved = await ordersApi.place(order, requestKey.current)
      await photoStore.removeFiles(order.items.flatMap((item) => item.photos?.files ?? []))
      if (draft.savedId) await savedDrafts.remove(draft.savedId).catch(() => {})
      if (draft.savedId) cartItems.filter((item) => item.meta?.draftId === draft.savedId).forEach((item) => removeCartItem(item.key))
      sessionStorage.removeItem(DRAFT_KEY(id))
      setSuccess(saved)
    } catch (error) {
      setSubmitError(error?.message || 'Your order could not be saved. Your details are still here; please try again.')
    } finally { setBusy(false) }
  }

  if (bookQuery.loading || settingsQuery.loading || resumeQuery.loading) return <p className="py-32 text-center text-ink/60">Loading your Song Book order…</p>
  if (bookQuery.error || settingsQuery.error) return <p className="py-32 text-center text-red-700">Could not load Song Book order settings.</p>
  if (!book) return <Container className="py-20"><Card className="mx-auto max-w-xl text-center"><h1 className="font-serif text-3xl">Song Book not found</h1><Button as={Link} to="/song-books" className="mt-6">Browse Song Books</Button></Card></Container>
  if (success) return <Container className="py-20"><Card className="mx-auto max-w-xl text-center"><h1 className="font-serif text-3xl">Your Song Book order is placed</h1><p className="mt-3 text-ink/65">Order number: <strong>{success.id}</strong></p><p className="mt-2 text-ink/65">We’ll contact you with the next steps.</p><Button as={Link} className="mt-6" to="/song-books">Back to Song Books</Button></Card></Container>

  const ctx = { copies, occasions: [], draft, update, errors, clear, settings, now, totals, cartMode, productName: 'Song Book' }
  const headings = [
    ['Personalize your Song Book', 'Tell us who it is for and which song belongs in the book.'],
    ['Add your photos', 'Choose the photos that will appear in your Song Book.'],
    ['Delivery details', 'Choose where and when this Song Book should arrive.'],
    ['Your information', 'Add contact details so we can confirm your order.'],
    ['Review your Song Book', 'Check your details before placing the order.'],
  ]
  const last = step === STEPS.length
  return <div className="bg-cream pb-32 pt-6 sm:pt-10 lg:pb-16"><Container>
    <PageNav trail={[{ label: 'Song Books', to: '/song-books' }, { label: book.title, to: `/song-books/${book.id}` }, { label: 'Order' }]} />
    <h1 className="mt-6 font-serif text-3xl sm:text-5xl">Order your Song Book</h1><p className="mt-2 text-ink/70">It only takes a few minutes. Your answers are saved as you go.</p>
    <div className="mt-6 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-6"><Stepper steps={STEPS} current={step} reached={draft.reached} onGo={edit} /></div>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
      <form noValidate onSubmit={(event) => { event.preventDefault(); void advance() }}>
        <div className="mb-5"><h2 className="font-serif text-2xl sm:text-3xl">{headings[step - 1][0]}</h2><p className="mt-1 text-ink/70">{headings[step - 1][1]}</p></div>
        {saveState === 'saved' && <p role="status" className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><CheckCircle2 size={18} className="shrink-0" /><span>Saved to your cart. You can finish this order later from the cart.</span><Link to="/cart" className="font-semibold underline">Go to cart</Link></p>}
        {saveState && saveState !== 'saved' && saveState !== 'saving' && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveState}</p>}
        {Object.keys(errors).length > 0 && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Please fix the highlighted fields to continue.</p>}
        {step === 1 && <Card><h2 className="font-serif text-2xl">Personalize your Song Book</h2><p className="mt-1 text-sm text-ink/60">Tell us who it is for and which song belongs in the book.</p>
          <div className="mt-5"><p className="mb-2 text-sm font-semibold">Page count</p><div className="grid grid-cols-2 gap-3">{[12, 16].map((count) => { const amount = Number(count === 12 ? book.price12 : book.price16); return <button key={count} type="button" disabled={amount <= 0} aria-pressed={draft.pages === count} onClick={() => update((d) => ({ ...d, pages: count }))} className={`rounded-xl border-2 p-3 text-left ${draft.pages === count ? 'border-brand bg-cream' : 'border-sand'} disabled:opacity-40`}><strong>{count} pages</strong><span className="mt-1 block text-sm text-brand">{formatPrice(amount)}</span></button> })}</div>{errors.pages && <p role="alert" className="mt-2 text-sm text-red-700">{errors.pages}</p>}</div>
          <div className="mt-5"><p className="mb-2 text-sm font-semibold">Category</p><div className="grid grid-cols-3 gap-2">{CATEGORIES.map((category) => <button type="button" key={category} aria-pressed={draft.category === category} onClick={() => update((d) => ({ ...d, category }))} className={`rounded-xl border-2 px-2 py-3 text-sm font-semibold ${draft.category === category ? 'border-brand bg-cream' : 'border-sand'}`}>{category}</button>)}</div></div>
          <div className="mt-5 space-y-4"><Input name="song-person" label={draft.category === 'Personal' ? 'Name' : 'Names'} required value={draft.name} error={errors.name} onChange={(name) => { clear('name'); update((d) => ({ ...d, name })) }} /><Input name="song-name" label="Song name" required value={draft.songName} error={errors.songName} onChange={(songName) => { clear('songName'); update((d) => ({ ...d, songName })) }} /><Input name="song-lyrics" label="Song lyrics" required multiline rows={8} hint="Around 60–80 words is recommended. There is no word-count limit." value={draft.lyrics} error={errors.lyrics} onChange={(lyrics) => { clear('lyrics'); update((d) => ({ ...d, lyrics })) }} /><Input name="song-notes" label="Additional notes (optional)" multiline rows={3} value={draft.notes} onChange={(notes) => update((d) => ({ ...d, notes }))} /></div>
        </Card>}
        {step === 2 && <PhotosStep ctx={ctx} />}
        {step === 3 && <DeliveryStep ctx={ctx} />}
        {step === 4 && <ContactStep ctx={ctx} />}
        {step === 5 && <Card><h2 className="font-serif text-2xl">Review your Song Book</h2>{submitError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{submitError}</p>}<dl className="mt-5 grid gap-3 sm:grid-cols-2">{[
          ['Pages', `${draft.pages} pages`], ['Category', draft.category], [draft.category === 'Personal' ? 'Name' : 'Names', draft.name], ['Song name', draft.songName], ['Lyrics', draft.lyrics], ['Photos', `${photoStore.list(draft.key).length} uploaded`], ['Recipient', draft.delivery.recipient || 'Same as contact'], ['Delivery', `${draft.delivery.location === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'} · ${longDate(draft.delivery.date)}`], ['Contact', `${draft.contact.name} · ${draft.contact.phone}`],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-cream/70 p-3"><dt className="text-xs text-ink/55">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-medium">{value}</dd></div>)}</dl></Card>}
        {errors.submit && <p className="flex items-center gap-2 text-sm text-red-700"><AlertCircle size={16} />{errors.submit}</p>}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand bg-white/95 px-3 py-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"><div className="mx-auto flex max-w-[1488px] items-center gap-2 sm:px-2 lg:gap-3 lg:px-0">
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 max-[460px]:px-3" onClick={back} disabled={busy}><ArrowLeft size={16} /> Back</Button>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 max-[460px]:px-3" onClick={saveToCart} disabled={busy || saveState === 'saving'}><ShoppingCart size={16} /><span className="max-[460px]:sr-only">{saveState === 'saving' ? 'Saving…' : 'Save to Cart'}</span></Button>
          <div className="mr-auto shrink-0 leading-tight lg:hidden"><p className="text-xs text-ink/60">Total</p><p className="text-lg font-extrabold">{formatPrice(totals.total)}</p></div>
          <Button type="submit" className="ml-auto shrink-0 gap-2 whitespace-nowrap shadow-lg disabled:opacity-70 max-[460px]:px-3 max-[460px]:text-sm" disabled={busy}>{busy ? 'Placing order…' : last && cartMode ? <><ShoppingCart size={18} /> Add Song Book to cart</> : last ? 'Place order' : <>Continue <ArrowRight size={18} /></>}</Button>
        </div></div>
        {last && <p className="mt-3 text-center text-xs text-ink/60 lg:text-right">{cartMode ? 'Your Song Book details, photos, delivery date and price will be saved with the cart item.' : 'Placing the order saves the details and lets us contact you to confirm it.'}</p>}
      </form>
      {!last && <Summary book={book} pages={draft.pages} totals={totals} delivery={draft.delivery} />}
    </div>
  </Container></div>
}
