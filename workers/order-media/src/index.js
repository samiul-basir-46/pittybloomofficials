const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
import { handleGuestMedia, handleGuestOrder } from './guestOrders.js'
let cachedJwks = null
let cachedJwksAt = 0

const json = (body, status, cors = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
})
const decode = (value) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))))
const bytes = (value) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_ORDER_PHOTO_BYTES = 100 * 1024 * 1024 // customer order photos are stored exactly as uploaded

async function readLimitedBody(stream) {
  if (!stream) return new Uint8Array(0)
  const reader = stream.getReader()
  const chunks = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

async function getJwks() {
  if (cachedJwks && Date.now() - cachedJwksAt < 50 * 60 * 1000) return cachedJwks
  const response = await fetch(JWKS_URL, { cf: { cacheTtl: 3000, cacheEverything: true } })
  if (!response.ok) throw new Error('Could not load Firebase signing keys')
  cachedJwks = await response.json()
  cachedJwksAt = Date.now()
  return cachedJwks
}

async function verifyFirebaseToken(request, env) {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return null
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.')
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null
  const header = decode(encodedHeader)
  const claims = decode(encodedPayload)
  if (header.alg !== 'RS256' || !header.kid) return null
  const now = Math.floor(Date.now() / 1000)
  if (claims.aud !== env.FIREBASE_PROJECT_ID || claims.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`
    || !claims.sub || claims.sub.length > 128 || claims.exp <= now || claims.iat > now || claims.auth_time > now) return null
  const jwks = await getJwks()
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.use === 'sig')
  if (!jwk) return null
  const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, bytes(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`))
  return valid ? claims : null
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  // Public media is served directly into <img> tags. Those requests normally
  // omit Origin entirely, so allow them without CORS response headers.
  if (!origin) return {}
  const allowed = (env.APP_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean)
  if (!allowed.includes(origin)) return null
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-File-Name',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function isAdmin(claims, env) {
  const allowed = (env.ADMIN_EMAILS || '').toLowerCase().split(',').map((email) => email.trim()).filter(Boolean)
  // The configured admin uses Firebase Email/Password auth, which may have an
  // unverified email claim even though the account is separately admin-approved.
  return allowed.includes(String(claims.email || '').toLowerCase())
}

async function hasAdminRole(request, env, claims) {
  // Admin routes are limited to the one email configured in Wrangler.
  return isAdmin(claims, env)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    let cors = corsHeaders(request, env)
    // Uploaded catalog images, product-card images and book previews are public. Anyone may view them from
    // any site (local dev, preview channels, custom domains); only writes need an allowed origin.
    const isPublicImageRead = ['GET', 'HEAD'].includes(request.method) && /^\/(catalog-images\/|manual-order-cards\/|books\/book-[a-z0-9-]{8,80}\/(pages\/\d{1,5}|source)$)/.test(url.pathname)
    if (!cors && isPublicImageRead) cors = { 'Access-Control-Allow-Origin': '*' }
    if (!cors) return json({ error: 'Origin is not allowed.' }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (url.pathname === '/guest-orders' && request.method === 'POST') return handleGuestOrder(request, env, cors)
    const manualCardImage = url.pathname.match(/^\/manual-order-cards\/(polaroids|frames|miniMagazines|magazines|songBooks)$/)
    if (manualCardImage && request.method === 'GET') {
      const object = await env.MEDIA_BUCKET.get(`manual-order-cards/${manualCardImage[1]}`)
      if (!object) return json({ error: 'No product card image has been uploaded yet.' }, 404, cors)
      const headers = new Headers(cors)
      object.writeHttpMetadata(headers)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      return new Response(object.body, { headers })
    }
    if (manualCardImage && ['PUT', 'DELETE'].includes(request.method)) {
      const adminClaims = await verifyFirebaseToken(request, env).catch(() => null)
      if (!adminClaims || !await hasAdminRole(request, env, adminClaims)) return json({ error: 'Admin access is required to manage product card images.' }, 403, cors)
      const key = `manual-order-cards/${manualCardImage[1]}`
      if (request.method === 'DELETE') {
        await env.MEDIA_BUCKET.delete(key)
        return json({ ok: true }, 200, cors)
      }
      const contentType = request.headers.get('Content-Type')?.split(';')[0]?.trim() || ''
      const length = Number(request.headers.get('Content-Length') || 0)
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) return json({ error: 'Choose a JPG, PNG, or WebP image.' }, 415, cors)
      if (length > 10 * 1024 * 1024) return json({ error: 'Card images must be 10 MB or smaller.' }, 413, cors)
      const image = await readLimitedBody(request.body)
      if (image === null || image.byteLength > 10 * 1024 * 1024) return json({ error: 'Card images must be 10 MB or smaller.' }, 413, cors)
      if (!image.byteLength) return json({ error: 'The selected image is empty.' }, 400, cors)
      await env.MEDIA_BUCKET.put(key, image, {
        httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
      })
      return json({ ok: true }, 201, cors)
    }
    const catalogImage = url.pathname.match(/^\/catalog-images\/([a-zA-Z0-9_-]{8,80})$/)
    if (catalogImage && request.method === 'GET') {
      const object = await env.MEDIA_BUCKET.get(`catalog-images/${catalogImage[1]}`)
      if (!object) return json({ error: 'Image not found.' }, 404, cors)
      const headers = new Headers(cors)
      object.writeHttpMetadata(headers)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      headers.set('Content-Disposition', 'inline')
      headers.set('X-Content-Type-Options', 'nosniff')
      return new Response(object.body, { headers })
    }
    if (catalogImage && ['PUT', 'DELETE'].includes(request.method)) {
      const adminClaims = await verifyFirebaseToken(request, env).catch(() => null)
      if (!adminClaims || !await hasAdminRole(request, env, adminClaims)) return json({ error: 'Admin access is required to manage catalog images.' }, 403, cors)
      const key = `catalog-images/${catalogImage[1]}`
      if (request.method === 'DELETE') {
        await env.MEDIA_BUCKET.delete(key)
        return json({ ok: true }, 200, cors)
      }
      const contentType = request.headers.get('Content-Type')?.split(';')[0]?.trim() || ''
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) return json({ error: 'Choose a JPG, PNG, or WebP image.' }, 415, cors)
      const image = await readLimitedBody(request.body)
      if (image === null || image.byteLength > 10 * 1024 * 1024) return json({ error: 'Images must be 10 MB or smaller.' }, 413, cors)
      if (!image.byteLength) return json({ error: 'The uploaded image is empty.' }, 400, cors)
      await env.MEDIA_BUCKET.put(key, image, {
        httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
      })
      return json({ ok: true }, 201, cors)
    }
    if (url.pathname === '/guest-media' && request.method === 'GET') {
      const adminClaims = await verifyFirebaseToken(request, env).catch(() => null)
      if (!adminClaims || !await hasAdminRole(request, env, adminClaims)) return json({ error: 'Admin access is required to view guest order photos.' }, 403, cors)
      return handleGuestMedia(request, env, url, cors)
    }
    if (url.pathname.startsWith('/guest-media/')) return handleGuestMedia(request, env, url, cors)
    // Book previews are public product content, so customers can read them without signing in.
    const publicPage = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/pages\/(\d{1,5})$/)
    if (request.method === 'GET' && publicPage) {
      const object = await env.MEDIA_BUCKET.get(`books/${publicPage[1]}/pages/${publicPage[2]}`)
      if (!object) return json({ error: 'Book page not found.' }, 404, cors)
      const headers = new Headers(cors)
      object.writeHttpMetadata(headers)
      // A book key is never reused for different pages, so browsers and the CDN can keep these for good.
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      return new Response(object.body, { headers })
    }
    const publicSource = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/source$/)
    if (request.method === 'GET' && publicSource) {
      const object = await env.MEDIA_BUCKET.get(`books/${publicSource[1]}/source.pdf`)
      if (!object) return json({ error: 'Original PDF not found.' }, 404, cors)
      const headers = new Headers(cors)
      object.writeHttpMetadata(headers)
      headers.set('Cache-Control', 'public, max-age=3600')
      headers.set('Content-Disposition', 'inline; filename="magazine.pdf"')
      return new Response(object.body, { headers })
    }

    const claims = await verifyFirebaseToken(request, env).catch(() => null)
    const isBookManagementRoute = url.pathname === '/books' || url.pathname.startsWith('/books/')
    const authlessAdminRoute = url.pathname === '/steadfast/dispatch'
      || url.pathname === '/media'
    if (!claims && !authlessAdminRoute) return json({ error: 'A valid Firebase sign-in is required.' }, 401, cors)
    if (isBookManagementRoute && !await hasAdminRole(request, env, claims)) return json({ error: 'Admin access is required to manage book previews.' }, 403, cors)

    if (request.method === 'POST' && url.pathname === '/steadfast/dispatch') {
      if (claims && !await hasAdminRole(request, env, claims)) return json({ error: 'Admin access is required to dispatch orders.' }, 403, cors)
      if (!env.STEADFAST_API_KEY || !env.STEADFAST_SECRET_KEY) {
        return json({ error: 'Steadfast API credentials are not configured on the media Worker.' }, 503, cors)
      }
      let input
      try { input = await request.json() } catch { return json({ error: 'Invalid dispatch details.' }, 400, cors) }
      const invoice = String(input.invoice || '').trim().slice(0, 80)
      const recipientName = String(input.recipient_name || '').trim().slice(0, 100)
      const rawPhone = String(input.recipient_phone || '').replace(/[^\d]/g, '')
      const recipientPhone = rawPhone.startsWith('8801') && rawPhone.length === 13 ? `0${rawPhone.slice(3)}` : rawPhone.slice(0, 20)
      const recipientAddress = String(input.recipient_address || '').trim().slice(0, 250)
      const codAmount = Number(input.cod_amount)
      if (!invoice || !recipientName || recipientPhone.length < 11 || !recipientAddress || !Number.isFinite(codAmount) || codAmount < 0) {
        return json({ error: 'Enter a valid recipient name, phone, address, and COD amount.' }, 400, cors)
      }
      const rawAlternativePhone = String(input.alternative_phone || '').replace(/[^\d]/g, '')
      const payload = {
        invoice,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_address: recipientAddress,
        cod_amount: String(Math.round(codAmount)),
        recipient_email: String(input.recipient_email || '').trim().slice(0, 180),
        alternative_phone: rawAlternativePhone.startsWith('8801') && rawAlternativePhone.length === 13 ? `0${rawAlternativePhone.slice(3)}` : rawAlternativePhone.slice(0, 20),
        item_description: String(input.item_description || 'Customized magazine order').trim().slice(0, 200),
        note: String(input.note || '').trim().slice(0, 250),
      }
      let courierResponse
      try {
        courierResponse = await fetch('https://portal.packzy.com/api/v1/create_order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': env.STEADFAST_API_KEY,
            'secret-key': env.STEADFAST_SECRET_KEY,
          },
          body: JSON.stringify(payload),
        })
      } catch (error) {
        console.error('Steadfast request failed', error)
        return json({ error: 'Could not connect to Steadfast. Please retry.' }, 502, cors)
      }
      const result = await courierResponse.json().catch(() => ({}))
      if (!courierResponse.ok || result.status !== 200 || !result.consignment) {
        const detail = result.errors && typeof result.errors === 'object'
          ? Object.values(result.errors).flat().map(String).join(' ')
          : ''
        const reason = [typeof result.message === 'string' ? result.message : '', detail].filter(Boolean).join(' - ')
        console.error('Steadfast rejected consignment', invoice, courierResponse.status, reason.slice(0, 200))
        return json({ error: (reason || `Steadfast could not create this consignment (HTTP ${courierResponse.status}).`).slice(0, 300) }, 502, cors)
      }
      const trackingUrl = result.tracking_url || result.tracking_link || result.public_tracking_url || result.customer_tracking_url
        || result.consignment.tracking_url || result.consignment.tracking_link || result.consignment.public_tracking_url || result.consignment.customer_tracking_url || ''
      return json({
        tracking_code: String(result.consignment.tracking_code || ''),
        tracking_url: String(trackingUrl),
        tracking_link: String(trackingUrl),
        consignment_id: String(result.consignment.consignment_id || ''),
        consignment: result.consignment,
      }, 201, cors)
    }

    if (request.method === 'GET' && url.pathname === '/books') {
      const books = []
      let cursor
      do {
        const listed = await env.MEDIA_BUCKET.list({ prefix: 'books/', cursor })
        for (const object of listed.objects.filter((item) => item.key.endsWith('/manifest.json'))) {
          const manifest = await env.MEDIA_BUCKET.get(object.key)
          if (!manifest) continue
          try { books.push(await manifest.json()) } catch { /* ignore incomplete manifests */ }
        }
        cursor = listed.truncated ? listed.cursor : undefined
      } while (cursor)
      return json({ books }, 200, cors)
    }

    const manifestPath = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/manifest$/)
    if (request.method === 'PUT' && manifestPath) {
      let manifest
      try { manifest = await request.json() } catch { return json({ error: 'Invalid book details.' }, 400, cors) }
      if (!Number.isInteger(manifest.pageCount) || manifest.pageCount < 1
        || !Number.isFinite(manifest.ratio) || manifest.ratio <= 0) return json({ error: 'Invalid book details.' }, 400, cors)
      const record = {
        key: manifestPath[1],
        pageCount: manifest.pageCount,
        ratio: manifest.ratio,
        name: String(manifest.name || 'Book PDF').slice(0, 180),
        sourceAvailable: manifest.sourceAvailable !== false,
        uploadedAt: new Date().toISOString(),
      }
      await env.MEDIA_BUCKET.put(`books/${record.key}/manifest.json`, JSON.stringify(record), {
        httpMetadata: { contentType: 'application/json', cacheControl: 'private, no-store' },
      })
      return json({ book: record }, 201, cors)
    }

    const sourceMultipart = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/source\/multipart$/)
    if (sourceMultipart && request.method === 'POST') {
      try {
        const upload = await env.MEDIA_BUCKET.createMultipartUpload(`books/${sourceMultipart[1]}/source.pdf`, {
          httpMetadata: { contentType: 'application/pdf', cacheControl: 'public, max-age=3600' },
          customMetadata: { ownerUid: claims?.sub || 'admin' },
        })
        return json({ uploadId: upload.uploadId }, 201, cors)
      } catch (error) {
        console.error('Could not start Cloudflare R2 PDF upload', error)
        return json({ error: 'Could not start the PDF upload.' }, 502, cors)
      }
    }
    if (sourceMultipart && request.method === 'DELETE') {
      const uploadId = url.searchParams.get('uploadId') || ''
      if (!uploadId || uploadId.length > 512) return json({ error: 'Invalid PDF upload session.' }, 400, cors)
      try {
        await env.MEDIA_BUCKET.resumeMultipartUpload(`books/${sourceMultipart[1]}/source.pdf`, uploadId).abort()
        return json({ ok: true }, 200, cors)
      } catch (error) {
        console.error('Could not abort Cloudflare R2 PDF upload', error)
        return json({ error: 'Could not cancel the PDF upload.' }, 502, cors)
      }
    }
    const sourcePart = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/source\/part$/)
    if (request.method === 'PUT' && sourcePart) {
      const uploadId = url.searchParams.get('uploadId') || ''
      const partNumber = Number(url.searchParams.get('partNumber'))
      if (!uploadId || uploadId.length > 512 || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
        return json({ error: 'Invalid PDF upload part.' }, 400, cors)
      }
      if (!request.body) return json({ error: 'The PDF upload part is empty.' }, 400, cors)
      try {
        const part = await env.MEDIA_BUCKET.resumeMultipartUpload(`books/${sourcePart[1]}/source.pdf`, uploadId).uploadPart(partNumber, request.body)
        return json({ part }, 200, cors)
      } catch (error) {
        console.error('Could not upload a Cloudflare R2 PDF part', error)
        return json({ error: `Could not upload PDF part ${partNumber}.` }, 502, cors)
      }
    }
    const sourceComplete = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/source\/complete$/)
    if (request.method === 'POST' && sourceComplete) {
      let body
      try { body = await request.json() } catch { return json({ error: 'Invalid PDF upload completion details.' }, 400, cors) }
      const uploadId = String(body?.uploadId || '')
      const parts = Array.isArray(body?.parts) ? body.parts : []
      if (!uploadId || uploadId.length > 512 || !parts.length || parts.length > 10000) return json({ error: 'Invalid PDF upload completion details.' }, 400, cors)
      const orderedParts = [...parts].sort((a, b) => Number(a.partNumber) - Number(b.partNumber))
      if (orderedParts.some((part, index) => !Number.isInteger(part.partNumber) || part.partNumber !== index + 1 || typeof part.etag !== 'string' || !part.etag)) {
        return json({ error: 'PDF upload parts are incomplete.' }, 400, cors)
      }
      try {
        const object = await env.MEDIA_BUCKET.resumeMultipartUpload(`books/${sourceComplete[1]}/source.pdf`, uploadId).complete(orderedParts)
        return json({ ok: true, size: object.size }, 201, cors)
      } catch (error) {
        console.error('Could not complete Cloudflare R2 PDF upload', error)
        return json({ error: 'Could not finish saving the original PDF.' }, 502, cors)
      }
    }

    const uploadSource = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/source$/)
    if (request.method === 'PUT' && uploadSource) {
      if (request.headers.get('Content-Type') !== 'application/pdf') return json({ error: 'An original PDF file is required.' }, 415, cors)
      if (!request.body) return json({ error: 'The PDF file is empty.' }, 400, cors)
      try {
        await env.MEDIA_BUCKET.put(`books/${uploadSource[1]}/source.pdf`, request.body, {
          httpMetadata: { contentType: 'application/pdf', cacheControl: 'public, max-age=3600' },
          customMetadata: { ownerUid: claims?.sub || 'admin' },
        })
      } catch (error) {
        console.error('Cloudflare R2 original PDF upload failed', error)
        return json({ error: 'Cloudflare R2 could not store the original PDF.' }, 502, cors)
      }
      return json({ ok: true }, 201, cors)
    }

    const uploadPage = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/pages\/(\d{1,5})$/)
    if (request.method === 'PUT' && uploadPage) {
      const contentType = request.headers.get('Content-Type') || ''
      if (!['image/png', 'image/jpeg'].includes(contentType)) return json({ error: 'A rendered book page image is required.' }, 415, cors)
      try {
        await env.MEDIA_BUCKET.put(`books/${uploadPage[1]}/pages/${uploadPage[2]}`, request.body, {
          httpMetadata: { contentType, cacheControl: 'public, max-age=3600' },
          customMetadata: { ownerUid: claims?.sub || 'admin' },
        })
      } catch (error) {
        console.error('Cloudflare R2 book page upload failed', error)
        return json({ error: 'Cloudflare R2 could not store a book page.' }, 502, cors)
      }
      return json({ ok: true }, 201, cors)
    }
    const deleteBook = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})$/)
    if (request.method === 'DELETE' && deleteBook) {
      const prefix = `books/${deleteBook[1]}/`
      let cursor
      do {
        const listed = await env.MEDIA_BUCKET.list({ prefix, cursor })
        if (listed.objects.length) await env.MEDIA_BUCKET.delete(listed.objects.map((object) => object.key))
        cursor = listed.truncated ? listed.cursor : undefined
      } while (cursor)
      await env.MEDIA_BUCKET.delete(`books/${deleteBook[1]}/manifest.json`)
      return json({ ok: true }, 200, cors)
    }

    if (request.method === 'PUT' && /^\/media\/[a-zA-Z0-9_-]{8,80}$/.test(url.pathname)) {
      const contentType = request.headers.get('Content-Type') || ''
      const length = Number(request.headers.get('Content-Length') || 0)
      if (!contentType.startsWith('image/')) return json({ error: 'Only image uploads are accepted.' }, 415, cors)
      if (length > MAX_ORDER_PHOTO_BYTES) return json({ error: 'Images must be 100 MB or smaller.' }, 413, cors)
      const id = url.pathname.split('/').pop()
      const key = claims ? `users/${claims.sub}/images/${id}` : `admin/images/${id}`
      const encodedName = request.headers.get('X-File-Name') || ''
      let fileName = 'image'
      try { fileName = decodeURIComponent(encodedName).slice(0, 180) || fileName } catch { /* ignore malformed names */ }
      const options = {
        httpMetadata: { contentType, cacheControl: 'private, no-store' },
        customMetadata: { ownerUid: claims?.sub || 'admin', fileName },
      }
      try {
        if (length > 0) {
          // Original bytes streamed straight into R2: no resizing, recompression or in-memory copy.
          await env.MEDIA_BUCKET.put(key, request.body, options)
          const stored = await env.MEDIA_BUCKET.head(key)
          if (!stored || stored.size !== length) { await env.MEDIA_BUCKET.delete(key); return json({ error: 'The upload was cut off. Please retry.' }, 502, cors) }
        } else {
          const image = await readLimitedBody(request.body)
          if (image === null) return json({ error: 'This upload could not be sized, so it must be 20 MB or smaller. Please retry.' }, 413, cors)
          if (!image.byteLength) return json({ error: 'The uploaded image is empty.' }, 400, cors)
          await env.MEDIA_BUCKET.put(key, image, options)
        }
      } catch (error) {
        console.error('Cloudflare R2 image upload failed', error)
        return json({ error: 'Cloudflare R2 could not store the uploaded image.' }, 502, cors)
      }
      return json({ key }, 201, cors)
    }

    if (request.method === 'GET' && url.pathname === '/media') {
      const key = url.searchParams.get('key') || ''
      const match = key.match(/^users\/([A-Za-z0-9_-]{1,128})\/images\/([a-zA-Z0-9_-]{8,80})$/)
      if (!match || (claims && match[1] !== claims.sub && !await hasAdminRole(request, env, claims))) return json({ error: 'Photo not found.' }, 404, cors)
      const object = await env.MEDIA_BUCKET.get(key)
      if (!object) return json({ error: 'Photo not found.' }, 404, cors)
      const headers = new Headers(cors)
      object.writeHttpMetadata(headers)
      headers.set('ETag', object.httpEtag)
      headers.set('Cache-Control', 'private, no-store')
      headers.set('Content-Disposition', 'inline')
      return new Response(object.body, { headers })
    }
    return json({ error: 'Not found.' }, 404, cors)
  },
}
