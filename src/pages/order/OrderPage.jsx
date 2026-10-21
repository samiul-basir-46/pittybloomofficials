import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Send, ShoppingCart } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import PageNav from '../../shared/ui/PageNav'
import useAsync from '../../shared/hooks/useAsync'
import { useAuth } from '../../shared/context/AuthContext'
import { customerProfileApi, getActiveAddons, getMagazine, getOccasions, getOrderSettings, getSizes, ordersApi } from '../../shared/services/contentService'
import { formatPrice } from '../../shared/utils/format'
import { STEPS } from './data'
import { buildCopies, defaultSizeFor, getFormats, sizesFor, withFields } from './lib/copies'
import { calcTotals, orderingDay } from './lib/pricing'
import { emptyContact, freshDraft, orderDraft } from './lib/orderDraft'
import { photoStore } from './lib/photoStore'
import { newDraftId, savedDrafts } from './lib/savedDrafts'
import { buildMagazineOrder } from './lib/buildOrder'
import { validateContact, validateCustomize, validateDelivery, validateMagazine } from './lib/validation'
import Stepper from './components/Stepper'
import PriceSummary from './components/PriceSummary'
import Success from './components/Success'
import MagazineStep from './steps/MagazineStep'
import CustomizeStep from './steps/CustomizeStep'
import PhotosStep from './steps/PhotosStep'
import DeliveryStep, { longDate } from './steps/DeliveryStep'
import ContactStep from './steps/ContactStep'
import ReviewStep from './steps/ReviewStep'

const HEADINGS = [
  { title: 'Choose your magazine', text: 'Pick the size, the number of pages and how many copies you need.' },
  { title: 'Personalize your magazine', text: 'Tell us about the occasion and the people in it. We use this to design your pages.' },
  { title: 'Upload your photos', text: 'Choose clear photos for each magazine, then pick a front and back page photo.' },
  { title: 'Delivery details', text: 'Where should we send it, and when do you need it?' },
  { title: 'Your Info', text: 'Please provide your contact information so we can communicate with you about your magazine order.' },
  { title: 'Review your order', text: 'Check everything below. You can edit any section before you place the order.' },
]
const STEP_COMPONENTS = [MagazineStep, CustomizeStep, PhotosStep, DeliveryStep, ContactStep, ReviewStep]

// A saved draft may point at sizes or add-ons that Admin has since changed. Fix it up so it always matches today's data.
function reconcile(draft, { sizes, formats, addons, settings }) {
  const max = Math.max(1, Number(settings.maxCopies) || 1)
  const picks = {}
  formats.forEach((f) => {
    const pick = draft.picks[f.id]
    if (!pick) return
    const size = sizesFor(sizes, f).find((s) => s.id === pick.sizeId) ?? defaultSizeFor(sizes, f)
    if (size) picks[f.id] = { sizeId: size.id, qty: Math.min(max, Math.max(1, Math.round(Number(pick.qty)) || 1)) }
  })
  // contact is merged with the empty one so a draft saved before a field existed (e.g. Instagram) still works
  return { ...draft, picks, contact: { ...emptyContact, ...draft.contact }, addons: draft.addons.filter((id) => addons.some((a) => a.id === id)) }
}

function Wizard({ magazine, sizes, addons, addonsFailed, occasions, settings, resumeDraft, customerProfile, customerEmail }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const now = useMemo(() => new Date(), [])
  const formats = useMemo(() => getFormats(settings), [settings])
  const topRef = useRef(null)
  const submitting = useRef(false)
  const submissionKey = useRef(null)

  const [draft, setDraft] = useState(() => {
    const start = freshDraft(
      magazine.id,
      (sizes.find((s) => s.id === 'a4-8') ?? sizes[0]),
    )
    // Resuming from the cart: the saved draft wins, unless this tab already holds a newer copy of that same draft
    // (it is updated on every keystroke, so a refresh of a resumed order keeps what was typed after resuming).
    const mine = orderDraft.get(magazine.id)
    const resumed = resumeDraft && !(mine && mine.savedId === resumeDraft.id) ? resumeDraft.draft : null
    const existing = reconcile(resumed ?? mine ?? start, { sizes, formats, addons, settings })
    return {
      ...existing,
      contact: {
        ...existing.contact,
        name: existing.contact.name || customerProfile.name || '',
        phone: existing.contact.phone || customerProfile.phone || '',
        instagram: existing.contact.instagram || customerProfile.instagram || '',
        email: existing.contact.email || customerEmail || '',
      },
      delivery: {
        ...existing.delivery,
        recipient: existing.delivery.recipient || customerProfile.name || '',
        phone: existing.delivery.phone || customerProfile.phone || '',
        address: existing.delivery.address || customerProfile.address || '',
        city: existing.delivery.city || customerProfile.city || '',
      },
    }
  })
  const [errors, setErrors] = useState({})
  const [returnToReviewFrom, setReturnToReviewFrom] = useState(null)
  const [status, setStatus] = useState('idle') // idle | submitting | error | done
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState(null)
  const [saveState, setSaveState] = useState(null) // null | saving | saved | error
  const [photosReady, setPhotosReady] = useState(false)

  useEffect(() => {
    let alive = true
    const restore = async () => {
      await Promise.all(Object.entries(draft.photos ?? {}).map(([key, meta]) => photoStore.hydrate(key, meta.files ?? [])))
      if (alive) setPhotosReady(true)
    }
    restore()
    return () => { alive = false }
  }, [])

  // Saved after every change so a refresh keeps the form. Not after the order is placed.
  useEffect(() => {
    if (status !== 'done') orderDraft.set(draft)
  }, [draft, status])

  const step = Math.min(Math.max(1, Number(params.get('step')) || 1), draft.reached)
  useEffect(() => {
    topRef.current?.scrollIntoView?.({ block: 'start' })
    setSaveState(null)
  }, [step])

  const update = (fn) => setDraft((d) => fn(d))
  const clear = (...keys) =>
    setErrors((e) => (keys.some((k) => k in e) ? Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))) : e))
  const goTo = (n) => {
    setReturnToReviewFrom(null)
    setErrors({})
    setSubmitError('')
    setParams({ step: n })
  }
  const editFromReview = (n) => {
    setReturnToReviewFrom(n)
    setErrors({})
    setSubmitError('')
    setParams({ step: n })
  }

  const copies = useMemo(() => buildCopies(draft, sizes, formats), [draft, sizes, formats])
  const chosenAddons = useMemo(() => addons.filter((a) => draft.addons.includes(a.id)).map((a) => ({ ...a, qty: 1 })), [addons, draft.addons])
  const totals = calcTotals({ copies, addons: chosenAddons, location: draft.delivery.location, date: draft.delivery.date, settings, now })

  // Save to Cart: keeps whatever is filled in so far (nothing is required) and lists it in the cart as a draft.
  // The draft id is kept inside the draft, so saving again updates the same cart entry instead of adding another.
  // Photos are not stored yet (they only exist in this page's memory), so the draft remembers only how many there were.
  const saveToCart = async () => {
    if (saveState === 'saving') return
    setSaveState('saving')
    const id = draft.savedId ?? newDraftId()
    try {
      await photoStore.flush(copies.map((copy) => copy.key))
      const photoCount = copies.reduce((n, c) => n + photoStore.list(c.key).length, 0)
      const summary = formats
        .filter((f) => draft.picks[f.id])
        .map((f) => {
          const pick = draft.picks[f.id]
          const size = sizesFor(sizes, f).find((s) => s.id === pick.sizeId)
          return `${f.id} · ${size ? `${size.pages} Pages` : 'pages not chosen'} × ${pick.qty}`
        })
        .join(', ')
      await savedDrafts.save({
        id,
        magazineId: magazine.id,
        magazineTitle: magazine.title,
        summary,
        addonCount: draft.addons.length,
        step,
        stepLabel: STEPS[step - 1].label,
        totalSteps: STEPS.length,
        photoCount,
        // Keep image references with the draft. The binary files are stored in IndexedDB.
        draft: {
          ...draft,
          savedId: id,
          photos: Object.fromEntries(copies.map((copy) => [copy.key, {
            ...(draft.photos[copy.key] ?? {}),
            files: photoStore.list(copy.key).map(({ id: photoId, name, size, type, storageKey }) => ({ id: photoId, name, size, type, storageKey })),
          }])),
        },
      })
      update((d) => ({ ...d, savedId: id }))
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  const validators = [
    () => validateMagazine({ picks: draft.picks, formats }),
    () => validateCustomize({ copies, customs: draft.customs, occasions }),
    () => ({}),
    () => validateDelivery({ delivery: draft.delivery, settings, now }),
    () => validateContact({ contact: draft.contact }),
  ]

  const focusFirst = (errs) => {
    const first = Object.keys(errs)[0]
    setTimeout(() => {
      const el = document.querySelector(`[data-field="${first}"]`)
      el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      el?.querySelector('input,textarea,select,button')?.focus({ preventScroll: true })
    }, 0)
  }

  const submit = async () => {
    if (submitting.current) return
    // Check every step again, so nothing incomplete can slip through a shortcut or an old draft
    for (let i = 0; i < validators.length; i++) {
      const errs = validators[i]()
      if (Object.keys(errs).length) {
        setParams({ step: i + 1 })
        setErrors(errs)
        setSubmitError('Some details are missing. We took you back to the step that needs fixing.')
        focusFirst(errs)
        return
      }
    }
    submitting.current = true
    setStatus('submitting')
    setSubmitError('')
    try {
      await photoStore.flush(copies.map((copy) => copy.key))
      // Keep one request key across retries so a timed-out response cannot create a duplicate.
      submissionKey.current ??= globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const order = buildMagazineOrder({ id: '', draft, copies, occasions, addons: chosenAddons, magazine, totals, settings, now, longDate })

      // The order must be saved before anything else happens. If saving fails we land in the catch below:
      // no success screen, no message opened, and the draft is kept so the customer can try again.
      const savedOrder = await ordersApi.place(order, submissionKey.current)

      // The order is placed, so its saved cart draft is no longer needed
      if (draft.savedId) await savedDrafts.remove(draft.savedId).catch(() => {})
      orderDraft.clear()
      setResult({ order: savedOrder })
      setStatus('done')
    } catch (error) {
      console.error('Magazine order submission failed:', error)
      submitting.current = false
      setStatus('error')
      const detail = error?.code === 'permission-denied'
        ? 'Firebase denied this order. Please sign in again and check that Firestore rules are deployed.'
        : error?.message || ''
      setSubmitError(`Your order could not be saved, so it has not been placed. Your progress is still here. Please try again.${detail ? ` (${detail})` : ''}`)
    }
  }

  const next = () => {
    if (status === 'submitting') return
    if (step === STEPS.length) return submit()
    const errs = validators[step - 1]()
    if (Object.keys(errs).length) {
      setErrors(errs)
      focusFirst(errs)
      return
    }
    setErrors({})
    if (returnToReviewFrom === step) {
      setReturnToReviewFrom(null)
      setParams({ step: STEPS.length })
      return
    }
    update((d) => ({ ...d, reached: Math.max(d.reached, step + 1) }))
    setParams({ step: step + 1 })
  }
  const back = () => (step === 1 ? navigate(`/magazines/${magazine.id}`) : goTo(step - 1))

  if (status === 'done' && result)
    return (
      <div className="bg-cream py-10 sm:py-16">
        <Container>
          <Success orderId={result.order.id} />
        </Container>
      </div>
    )

  if (!photosReady) return <p className="py-32 text-center text-ink/60">Restoring your saved photos…</p>

  const ctx = { magazine, sizes, addons, chosenAddons, addonsFailed, occasions, settings, formats, copies, draft, update, errors, clear, totals, now, goTo, editFromReview, submitError }
  const StepView = STEP_COMPONENTS[step - 1]
  const heading = HEADINGS[step - 1]
  const last = step === STEPS.length
  const busy = status === 'submitting'

  return (
    <div className="bg-cream pb-32 pt-6 sm:pt-10 lg:pb-16">
      <Container>
        <PageNav trail={[{ label: 'Magazines', to: '/magazines' }, { label: magazine.title, to: `/magazines/${magazine.id}` }, { label: 'Order' }]} />
        <div ref={topRef} className="scroll-mt-4" />
        <h1 className="mt-6 font-serif text-3xl sm:text-5xl">Order your magazine</h1>
        <p className="mt-2 text-ink/70">It only takes a few minutes. Your answers are saved as you go.</p>

        <div className="mt-6 rounded-2xl border border-sand bg-white p-4 shadow-sm sm:p-6">
          <Stepper steps={STEPS} current={step} reached={draft.reached} onGo={goTo} />
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              next()
            }}
          >
            <div className="mb-5">
              <h2 className="font-serif text-2xl sm:text-3xl">{heading.title}</h2>
              <p className="mt-1 text-ink/70">{heading.text}</p>
            </div>
            {saveState === 'saved' && (
              <p
                role="status"
                className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              >
                <CheckCircle2 size={18} className="shrink-0" />
                <span>Saved to your cart. You can finish this order later from the cart.</span>
                <Link to="/cart" className="font-semibold underline">
                  Go to cart
                </Link>
              </p>
            )}
            {saveState === 'error' && (
              <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                We could not save your progress. Please keep this page open: if you leave now, what you have entered may be lost.
              </p>
            )}
            {Object.keys(errors).length > 0 && (
              <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Please fix the highlighted fields to continue.
              </p>
            )}

            <StepView ctx={ctx} />

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand bg-white/95 px-3 py-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <div className="mx-auto flex max-w-[1488px] items-center gap-2 sm:px-2 lg:gap-3 lg:px-0">
                <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 max-[460px]:px-3" onClick={back} disabled={busy}>
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 max-[460px]:px-3" onClick={saveToCart} disabled={busy || saveState === 'saving'}>
                  <ShoppingCart size={16} />
                  <span className="max-[460px]:sr-only">{saveState === 'saving' ? 'Saving…' : 'Save to Cart'}</span>
                </Button>
                <div className="mr-auto shrink-0 leading-tight lg:hidden">
                  <p className="text-xs text-ink/60">Total</p>
                  <p className="text-lg font-extrabold">{formatPrice(totals.total)}</p>
                </div>
                <Button type="submit" className="ml-auto shrink-0 gap-2 whitespace-nowrap shadow-lg disabled:opacity-70 max-[460px]:px-3 max-[460px]:text-sm" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Placing your order…
                    </>
                  ) : last ? (
                    <>
                      <Send size={18} /> Place order
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </div>
            </div>
            {last && <p className="mt-3 text-center text-xs text-ink/60 lg:text-right">Placing the order opens a ready message with your order details to send us. Nothing is charged online.</p>}
          </form>

          {!last && (
            <aside className="rounded-2xl border border-sand bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <PriceSummary copies={copies} addons={chosenAddons} totals={totals} location={draft.delivery.location} />
              {settings.deliveryNote && <p className="mt-4 text-xs leading-5 text-ink/55">{settings.deliveryNote}</p>}
            </aside>
          )}
        </div>
      </Container>
    </div>
  )
}

export default function OrderPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const magazine = useAsync(() => getMagazine(id), [id])
  const sizes = useAsync(getSizes)
  const addons = useAsync(getActiveAddons)
  const occasions = useAsync(getOccasions)
  const settings = useAsync(getOrderSettings)
  const profile = useAsync(() => customerProfileApi.get(user?.uid), [user?.uid])
  // ?draft=ID is a link from the cart that resumes a saved draft
  const [search] = useSearchParams()
  const resumeId = search.get('draft')
  const resume = useAsync(() => (resumeId ? savedDrafts.get(resumeId) : Promise.resolve(null)), [resumeId])

  const parts = [magazine, sizes, occasions, settings]
  if (parts.some((p) => p.loading) || addons.loading || resume.loading || profile.loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  if (parts.some((p) => p.error))
    return (
      <div className="py-32 text-center">
        <p className="text-ink/70">We could not load the order form.</p>
        <Button className="mt-4" onClick={() => parts.forEach((p) => p.reload())}>
          Try again
        </Button>
      </div>
    )
  if (!magazine.data) return <p className="py-32 text-center text-ink/60">Magazine not found.</p>
  if (!sizes.data.length) return <p className="py-32 text-center text-ink/60">No sizes are available to order right now.</p>
  if (!getFormats(settings.data).some((f) => sizesFor(sizes.data, f).length)) return <Navigate to={`/magazines/${id}`} replace />

  return (
    <Wizard
      key={magazine.data.id}
      magazine={magazine.data}
      sizes={sizes.data}
      addons={addons.data ?? []}
      addonsFailed={Boolean(addons.error)}
      occasions={occasions.data.map(withFields)}
      settings={settings.data}
      customerProfile={profile.data || {}}
      customerEmail={user?.email || ''}
      resumeDraft={resume.data?.magazineId === magazine.data.id ? resume.data : null}
    />
  )
}
