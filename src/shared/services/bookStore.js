// Magazine preview pages are stored in Cloudflare R2 through the authenticated media Worker.
import { auth } from './firebaseClient'

const MEDIA_API = import.meta.env.VITE_MEDIA_API_URL?.replace(/\/$/, '')
const newKey = () => `book-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
export const originalBookUrl = (key) => MEDIA_API && key ? `${MEDIA_API}/books/${key}/source` : ''

async function adminToken() {
  if (!MEDIA_API) throw new Error('Cloudflare media storage is not configured. Set VITE_MEDIA_API_URL.')
  if (!auth?.currentUser) throw new Error('Sign in to the admin account before uploading a PDF.')
  return auth.currentUser.getIdToken()
}

export const bookStore = {
  async save(pages, metadata, sourceFile, onProgress) {
    const key = newKey()
    const token = await adminToken()
    let uploaded = 0
    try {
      // Keep the source PDF byte-for-byte so it can always be retrieved without preview conversion.
      const source = await fetch(`${MEDIA_API}/books/${key}/source`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/pdf' },
        body: sourceFile,
      })
      if (!source.ok) {
        const result = await source.json().catch(() => null)
        throw new Error(result?.error || 'Could not store the original PDF.')
      }
      // A few pages at a time avoids holding a large PDF's full upload queue in memory.
      for (let start = 0; start < pages.length; start += 3) {
        await Promise.all(pages.slice(start, start + 3).map(async (page, offset) => {
          const response = await fetch(`${MEDIA_API}/books/${key}/pages/${start + offset + 1}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
            body: page,
          })
          if (!response.ok) {
            const result = await response.json().catch(() => null)
            throw new Error(result?.error || `Could not upload PDF preview page ${start + offset + 1}.`)
          }
          onProgress?.(++uploaded, pages.length)
        }))
      }
      const manifest = await fetch(`${MEDIA_API}/books/${key}/manifest`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...metadata, pageCount: pages.length }),
      })
      if (!manifest.ok) {
        const result = await manifest.json().catch(() => null)
        throw new Error(result?.error || 'Could not finish saving the PDF upload.')
      }
      return key
    } catch (error) {
      await this.remove(key).catch(() => {})
      throw error
    }
  },
  async get(key, pageCount) {
    if (!MEDIA_API) throw new Error('Cloudflare media storage is not configured.')
    return Promise.all(Array.from({ length: pageCount }, async (_, index) => {
      const response = await fetch(`${MEDIA_API}/books/${key}/pages/${index + 1}`)
      if (!response.ok) throw new Error(`Could not load preview page ${index + 1} from Cloudflare R2.`)
      return response.blob()
    }))
  },
  async list() {
    const token = await adminToken()
    const response = await fetch(`${MEDIA_API}/books`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error('Could not load uploaded PDFs from Cloudflare R2.')
    const result = await response.json()
    return result.books ?? []
  },
  async remove(key) {
    if (!key || !MEDIA_API) return
    const token = await adminToken()
    const response = await fetch(`${MEDIA_API}/books/${key}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error('Could not remove the old PDF preview from Cloudflare R2.')
  },
}
