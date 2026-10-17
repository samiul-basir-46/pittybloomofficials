import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SITE } from '../config/site'
import { settingsApi } from '../services/contentService'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(SITE)

  useEffect(() => {
    settingsApi.get().then(setSettings)
  }, [])

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
