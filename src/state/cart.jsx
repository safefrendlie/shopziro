import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { safeJson } from '../lib/utils'
import { useConfirm } from '../components/ui'

const KEY = 'shopziro_cart_v1'
const CartCtx = createContext(null)

function load() {
  try {
    const v = safeJson(localStorage.getItem(KEY), null)
    if (v && Array.isArray(v.items)) return v
  } catch {
    /* ignore */
  }
  return { shop: null, items: [] }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(load)
  const [confirm, confirmNode] = useConfirm()

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart))
    } catch {
      /* ignore */
    }
  }, [cart])

  const add = useCallback(
    async (shop, item) => {
      if (cart.shop && cart.shop.id !== shop.id && cart.items.length > 0) {
        const ok = await confirm(
          `Your cart has items from ${cart.shop.name}. Start a new cart with ${shop.name} instead?`,
          { confirmText: 'Start new cart' }
        )
        if (!ok) return false
        setCart({ shop, items: [{ ...item, key: `${item.product_id}|${item.variation || ''}` }] })
        return true
      }
      setCart((c) => {
        const key = `${item.product_id}|${item.variation || ''}`
        const exists = c.items.find((i) => i.key === key)
        const items = exists
          ? c.items.map((i) => (i.key === key ? { ...i, qty: Math.min(99, i.qty + item.qty) } : i))
          : [...c.items, { ...item, key }]
        return { shop, items }
      })
      return true
    },
    [cart, confirm]
  )

  const setQty = useCallback((key, qty) => {
    setCart((c) => {
      const items = c.items
        .map((i) => (i.key === key ? { ...i, qty: Math.max(0, Math.min(99, qty)) } : i))
        .filter((i) => i.qty > 0)
      return { shop: items.length ? c.shop : null, items }
    })
  }, [])

  const remove = useCallback((key) => setQty(key, 0), [setQty])
  const clear = useCallback(() => setCart({ shop: null, items: [] }), [])

  const value = useMemo(
    () => ({
      shop: cart.shop,
      items: cart.items,
      count: cart.items.reduce((n, i) => n + i.qty, 0),
      total: cart.items.reduce((n, i) => n + i.qty * Number(i.price || 0), 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [cart, add, setQty, remove, clear]
  )

  return (
    <CartCtx.Provider value={value}>
      {children}
      {confirmNode}
    </CartCtx.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
