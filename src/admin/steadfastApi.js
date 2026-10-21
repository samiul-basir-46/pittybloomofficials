const MEDIA_API = import.meta.env.VITE_MEDIA_API_URL?.replace(/\/$/, '')

export async function createSteadfastConsignment(details) {
  if (!MEDIA_API) throw new Error('Courier API is not configured. Set VITE_MEDIA_API_URL and try again.')
  const response = await fetch(`${MEDIA_API}/steadfast/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Steadfast dispatch failed. Please try again.')
  return result
}
