import { Card, Input } from '../components/FormField'

// The heading and the line under it ("Your Info" / "Please provide your contact information…") come from OrderPage.
export default function ContactStep({ ctx }) {
  const { draft, update, errors, clear } = ctx
  const c = draft.contact
  const set = (key, errorKey = key) => (value) => {
    clear(errorKey)
    update((d) => ({ ...d, contact: { ...d.contact, [key]: value } }))
  }

  return (
    <Card>
      <p className="text-sm text-ink/60">This is your own contact information, not the person receiving the magazine.</p>
      <div className="mt-5 space-y-4">
        <Input name="name" label="Your Name" required autoComplete="name" placeholder="e.g. Fahim Ahmed" value={c.name} error={errors.name} onChange={set('name')} />
        <div>
          <Input
            name="contactPhone"
            label="Your WhatsApp Number"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            hint="We will message you on this number about your order. A number outside Bangladesh can be written like +14155550123."
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
          name="instagram"
          label="Your Instagram Username"
          required
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="@yourusername"
          hint="Just your username, for example @pittybloomofficials. Please do not paste a link."
          value={c.instagram ?? ''}
          error={errors.instagram}
          onChange={set('instagram')}
        />
        <Input
          name="email"
          label="Email"
          type="email"
          autoComplete="off"
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
