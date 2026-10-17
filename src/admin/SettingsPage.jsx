import { useEffect, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import Button from '../shared/ui/Button'
import Field from './Field'
import { useSettings } from '../shared/context/SettingsContext'

const MAX_SLIDES = 5

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

export default function SettingsPage() {
  const { settings, save } = useSettings()
  const [form, setForm] = useState(settings)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => setForm(settings), [settings])

  const dirty = JSON.stringify(form) !== JSON.stringify(settings)
  const info = form.productInfo
  const set = (key) => (value) => {
    setStatus('')
    setForm({ ...form, [key]: value })
  }
  const setAt = (key, i) => (value) => {
    setStatus('')
    setForm({ ...form, [key]: form[key].map((v, n) => (n === i ? value : v)) })
  }
  const setInfo = (key) => (value) => {
    setStatus('')
    setForm({ ...form, productInfo: { ...form.productInfo, [key]: value } })
  }
  const lines = (key) => ({
    type: 'textarea',
    rows: 5,
    value: info[key].join('\n'),
    onChange: (v) => setInfo(key)(v.split('\n')),
  })
  const addSlide = () => setForm({ ...form, heroImages: [...form.heroImages, ''] })
  const removeSlide = (i) => setForm({ ...form, heroImages: form.heroImages.filter((_, n) => n !== i) })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await save({ ...form, heroImages: form.heroImages.filter((s, i) => i === 0 || s) })
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 pb-24">
      <div>
        <h1 className="font-serif text-3xl">Site Settings</h1>
        <p className="mt-1 text-sm text-ink/60">Everything here updates the live site after you save.</p>
      </div>

      <Group title="Brand">
        <Field label="Brand name" value={form.name} onChange={set('name')} required />
        <Field label="Logo" type="image" value={form.logo} onChange={set('logo')} />
        <Field label="Big hero word" value={form.heroWord} onChange={set('heroWord')} required />
      </Group>

      <Group title="Hero" hint="Slideshow images shown at the top of the home page (up to 5).">
        {form.heroImages.map((src, i) => (
          <div key={i} className="relative rounded-xl border border-sand p-4">
            <Field
              label={`Slideshow image ${i + 1}${i === 0 ? '' : ' (optional)'}`}
              type="image"
              value={src}
              onChange={setAt('heroImages', i)}
            />
            {i > 0 && (
              <button
                type="button"
                aria-label="Remove slide"
                onClick={() => removeSlide(i)}
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {form.heroImages.length < MAX_SLIDES && (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addSlide}>
            <Plus size={14} /> Add slide
          </Button>
        )}
        <Field label="Quote line 1" value={form.quote[0]} onChange={setAt('quote', 0)} />
        <Field label="Quote line 2" value={form.quote[1]} onChange={setAt('quote', 1)} />
        <Field label="Button text" value={form.ctaLabel} onChange={set('ctaLabel')} />
        <Field label="Button link (e.g. /magazines)" value={form.ctaLink} onChange={set('ctaLink')} />
      </Group>

      <Group title="Home page">
        <Field label="Best Selling title" value={form.bestSellingTitle} onChange={set('bestSellingTitle')} />
        <Field label="More Products title" value={form.moreProductsTitle} onChange={set('moreProductsTitle')} />
        <Field label="More Products subtitle" value={form.subtitle} onChange={set('subtitle')} />
        <Field label="About title" value={form.aboutTitle} onChange={set('aboutTitle')} />
        <Field
          label="About text (blank line between paragraphs)"
          type="textarea"
          rows={10}
          value={form.about.join('\n\n')}
          onChange={(v) => set('about')(v.split(/\n{2,}/))}
        />
        {form.aboutImages.map((src, i) => (
          <Field key={i} label={`About image ${i + 1}`} type="image" value={src} onChange={setAt('aboutImages', i)} />
        ))}
      </Group>

      <Group title="Magazine pages">
        <Field label="Magazines page title" value={form.magazinesTitle} onChange={set('magazinesTitle')} />
        <Field label="Lines under the price (one per line)" {...lines('notes')} rows={3} />
        <Field label="Text under Buy Now" value={info.buyNote} onChange={setInfo('buyNote')} />
        <Field label="About This Product: intro line" value={info.tagline} onChange={setInfo('tagline')} />
        <Field label="What's included (one per line)" {...lines('included')} />
        <Field label="Things required (one per line)" {...lines('required')} />
        <Field label="Perfect for (one per line)" {...lines('perfectFor')} />
        <Field label="Important information (one per line)" {...lines('important')} />
        <Field label="Privacy note" type="textarea" rows={3} value={info.privacy} onChange={setInfo('privacy')} />
      </Group>

      <Group title="Orders & cart" hint="Orders from the cart open as a ready-made message to this number.">
        <Field label="WhatsApp number with country code (e.g. 8801XXXXXXXXX)" value={form.whatsapp} onChange={set('whatsapp')} />
        <Field label="Note shown in the cart" type="textarea" rows={3} value={form.deliveryNote} onChange={set('deliveryNote')} />
      </Group>

      <Group title="Footer & contact">
        <Field label="Footer text" type="textarea" rows={3} value={form.blurb} onChange={set('blurb')} />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} />
        <Field label="Instagram handle" value={form.instagram} onChange={set('instagram')} />
        <Field label="Instagram link" value={form.instagramUrl} onChange={set('instagramUrl')} />
      </Group>

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
          {status === 'error' && (
            <span className="text-sm text-red-500">Could not save. An image may be too large for browser storage.</span>
          )}
        </div>
      </div>
    </form>
  )
}