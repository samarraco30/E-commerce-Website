import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import api from '../../services/api'
import { STA_MARIA_BARANGAYS } from '../../data/staMariaAddresses'
import '../../styles/buyer/buyer-checkout.css'

const blankAddress = {
  label: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  barangay: '',
  city: 'Sta. Maria',
  postalCode: '',
  deliveryNotes: ''
}

export default function AddressBookPage() {
  const [addresses, setAddresses] = useState([])
  const [form, setForm] = useState(blankAddress)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const modalRef = useRef(null)

  const loadAddresses = async () => {
    const { data } = await api.get('/addresses')
    setAddresses(data.data)
  }

  useEffect(() => {
    let active = true
    api.get('/addresses')
      .then(({ data }) => {
        if (active) setAddresses(data.data)
      })
      .catch(() => {
        if (active) setError('We could not load your saved addresses. Please try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!showForm) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modalRef.current?.focus()

    const closeOnEscape = event => {
      if (event.key === 'Escape' && !saving) setShowForm(false)
    }
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [showForm, saving])

  const handleChange = event => {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  }

  const openNewAddress = () => {
    setEditingId(null)
    setForm(blankAddress)
    setError('')
    setShowForm(true)
  }

  const startRename = address => {
    setEditingId(address.id)
    setForm({ ...blankAddress, label: address.label })
    setError('')
    setShowForm(true)
  }

  const handleSubmit = event => {
    event.preventDefault()
    setError('')
    setSaving(true)

    const request = editingId
      ? api.patch(`/addresses/${editingId}`, { label: form.label.trim() })
      : api.post('/addresses', {
          ...form,
          label: form.label.trim(),
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postalCode: form.postalCode.trim(),
          deliveryNotes: form.deliveryNotes.trim()
        })

    request
      .then(async () => {
        await loadAddresses()
        setError('')
        setShowForm(false)
        setEditingId(null)
      })
      .catch(requestError => {
        setError(
          requestError.response?.data?.message ||
          'We could not save this address. Please check the details and try again.'
        )
      })
      .finally(() => setSaving(false))
  }

  const setDefault = async addressId => {
    setError('')
    try {
      await api.patch(`/addresses/${addressId}`, { isDefault: true })
      await loadAddresses()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not update your default address.')
    }
  }

  const removeAddress = async addressId => {
    if (!window.confirm('Remove this saved address?')) return
    setError('')
    try {
      const { data } = await api.delete(`/addresses/${addressId}`)
      setAddresses(data.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not remove this address.')
    }
  }

  return (
    <section className="buyer-address-page">
      <div className="buyer-address-heading">
        <div>
          <span className="buyer-eyebrow">DELIVERY PREFERENCES</span>
          <h1>My addresses</h1>
          <p>Save addresses for faster checkout. Your default is selected automatically.</p>
        </div>
        <button type="button" className="buyer-address-add" onClick={openNewAddress}>
          <Plus size={17} /> Add new address
        </button>
      </div>

      {error && <p className="buyer-checkout-error" role="alert">{error}</p>}

      {showForm && (
        <div
          className="buyer-address-modal-overlay"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !saving) setShowForm(false)
          }}
        >
          <form
            ref={modalRef}
            className="buyer-checkout-card buyer-address-modal buyer-address-form"
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="buyer-address-modal-title"
            tabIndex={-1}
          >
            <button
              type="button"
              className="buyer-address-modal-close"
              onClick={() => setShowForm(false)}
              disabled={saving}
              aria-label="Close address form"
            >
              <X size={20} />
            </button>
            <div className="buyer-checkout-section-heading">
              <span><MapPin size={16} /></span>
              <div>
                <h2 id="buyer-address-modal-title">{editingId ? 'Rename saved address' : 'Add a delivery address'}</h2>
                <p>{editingId ? 'Choose a name that helps you recognize this address.' : 'Enter your delivery details to save this address to your account.'}</p>
              </div>
            </div>

            <div className="buyer-checkout-fields">
            <label>
              Address name
              <input name="label" value={form.label} onChange={handleChange} placeholder="Home, Work, etc." required maxLength={40} />
            </label>
            {!editingId && (
              <>
                <label>
                  Recipient name
                  <input name="fullName" autoComplete="name" value={form.fullName} onChange={handleChange} required maxLength={120} />
                </label>
                <label>
                  Email address
                  <input name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} required maxLength={255} />
                </label>
                <label>
                  Phone number
                  <input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={handleChange} required maxLength={30} />
                </label>
                <label className="buyer-checkout-full">
                  House number, street, subdivision
                  <input name="address" autoComplete="street-address" value={form.address} onChange={handleChange} required maxLength={255} />
                </label>
                <label>
                  Barangay
                  <select name="barangay" value={form.barangay} onChange={handleChange} required>
                    <option value="">Select a barangay</option>
                    {STA_MARIA_BARANGAYS.map(barangay => <option key={barangay} value={barangay}>{barangay}</option>)}
                  </select>
                </label>
                <label>
                  Municipality
                  <input name="city" value={form.city} onChange={handleChange} required maxLength={120} />
                </label>
                <label>
                  Postal code
                  <input name="postalCode" inputMode="numeric" autoComplete="postal-code" value={form.postalCode} onChange={handleChange} required maxLength={12} />
                </label>
                <label className="buyer-checkout-full">
                  Delivery instructions <span>(optional)</span>
                  <textarea name="deliveryNotes" value={form.deliveryNotes} onChange={handleChange} rows="2" maxLength={500} />
                </label>
              </>
            )}
          </div>

            {error && <p className="buyer-checkout-error" role="alert">{error}</p>}
            <div className="buyer-address-form-actions">
              <button type="submit" className="buyer-address-add" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save name' : 'Save address'}
              </button>
              <button type="button" className="buyer-address-cancel" onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p role="status">Loading your saved addresses...</p>
      ) : addresses.length === 0 ? (
        <div className="buyer-checkout-empty">
          <MapPin size={36} />
          <h2>No saved addresses yet</h2>
          <p>Add your home or work address for quicker checkout.</p>
          <button type="button" className="buyer-address-add" onClick={openNewAddress}>
            <Plus size={17} /> Add an address
          </button>
        </div>
      ) : (
        <div className="buyer-address-list">
          {addresses.map(address => (
            <article className="buyer-address-card" key={address.id}>
              <div className="buyer-address-card-heading">
                <strong>{address.label}</strong>
                {address.isDefault && <span className="buyer-address-default"><Star size={13} fill="currentColor" /> Default</span>}
              </div>
              <p><strong>{address.fullName}</strong> · {address.phone}</p>
              <p>{address.address}, {address.barangay}, {address.city}, {address.postalCode}</p>
              {address.deliveryNotes && <p className="buyer-address-notes">{address.deliveryNotes}</p>}
              <div className="buyer-address-actions">
                {!address.isDefault && (
                  <button type="button" onClick={() => setDefault(address.id)}>
                    <Star size={14} /> Set as default
                  </button>
                )}
                <button type="button" onClick={() => startRename(address)}>
                  <Pencil size={14} /> Rename
                </button>
                <button type="button" className="buyer-address-delete" onClick={() => removeAddress(address.id)}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Link to="/buyer/checkout" className="buyer-address-back">Return to checkout</Link>
    </section>
  )
}
