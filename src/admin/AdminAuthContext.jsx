import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { adminAuth, firebaseConfigured } from '../shared/services/firebaseClient'

const AdminAuthContext = createContext(null)
const ADMIN_EMAILS = new Set((import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean))

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(firebaseConfigured)

  useEffect(() => {
    if (!firebaseConfigured || !adminAuth) return
    return onAuthStateChanged(adminAuth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  const isAdmin = Boolean(user?.email && ADMIN_EMAILS.has(user.email.toLowerCase()))
  const value = useMemo(() => ({
    user,
    loading,
    configured: firebaseConfigured,
    isAdmin,
    signInWithPassword: async (email, password) => {
      if (!firebaseConfigured || !adminAuth) throw new Error('Firebase config is missing. Add the VITE_FIREBASE_* values to .env.')
      return signInWithEmailAndPassword(adminAuth, email.trim(), password)
    },
    signOut: async () => { if (adminAuth) await signOut(adminAuth) },
  }), [user, loading, isAdmin])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export const useAdminAuth = () => useContext(AdminAuthContext) ?? {
  user: null,
  loading: false,
  configured: firebaseConfigured,
  isAdmin: false,
  signInWithPassword: async () => { throw new Error('Wrap the admin route in AdminAuthProvider before signing in.') },
  signOut: async () => {},
}
