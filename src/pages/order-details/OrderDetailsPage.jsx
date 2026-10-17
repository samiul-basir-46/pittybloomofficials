import { useRef } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import SmartImage from '../../shared/ui/SmartImage'
import PageNav from '../../shared/ui/PageNav'
import useAsync from '../../shared/hooks/useAsync'
import { useCart } from '../../shared/context/CartContext'
import { draft } from '../../shared/services/draft'
import { getActiveAddons, getMagazine, getSizes } from '../../shared/services/contentService'
import { magazineLine } from '../magazine-detail/data'
import { getAddonDetailRows, getMagazineDetailSections } from './data'
import { formatPrice } from '../../shared/utils/format'

function Rows({ rows }) {
  return (
    <dl className="divide-y divide-sand">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-6 py-3 text-sm">
          <dt className="text-ink/60">{r.label}</dt>
          <dd className="text-right font-medium">
            {r.value}
            {r.sample && <span className="ml-2 rounded-full bg-accent/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand">Sample</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-sand bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-2 font-serif text-xl">{title}</h2>
      {children}
    </section>
  )
}

function Details({ magazine, size, addons, selection }) {
  const navigate = useNavigate()
  const { put } = useCart()
  const done = useRef(false)

  const chosen = selection
    .map((s) => ({ addon: addons.find((a) => a.id === s.id), qty: s.qty }))
    .filter((s) => s.addon)
  const addonTotal = chosen.reduce((sum, s) => sum + s.addon.price * s.qty, 0)

  // Moves the selection into the cart, then on to the existing checkout. The ref blocks double clicks,
  // and put() sets exact quantities, so repeating this step can never duplicate an item.
  const proceed = () => {
    if (done.current) return
    done.current = true
    put(magazineLine(magazine, size), { keepHigher: true })
    chosen.forEach(({ addon, qty }) =>
      put({
        kind: 'addon',
        id: addon.id,
        optionId: 'default',
        name: addon.name,
        image: addon.image,
        optionLabel: 'Add-on',
        price: addon.price,
        qty,
        to: '/',
      }),
    )
    draft.clear()
    navigate('/cart')
  }

  return (
    <div className="bg-cream py-8 sm:py-12">
      <Container>
        <PageNav
          trail={[
            { label: 'Magazines', to: '/magazines' },
            { label: magazine.title, to: `/magazines/${magazine.id}` },
            { label: 'Details' },
          ]}
        />
        <h1 className="mt-8 font-serif text-4xl sm:text-5xl">Review your order</h1>
        <p className="mt-2 text-ink/60">Step 2 of 3: check the details, then continue to checkout.</p>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <Section title="Magazine details">
              <div className="mb-4 flex items-center gap-4">
                <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-sand">
                  <SmartImage src={magazine.image} alt={magazine.title} />
                </div>
                <div>
                  <p className="text-lg font-bold">{magazine.title}</p>
                  <p className="text-sm text-ink/60">{size.pages} Pages</p>
                </div>
              </div>
              {getMagazineDetailSections(magazine, size).map((s) => (
                <div key={s.title} className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand">{s.title}</p>
                  <Rows rows={s.rows} />
                </div>
              ))}
            </Section>

            {chosen.length > 0 && (
              <Section title="Your add-ons">
                <ul className="divide-y divide-sand">
                  {chosen.map(({ addon, qty }) => (
                    <li key={addon.id} className="flex gap-4 py-4 first:pt-2 last:pb-0">
                      <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-sand">
                        <SmartImage src={addon.image} alt={addon.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold">{addon.name}</p>
                          {addon.price > 0 && <p className="font-bold">{formatPrice(addon.price * qty)}</p>}
                        </div>
                        <p className="text-sm text-ink/60">Quantity: {qty}</p>
                        <Rows rows={getAddonDetailRows(addon)} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          <aside className="space-y-4 rounded-2xl border border-sand bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <h2 className="font-serif text-2xl">Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink/60">
                  {magazine.title} ({size.pages} Pages)
                </dt>
                <dd className="font-semibold">{formatPrice(size.price)}</dd>
              </div>
              {chosen.map(({ addon, qty }) => (
                <div key={addon.id} className="flex justify-between">
                  <dt className="text-ink/60">
                    {addon.name} × {qty}
                  </dt>
                  <dd className="font-semibold">{addon.price > 0 ? formatPrice(addon.price * qty) : '—'}</dd>
                </div>
              ))}
              <div className="flex justify-between">
                <dt className="text-ink/60">Delivery</dt>
                <dd className="text-ink/60">Confirmed on order</dd>
              </div>
              <div className="flex justify-between border-t border-sand pt-3 text-lg">
                <dt className="font-semibold">Total</dt>
                <dd className="font-extrabold">{formatPrice(size.price + addonTotal)}</dd>
              </div>
            </dl>
            <Button className="w-full gap-2 shadow-lg" onClick={proceed}>
              Continue to checkout <ArrowRight size={18} />
            </Button>
            <Link to={`/magazines/${magazine.id}`} className="block text-center text-sm font-medium text-brand hover:underline">
              ← Change selection
            </Link>
          </aside>
        </div>
      </Container>
    </div>
  )
}

export default function OrderDetailsPage() {
  const { id } = useParams()
  const magazine = useAsync(() => getMagazine(id), [id])
  const sizes = useAsync(getSizes)
  const addons = useAsync(getActiveAddons)
  const selection = draft.get()

  // Opened directly (or after checkout): there is no selection to show, so go back and let them pick.
  if (!selection || selection.magazineId !== id) return <Navigate to={`/magazines/${id}`} replace />
  if (magazine.loading || sizes.loading || addons.loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  const size = sizes.data?.find((s) => s.id === selection.sizeId)
  if (!magazine.data || !size) return <Navigate to={`/magazines/${id}`} replace />

  return <Details magazine={magazine.data} size={size} addons={addons.data ?? []} selection={selection.addons ?? []} />
}
