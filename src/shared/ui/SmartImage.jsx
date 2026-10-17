const fallback = (text, size) =>
  `https://placehold.co/${size}/f0e4e7/6b3f45?text=${encodeURIComponent(text)}`

export default function SmartImage({ src, alt, className = '', placeholder = '600x750' }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`h-full w-full object-cover ${className}`}
      onError={(e) => {
        e.currentTarget.onerror = null
        e.currentTarget.src = fallback(alt, placeholder)
      }}
    />
  )
}
