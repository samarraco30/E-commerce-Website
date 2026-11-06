import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, LockKeyhole, MapPin, PackageCheck, X } from 'lucide-react'
import api from '../../services/api'
import { useCart } from '../../context/useCart'
import { clearAuthSession } from '../../utils/auth'
import {
  addressToCheckoutDetails,
  STA_MARIA_BARANGAYS
} from '../../data/staMariaAddresses'
import '../../styles/buyer/buyer-checkout.css'

const initialDetails = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  barangay: '',
  city: 'Sta. Maria',
  postalCode: '',
  deliveryNotes: ''
}

const initialNewAddress = {
  label: 'Home',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  barangay: '',
  city: 'Sta. Maria',
  postalCode: '',
  deliveryNotes: ''
}

const formatPrice = amount => `₱${amount.toLocaleString('en-PH')}`
const discountDescription = discount => {
  if (discount.type === 'fixed_amount') return `${formatPrice(discount.amount)} off`
  if (discount.type === 'minimum_spend') return `${formatPrice(discount.amount)} off with a ${formatPrice(discount.minimumSpend)} minimum spend`
  return `${discount.percentage}% discount`
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const formRef = useRef(null)
  const addressModalRef = useRef(null)
  const { items, subtotal, clearCart, refreshOrders } = useCart()
  const [step, setStep] = useState(1)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [details, setDetails] = useState(initialDetails)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [newAddress, setNewAddress] = useState(initialNewAddress)
  const [addressError, setAddressError] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [manualDiscountCode, setManualDiscountCode] = useState(null)
  const [discountValidation, setDiscountValidation] = useState(null)
  const discountItems = useMemo(() => items.map(item => ({
    id: item.id,
    quantity: item.quantity,
    variations: item.selectedVariations || []
  })), [items])
  const discountValidationKey = JSON.stringify([manualDiscountCode, discountItems])
  const currentDiscountValidation = discountValidation?.key === discountValidationKey ? discountValidation : null
  const appliedDiscount = currentDiscountValidation?.discount ?? null
  const discountError = currentDiscountValidation?.error ?? ''
  const checkingDiscount = items.length > 0 && !currentDiscountValidation
  const shippingBySeller = new Map(items.map(item => [item.sellerId ?? 'sample', Number(item.shippingFee ?? 60)]))
  const shippingFee = [...shippingBySeller.values()].reduce((total, fee) => total + fee, 0)
  const steps = [
    { number: 1, title: 'Contact' },
    { number: 2, title: 'Delivery' },
    { number: 3, title: 'Review & pay' }
  ]

  useEffect(() => {
    let active = true
    if (!items.length) return undefined

    api.post('/orders/discount', {
      ...(manualDiscountCode ? { code: manualDiscountCode } : {}),
      items: discountItems
    })
      .then(({ data }) => {
        if (!active) return
        setDiscountValidation({
          key: discountValidationKey,
          discount: data.data,
          error: manualDiscountCode && !data.data ? 'This voucher cannot be applied to your cart.' : ''
        })
      })
      .catch(requestError => {
        if (active) {
          setDiscountValidation({
            key: discountValidationKey,
            discount: null,
            error: manualDiscountCode
              ? requestError.response?.data?.message || 'This discount code cannot be applied.'
              : requestError.response?.data?.message || 'We could not check claimed vouchers.'
          })
        }
      })

    return () => {
      active = false
    }
  }, [discountItems, items.length, manualDiscountCode, discountValidationKey])

  useEffect(() => {
    let active = true
    api.get('/addresses')
      .then(({ data }) => {
        if (!active) return
        const addresses = data.data
        setSavedAddresses(addresses)
        const defaultAddress = addresses.find(address => address.isDefault)
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
          setDetails(addressToCheckoutDetails(defaultAddress))
        }
      })
      .catch(requestError => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
            'We could not load your saved addresses. You can still enter a new one.'
          )
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!showAddressModal) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    addressModalRef.current?.focus()

    const closeOnEscape = event => {
      if (event.key === 'Escape' && !savingAddress) {
        setShowAddressModal(false)
      }
    }
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [showAddressModal, savingAddress])

  const handleChange = event => {
    if (event.target.name === 'barangay') {
      setSelectedAddressId('')
    } else if ([
      'fullName',
      'email',
      'phone',
      'address',
      'barangay',
      'city',
      'postalCode',
      'deliveryNotes'
    ].includes(event.target.name)) {
      setSelectedAddressId('')
    }
    setDetails(current => ({
      ...current,
      [event.target.name]: event.target.value
    }))
  }

  const handleAddressSelect = event => {
    if (event.target.value === 'add-new-address') {
      setNewAddress({
        ...initialNewAddress,
        fullName: details.fullName,
        email: details.email,
        phone: details.phone
      })
      setAddressError('')
      setShowAddressModal(true)
      return
    }

    const address = savedAddresses.find(
      item => String(item.id) === event.target.value
    )
    setSelectedAddressId(address?.id || '')
    if (address) setDetails(addressToCheckoutDetails(address))
  }

  const handleNewAddressChange = event => {
    setNewAddress(current => ({
      ...current,
      [event.target.name]: event.target.value
    }))
    setAddressError('')
  }

  const handleNewAddressSubmit = async event => {
    event.preventDefault()
    setAddressError('')
    setSavingAddress(true)

    try {
      const { data } = await api.post('/addresses', {
        ...newAddress,
        label: newAddress.label.trim(),
        fullName: newAddress.fullName.trim(),
        email: newAddress.email.trim(),
        phone: newAddress.phone.trim(),
        address: newAddress.address.trim(),
        city: newAddress.city.trim(),
        postalCode: newAddress.postalCode.trim(),
        deliveryNotes: newAddress.deliveryNotes.trim()
      })

      setSavedAddresses(current => [...current, data.data])
      setSelectedAddressId(String(data.data.id))
      setDetails(current => ({
        ...current,
        ...addressToCheckoutDetails(data.data)
      }))
      setShowAddressModal(false)
      setAddressError('')
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearAuthSession()
        setAddressError('Your sign-in has expired. Please sign in again to save this address.')
      } else {
        setAddressError(
          requestError.response?.data?.message ||
          'We could not save this address. Please check the details and try again.'
        )
      }
    } finally {
      setSavingAddress(false)
    }
  }

  const handleNext = () => {
    if (step === 2 && !selectedAddressId) {
      setError('Choose a saved address or add a new one to continue.')
      return
    }
    if (step < steps.length && !formRef.current?.reportValidity()) return
    setError('')
    setStep(current => Math.min(current + 1, steps.length))
  }

  const handleBack = () => {
    setError('')
    setStep(current => Math.max(current - 1, 1))
  }

  const applyDiscount = () => {
    if (!discountCode.trim()) return
    setManualDiscountCode(discountCode.trim())
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const customer = {
        ...details,
        fullName: details.fullName.trim(),
        email: details.email.trim(),
        phone: details.phone.trim(),
        address: details.address.trim(),
        barangay: details.barangay,
        city: details.city.trim(),
        postalCode: details.postalCode.trim(),
        deliveryNotes: details.deliveryNotes.trim()
      }

      const orderCustomer = {
        ...customer,
        addressLabel: selectedAddressId
          ? savedAddresses.find(
              address => String(address.id) === String(selectedAddressId)
            )?.label
          : ''
      }
      const { data } = await api.post('/orders', {
        customer: orderCustomer,
        items: items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          variations: item.selectedVariations || []
        })),
        discountCode: appliedDiscount?.code
      })
      clearCart()
      await refreshOrders()
      if (data.data.length === 1) {
        navigate(`/buyer/receipt/${data.data[0].id}`, { replace: true })
      } else {
        navigate('/buyer/orders', { replace: true })
      }
    } catch (submitError) {
      const validationErrors = submitError.response?.data?.errors
      setError(validationErrors
        ? Object.values(validationErrors).flat()[0]
        : submitError.response?.data?.message || submitError.message)
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <section className="buyer-checkout-page">
        <div className="buyer-checkout-empty">
          <PackageCheck size={36} />
          <h1>Nothing to check out yet</h1>
          <p>Your cart is empty. Add products before checking out.</p>
          <Link to="/buyer/products">Browse products</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="buyer-checkout-page">
      <div className="buyer-checkout-heading">
        <span className="buyer-eyebrow">SAFE AND SIMPLE CHECKOUT</span>
        <h1>Checkout</h1>
        <p>Complete these three quick steps to place your order.</p>
      </div>

      <div className="buyer-checkout-layout">
        <div className="buyer-checkout-main">
          <div className="buyer-checkout-progress" aria-label="Checkout progress">
        <div className="buyer-checkout-progress-heading">
          <span>YOUR CHECKOUT</span>
          <span>STEP {step} OF {steps.length}</span>
        </div>
        <div className="buyer-checkout-step-track">
          {steps.map((item, index) => (
            <div
              key={item.number}
              className={`buyer-checkout-step ${
                step >= item.number ? 'active' : ''
              } ${step > item.number ? 'completed' : ''}`}
              aria-current={step === item.number ? 'step' : undefined}
            >
              <span className="buyer-checkout-step-circle">
                {step > item.number
                  ? <Check size={15} strokeWidth={3} />
                  : item.number}
              </span>
              <span className="buyer-checkout-step-label">{item.title}</span>
              {index < steps.length - 1 && (
                <span className="buyer-checkout-step-line">
                  <span style={{ width: step > item.number ? '100%' : '0%' }} />
                </span>
              )}
            </div>
          ))}
        </div>
          </div>

          <form ref={formRef} className="buyer-checkout-step-form" onSubmit={handleSubmit}>
        {step === 1 && (
          <section className="buyer-checkout-card buyer-checkout-step-card">
            <div className="buyer-checkout-section-heading">
              <div>
                <h2>How can we contact you?</h2>
                <p>Enter the details for updates about your order.</p>
              </div>
            </div>

            <div className="buyer-checkout-fields">
              <label>
                Full name
                <input name="fullName" autoComplete="name" value={details.fullName} onChange={handleChange} required maxLength={120} />
              </label>
              <label>
                Email address
                <input name="email" type="email" autoComplete="email" value={details.email} onChange={handleChange} required maxLength={255} />
              </label>
              <label>
                Phone number
                <input name="phone" type="tel" autoComplete="tel" value={details.phone} onChange={handleChange} required maxLength={30} />
              </label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="buyer-checkout-card buyer-checkout-step-card">
            <div className="buyer-checkout-section-heading">
              <div>
                <h2>Where should we deliver your order?</h2>
                <p>Choose a saved address or add a new one.</p>
              </div>
            </div>

            <div className="buyer-checkout-address-tools">
              <label>
                Choose a saved address
                <select value={selectedAddressId} onChange={handleAddressSelect}>
                  <option value="">Choose an address</option>
                  {savedAddresses.map(address => (
                    <option key={address.id} value={address.id}>
                      {address.label}{address.isDefault ? ' (default)' : ''} — {address.barangay}
                    </option>
                  ))}
                  <option value="add-new-address">+ Add a new address</option>
                </select>
              </label>
              <Link to="/buyer/addresses">Manage saved addresses</Link>
            </div>

            {selectedAddressId && (
              <div className="buyer-checkout-selected-address">
                <MapPin size={17} />
                <div>
                  <strong>
                    {savedAddresses.find(address => String(address.id) === String(selectedAddressId))?.label}
                  </strong>
                  <span>
                    {details.address}, {details.barangay}, {details.city} {details.postalCode}
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="buyer-checkout-card buyer-checkout-step-card buyer-checkout-review">
            <div className="buyer-checkout-section-heading">
              <div>
                <h2>Review and confirm</h2>
                <p>Check your order, delivery address, and payment method.</p>
              </div>
            </div>

            <div className="buyer-checkout-review-details">
              <div>
                <strong>Delivery address</strong>
                <span>{details.address}, {details.barangay}, {details.city} {details.postalCode}</span>
                <span>{details.fullName} · {details.phone}</span>
              </div>
              <button type="button" onClick={() => setStep(2)}>Edit</button>
            </div>

            <label className="buyer-payment-option">
              <input type="radio" name="payment" value="cod" checked readOnly />
              <span>
                <strong>Cash on delivery</strong>
                <small>Pay the delivery person when you receive the order.</small>
              </span>
            </label>

          </section>
        )}

        {error && <p className="buyer-checkout-error" role="alert">{error}</p>}

        <div className="buyer-checkout-navigation">
          {step === 1 ? (
            <Link to="/buyer/cart" className="buyer-checkout-back">
              <ArrowLeft size={16} /> Back to cart
            </Link>
          ) : (
            <button type="button" className="buyer-checkout-previous" onClick={handleBack}>
              <ArrowLeft size={16} /> Back
            </button>
          )}

          {step < steps.length ? (
            <button type="button" className="buyer-checkout-next" onClick={handleNext}>
              Continue <ArrowRight size={17} />
            </button>
          ) : (
            <button className="buyer-place-order" type="submit" disabled={submitting || checkingDiscount}>
              <LockKeyhole size={17} />
              {submitting ? 'Placing order...' : checkingDiscount ? 'Checking voucher...' : 'Place order'}
            </button>
          )}
        </div>
          </form>
        </div>

        <aside className="buyer-checkout-summary" aria-label="Order summary">
          <h2>Your order</h2>
          <div className="buyer-checkout-summary-items">
            {items.map(item => (
              <div className="buyer-checkout-summary-item" key={item.cartKey || item.id}>
                <img src={item.image} alt="" />
                <div>
                  <strong>{item.name}</strong>
                  <small>Qty {item.quantity} · {formatPrice(item.price)} each</small>
                  {item.selectedVariations?.map(variation => <small key={variation.name}>{variation.name}: {variation.value}</small>)}
                </div>
                <b>{formatPrice(item.price * item.quantity)}</b>
              </div>
            ))}
          </div>
          <div className="buyer-checkout-discount">
            <label htmlFor="checkout-discount-code">Discount code</label>
            <div>
              <input id="checkout-discount-code" value={discountCode} onChange={event => {
                setDiscountCode(event.target.value)
                setManualDiscountCode(null)
              }} maxLength={40} placeholder="Enter code" />
              <button type="button" onClick={applyDiscount} disabled={checkingDiscount || !discountCode.trim()}>
                {checkingDiscount ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {discountError && <small role="alert">{discountError}</small>}
            {appliedDiscount && <small role="status">{appliedDiscount.name ? `${appliedDiscount.name}: ` : ''}{discountDescription(appliedDiscount)} applied to {appliedDiscount.shop} items.</small>}
          </div>
          <div className="buyer-checkout-total-row">
            <span>Items ({items.reduce((count, item) => count + item.quantity, 0)})</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          {appliedDiscount && <div className="buyer-checkout-total-row"><span>Discount ({appliedDiscount.name ? `${appliedDiscount.name} · ` : ''}{appliedDiscount.code})</span><strong>−{formatPrice(appliedDiscount.discountAmount)}</strong></div>}
          <div className="buyer-checkout-total-row">
            <span>Delivery fee</span>
            <strong>{formatPrice(shippingFee)}</strong>
          </div>
          <div className="buyer-checkout-grand-total">
            <span>Total due on delivery</span>
            <strong>{formatPrice(subtotal - (appliedDiscount?.discountAmount || 0) + shippingFee)}</strong>
          </div>
          <p className="buyer-checkout-summary-note">
            Final total includes delivery.
          </p>
        </aside>
      </div>

      {showAddressModal && (
        <div
          className="buyer-address-modal-overlay"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !savingAddress) {
              setShowAddressModal(false)
            }
          }}
        >
          <form
            ref={addressModalRef}
            className="buyer-checkout-card buyer-address-modal buyer-checkout-address-modal"
            onSubmit={handleNewAddressSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-new-address-title"
            tabIndex={-1}
          >
            <button
              type="button"
              className="buyer-address-modal-close"
              onClick={() => setShowAddressModal(false)}
              disabled={savingAddress}
              aria-label="Close address form"
            >
              <X size={20} />
            </button>

            <div className="buyer-checkout-section-heading">
              <span><MapPin size={16} /></span>
              <div>
                <h2 id="checkout-new-address-title">Add a new address</h2>
                <p>Enter the recipient and delivery details for this address.</p>
              </div>
            </div>

            <div className="buyer-checkout-fields">
              <label>
                Address name
                <input
                  name="label"
                  value={newAddress.label}
                  onChange={handleNewAddressChange}
                  placeholder="Home, Work, etc."
                  required
                  maxLength={40}
                />
              </label>
              <label className="buyer-checkout-full">
                Recipient name
                <input
                  name="fullName"
                  autoComplete="name"
                  value={newAddress.fullName}
                  onChange={handleNewAddressChange}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={newAddress.email}
                  onChange={handleNewAddressChange}
                  required
                  maxLength={255}
                />
              </label>
              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={newAddress.phone}
                  onChange={handleNewAddressChange}
                  required
                  maxLength={30}
                />
              </label>
              <label className="buyer-checkout-full">
                House number, street, subdivision
                <input
                  name="address"
                  autoComplete="street-address"
                  value={newAddress.address}
                  onChange={handleNewAddressChange}
                  required
                  maxLength={255}
                />
              </label>
              <label>
                Barangay
                <select
                  name="barangay"
                  value={newAddress.barangay}
                  onChange={handleNewAddressChange}
                  required
                >
                  <option value="">Select a barangay</option>
                  {STA_MARIA_BARANGAYS.map(barangay => (
                    <option key={barangay} value={barangay}>{barangay}</option>
                  ))}
                </select>
              </label>
              <label>
                Municipality / city
                <input
                  name="city"
                  autoComplete="address-level2"
                  value={newAddress.city}
                  onChange={handleNewAddressChange}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Postal code
                <input
                  name="postalCode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={newAddress.postalCode}
                  onChange={handleNewAddressChange}
                  required
                  maxLength={12}
                />
              </label>
              <label className="buyer-checkout-full">
                Delivery instructions <span>(optional)</span>
                <textarea
                  name="deliveryNotes"
                  value={newAddress.deliveryNotes}
                  onChange={handleNewAddressChange}
                  rows="2"
                  maxLength={500}
                />
              </label>
            </div>

            {addressError && (
              <p className="buyer-checkout-error" role="alert">
                {addressError}
                {!window.localStorage.getItem('altf4.auth.token') &&
                  !window.sessionStorage.getItem('altf4.auth.token') && (
                    <>
                      {' '}
                      <Link
                        to="/login"
                        state={{ from: `${location.pathname}${location.search}` }}
                      >
                        Sign in
                      </Link>
                    </>
                  )}
              </p>
            )}

            <div className="buyer-address-form-actions">
              <button type="submit" className="buyer-address-add" disabled={savingAddress}>
                {savingAddress ? 'Saving...' : 'Save and use address'}
              </button>
              <button
                type="button"
                className="buyer-address-cancel"
                onClick={() => setShowAddressModal(false)}
                disabled={savingAddress}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
