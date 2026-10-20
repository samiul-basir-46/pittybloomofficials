import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import Container from '../shared/ui/Container'
import Button from '../shared/ui/Button'
import { useAuth } from '../shared/context/AuthContext'

const safeDestination = (value) => value?.startsWith('/admin') ? value : '/admin'

function readableError(error) {
  if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password' || error?.code === 'auth/user-not-found') return 'Email or password is incorrect.'
  if (error?.code === 'auth/operation-not-allowed') return 'Email/password sign-in is not enabled in Firebase Authentication.'
  if (error?.code === 'auth/too-many-requests') return 'Too many attempts. Wait a little and try again.'
  return error?.message || 'Could not sign in. Please try again.'
}

export default function AdminLoginPage() {
  const { user, isAdmin, loading, configured, signInWithPassword, signOut } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const next = safeDestination(params.get('next'))

  useEffect(() => {
    if (!loading && user && isAdmin) navigate(next, { replace: true })
  }, [loading, user, isAdmin, next, navigate])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signInWithPassword(email, password)
      setPassword('')
    } catch (e) {
      setError(readableError(e))
    } finally {
      setBusy(false)
    }
  }

  return <div className="bg-cream py-12 sm:py-16">
    <Container>
      <section className="mx-auto max-w-lg rounded-2xl border border-sand bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-cream text-ink"><LockKeyhole size={19} /></span>
          <div>
            <h1 className="font-serif text-3xl">Admin sign in</h1>
            <p className="mt-1 text-sm text-ink/60">Use your administrator email and password.</p>
          </div>
        </div>

        {!configured ? <p role="alert" className="mt-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Firebase is not configured. Check the Firebase values in <code>.env</code>.</p> : <>
          {params.has('denied') && <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This account is not authorized to open the Admin Panel.</p>}
          {user && !isAdmin && !loading && <div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <p>Signed in as {user.email}, but this account does not have admin access.</p>
            <button type="button" className="mt-2 font-semibold underline" onClick={() => signOut()}>Sign out and switch account</button>
          </div>}
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium text-ink">
              Email
              <input className="mt-1 w-full rounded-lg border border-sand px-3 py-2.5 font-normal outline-none focus:border-ink" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block text-sm font-medium text-ink">
              Password
              <input className="mt-1 w-full rounded-lg border border-sand px-3 py-2.5 font-normal outline-none focus:border-ink" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" type="submit" disabled={busy || loading}>{busy ? 'Signing in…' : 'Sign in to Admin Panel'}</Button>
          </form>
        </>}
      </section>
    </Container>
  </div>
}
