import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, firebaseConfigured, googleProvider } from '../services/firebaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(firebaseConfigured)

  useEffect(() => {
    if (!firebaseConfigured) return
    let active = true
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return
      setLoading(true)
      setUser(nextUser)
      setIsAdmin(false)
      if (!nextUser) { setLoading(false); return }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', nextUser.uid))
        if (active) setIsAdmin(adminDoc.exists() && adminDoc.data()?.role === 'admin')
      } catch {
        if (active) setIsAdmin(false)
      } finally {
        if (active) setLoading(false)
      }
    })
    return () => { active = false; unsubscribe() }
  }, [])

  const value = useMemo(() => ({
    user, isAdmin, loading, configured: firebaseConfigured,
    signIn: async () => { if (!firebaseConfigured) throw new Error('Firebase config is missing. Add the VITE_FIREBASE_* values to .env.') ; return signInWithPopup(auth, googleProvider) },
    signInWithPassword: async (email, password) => {
      if (!firebaseConfigured) throw new Error('Firebase config is missing. Add the VITE_FIREBASE_* values to .env.')
      return signInWithEmailAndPassword(auth, email.trim(), password)
    },
    signOut: async () => { if (firebaseConfigured) await signOut(auth) },
  }), [user, isAdmin, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext) ?? {
  user: null,
  isAdmin: false,
  loading: false,
  configured: firebaseConfigured,
  signIn: async () => { throw new Error('Wrap the app in AuthProvider before signing in.') },
  signInWithPassword: async () => { throw new Error('Wrap the app in AuthProvider before signing in.') },
  signOut: async () => {},
}
