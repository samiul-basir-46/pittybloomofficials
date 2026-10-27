// Admin magazine previews are stored in Cloudflare R2 through the media Worker.
import { adminAuth } from './firebaseClient'
const MEDIA_API = import.meta.env.VITE_MEDIA_API_URL?.replace(/\/$/, '')
const newKey = () => `book-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
export const originalBookUrl = (key) => MEDIA_API && key ? `${MEDIA_API}/books/${key}/source` : ''
// `revision` changes whenever an admin edits pages of an existing book, so browsers never keep showing an old page.
export const bookPageUrl = (key, page, revision) => MEDIA_API && key ? `${MEDIA_API}/books/${key}/pages/${page}${revision ? `?v=${revision}` : ''}` : ''

async function ensureMediaApi() {
  if (!MEDIA_API) throw new Error('Cloudflare media storage is not configured. Set VITE_MEDIA_API_URL.')
}

async function adminAuthorization() {
  if (!adminAuth?.currentUser) throw new Error('Sign in to the admin dashboard before managing book previews.')
  return `Bearer ${await adminAuth.currentUser.getIdToken()}`
}

export const bookStore = {
  // Always the current stored page (bypasses every cache); used when pages are re-ordered or removed.
  async getPageBlob(key, pageNumber) {
    await ensureMediaApi()
    const response = await fetch(`${MEDIA_API}/books/${key}/pages/${pageNumber}?fresh=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Could not read page ${pageNumber} (error ${response.status}).`)
    return response.blob()
  },
  async updatePage(key, pageNumber, page) {
    await ensureMediaApi()
    const response = await fetch(`${MEDIA_API}/books/${key}/pages/${pageNumber}`, {
      method: 'PUT',
      headers: { Authorization: await adminAuthorization(), 'Content-Type': page.type || 'image/jpeg' },
      body: page,
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.error || `Could not save page ${pageNumber}.`)
    }
  },
  async updateManifest(key, manifest) {
    await ensureMediaApi()
    const response = await fetch(`${MEDIA_API}/books/${key}/manifest`, {
      method: 'PUT',
      headers: { Authorization: await adminAuthorization(), 'Content-Type': 'application/json' },
      body: JSON.stringify(manifest),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.error || 'Could not save the book preview details.')
    }
  },
  async save(pages, metadata, sourceFile, onProgress) {
    const key = newKey()
    await ensureMediaApi()
    const authorization = await adminAuthorization()
    let uploaded = 0
    let sourceUploadId = ''
    try {
      if (sourceFile) {
        // R2 multipart uploads send bounded chunks through Workers, so one large
        // PDF never has to fit inside a single Cloudflare request body.
        const sourcePath = `${MEDIA_API}/books/${key}/source`
        const started = await fetch(`${sourcePath}/multipart`, {
          method: 'POST',
          headers: { Authorization: authorization },
        })
        const startedResult = await started.json().catch(() => null)
        if (!started.ok || !startedResult?.uploadId) {
          if (started.status === 404) {
            throw new Error('PDF upload endpoint is missing on the live Worker. Deploy the latest media Worker, then rebuild and deploy the website.')
          }
          throw new Error(startedResult?.error || 'Could not start uploading the original PDF.')
        }
        sourceUploadId = startedResult.uploadId
        const chunkSize = 32 * 1024 * 1024
        const parts = []
        for (let offset = 0, partNumber = 1; offset < sourceFile.size; offset += chunkSize, partNumber += 1) {
          const response = await fetch(`${sourcePath}/part?uploadId=${encodeURIComponent(sourceUploadId)}&partNumber=${partNumber}`, {
            method: 'PUT',
            headers: { Authorization: authorization, 'Content-Type': 'application/octet-stream' },
            body: sourceFile.slice(offset, Math.min(offset + chunkSize, sourceFile.size)),
          })
          const result = await response.json().catch(() => null)
          if (!response.ok || !result?.part) throw new Error(result?.error || `Could not upload PDF part ${partNumber}.`)
          parts.push(result.part)
        }
        const completed = await fetch(`${sourcePath}/complete`, {
          method: 'POST',
          headers: { Authorization: authorization, 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: sourceUploadId, parts }),
        })
        const completedResult = await completed.json().catch(() => null)
        if (!completed.ok) throw new Error(completedResult?.error || 'Could not finish uploading the original PDF.')
        sourceUploadId = ''
      }
      // A few pages at a time avoids holding a large PDF's full upload queue in memory.
      for (let start = 0; start < pages.length; start += 3) {
        await Promise.all(pages.slice(start, start + 3).map(async (page, offset) => {
          const response = await fetch(`${MEDIA_API}/books/${key}/pages/${start + offset + 1}`, {
            method: 'PUT',
          headers: { Authorization: authorization, 'Content-Type': page.type || 'image/png' },
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
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...metadata, pageCount: pages.length, sourceAvailable: Boolean(sourceFile) }),
      })
      if (!manifest.ok) {
        const result = await manifest.json().catch(() => null)
        throw new Error(result?.error || 'Could not finish saving the PDF upload.')
      }
      return key
    } catch (error) {
      if (sourceUploadId) {
        await fetch(`${MEDIA_API}/books/${key}/source/multipart?uploadId=${encodeURIComponent(sourceUploadId)}`, {
          method: 'DELETE',
          headers: { Authorization: authorization },
        }).catch(() => {})
      }
      await this.remove(key).catch(() => {})
      throw error
    }
  },
  async get(key, pageCount, onProgress) {
    if (!MEDIA_API) throw new Error('Cloudflare media storage is not configured.')
    let done = 0
    return Promise.all(Array.from({ length: pageCount }, async (_, index) => {
      // Stable R2 URLs can be reused from the browser cache on repeat visits.
      const response = await fetch(`${MEDIA_API}/books/${key}/pages/${index + 1}`, { cache: 'force-cache' })
      if (!response.ok) throw new Error(`Could not load preview page ${index + 1} from Cloudflare R2.`)
      const blob = await response.blob()
      onProgress?.(++done)
      return blob
    }))
  },
  async list() {
    await ensureMediaApi()
    const response = await fetch(`${MEDIA_API}/books`, { headers: { Authorization: await adminAuthorization() } })
    if (!response.ok) throw new Error('Could not load uploaded PDFs from Cloudflare R2.')
    const result = await response.json()
    return result.books ?? []
  },
  async remove(key) {
    if (!key || !MEDIA_API) return
    await ensureMediaApi()
    const response = await fetch(`${MEDIA_API}/books/${key}`, { method: 'DELETE', headers: { Authorization: await adminAuthorization() } })
    if (!response.ok) throw new Error('Could not remove the old PDF preview from Cloudflare R2.')
  },
}
