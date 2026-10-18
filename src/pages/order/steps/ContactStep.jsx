import { Card, Input } from '../components/FormField'

export default function ContactStep({ ctx }) {
  const { draft, update, errors, clear } = ctx
  const c = draft.contact
  const set = (key, errorKey = key) => (value) => {
    clear(errorKey)
    update((d) => ({ ...d, contact: { ...d.contact, [key]: value } }))
  }

  return (
    <Card>
      <h2 className="text-lg font-bold">About you</h2>
      <p className="mt-1 text-sm text-ink/60">We use this only to confirm your order. This can be different from the delivery person.</p>
      <div className="mt-5 space-y-4">
        <Input name="name" label="Your name" required autoComplete="name" placeholder="e.g. Fahim Ahmed" value={c.name} error={errors.name} onChange={set('name')} />
        <div>
          <Input
            name="contactPhone"
            label="Your phone number"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            hint="Preferably the number you use on WhatsApp."
            value={c.phone}
            error={errors.contactPhone}
            onChange={set('phone', 'contactPhone')}
          />
          {!c.phone && draft.delivery.phone && (
            <button
              type="button"
              onClick={() => set('phone', 'contactPhone')(draft.delivery.phone)}
              className="mt-2 text-sm font-medium text-brand hover:underline"
            >
              Use the delivery number ({draft.delivery.phone})
            </button>
          )}
        </div>
        <Input
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={c.email}
          error={errors.email}
          onChange={set('email')}
        />
        <Input
          name="note"
          label="Anything else we should know?"
          multiline
          rows={3}
          placeholder="e.g. a theme or colour you like, or a message for our team"
          value={c.note}
          onChange={set('note')}
        />
      </div>
    </Card>
  )
}
