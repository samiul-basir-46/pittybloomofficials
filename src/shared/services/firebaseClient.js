import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, initializeFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Firestore's default streaming connection is silently blocked or stalled by some mobile networks, proxies and
// Safari builds, which leaves order saving "buffering" forever. Auto-detect falls back to long-polling when needed.
const openFirestore = (firebaseApp) => {
  try { return initializeFirestore(firebaseApp, { experimentalAutoDetectLongPolling: true }) }
  catch { return getFirestore(firebaseApp) } // already initialised (hot reload)
}

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
const app = firebaseConfigured ? (getApps().find((candidate) => candidate.name === '[DEFAULT]') ?? initializeApp(config)) : null
export const auth = app ? getAuth(app) : null
export const db = app ? openFirestore(app) : null
// Admin auth uses a separate Firebase app name, so its persisted session cannot
// replace or sign out the customer's default-app session.
const adminApp = firebaseConfigured
  ? (getApps().find((candidate) => candidate.name === 'pittybloom-admin') ?? initializeApp(config, 'pittybloom-admin'))
  : null
export const adminAuth = adminApp ? getAuth(adminApp) : null
export const adminDb = adminApp ? openFirestore(adminApp) : null
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
