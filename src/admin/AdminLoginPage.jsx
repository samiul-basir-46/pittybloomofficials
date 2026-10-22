import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { useAdminAuth } from './AdminAuthContext'

const safeDestination = (value) => value?.startsWith('/admin') && value !== '/admin/login' ? value : '/admin'

function readableError(error) {
  const code = error?.code || ''
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code)) return 'Email or password is incorrect.'
  if (code === 'auth/operation-not-allowed') return 'Email and password sign-in is not enabled for this admin account.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a little and try again.'
  return error?.message || 'Could not sign in. Please try again.'
}

export default function AdminLoginPage() {
  const { user, isAdmin, loading, configured, signInWithPassword, signOut } = useAdminAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const destination = safeDestination(params.get('next'))

  useEffect(() => {
    if (!loading && user && isAdmin) navigate(destination, { replace: true })
  }, [destination, isAdmin, loading, navigate, user])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const credential = await signInWithPassword(email, password)
      if (!new Set((import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((value) => value.trim().toLowerCase())).has(credential.user.email?.toLowerCase())) {
        await signOut()
        throw new Error('This email does not have admin access.')
      }
      setPassword('')
      navigate(destination, { replace: true })
    } catch (cause) {
      setError(readableError(cause))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-sand bg-white p-6 shadow-sm sm:p-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-ink/65 hover:text-brand"><ArrowLeft size={16} /> Visit homepage</Link>
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><LockKeyhole size={22} /></div>
        <h1 className="font-serif text-3xl">Admin sign in</h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">Use your admin email and password to manage orders.</p>

        {!configured && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Admin sign-in is unavailable because Firebase is not configured.</p>}
        {user && !isAdmin && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This account does not have admin access. Sign out and use the admin email instead.<button type="button" onClick={() => signOut()} className="ml-2 font-semibold underline">Sign out</button></div>}
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Email
            <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-sand px-3.5 outline-none focus:border-brand" placeholder="admin@example.com" />
          </label>
          <label className="block text-sm font-medium">Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-sand px-3.5 outline-none focus:border-brand" placeholder="Your password" />
          </label>
          <button type="submit" disabled={!configured || submitting} className="min-h-12 w-full rounded-xl bg-brand px-4 font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )
}
