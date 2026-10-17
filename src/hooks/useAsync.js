import { useEffect, useState } from 'react'

export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true }))
    fn()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState({ data: null, loading: false, error }))
    return () => {
      active = false
    }
  }, [...deps, tick])

  return { ...state, reload: () => setTick((t) => t + 1) }
}
