// Photo limits come from Admin > Mini pocket magazines. Max empty / 0 means "no upper limit".
export const photoRule = (item) => {
  const min = Math.max(1, Math.floor(Number(item?.minPhotos)) || 1)
  const rawMax = Math.floor(Number(item?.maxPhotos)) || 0
  const max = rawMax >= min ? rawMax : 0
  const summary = max ? (max === min ? `Upload exactly ${min} photo${min === 1 ? '' : 's'}.` : `Upload ${min} to ${max} photos.`) : `Upload at least ${min} photo${min === 1 ? '' : 's'} (no upper limit).`
  const check = (count) => count < min ? `Add at least ${min} photo${min === 1 ? '' : 's'} (you added ${count}).` : max && count > max ? `You can add up to ${max} photos (you added ${count}).` : ''
  return { min, max, summary, check }
}
