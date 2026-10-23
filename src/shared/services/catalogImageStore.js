import { adminAuth } from './firebaseClient'

const MEDIA_API = import.meta.env.VITE_MEDIA_API_URL?.replace(/\/$/, '')
const newImageId = () => crypto.randomUUID().replaceAll('-', '')

export async function uploadCatalogImage(dataUrl) {
  if (!MEDIA_API) throw new Error('Cloudflare image storage is not configured.')
  if (!adminAuth?.currentUser) throw new Error('Sign in to the admin account before uploading an image.')

  const blob = await fetch(dataUrl).then((response) => response.blob())
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image.')
  }

  const id = newImageId()
  const token = await adminAuth.currentUser.getIdToken()
  const response = await fetch(`${MEDIA_API}/catalog-images/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': blob.type },
    body: blob,
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error || 'Could not upload the image to Cloudflare.')
  return `${MEDIA_API}/catalog-images/${id}`
}

export async function deleteCatalogImage(imageUrl) {
  if (!MEDIA_API || !imageUrl) return
  let pathname
  try { pathname = new URL(imageUrl).pathname } catch { return }
  const match = pathname.match(/\/catalog-images\/([a-zA-Z0-9_-]{8,80})$/)
  if (!match) return
  if (!adminAuth?.currentUser) throw new Error('Sign in to the admin account before removing an image.')
  const token = await adminAuth.currentUser.getIdToken()
  const response = await fetch(`${MEDIA_API}/catalog-images/${match[1]}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok && response.status !== 404) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.error || 'Could not remove the image from Cloudflare.')
  }
}
