import { AlertCircle, Copy } from 'lucide-react'
import { Card, Field, Input, Notice, controlClass } from '../components/FormField'
import { copyTitle } from '../lib/copies'

export default function CustomizeStep({ ctx }) {
  const { copies, occasions, draft, update, errors, clear, settings } = ctx
  const quick = occasions.filter((o) => o.quick === 'Yes')

  const setCustom = (key, patch) =>
    update((d) => ({
      ...d,
      customs: { ...d.customs, [key]: { occasionId: '', values: {}, notes: '', ...d.customs[key], ...patch } },
    }))
  const setValue = (key, fieldId, value) => {
    clear(`${key}.${fieldId}`)
    setCustom(key, { values: { ...draft.customs[key]?.values, [fieldId]: value } })
  }
  const first = copies[0]
  const firstCustom = first && draft.customs[first.key]

  if (occasions.length === 0)
    return <Notice tone="warn">Occasions are not set up yet, so there is nothing to fill in here. You can continue.</Notice>

  return (
    <div className="space-y-6">
      {copies.map((copy) => {
        const custom = draft.customs[copy.key] ?? { occasionId: '', values: {}, notes: '' }
        const occasion = occasions.find((o) => o.id === custom.occasionId)
        return (
          <Card key={copy.key} aria-label={copyTitle(copy)}>
            <div className="flex items-center gap-3 border-b border-sand pb-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{copy.number}</span>
              <h2 className="font-bold">{copyTitle(copy)}</h2>
            </div>

            {copy.number > 1 && firstCustom?.occasionId && (
              <button
                type="button"
                onClick={() =>
                  setCustom(copy.key, { occasionId: firstCustom.occasionId, values: { ...firstCustom.values }, notes: firstCustom.notes })
                }
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-sand bg-cream px-4 py-2 text-sm font-medium hover:bg-sand"
              >
                <Copy size={14} /> Fill with the same details as Book #{first.number}
              </button>
            )}

            <div data-field={`${copy.key}.occasion`} className="mt-5">
              <p className="text-sm font-semibold">
                What is the occasion? <span className="text-heart">*</span>
              </p>
              <p className="mb-3 text-xs text-ink/60">This decides which questions we ask next.</p>
              <div role="radiogroup" aria-label="Occasion" className="grid grid-cols-3 gap-2">
                {quick.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={custom.occasionId === o.id}
                    onClick={() => {
                      clear(`${copy.key}.occasion`)
                      setCustom(copy.key, { occasionId: o.id })
                    }}
                    className={`rounded-xl border-2 px-2 py-3 text-sm font-semibold transition ${
                      custom.occasionId === o.id ? 'border-brand bg-cream shadow' : 'border-sand bg-white hover:border-brand/40'
                    }`}
                  >
                    <span aria-hidden="true">{o.emoji}</span> {o.label}
                  </button>
                ))}
              </div>
              <select
                aria-label="Or choose another occasion"
                className={`${controlClass(errors[`${copy.key}.occasion`])} mt-3`}
                value={custom.occasionId}
                onChange={(e) => {
                  clear(`${copy.key}.occasion`)
                  setCustom(copy.key, { occasionId: e.target.value })
                }}
              >
                <option value="" disabled>
                  — Or choose any other occasion —
                </option>
                {occasions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.emoji} {o.label}
                  </option>
                ))}
              </select>
              {errors[`${copy.key}.occasion`] && (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle size={15} /> {errors[`${copy.key}.occasion`]}
                </p>
              )}
            </div>

            {occasion && (
              <div className="mt-5 space-y-4 rounded-2xl border border-brand/20 bg-cream/60 p-4 sm:p-5">
                <div>
                  <h3 className="font-bold">
                    {occasion.emoji} Details for your {occasion.label} magazine
                  </h3>
                  <p className="text-xs text-ink/60">Fields marked * are required. Everything else is optional.</p>
                </div>
                {occasion.fields.map((f) => (
                  <Input
                    key={f.id}
                    name={`${copy.key}.${f.id}`}
                    label={f.label}
                    required={f.required}
                    type={f.type}
                    placeholder={f.placeholder}
                    value={custom.values?.[f.id] ?? ''}
                    error={errors[`${copy.key}.${f.id}`]}
                    onChange={(v) => setValue(copy.key, f.id, v)}
                  />
                ))}
                <Input
                  name={`${copy.key}.notes`}
                  label={settings.notesLabel}
                  hint={settings.notesHint}
                  multiline
                  rows={4}
                  placeholder="Write cute notes, sweet messages, memorable captions, quotes or wishes to include in the magazine pages…"
                  value={custom.notes ?? ''}
                  onChange={(v) => setCustom(copy.key, { notes: v })}
                />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
