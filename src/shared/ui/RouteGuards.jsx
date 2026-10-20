import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Loading() { return <p className="py-32 text-center text-ink/60">Checking account…</p> }

export function RequireCustomer({ children }) {
  const auth = useAuth()
  const location = useLocation()
  if (!auth.configured) return children
  if (auth.loading) return <Loading />
  if (!auth.user) return <Navigate to={`/account?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return children
}

export function RequireAdmin({ children }) {
  const auth = useAuth()
  if (!auth.configured) return <p role="alert" className="mx-auto max-w-xl px-6 py-24 text-center text-ink/70">Admin access is locked because Firebase authentication is not configured.</p>
  if (auth.loading) return <Loading />
  if (!auth.user) return <Navigate to="/admin/login?next=%2Fadmin" replace />
  if (!auth.isAdmin) return <Navigate to="/admin/login?denied=1" replace />
  return children
}
