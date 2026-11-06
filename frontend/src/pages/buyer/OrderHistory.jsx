import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck } from 'lucide-react'
import { useCart } from '../../context/useCart'
import api from '../../services/api'
import '../../styles/buyer/buyer-checkout.css'

export default function OrderHistory() {
  const { orders, ordersLoading, ordersError, refreshOrders, addItem } = useCart()
  const [reorderingId, setReorderingId] = useState('')
  const [reorderError, setReorderError] = useState('')
  const [reorderNotice, setReorderNotice] = useState('')
  const [returnError, setReturnError] = useState('')
  const [returnNotice, setReturnNotice] = useState('')
  const [returningId, setReturningId] = useState('')

  useEffect(() => {
    refreshOrders()
  }, [refreshOrders])

  const reorder = async order => {
    setReorderingId(order.id)
    setReorderError('')
    setReorderNotice('')
    try {
      const { data } = await api.post(`/orders/${order.id}/reorder`)
      let addedCount = 0
      const cartErrors = []
      for (const item of data.data.items) {
        try {
          if (!addItem(item, item.quantity, { showNotice: false })) {
            cartErrors.push(item.name)
          } else {
            addedCount += 1
          }
        } catch (error) {
          cartErrors.push(`${item.name}: ${error.message}`)
        }
      }

      const unavailable = [...data.data.unavailable, ...cartErrors]
      if (addedCount) {
        setReorderNotice(unavailable.length
          ? `Available items were added to your cart. Some items are unavailable: ${[...new Set(unavailable)].join(', ')}.`
          : 'Items from your order were added to your cart.')
      } else {
        setReorderError(unavailable.length
          ? `No items could be reordered: ${[...new Set(unavailable)].join(', ')}.`
          : 'No available items could be added from this order.')
      }
    } catch (requestError) {
      setReorderError(requestError.response?.data?.message || 'We could not reorder this purchase.')
    } finally {
      setReorderingId('')
    }
  }

  const requestReturn = async order => {
    const reason = window.prompt('Why are you requesting a return or reporting a problem?')
    if (reason === null) return
    const description = window.prompt('Describe the issue (at least 10 characters):')
    if (description === null) return
    setReturningId(order.id)
    setReturnError('')
    setReturnNotice('')
    try {
      await api.post(`/orders/${order.id}/returns`, { reason, description })
      await refreshOrders()
      setReturnNotice(`Return request for order ${order.id} was submitted for review.`)
    } catch (requestError) {
      setReturnError(requestError.response?.data?.message || 'We could not submit this return request.')
    } finally {
      setReturningId('')
    }
  }

  return (
    <section className="buyer-orders-page">
      <span className="buyer-eyebrow">YOUR PURCHASES</span>
      <h1>Order history</h1>
      {ordersError && <p className="buyer-checkout-error" role="alert">{ordersError}</p>}
      {reorderError && <p className="buyer-checkout-error" role="alert">{reorderError}</p>}
      {reorderNotice && <p className="buyer-checkout-success" role="status">{reorderNotice} <Link to="/buyer/cart">View cart</Link></p>}
      {returnError && <p className="buyer-checkout-error" role="alert">{returnError}</p>}
      {returnNotice && <p className="buyer-checkout-success" role="status">{returnNotice}</p>}
      {ordersLoading ? (
        <p>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div className="buyer-checkout-empty">
          <PackageCheck size={36} />
          <h2>No orders yet</h2>
          <p>Completed purchases and receipts will appear here.</p>
          <Link to="/buyer/products">Browse products</Link>
        </div>
      ) : (
        <div className="buyer-orders-list">
          {orders.map(order => (
            <article className="buyer-order-row" key={order.id}>
              <div>
                <strong>Order {order.id}</strong>
                <span>{new Date(order.placedAt).toLocaleString()}</span>
                <small>{order.items.length} {order.items.length === 1 ? 'product' : 'products'} · {order.status}</small>
                {order.returnRequest && <small>Return request: {order.returnRequest.status.replace('_', ' ')}{order.returnRequest.adminNote ? ` · ${order.returnRequest.adminNote}` : ''}</small>}
              </div>
              <strong>₱{(order.subtotal - (order.discountAmount || 0) + order.shippingFee).toLocaleString('en-PH')}</strong>
              <div className="buyer-order-row-actions">
                <Link to={`/buyer/orders/${order.id}/tracking`}>Track order</Link>
                <Link to={`/buyer/receipt/${order.id}`}>View receipt</Link>
                <button type="button" onClick={() => reorder(order)} disabled={reorderingId === order.id}>
                  {reorderingId === order.id ? 'Adding...' : 'Reorder'}
                </button>
                {order.status === 'Delivered' && !order.returnRequest && <button type="button" onClick={() => requestReturn(order)} disabled={returningId === order.id}>{returningId === order.id ? 'Submitting...' : 'Request return / report issue'}</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
