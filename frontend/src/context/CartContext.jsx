import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ShoppingCart, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CartContext } from './cart-context'
import api from '../services/api'
import {
  getAuthSessionChangedEventName,
  getAuthUser,
  hasAuthToken
} from '../utils/auth'

const CART_STORAGE_KEY = 'altf4_cart'

function storageKey(key, userId) {
  return userId == null ? null : `${key}:${userId}`
}

function readCart(userId) {
  const key = storageKey(CART_STORAGE_KEY, userId)
  if (!key) return []

  try {
    const storedCart = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(storedCart)
      ? storedCart.filter(item =>
          item &&
          (typeof item.id === 'number' || typeof item.id === 'string') &&
          typeof item.name === 'string' &&
          Number.isFinite(Number(item.price)) &&
          Number.isFinite(Number(item.quantity)) &&
          Number(item.quantity) > 0
        ).map(item => ({
          ...item,
          price: Number(item.price),
          quantity: Number(item.quantity),
          stock: Number(item.stock) > 0 ? Number(item.stock) : 99,
          shippingFee: Number(item.shippingFee ?? 60)
        }))
      : []
  } catch (error) {
    console.error('Unable to read the saved cart.', error)
    return []
  }
}

function getImage(product) {
  return product.images?.[0] || product.image || ''
}

export function CartProvider({ children }) {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(() => getAuthUser()?.id ?? null)
  const userIdRef = useRef(userId)
  const [items, setItems] = useState(() => readCart(userId))
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(() => getAuthUser()?.id != null)
  const [ordersError, setOrdersError] = useState('')
  const [cartNotice, setCartNotice] = useState(null)

  const refreshOrders = useCallback(async () => {
    if (userId == null || !hasAuthToken()) {
      return
    }

    try {
      const { data } = await api.get('/orders')
      if (userIdRef.current === userId) {
        setOrders(data.data)
        setOrdersError('')
      }
    } catch (error) {
      if (userIdRef.current === userId) {
        console.error('Unable to load your orders.', error)
        setOrdersError(error.response?.data?.message || 'We could not load your order history.')
      }
    } finally {
      if (userIdRef.current === userId) setOrdersLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId == null || !hasAuthToken()) return undefined

    let active = true
    let requestInFlight = false
    const fetchOrders = async () => {
      if (requestInFlight || document.visibilityState === 'hidden') return
      requestInFlight = true
      try {
        const { data } = await api.get('/orders')
        if (!active || userIdRef.current !== userId) return
        setOrders(current => {
          const unchanged = current.length === data.data.length &&
            current.every((order, index) => (
              order.id === data.data[index].id &&
              order.status === data.data[index].status &&
              order.trackingHistory?.at(-1)?.at === data.data[index].trackingHistory?.at(-1)?.at
            ))
          return unchanged ? current : data.data
        })
        setOrdersError('')
      } catch (error) {
        if (!active || userIdRef.current !== userId) return
        console.error('Unable to refresh your orders.', error)
        setOrdersError(error.response?.data?.message || 'We could not refresh your order history.')
      } finally {
        requestInFlight = false
        if (active && userIdRef.current === userId) setOrdersLoading(false)
      }
    }

    fetchOrders()
    const intervalId = window.setInterval(fetchOrders, 3000)
    document.addEventListener('visibilitychange', fetchOrders)

    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', fetchOrders)
    }
  }, [userId])

  useEffect(() => {
    const key = storageKey(CART_STORAGE_KEY, userId)
    if (!key) return

    try {
      window.localStorage.setItem(key, JSON.stringify(items))
    } catch (error) {
      console.error('Unable to save the cart.', error)
    }
  }, [items, userId])

  useEffect(() => {
    const syncUser = () => {
      const nextUserId = getAuthUser()?.id ?? null
      if (userIdRef.current === nextUserId) return

      userIdRef.current = nextUserId
      setUserId(nextUserId)
      setItems(readCart(nextUserId))
      setOrders([])
      setOrdersLoading(nextUserId != null)
      setOrdersError('')
      setCartNotice(null)
    }

    const syncCart = event => {
      if (
        event.key === 'altf4.auth.token' ||
        event.key === 'altf4.auth.user'
      ) {
        syncUser()
      }

      const activeUserId = userIdRef.current
      if (event.key === storageKey(CART_STORAGE_KEY, activeUserId)) {
        setItems(readCart(activeUserId))
      }
    }

    const authEvent = getAuthSessionChangedEventName()
    window.addEventListener(authEvent, syncUser)
    window.addEventListener('storage', syncCart)
    return () => {
      window.removeEventListener(authEvent, syncUser)
      window.removeEventListener('storage', syncCart)
    }
  }, [])

  useEffect(() => {
    if (!cartNotice) return undefined
    const timeout = window.setTimeout(() => setCartNotice(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [cartNotice])

  const addItems = useCallback((entries, { showNotice = true } = {}) => {
    if (!hasAuthToken() || userId == null) return false
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error('Choose at least one product variation.')
    }

    let nextItems = [...items]
    const productLimits = new Map()
    let totalAdded = 0

    entries.forEach(({ product, quantity }) => {
      const price = typeof product?.price === 'number'
        ? product.price
        : Number(String(product?.price ?? '').replace(/[^\d.]/g, ''))
      const stock = product?.stock == null ? 99 : Number(product.stock)
      const amount = Number(quantity)
      const productStock = product?.productStock == null ? stock : Number(product.productStock)
      const productMinOrder = Math.max(1, Number(product?.details?.minimumOrder || 1))
      const productMaxOrder = Math.min(
        productStock,
        Number(product?.details?.maximumOrder || productStock)
      )
      const selectedVariations = product?.selectedVariations || []
      const cartKey = `${product?.id}:${JSON.stringify(selectedVariations)}`

      if (
        product?.id == null ||
        !product.name ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(stock) ||
        stock < 0 ||
        !Number.isInteger(productStock) ||
        productStock < 0
      ) {
        throw new Error('This product cannot be added to the cart.')
      }
      if (!Number.isInteger(amount) || amount < 1) {
        throw new Error('Enter a valid product quantity.')
      }

      const currentIndex = nextItems.findIndex(
        item => (item.cartKey || `${item.id}:[]`) === cartKey
      )
      const currentItem = currentIndex >= 0 ? nextItems[currentIndex] : null
      const lineMaxOrder = Math.min(
        stock,
        Number(product?.details?.maximumOrder || stock)
      )
      const nextLineQuantity = amount + (currentItem?.quantity || 0)
      if (nextLineQuantity > lineMaxOrder) {
        throw new Error(`The maximum order for this variation is ${lineMaxOrder}.`)
      }

      if (currentItem) {
        nextItems[currentIndex] = {
          ...currentItem,
          stock: Math.min(currentItem.stock, stock),
          quantity: nextLineQuantity
        }
      } else {
        nextItems.push({
          id: product.id,
          cartKey,
          name: product.name,
          category: product.category || '',
          price,
          image: getImage(product),
          seller: product.seller || '',
          sellerId: product.sellerId || null,
          shippingFee: Number(product.shippingFee ?? 60),
          unit: product.unit || '',
          selectedVariations,
          variantSku: product.variantSku || null,
          variationImageIndex: product.variationImageIndex ?? null,
          quantity: amount,
          stock,
          minOrder: selectedVariations.length ? 1 : productMinOrder,
          productMinOrder,
          maxOrder: lineMaxOrder
        })
      }

      const limit = productLimits.get(String(product.id)) || {
        minOrder: productMinOrder,
        maxOrder: productMaxOrder,
        stock: productStock
      }
      productLimits.set(String(product.id), limit)
      totalAdded += amount
    })

    productLimits.forEach((limit, productId) => {
      const totalQuantity = nextItems
        .filter(item => String(item.id) === productId)
        .reduce((sum, item) => sum + item.quantity, 0)
      if (totalQuantity < limit.minOrder) {
        throw new Error(`The minimum order for this product is ${limit.minOrder}.`)
      }
      if (totalQuantity > Math.min(limit.maxOrder, limit.stock)) {
        throw new Error(`The maximum order for this product is ${Math.min(limit.maxOrder, limit.stock)}.`)
      }
    })

    const firstProduct = entries[0].product
    setCartNotice(showNotice
      ? {
          id: `${firstProduct.id}-${Date.now()}`,
          name: totalAdded > 1 ? `${totalAdded} items added` : firstProduct.name
        }
      : null)
    setItems(nextItems)
    return true
  }, [items, userId])

  const addItem = useCallback((product, quantity = 1, options) => (
    addItems([{ product, quantity }], options)
  ), [addItems])

  const updateQuantity = useCallback((cartKey, quantity) => {
    const amount = Math.floor(Number(quantity))
    if (!Number.isInteger(amount) || amount < 1) {
      throw new Error('Cart quantity must be at least one.')
    }
    const currentItem = items.find(item => (item.cartKey || `${item.id}:[]`) === cartKey)
    if (currentItem && (amount < (currentItem.minOrder || 1) || amount > Math.min(currentItem.stock, currentItem.maxOrder || currentItem.stock))) {
      throw new Error(`Quantity must be between ${currentItem.minOrder || 1} and ${Math.min(currentItem.stock, currentItem.maxOrder || currentItem.stock)}.`)
    }

    setItems(current => current.map(item => (item.cartKey || `${item.id}:[]`) === cartKey
      ? { ...item, quantity: amount }
      : item))
  }, [items])

  const removeItem = cartKey => {
    setItems(current => current.filter(item => (item.cartKey || `${item.id}:[]`) !== cartKey))
  }

  const clearCart = () => setItems([])

  const updateOrderStatus = useCallback(async (orderId, nextStatus) => {
    if (userId == null) throw new Error('Sign in before updating an order.')
    if (nextStatus !== 'Cancelled') {
      throw new Error('Only the seller can update this order status.')
    }

    const { data } = await api.patch(`/orders/${orderId}/cancel`)
    setOrders(current => current.map(order => order.id === orderId ? data.data : order))
    setOrdersError('')
  }, [userId])

  const dismissCartNotice = () => setCartNotice(null)

  const value = useMemo(() => ({
    items,
    orders,
    ordersLoading,
    ordersError,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    addItem,
    addItems,
    updateQuantity,
    removeItem,
    clearCart,
    refreshOrders,
    updateOrderStatus,
    dismissCartNotice
  }), [items, orders, ordersLoading, ordersError, addItem, addItems, updateQuantity, refreshOrders, updateOrderStatus])

  return (
    <CartContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {cartNotice && (
          <motion.aside
            className="buyer-cart-toast"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, x: 30, y: -8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 25 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <span className="buyer-cart-toast-icon">
              <CheckCircle2 size={20} />
            </span>
            <span className="buyer-cart-toast-copy">
              <strong>Added to your cart</strong>
              <small>{cartNotice.name}</small>
            </span>
            <button type="button" onClick={() => {
              dismissCartNotice()
              navigate('/buyer/cart')
            }}>
              <ShoppingCart size={15} />
              View cart
            </button>
            <button
              type="button"
              className="buyer-cart-toast-dismiss"
              onClick={dismissCartNotice}
              aria-label="Dismiss cart confirmation"
            >
              <X size={16} />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </CartContext.Provider>
  )
}
