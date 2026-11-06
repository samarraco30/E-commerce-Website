import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Printer } from 'lucide-react'
import { useCart } from '../../context/useCart'
import '../../styles/buyer/buyer-checkout.css'

const formatPrice = amount => `₱${Number(amount).toLocaleString('en-PH')}`

export default function OrderReceipt({ orderId: routeOrderId }) {
  const { orderId: paramOrderId } = useParams()
  const orderId = routeOrderId ?? paramOrderId
  const { orders, ordersLoading, ordersError, refreshOrders } = useCart()
  const order = orders.find(item => item.id === orderId)

  useEffect(() => {
    refreshOrders()
  }, [refreshOrders])

  if (!order) {
    return (
      <section className="buyer-receipt-page">
        <div className="buyer-receipt-card buyer-receipt-not-found">
          <h1>{ordersLoading ? 'Loading receipt...' : 'Receipt not found'}</h1>
          <p>{ordersError || (ordersLoading ? 'Retrieving your saved order.' : 'This order may not belong to your account.')}</p>
          <Link to="/buyer/orders">View your orders</Link>
        </div>
      </section>
    )
  }

  const total = order.subtotal + order.shippingFee

  return (
    <section className="buyer-receipt-page">
      <article className="buyer-receipt-card">
        <div className="buyer-receipt-success">
          <CheckCircle2 size={42} />
          <span>ORDER PLACED</span>
          <h1>Thank you, {order.customer.fullName}!</h1>
          <p>Your order has been received. Keep this receipt for your records.</p>
        </div>

        <div className="buyer-receipt-meta">
          <div><span>Order number</span><strong>{order.id}</strong></div>
          <div><span>Order date</span><strong>{new Date(order.placedAt).toLocaleString()}</strong></div>
          <div><span>Payment</span><strong>{order.paymentMethod}</strong></div>
          <div><span>Status</span><strong>{order.status}</strong></div>
        </div>

        <section className="buyer-receipt-section">
          <h2>Delivery details</h2>
          <p>{order.customer.fullName}</p>
          <p>{order.customer.address}, {order.customer.barangay}</p>
          <p>{order.customer.city}, {order.customer.postalCode}</p>
          <p>{order.customer.phone} · {order.customer.email}</p>
          {order.customer.deliveryNotes && <p>Instructions: {order.customer.deliveryNotes}</p>}
        </section>

        <section className="buyer-receipt-section">
          <h2>Order summary</h2>
          {order.items.map(item => (
            <div className="buyer-receipt-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <small>{item.quantity} × {formatPrice(item.price)}</small>
                {item.variations?.map(variation => <small key={variation.name}>{variation.name}: {variation.value}</small>)}
              </div>
              <b>{formatPrice(item.price * item.quantity)}</b>
            </div>
          ))}
          <div className="buyer-checkout-total-row">
            <span>Subtotal</span><strong>{formatPrice(order.subtotal)}</strong>
          </div>
          {order.discountAmount > 0 && <div className="buyer-checkout-total-row">
            <span>Discount{order.discountCode ? ` (${order.discountName ? `${order.discountName} · ` : ''}${order.discountCode})` : ''}</span><strong>−{formatPrice(order.discountAmount)}</strong>
          </div>}
          <div className="buyer-checkout-total-row">
            <span>Delivery fee</span><strong>{formatPrice(order.shippingFee)}</strong>
          </div>
          <div className="buyer-checkout-grand-total">
            <span>Total due on delivery</span><strong>{formatPrice(total - (order.discountAmount || 0))}</strong>
          </div>
        </section>

        <div className="buyer-receipt-actions">
          <Link to={`/buyer/orders/${order.id}/tracking`}>Track order</Link>
          <button type="button" onClick={() => window.print()}>
            <Printer size={16} /> Print receipt
          </button>
          <Link to="/buyer/orders">Order history</Link>
          <Link to="/buyer">Continue shopping</Link>
        </div>
      </article>
    </section>
  )
}
