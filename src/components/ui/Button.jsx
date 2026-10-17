const variants = {
  solid: 'bg-brand text-white hover:bg-brand-dark',
  outline: 'border-2 border-brand bg-white text-brand-dark hover:bg-sand',
  light: 'bg-white text-brand hover:bg-sand',
}

const sizes = {
  sm: 'px-5 py-2.5 text-sm',
  md: 'px-8 py-3.5',
}

export default function Button({ as: Tag = 'button', variant = 'solid', size = 'md', className = '', ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-full font-semibold transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}
