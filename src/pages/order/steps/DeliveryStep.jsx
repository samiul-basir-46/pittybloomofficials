import { CalendarDays, Info } from 'lucide-react'
import { formatPrice } from '../../../shared/utils/format'
import { Card, Field, Input, Notice } from '../components/FormField'
import Calendar from '../components/Calendar'
import { checkDate, longDate, orderingDay, rushSentence, toISO } from '../lib/pricing'

export const LOCATIONS = [
  { id: 'inside', label: 'Inside Dhaka', icon: '🏙️', chargeKey: 'insideDhakaCharge' },
  { id: 'outside', label: 'Outside Dhaka', icon: '🚚', chargeKey: 'outsideDhakaCharge' },
]

export { longDate }

export default function DeliveryStep({ ctx }) {
  const { draft, update, errors, clear, settings, now, totals, cartMode } = ctx
  const d = draft.delivery
  const set = (key) => (value) => {
    clear(key)
    update((x) => ({ ...x, delivery: { ...x.delivery, [key]: value } }))
  }
  const chooseLocation = (id) => {
    clear('location', 'date')
    update((x) => {
      const stillOk = x.delivery.date && checkDate(x.delivery.date, id, settings, now).allowed
      return { ...x, delivery: { ...x.delivery, location: id, date: stillOk ? x.delivery.date : '' } }
    })
  }
  const rule = rushSentence(settings, formatPrice)
  const picked = d.date && d.location ? checkDate(d.date, d.location, settings, now) : null

  return (
    <div className="space-y-6">
      <Card>
        {!cartMode && <><h2 className="text-lg font-bold">Who should we deliver to?</h2>
        <p className="mt-1 text-sm text-ink/60">The person who will receive the magazine.</p></>}
        {cartMode && <h2 className="text-lg font-bold">Delivery area</h2>}
        <div className="mt-5 space-y-4">
          {!cartMode && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="phone"
              label="Contact number"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              hint="The courier will call this number."
              value={d.phone}
              error={errors.phone}
              onChange={set('phone')}
            />
            <Input
              name="recipient"
              label="Recipient name"
              autoComplete="name"
              placeholder="e.g. Sarah / Recipient's name"
              value={d.recipient}
              onChange={set('recipient')}
            />
          </div>
          <Input
            name="address"
            label="Full address"
            required
            autoComplete="street-address"
            placeholder="House/Flat no., Road, Area/Village"
            value={d.address}
            error={errors.address}
            onChange={set('address')}
          />
          <Input
            name="city"
            label="City / District"
            required
            autoComplete="address-level2"
            placeholder="e.g. Dhaka, Cumilla, Chattogram…"
            value={d.city}
            error={errors.city}
            onChange={set('city')}
          />
          </>}
          <Field name="location" label="Delivery location" required error={errors.location} hint="This sets your delivery charge.">
            <div role="radiogroup" aria-label="Delivery location" className="grid grid-cols-2 gap-3">
              {LOCATIONS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={d.location === l.id}
                  onClick={() => chooseLocation(l.id)}
                  className={`rounded-2xl border-2 px-3 py-4 text-center transition ${
                    d.location === l.id ? 'border-brand bg-cream shadow' : 'border-sand bg-white hover:border-brand/40'
                  }`}
                >
                  <span className="block text-lg" aria-hidden="true">
                    {l.icon}
                  </span>
                  <span className="block font-semibold">{l.label}</span>
                  <span className="block text-sm text-warm">{formatPrice(Number(settings[l.chargeKey]) || 0)}</span>
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <CalendarDays size={20} className="text-brand" /> {cartMode ? 'Choose a delivery date for your magazine' : 'When do you need the magazine?'}
        </h2>
        {(rule || settings.standardNote) && (
          <p className="mt-3 flex gap-2 rounded-xl border border-sand bg-cream px-4 py-3 text-sm leading-6 text-ink/75">
            <Info size={16} className="mt-1 shrink-0 text-brand" />
            <span>
              {rule} {settings.standardNote}
            </span>
          </p>
        )}
        <div className="mt-4">
          <Field
            name="date"
            label="Delivery date"
            required
            error={errors.date}
            hint={d.location ? 'Tap a date. Dates with an extra charge show it under the number.' : 'Choose your delivery location above first.'}
          >
            <Calendar
              key={d.location || 'none'}
              value={d.date}
              disabled={!d.location}
              startISO={orderingDay(now, settings.cutoffHour)}
              todayISO={toISO(now)}
              getInfo={(iso) => checkDate(iso, d.location, settings, now)}
              onChange={set('date')}
            />
          </Field>
          {picked?.allowed && (
            <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" aria-live="polite">
              <strong>{longDate(d.date)}</strong>
              {totals.rushCharge > 0
                ? ` · Rush delivery charge +${formatPrice(totals.rushCharge)}`
                : ' · No rush charge'}
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
