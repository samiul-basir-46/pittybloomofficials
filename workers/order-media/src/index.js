const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
let cachedJwks = null
let cachedJwksAt = 0

const json = (body, status, cors = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
})
const decode = (value) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))))
const bytes = (value) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const MAX_IMAGE_BYTES = 20 * 1024 * 1024

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
  const allowed = (env.APP_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean)
  if (!allowed.includes(origin)) return null
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env)
    if (!cors) return json({ error: 'Origin is not allowed.' }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const url = new URL(request.url)
    // Book previews are public product content, so customers can read them without signing in.
    const publicPage = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/pages\/(\d{1,5})$/)
    if (request.method === 'GET' && publicPage) {
      const object = await env.MEDIA_BUCKET.get(`books/${publicPage[1]}/pages/${publicPage[2]}`)
      if (!object) return json({ error: 'Book page not found.' }, 404, cors)
      const headers = new Headers(cors)
      object.writeHttpMetadata(headers)
      headers.set('Cache-Control', 'public, max-age=3600')
      return new Response(object.body, { headers })
    }

    const claims = await verifyFirebaseToken(request, env).catch(() => null)
    if (!claims) return json({ error: 'A valid Firebase sign-in is required.' }, 401, cors)

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
      if (!Number.isInteger(manifest.pageCount) || manifest.pageCount < 4 || manifest.pageCount % 4 !== 0
        || !Number.isFinite(manifest.ratio) || manifest.ratio <= 0) return json({ error: 'Invalid book details.' }, 400, cors)
      const record = {
        key: manifestPath[1],
        pageCount: manifest.pageCount,
        ratio: manifest.ratio,
        name: String(manifest.name || 'Book PDF').slice(0, 180),
        uploadedAt: new Date().toISOString(),
      }
      await env.MEDIA_BUCKET.put(`books/${record.key}/manifest.json`, JSON.stringify(record), {
        httpMetadata: { contentType: 'application/json', cacheControl: 'private, no-store' },
      })
      return json({ book: record }, 201, cors)
    }

    const uploadPage = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/pages\/(\d{1,5})$/)
    if (request.method === 'PUT' && uploadPage) {
      if (!request.headers.get('Content-Type')?.startsWith('image/')) return json({ error: 'A rendered book page image is required.' }, 415, cors)
      try {
        await env.MEDIA_BUCKET.put(`books/${uploadPage[1]}/pages/${uploadPage[2]}`, request.body, {
          httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=3600' },
          customMetadata: { ownerUid: claims.sub },
        })
      } catch (error) {
        console.error('Cloudflare R2 book page upload failed', error)
        return json({ error: 'Cloudflare R2 could not store a book page.' }, 502, cors)
      }
      return json({ ok: true }, 201, cors)
    }
    const deleteBook = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})$/)
    if (request.method === 'DELETE' && deleteBook) {
      const prefix = `books/${deleteBook[1]}/pages/`
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
      if (length > MAX_IMAGE_BYTES) return json({ error: 'Images must be 20 MB or smaller.' }, 413, cors)
      const id = url.pathname.split('/').pop()
      const key = `users/${claims.sub}/images/${id}`
      let image
      try { image = await readLimitedBody(request.body) } catch (error) {
        console.error('Could not read uploaded image body', error)
        return json({ error: 'Could not read the uploaded image. Please retry.' }, 400, cors)
      }
      if (image === null) return json({ error: 'Images must be 20 MB or smaller.' }, 413, cors)
      if (!image.byteLength) return json({ error: 'The uploaded image is empty.' }, 400, cors)
      const encodedName = request.headers.get('X-File-Name') || ''
      let fileName = 'image'
      try { fileName = decodeURIComponent(encodedName).slice(0, 180) || fileName } catch { /* ignore malformed names */ }
      try {
        // A Uint8Array carries its exact length. Browsers do not expose a way to
        // set Content-Length on fetch requests, which can make streamed R2 puts fail.
        await env.MEDIA_BUCKET.put(key, image, {
          httpMetadata: { contentType, cacheControl: 'private, no-store' },
          customMetadata: { ownerUid: claims.sub, fileName },
        })
      } catch (error) {
        console.error('Cloudflare R2 image upload failed', error)
        return json({ error: 'Cloudflare R2 could not store the uploaded image.' }, 502, cors)
      }
      return json({ key }, 201, cors)
    }

    if (request.method === 'GET' && url.pathname === '/media') {
      const key = url.searchParams.get('key') || ''
      const match = key.match(/^users\/([A-Za-z0-9_-]{1,128})\/images\/([a-zA-Z0-9_-]{8,80})$/)
      if (!match || (match[1] !== claims.sub && !isAdmin(claims, env))) return json({ error: 'Photo not found.' }, 404, cors)
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
