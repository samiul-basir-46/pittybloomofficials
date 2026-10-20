import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SITE } from '../config/site'
import { settingsApi } from '../services/contentService'
import { useAuth } from './AuthContext'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(SITE)
  const { user } = useAuth()

  useEffect(() => {
    let active = true
    settingsApi.get().then((next) => active && setSettings(next)).catch(() => {})
    return () => { active = false }
  }, [user?.uid])

  const value = useMemo(
    () => ({
      settings,
      save: async (next) => setSettings(await settingsApi.save(next)),
    }),
    [settings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
