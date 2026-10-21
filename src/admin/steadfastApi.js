import { auth } from '../shared/services/firebaseClient'

const MEDIA_API = import.meta.env.VITE_MEDIA_API_URL?.replace(/\/$/, '')

export async function createSteadfastConsignment(details) {
  if (!MEDIA_API) throw new Error('Courier API is not configured. Set VITE_MEDIA_API_URL and try again.')
  if (!auth?.currentUser) throw new Error('Sign in to the admin account before dispatching an order.')
  const token = await auth.currentUser.getIdToken()
  const response = await fetch(`${MEDIA_API}/steadfast/dispatch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Steadfast dispatch failed. Please try again.')
  return result
}
