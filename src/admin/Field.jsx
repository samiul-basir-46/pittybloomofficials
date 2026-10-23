import ImageField from './ImageField'
import PdfField from './PdfField'
import GalleryField from './GalleryField'
import { inputClass } from './classes'

export default function Field({ label, type = 'text', value, onChange, options = [], rows = 5, required }) {
  const handle = (e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)
  let control

  if (type === 'image') {
    control = <ImageField value={value} onChange={onChange} />
  } else if (type === 'gallery') {
    control = <GalleryField value={value} onChange={onChange} />
  } else if (type === 'pdf') {
    control = <PdfField value={value} onChange={onChange} />
  } else if (type === 'textarea') {
    control = <textarea rows={rows} className={inputClass} value={value ?? ''} onChange={handle} required={required} />
  } else if (type === 'select') {
    control = (
      <select className={inputClass} value={value ?? ''} onChange={handle}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o || 'None'}
          </option>
        ))}
      </select>
    )
  } else {
    control = <input type={type} className={inputClass} value={value ?? ''} onChange={handle} required={required} />
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {control}
    </div>
  )
}
