import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CheckCircle2, Package, Truck, XCircle } from 'lucide-react'
import { ORDER_STAGES } from '../../data/orderTracking'
import { useCart } from '../../context/useCart'
import api from '../../services/api'
import '../../styles/buyer/buyer-checkout.css'

const stageDescriptions = [
  'Your order has been received.',
  'The seller is preparing your items.',
  'Your order is packed and ready to ship.',
  'Your parcel has been handed to the delivery partner.',
  'The rider is bringing your order to you.',
  'Your order has been delivered.'
]

export default function OrderTracking({ orderId }) {
  const { orders, ordersLoading, ordersError, refreshOrders, updateOrderStatus } = useCart()
  const [error, setError] = useState('')
  const [reviewForms, setReviewForms] = useState({})
  const [submittedReviews, setSubmittedReviews] = useState([])
  const order = orders.find(item => item.id === orderId)
  const statusIndex = ORDER_STAGES.indexOf(order?.status)
  const isCancelled = order?.status === 'Cancelled'
  const isDelivered = order?.status === 'Delivered'
  const itemCount = order?.items.reduce((count, item) => count + item.quantity, 0) || 0

  useEffect(() => {
    refreshOrders()
  }, [refreshOrders])

  const updateStatus = async status => {
    try {
      setError('')
      await updateOrderStatus(order.id, status)
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  const submitReview = async product => {
    const form = reviewForms[product.id] || { rating: 5, title: '', body: '' }
    try {
      setError('')
      await api.post(`/orders/${order.id}/reviews`, {
        productId: product.id,
        ...form
      })
      setSubmittedReviews(current => [...current, product.id])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not submit your review.')
    }
  }

  if (!order) {
    return (
      <section className="buyer-tracking-page">
        <div className="buyer-checkout-empty">
          <Package size={36} />
          <h1>Order not found</h1>
          <p>{ordersError || (ordersLoading ? 'Retrieving your saved order.' : 'This order may not belong to your account.')}</p>
          <Link to="/buyer/orders">Back to order history</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="buyer-tracking-page">
      <div className="buyer-tracking-heading">
        <div>
          <span className="buyer-eyebrow">ORDER TRACKING</span>
          <h1>Follow your delivery</h1>
          <p>Order <strong>{order.id}</strong> · {itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>
        <Link to={`/buyer/receipt/${order.id}`}>View order summary</Link>
      </div>

      <div className="buyer-tracking-card">
        <div className={`buyer-tracking-current ${isCancelled ? 'cancelled' : ''}`}>
          {isCancelled ? <XCircle size={25} /> : <Truck size={25} />}
          <div>
            <span>Current status</span>
            <strong>{order.status}</strong>
            <small>
              {order.trackingHistory?.at(-1)?.note ||
                stageDescriptions[Math.max(statusIndex, 0)]}
            </small>
          </div>
          <div className="buyer-tracking-number">
            <span>Tracking number</span>
            <strong>{order.trackingNumber || 'Not assigned yet'}</strong>
          </div>
        </div>

        {!isCancelled && (
          <div className="buyer-tracking-progress" aria-label="Order progress">
            {ORDER_STAGES.map((stage, index) => {
              const complete = index <= statusIndex
              return (
                <div
                  className={`buyer-tracking-step ${complete ? 'complete' : ''} ${index === statusIndex ? 'current' : ''}`}
                  key={stage}
                >
                  <span className="buyer-tracking-step-marker">
                    {complete ? <CheckCircle2 size={20} /> : index + 1}
                  </span>
                  <strong>{stage}</strong>
                  <small>
                    {order.trackingHistory?.find(event => event.status === stage)
                      ? new Date(order.trackingHistory.find(event => event.status === stage).at).toLocaleString()
                      : 'Waiting for update'}
                  </small>
                </div>
              )
            })}
          </div>
        )}

        <div className="buyer-tracking-events">
          <h2>Tracking updates</h2>
          {(order.trackingHistory || []).slice().reverse().map((event, index) => (
            <article className="buyer-tracking-event" key={`${event.status}-${event.at}`}>
              <span className={`buyer-tracking-event-dot ${index === 0 ? 'latest' : ''}`} />
              <div>
                <strong>{event.status}</strong>
                <p>{event.note}</p>
                <small>{new Date(event.at).toLocaleString()}</small>
              </div>
            </article>
          ))}
        </div>

        {isDelivered && (
          <div className="buyer-tracking-reviews">
            <h2>Review your products</h2>
            {order.items.map(product => (
              <form className="buyer-tracking-review-form" key={product.id} onSubmit={event => {
                event.preventDefault()
                submitReview(product)
              }}>
                <strong>{product.name}</strong>
                {submittedReviews.includes(product.id) || order.reviews?.includes(product.id) ? <p>Thanks for your feedback.</p> : (
                  <>
                    <label>Rating<select value={reviewForms[product.id]?.rating || 5} onChange={event => setReviewForms(current => ({
                      ...current,
                      [product.id]: { ...current[product.id], rating: Number(event.target.value) }
                    }))}>{[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} stars</option>)}</select></label>
                    <label>Title (optional)<input maxLength={120} value={reviewForms[product.id]?.title || ''} onChange={event => setReviewForms(current => ({
                      ...current,
                      [product.id]: { ...current[product.id], title: event.target.value }
                    }))} /></label>
                    <label>Your review<textarea required maxLength={2000} value={reviewForms[product.id]?.body || ''} onChange={event => setReviewForms(current => ({
                      ...current,
                      [product.id]: { ...current[product.id], body: event.target.value }
                    }))} /></label>
                    <button className="buyer-tracking-advance" type="submit">Submit review</button>
                  </>
                )}
              </form>
            ))}
          </div>
        )}

        {error && <p className="buyer-checkout-error" role="alert">{error}</p>}

        {!isDelivered && !isCancelled && (
          <div className="buyer-tracking-demo-actions">
            {statusIndex === 0 && (
              <button
                type="button"
                className="buyer-tracking-cancel"
                onClick={() => updateStatus('Cancelled')}
              >
                Cancel order
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
