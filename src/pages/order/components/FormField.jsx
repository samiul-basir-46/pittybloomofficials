import { AlertCircle } from 'lucide-react'

export const controlClass = (error) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition placeholder:text-ink/35 focus:ring-2 ${
    error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-mist focus:border-brand focus:ring-brand/15'
  }`

// Label (with a clear required / optional marker), optional help text, the control, and the error beside it.
export function Field({ name, label, required, hint, error, htmlFor, children }) {
  const Label = htmlFor ? 'label' : 'p'
  return (
    <div data-field={name}>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label}
        {required ? (
          <span className="ml-1 text-heart" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-ink/50">(optional)</span>
        )}
      </Label>
      {hint && <p className="mb-2 text-xs leading-5 text-ink/60">{hint}</p>}
      {children}
      {error && (
        <p id={`e-${name}`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({ name, label, required, hint, error, multiline, onChange, ...props }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <Field name={name} label={label} required={required} hint={hint} error={error} htmlFor={`f-${name}`}>
      <Tag
        id={`f-${name}`}
        name={name}
        className={controlClass(error)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `e-${name}` : undefined}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </Field>
  )
}

export const Card = ({ className = '', children, ...props }) => (
  <section className={`rounded-2xl border border-sand bg-white p-5 shadow-sm sm:p-6 ${className}`} {...props}>
    {children}
  </section>
)

export const Notice = ({ tone = 'info', children }) => (
  <p
    className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
      tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-sand bg-cream text-ink/75'
    }`}
  >
    {children}
  </p>
)
