import { AlertCircle, Check, Lightbulb } from 'lucide-react'
import SmartImage from '../../../shared/ui/SmartImage'
import QtyStepper from '../../../shared/ui/QtyStepper'
import { formatPrice } from '../../../shared/utils/format'
import { parseOptions } from '../../../shared/utils/options'
import { Card, Notice } from '../components/FormField'
import { defaultSizeFor, sizesFor } from '../lib/copies'
import { Link } from 'react-router-dom'
import AddonConfigurator, { createAddonDetails } from './AddonConfigurator'

const QUICK = [1, 2, 3, 4]

export default function MagazineStep({ ctx }) {
  const { magazine, sizes, addons, products, addonsFailed, formats, draft, update, errors, clear, settings } = ctx
  const maxCopies = Math.max(1, Number(settings.maxCopies) || 1)

  const toggleFormat = (format) => {
    clear('picks', `pages.${format.id}`)
    update((d) => {
      const picks = { ...d.picks }
      if (picks[format.id]) delete picks[format.id]
      else picks[format.id] = { sizeId: defaultSizeFor(sizes, format).id, qty: 1 }
      return { ...d, picks }
    })
  }
  const setPick = (format, patch) => {
    clear(`pages.${format.id}`)
    update((d) => ({ ...d, picks: { ...d.picks, [format.id]: { ...d.picks[format.id], ...patch } } }))
  }
  const toggleAddon = (addon) => update((d) => {
    if (d.addons.includes(addon.id)) return { ...d, addons: d.addons.filter((id) => id !== addon.id) }
    const product = products.find((item) => item.id === addon.id)
    return { ...d, addons: [...d.addons, addon.id], addonDetails: { ...d.addonDetails, [addon.id]: d.addonDetails?.[addon.id] ?? createAddonDetails(addon, product) } }
  })
  const updateAddon = (id, patch) => update((d) => ({ ...d, addonDetails: { ...d.addonDetails, [id]: { ...d.addonDetails[id], ...patch } } }))

  return (
    <div className="space-y-6">
      <Card className="flex items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-sand sm:size-24">
          <SmartImage src={magazine.image} alt={magazine.title} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Your magazine design</p>
          <p className="truncate font-serif text-2xl">{magazine.title}</p>
          <Link to={`/magazines/${magazine.id}`} className="text-sm font-medium text-brand hover:underline">
            Choose a different design
          </Link>
        </div>
      </Card>

      <Card data-field="picks">
        <h2 className="text-lg font-bold">
          Which size? <span className="text-heart">*</span>
        </h2>
        <p className="mt-1 text-sm text-ink/60">You can order both sizes in the same order.</p>
        {errors.picks && (
          <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle size={15} /> {errors.picks}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2" role="group" aria-label="Magazine size">
          {formats.map((format) => {
            const list = sizesFor(sizes, format)
            const on = Boolean(draft.picks[format.id])
            const disabled = list.length === 0
            return (
              <button
                key={format.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={disabled}
                onClick={() => toggleFormat(format)}
                className={`relative rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  on ? 'border-brand bg-cream shadow' : 'border-sand bg-white hover:border-brand/40'
                }`}
              >
                <span
                  className={`absolute right-3 top-3 grid size-6 place-items-center rounded-full border-2 ${
                    on ? 'border-brand bg-brand text-white' : 'border-mist text-transparent'
                  }`}
                >
                  <Check size={14} />
                </span>
                <p className="text-lg font-bold">{format.label}</p>
                <p className="text-sm text-ink/60">{format.note}</p>
                <p className="mt-2 text-sm font-medium text-warm">
                  {disabled
                    ? 'Not available right now'
                    : `${list[0].pages}–${list[list.length - 1].pages} pages · from ${formatPrice(Math.min(...list.map((s) => s.price)))}`}
                </p>
              </button>
            )
          })}
        </div>

        {formats
          .filter((f) => draft.picks[f.id])
          .map((format) => {
            const pick = draft.picks[format.id]
            const list = sizesFor(sizes, format)
            const size = list.find((s) => s.id === pick.sizeId)
            return (
              <div key={format.id} className="mt-5 rounded-2xl border border-sand bg-cream/50 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{format.label}</h3>
                  {size && <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">✓ {size.pages}p selected</span>}
                </div>

                <div data-field={`pages.${format.id}`} className="mt-4">
                  <p className="text-sm font-semibold">
                    Select page count <span className="text-heart">*</span>
                  </p>
                  <p className="mb-3 text-xs text-ink/60">Choose the total number of pages you want in your magazine.</p>
                  <div role="radiogroup" aria-label={`${format.label} page count`} className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-4">
                    {list.map((s) => {
                      const picked = s.id === pick.sizeId
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={picked}
                          onClick={() => setPick(format, { sizeId: s.id })}
                          className={`relative rounded-xl border-2 px-2 py-3 text-center transition ${
                            picked ? 'border-brand bg-white shadow' : 'border-sand bg-white hover:border-brand/40'
                          }`}
                        >
                          {s.tag && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-brand">
                              {s.tag}
                            </span>
                          )}
                          <span className="block text-base font-bold">{s.pages}p</span>
                          {s.photos && <span className="block text-[11px] text-ink/55">~{s.photos} photos</span>}
                          <span className="mt-1 block text-sm font-semibold text-warm">{formatPrice(s.price)}</span>
                          {s.mrp > s.price && <span className="block text-[11px] text-ink/40 line-through">{formatPrice(s.mrp)}</span>}
                        </button>
                      )
                    })}
                  </div>
                  {errors[`pages.${format.id}`] && (
                    <p role="alert" className="mt-2 text-sm text-red-600">
                      {errors[`pages.${format.id}`]}
                    </p>
                  )}
                </div>

                {size?.photos && (
                  <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                    <Lightbulb size={16} className="shrink-0" /> Recommended photos: <strong>{size.photos}</strong>
                  </p>
                )}

                <div className="mt-5">
                  <p className="text-sm font-semibold">
                    How many {format.label} copies do you need? <span className="text-heart">*</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {QUICK.filter((n) => n <= maxCopies).map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={pick.qty === n}
                        onClick={() => setPick(format, { qty: n })}
                        className={`size-11 rounded-xl border-2 font-bold transition ${
                          pick.qty === n ? 'border-brand bg-brand text-white' : 'border-sand bg-white hover:border-brand/40'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="ml-1 text-sm text-ink/60">or</span>
                    <QtyStepper value={pick.qty} min={1} max={maxCopies} onChange={(qty) => setPick(format, { qty })} />
                  </div>
                  {pick.qty > 1 && <p className="mt-2 text-xs text-ink/60">Each copy gets its own details in the next step.</p>}
                </div>
              </div>
            )
          })}
      </Card>

      {addons.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold">
            Add something extra <span className="ml-1 text-xs font-normal text-ink/50">(optional)</span>
          </h2>
          <p className="mt-1 text-sm text-ink/60">These are sold separately and added to your total. Skip this if you only want the magazine.</p>
          <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {addons.map((a) => {
              const on = draft.addons.includes(a.id)
              const product = products.find((item) => item.id === a.id)
              const selectedOption = parseOptions(product?.options).find((option) => option.id === draft.addonDetails?.[a.id]?.optionId)
              const tilePrice = a.id === 'polaroids' ? Number(product?.unitPrice) || a.price : selectedOption?.price ?? a.price
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleAddon(a)}
                    className={`block w-full overflow-hidden rounded-xl border-2 bg-white text-left transition ${
                      on ? 'border-brand shadow' : 'border-sand hover:border-brand/40'
                    }`}
                  >
                    <div className="relative aspect-square bg-sand">
                      <SmartImage src={a.image} alt={a.name} placeholder="600x600" />
                      <span
                        className={`absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full border-2 ${
                          on ? 'border-brand bg-brand text-white' : 'border-white bg-white/70 text-transparent'
                        }`}
                      >
                        <Check size={12} />
                      </span>
                    </div>
                    <div className={`px-1.5 py-2 text-center ${on ? 'bg-cream' : ''}`}>
                      <p className="truncate text-xs font-semibold">{a.name}</p>
                      {tilePrice > 0 && <p className="mt-0.5 text-xs font-bold text-warm">{formatPrice(tilePrice)}</p>}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          {addons.filter((addon) => draft.addons.includes(addon.id)).map((addon) => <AddonConfigurator key={addon.id} addon={addon} product={products.find((product) => product.id === addon.id)} details={draft.addonDetails?.[addon.id] ?? createAddonDetails(addon, products.find((product) => product.id === addon.id))} onChange={(patch) => updateAddon(addon.id, patch)} error={errors[`addon.${addon.id}`]} />)}
        </Card>
      )}
      {addonsFailed && <Notice tone="warn">We could not load the add-on products. You can still continue without them.</Notice>}
    </div>
  )
}
