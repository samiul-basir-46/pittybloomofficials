import { useEffect, useState } from 'react'
import { ordersApi } from '../services/contentService'

export default function useOrders() {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, loading: true, error: null }))
    const onChange = (data) => {
      if (active) setState({ data, loading: false, error: null })
    }
    const onError = (error) => {
      if (active) setState((current) => ({ ...current, loading: false, error }))
    }
    const unsubscribe = ordersApi.watchAdmin?.(onChange, onError)
    if (!unsubscribe) ordersApi.list().then(onChange).catch(onError)
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  return state
}
