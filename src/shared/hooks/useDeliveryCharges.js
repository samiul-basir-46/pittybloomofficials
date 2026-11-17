import { useEffect, useState } from 'react'
import { getOrderSettings } from '../services/contentService'
import { ORDER_DEFAULTS } from '../../pages/order/data'

// Keep every storefront checkout connected to the single Admin → Order Settings source.
export default function useDeliveryCharges() {
  const [settings, setSettings] = useState(ORDER_DEFAULTS)

  useEffect(() => {
    let active = true
    getOrderSettings().then((saved) => {
      if (active) setSettings({ ...ORDER_DEFAULTS, ...saved })
    }).catch(() => {})
    return () => { active = false }
  }, [])

  return settings
}
