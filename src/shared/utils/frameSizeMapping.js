export const frameDimensions = (value = '') => {
  const match = String(value).match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i)
  if (!match) return ''
  return [Number(match[1]), Number(match[2])].sort((a, b) => a - b).join('x')
}

export const frameSizeIdFor = (frame, options = []) => {
  const explicit = String(frame?.sizeId || '')
  if (explicit && options.some((option) => option.id === explicit)) return explicit
  const dimensions = frameDimensions(`${frame?.title || ''} ${frame?.description || ''}`)
  if (!dimensions) return ''
  const matches = options.filter((option) => frameDimensions(option.label) === dimensions)
  return matches.length === 1 ? matches[0].id : ''
}
