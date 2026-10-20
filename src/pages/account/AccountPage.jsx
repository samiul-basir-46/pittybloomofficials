import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn, LogOut } from 'lucide-react'
import Container from '../../shared/ui/Container'
import Button from '../../shared/ui/Button'
import { useAuth } from '../../shared/context/AuthContext'

export default function AccountPage() {
  const { user, loading, configured, signInWithGoogle, signOut } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const next = params.get('next')

  useEffect(() => {
    if (user && next) navigate(next.startsWith('/') ? next : '/cart', { replace: true })
  }, [user, next, navigate])

  const login = async () => {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(e?.code === 'auth/popup-closed-by-user' ? 'Sign-in was cancelled.' : e.message || 'Google sign-in failed. Please try again.')
    } finally { setBusy(false) }
  }

  return <div className="bg-cream py-12 sm:py-16">
    <Container>
      <section className="mx-auto max-w-lg rounded-2xl border border-sand bg-white p-6 shadow-sm sm:p-8">
        <h1 className="font-serif text-3xl">Your account</h1>
        {loading ? <p className="mt-4 text-sm text-ink/60">Checking sign-in…</p> : user ? <>
          <p className="mt-4 text-sm text-ink/60">Signed in with Google</p>
          <p className="mt-1 font-semibold">{user.displayName || user.email}</p>
          <p className="text-sm text-ink/60">{user.email}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/cart')}>Go to cart</Button>
            <Button variant="outline" className="gap-2" onClick={() => signOut()}><LogOut size={16} /> Sign out</Button>
          </div>
        </> : <>
          <p className="mt-3 text-sm leading-6 text-ink/65">Sign in with Google to save magazine drafts, upload photos and submit orders across your devices.</p>
          <Button className="mt-6 w-full gap-2" onClick={login} disabled={busy || !configured}>
            <LogIn size={17} /> {busy ? 'Opening Google sign-in…' : 'Continue with Google'}
          </Button>
          {!configured && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Firebase is not configured yet. Add the Firebase web app values to <code>.env</code> after setup.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </>}
      </section>
    </Container>
  </div>
}
