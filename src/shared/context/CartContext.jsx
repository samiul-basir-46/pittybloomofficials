import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'pb:cart'
const MAX_QTY = 99

// A cart line is a snapshot of what the customer picked (name, option, price at that moment),
// so changing prices later in Admin never rewrites a cart that is already filled.
const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved.filter((i) => i && i.key && Number.isFinite(i.price) && i.qty > 0) : []
  } catch {
    return []
  }
}

const keyOf = (item) => item.meta?.draftId
  ? [item.kind, item.id, 'draft', item.meta.draftId].join('|')
  : item.meta?.cartConfigId
    ? [item.kind, item.id, 'configured', item.meta.cartConfigId].join('|')
  : [item.kind, item.id, item.optionId, (item.note ?? '').trim()].join('|')
const clampQty = (n) => Math.min(MAX_QTY, Math.max(1, Math.round(Number(n) || 1)))

export function CartProvider({ children }) {
  const [items, setItems] = useState(load)
  const [notice, setNotice] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // cart still works in memory if storage is full or blocked
    }
  }, [items])

  // Keep several browser tabs in sync.
  useEffect(() => {
    const onStorage = (e) => e.key === STORAGE_KEY && setItems(load())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback((item, { silent = false } = {}) => {
    const note = (item.note ?? '').trim()
    const key = keyOf(item)
    const qty = clampQty(item.qty ?? 1)
    setItems((prev) =>
      prev.some((i) => i.key === key)
        ? prev.map((i) => (i.key === key ? { ...i, qty: clampQty(i.qty + qty) } : i))
        : [...prev, { ...item, note, key, qty }],
    )
    if (!silent) {
      setNotice({ name: item.name, id: Date.now() })
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setNotice(null), 3500)
    }
  }, [])

  // Sets a line to an exact quantity instead of adding to it, so repeating a step never duplicates an item.
  // keepHigher: never lower a quantity the customer already chose in the cart.
  const put = useCallback((item, { keepHigher = false } = {}) => {
    const note = (item.note ?? '').trim()
    const key = keyOf(item)
    const qty = clampQty(item.qty ?? 1)
    setItems((prev) =>
      prev.some((i) => i.key === key)
        ? prev.map((i) => (i.key === key ? { ...i, ...item, note, key, qty: keepHigher ? Math.max(i.qty, qty) : qty } : i))
        : [...prev, { ...item, note, key, qty }],
    )
  }, [])

  const replace = useCallback((key, item) => {
    const note = (item.note ?? '').trim()
    const nextKey = keyOf(item)
    setItems((prev) => prev.map((current) => current.key === key
      ? { ...item, note, key: nextKey, qty: clampQty(current.qty) }
      : current))
  }, [])

  const setQty = useCallback(
    (key, qty) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: clampQty(qty) } : i))),
    [],
  )
  const remove = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), [])
  const clear = useCallback(() => setItems([]), [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal: items.reduce((sum, i) => sum + i.price * i.qty, 0),
      savings: items.reduce((sum, i) => sum + Math.max(0, (i.mrp || 0) - i.price) * i.qty, 0),
      notice,
      add,
      put,
      replace,
      setQty,
      remove,
      clear,
      dismissNotice,
    }),
    [items, notice, add, put, replace, setQty, remove, clear, dismissNotice],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
