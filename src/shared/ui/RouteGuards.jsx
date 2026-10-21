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

