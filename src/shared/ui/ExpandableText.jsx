import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Shows text exactly as typed in the admin (line breaks, blank lines, bullets, emoji) and folds it to the first
// few lines with a "See more" toggle, which only appears when the text is actually longer than that.
export default function ExpandableText({ text, lines = 3, className = '' }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const value = String(text ?? '').replace(/\r\n?/g, '\n').trim()

  useLayoutEffect(() => {
    const node = ref.current
    if (!node || open) return undefined
    const measure = () => setOverflowing(node.scrollHeight - node.clientHeight > 1)
    measure()
    return undefined
  }, [value, open, lines])

  useEffect(() => {
    const node = ref.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => { if (!open) setOverflowing(node.scrollHeight - node.clientHeight > 1) })
    observer.observe(node)
    return () => observer.disconnect()
  }, [open, value])

  if (!value) return null
  const clamp = { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, overflow: 'hidden' }
  return <div className={className}>
    <p ref={ref} className="whitespace-pre-line break-words text-left" style={open ? undefined : clamp}>{value}</p>
    {(overflowing || open) && <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="mt-2 text-sm font-semibold text-brand underline-offset-2 hover:underline">{open ? 'See less' : 'See more'}</button>}
  </div>
}
