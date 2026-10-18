import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import PageNav from '../../shared/ui/PageNav'
import useAsync from '../../shared/hooks/useAsync'
import { useSettings } from '../../shared/context/SettingsContext'
import { getActiveAddons, getMagazine, getOccasions, getOrderSettings, getSizes, ordersApi } from '../../shared/services/contentService'
import { makeOrderId } from '../../shared/utils/orders'
import { formatPrice } from '../../shared/utils/format'
import { STEPS } from './data'
import { buildCopies, defaultSizeFor, getFormats, sizesFor, withFields } from './lib/copies'
import { calcTotals, orderingDay } from './lib/pricing'
import { freshDraft, orderDraft } from './lib/orderDraft'
import { photoStore } from './lib/photoStore'
import { buildMagazineOrder } from './lib/buildOrder'
import { buildOrderMessage } from './lib/message'
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
  { title: 'Your details', text: 'So we can reach you about your order.' },
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
  return { ...draft, picks, addons: draft.addons.filter((id) => addons.some((a) => a.id === id)) }
}

function Wizard({ magazine, sizes, addons, addonsFailed, occasions, settings }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { settings: site } = useSettings()
  const now = useMemo(() => new Date(), [])
  const formats = useMemo(() => getFormats(settings), [settings])
  const topRef = useRef(null)
  const submitting = useRef(false)
  const orderId = useRef(null)

  const [draft, setDraft] = useState(() => {
    const start = freshDraft(
      magazine.id,
      (sizes.find((s) => s.id === 'a4-8') ?? sizes[0]),
    )
    return reconcile(orderDraft.get(magazine.id) ?? start, { sizes, formats, addons, settings })
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | error | done
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState(null)

  // Saved after every change so a refresh keeps the form. Not after the order is placed.
  useEffect(() => {
    if (status !== 'done') orderDraft.set(draft)
  }, [draft, status])

  const step = Math.min(Math.max(1, Number(params.get('step')) || 1), draft.reached)
  useEffect(() => {
    topRef.current?.scrollIntoView?.({ block: 'start' })
  }, [step])

  const update = (fn) => setDraft((d) => fn(d))
  const clear = (...keys) =>
    setErrors((e) => (keys.some((k) => k in e) ? Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))) : e))
  const goTo = (n) => {
    setErrors({})
    setSubmitError('')
    setParams({ step: n })
  }

  const copies = useMemo(() => buildCopies(draft, sizes, formats), [draft, sizes, formats])
  const chosenAddons = useMemo(() => addons.filter((a) => draft.addons.includes(a.id)).map((a) => ({ ...a, qty: 1 })), [addons, draft.addons])
  const totals = calcTotals({ copies, addons: chosenAddons, location: draft.delivery.location, date: draft.delivery.date, settings, now })

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
      const existing = await ordersApi.list()
      // The ID is made once, so retrying after an error can never create a second order
      orderId.current ??= makeOrderId(existing)
      const order = buildMagazineOrder({ id: orderId.current, draft, copies, occasions, addons: chosenAddons, magazine, totals, settings, now, longDate })
      const photoCount = copies.reduce((n, c) => n + photoStore.list(c.key).length, 0)

      // The order is saved first. If browser storage is full the customer can still send the message.
      let saved = true
      try {
        await ordersApi.save(order)
      } catch {
        saved = false
      }
      const text = buildOrderMessage(order, site.name)
      const number = (site.whatsapp || '').replace(/\D/g, '')
      const url = number
        ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
        : `mailto:${site.email}?subject=${encodeURIComponent(`New order ${order.id}`)}&body=${encodeURIComponent(text)}`

      orderDraft.clear()
      setResult({ order, url, saved, photoCount, whatsapp: Boolean(number) })
      setStatus('done')
      if (number) window.open(url, '_blank', 'noopener')
      else window.location.href = url
    } catch {
      submitting.current = false
      setStatus('error')
      setSubmitError('Something went wrong and your order was not sent. Nothing has been lost, so please try again.')
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
    update((d) => ({ ...d, reached: Math.max(d.reached, step + 1) }))
    setParams({ step: step + 1 })
  }
  const back = () => (step === 1 ? navigate(`/magazines/${magazine.id}`) : goTo(step - 1))

  if (status === 'done' && result)
    return (
      <div className="bg-cream py-10 sm:py-16">
        <Container>
          <Success result={result} whatsapp={result.whatsapp} photosNote={settings.photosNote} />
        </Container>
      </div>
    )

  const ctx = { magazine, sizes, addons, chosenAddons, addonsFailed, occasions, settings, formats, copies, draft, update, errors, clear, totals, now, goTo, submitError }
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
            {Object.keys(errors).length > 0 && (
              <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Please fix the highlighted fields to continue.
              </p>
            )}

            <StepView ctx={ctx} />

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand bg-white/95 px-4 py-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <div className="mx-auto flex max-w-[1488px] items-center gap-3 sm:px-2 lg:px-0">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={back} disabled={busy}>
                  <ArrowLeft size={16} /> Back
                </Button>
                <div className="mr-auto leading-tight lg:hidden">
                  <p className="text-xs text-ink/60">Total</p>
                  <p className="text-lg font-extrabold">{formatPrice(totals.total)}</p>
                </div>
                <Button type="submit" className="ml-auto gap-2 shadow-lg disabled:opacity-70" disabled={busy}>
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
  const { id } = useParams()
  const magazine = useAsync(() => getMagazine(id), [id])
  const sizes = useAsync(getSizes)
  const addons = useAsync(getActiveAddons)
  const occasions = useAsync(getOccasions)
  const settings = useAsync(getOrderSettings)

  const parts = [magazine, sizes, occasions, settings]
  if (parts.some((p) => p.loading) || addons.loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
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
    />
  )
}
