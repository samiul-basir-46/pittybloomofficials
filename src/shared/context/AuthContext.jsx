import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'
import { auth, firebaseConfigured, googleProvider } from '../services/firebaseClient'

const AuthContext = createContext(null)
const ADMIN_EMAILS = new Set((import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean))

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(firebaseConfigured)

  useEffect(() => {
    if (!firebaseConfigured) return
    let active = true
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return
      setLoading(true)
      setUser(nextUser)
      if (!nextUser) { setLoading(false); return }
      setLoading(false)
    })
    return () => { active = false; unsubscribe() }
  }, [])

  const isAdmin = Boolean(user?.email && ADMIN_EMAILS.has(user.email.toLowerCase()))
  const value = useMemo(() => ({
    user, loading, configured: firebaseConfigured, isAdmin,
    signInWithPassword: async (email, password) => {
      if (!firebaseConfigured) throw new Error('Firebase config is missing. Add the VITE_FIREBASE_* values to .env.')
      return signInWithEmailAndPassword(auth, email.trim(), password)
    },
    signInWithGoogle: async () => { if (!firebaseConfigured) throw new Error('Firebase config is missing. Add the VITE_FIREBASE_* values to .env.') ; return signInWithPopup(auth, googleProvider) },
    signOut: async () => { if (firebaseConfigured) await signOut(auth) },
  }), [user, loading, isAdmin])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext) ?? {
  user: null,
  loading: false,
  isAdmin: false,
  configured: firebaseConfigured,
  signInWithPassword: async () => { throw new Error('Wrap the app in AuthProvider before signing in.') },
  signInWithGoogle: async () => { throw new Error('Wrap the app in AuthProvider before signing in.') },
  signOut: async () => {},
}
