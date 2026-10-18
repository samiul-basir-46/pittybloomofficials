import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import Button from '../shared/ui/Button'
import Field from './Field'
import useAsync from '../shared/hooks/useAsync'
import { getOrderSettings, orderSettingsApi } from '../shared/services/contentService'
import { ORDER_DEFAULTS } from '../pages/order/data'
import { parseRushRules } from '../pages/order/lib/pricing'

function Group({ title, hint, children }) {
  return (
    <section className="space-y-5 rounded-2xl border border-sand bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-serif text-xl">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-ink/50">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

const NUMBERS = ['a4MaxPages', 'a5MaxPages', 'maxCopies', 'insideDhakaCharge', 'outsideDhakaCharge', 'cutoffHour', 'outsideMinDays']

// Checks the form and returns the first problem in plain words, or '' when it is fine.
const check = (f) => {
  const bad = NUMBERS.find((k) => !Number.isFinite(f[k]) || f[k] < 0)
  if (bad) return 'Numbers cannot be empty or negative.'
  if (f.a4MaxPages % 4 || f.a5MaxPages % 4 || f.a4MaxPages < 4 || f.a5MaxPages < 4) return 'Page limits must be multiples of 4.'
  if (f.maxCopies < 1) return 'Copies per size must be at least 1.'
  if (f.cutoffHour > 24) return 'The cut-off hour must be between 0 and 24.'
  if (f.outsideMinDays < 1) return 'Outside Dhaka needs at least 1 day.'
  const lines = f.rushRules.split('\n').filter((l) => l.trim())
  if (parseRushRules(f.rushRules).length !== lines.length) return 'Rush rules: use one rule per line, like  1 | 100  (days | extra charge).'
  return ''
}

export default function OrderSettingsPage() {
  const { data } = useAsync(getOrderSettings)
  const [saved, setSaved] = useState(null)
  const [form, setForm] = useState(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) {
      setSaved(data)
      setForm(data)
    }
  }, [data])
  if (!form) return <p className="py-10 text-center text-ink/60">Loading…</p>

  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const set = (key) => (value) => {
    setStatus('')
    setForm({ ...form, [key]: value })
  }
  const num = (key, label, extra = {}) => <Field label={label} type="number" value={form[key]} onChange={set(key)} {...extra} />
  const problem = check(form)

  const submit = async (e) => {
    e.preventDefault()
    if (problem) return setStatus('invalid')
    setSaving(true)
    try {
      await orderSettingsApi.save(form)
      setSaved(form)
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }
  const restore = () => {
    if (!window.confirm('Put every order setting back to its original value?')) return
    setStatus('')
    setForm({ ...ORDER_DEFAULTS })
  }

  return (
    <form onSubmit={submit} className="space-y-6 pb-24">
      <div>
        <h1 className="font-serif text-3xl">Order Settings</h1>
        <p className="mt-1 text-sm text-ink/60">
          Controls the magazine order form. Page counts and prices are in Sizes &amp; Pricing, and the occasion questions are in Occasions.
        </p>
      </div>

      <Group title="Magazine sizes" hint="The A4 and A5 cards on the first step.">
        <Field label="A4 name" value={form.a4Label} onChange={set('a4Label')} />
        <Field label="A4 short description" value={form.a4Note} onChange={set('a4Note')} />
        {num('a4MaxPages', 'A4 maximum pages')}
        <Field label="A5 name" value={form.a5Label} onChange={set('a5Label')} />
        <Field label="A5 short description" value={form.a5Note} onChange={set('a5Note')} />
        {num('a5MaxPages', 'A5 maximum pages')}
        {num('maxCopies', 'Most copies of one size in a single order')}
      </Group>

      <Group title="Delivery charges">
        {num('insideDhakaCharge', 'Inside Dhaka (BDT)')}
        {num('outsideDhakaCharge', 'Outside Dhaka (BDT)')}
      </Group>

      <Group title="Delivery dates" hint="Customers pick their date on a calendar. Dates that are too soon are greyed out.">
        <Field
          label="Rush charges for Inside Dhaka, one per line: days from the order date | extra charge"
          type="textarea"
          rows={3}
          value={form.rushRules}
          onChange={set('rushRules')}
        />
        {num('cutoffHour', 'Orders placed from this hour count from the next day (0–24 clock, 18 is 6:00 PM)')}
        {num('outsideMinDays', 'Earliest delivery for Outside Dhaka, in days from the order date')}
        <Field label="Extra sentence shown under the calendar" value={form.standardNote} onChange={set('standardNote')} />
      </Group>

      <Group title="Texts customers see">
        <Field label="Photos step: what to do with the photos" type="textarea" rows={3} value={form.photosNote} onChange={set('photosNote')} />
        <Field label="Notes field title" value={form.notesLabel} onChange={set('notesLabel')} />
        <Field label="Notes field help text" value={form.notesHint} onChange={set('notesHint')} />
      </Group>

      <Button type="button" variant="outline" size="sm" onClick={restore}>
        Restore original values
      </Button>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-white/95 px-5 py-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Button type="submit" size="sm" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {dirty && !status && <span className="text-sm text-amber-600">Unsaved changes</span>}
          {status === 'saved' && !dirty && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check size={16} /> Saved
            </span>
          )}
          {(status === 'invalid' || (dirty && problem)) && <span className="text-sm text-red-500">{problem}</span>}
          {status === 'error' && <span className="text-sm text-red-500">Could not save. Browser storage may be full.</span>}
        </div>
      </div>
    </form>
  )
}
