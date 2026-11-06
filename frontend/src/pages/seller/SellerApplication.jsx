import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileText, Store } from 'lucide-react'
import api from '../../services/api'
import './seller.css'

const categories = [
  'Agricultural Products',
  'Food & Beverages',
  'Local Delicacies',
  'Handicrafts',
  'Poultry & Chicken',
  'Pasalubong'
]

const initialForm = {
  shopName: '',
  category: categories[0],
  businessName: '',
  registrationType: 'dti',
  registrationNumber: '',
  businessAddress: '',
  businessBarangay: '',
  businessCity: 'Sta. Maria',
  shopPhone: '',
  shopEmail: '',
  shopeeAccount: '',
  pickupAddress: '',
  pickupBarangay: '',
  pickupCity: 'Sta. Maria',
  payoutAccountName: '',
  payoutBank: '',
  payoutAccountNumber: ''
}

const documents = [
  ['governmentId', 'Valid government-issued ID', true],
  ['proofBusinessAddress', 'Proof of business address', true],
  ['businessRegistration', 'DTI or SEC registration', true],
  ['mayorPermit', 'Mayor’s / Business Permit', true],
  ['barangayClearance', 'Barangay Business Clearance', false],
  ['leaseContract', 'Contract of lease (if renting)', false],
  ['locationSketch', 'Location sketch or map', false],
  ['zoningClearance', 'Zoning clearance (if required)', false],
  ['fireSafetyCertificate', 'Fire safety certificate (if required)', false],
  ['occupancyPermit', 'Occupancy permit (if applicable)', false],
  ['sanitaryPermit', 'Sanitary permit (if applicable)', false]
]

const sections = [
  {
    title: 'Shop information',
    fields: [
      ['shopName', 'Shop name', 'text'],
      ['category', 'Main product category', 'select'],
      ['shopPhone', 'Shop mobile number', 'tel'],
      ['shopEmail', 'Shop email address', 'email'],
      ['shopeeAccount', 'Active Shopee account / shop name', 'text']
    ]
  },
  {
    title: 'Business registration',
    fields: [
      ['businessName', 'Registered business name', 'text'],
      ['registrationType', 'Business type', 'registration'],
      ['registrationNumber', 'DTI / SEC registration number', 'text'],
      ['businessAddress', 'Business street address', 'text'],
      ['businessBarangay', 'Business barangay', 'text'],
      ['businessCity', 'City / municipality', 'text']
    ]
  },
  {
    title: 'Pickup address',
    fields: [
      ['pickupAddress', 'Pickup street address', 'text'],
      ['pickupBarangay', 'Pickup barangay', 'text'],
      ['pickupCity', 'Pickup city / municipality', 'text']
    ]
  },
  {
    title: 'Payout account',
    fields: [
      ['payoutAccountName', 'Account holder name', 'text'],
      ['payoutBank', 'Bank or eligible payout provider', 'text'],
      ['payoutAccountNumber', 'Account number', 'text']
    ]
  }
]

function applicationFormData(application) {
  return {
    ...initialForm,
    ...(application?.details || {}),
    shopName: application?.shopName || application?.details?.shopName || '',
    category: application?.category || initialForm.category
  }
}

export default function SellerApplication() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [application, setApplication] = useState(null)
  const [testingAvailable, setTestingAvailable] = useState(false)
  const [files, setFiles] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/seller/application')
      .then(({ data }) => {
        setApplication(data.data)
        setTestingAvailable(data.testingAvailable === true)
        if (data.data) setForm(applicationFormData(data.data))
      })
      .catch(requestError => {
        setError(requestError.response?.data?.message || 'We could not load your seller application.')
      })
      .finally(() => setLoading(false))
  }, [])

  const activateTestSeller = async () => {
    setError('')
    setSubmitting(true)
    try {
      await api.post('/seller/test-activate')
      navigate('/seller', { replace: true })
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Test seller activation is only available in local development.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = event => {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const body = new FormData()
    Object.entries(form).forEach(([name, value]) => body.append(name, value))
    Object.entries(files).forEach(([name, file]) => {
      if (file) body.append(name, file)
    })

    try {
      const { data } = await api.post('/seller/application', body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setApplication(data.data)
      setFiles({})
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors
      const firstValidationError = validationErrors
        ? Object.values(validationErrors).flat()[0]
        : null
      setError(
        firstValidationError ||
        requestError.response?.data?.message ||
        'We could not submit your application. Check the form and try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <main className="seller-page"><p className="seller-loading">Loading your seller application...</p></main>
  }

  if (application?.status === 'approved') {
    return (
      <main className="seller-page">
        <section className="seller-status-card">
          <CheckCircle2 size={42} />
          <span className="seller-eyebrow">APPLICATION APPROVED</span>
          <h1>Welcome, {application.shopName}!</h1>
          <p>Your shop is ready. Start listing products and managing your seller account.</p>
          <Link className="seller-primary-button" to="/seller">Open seller dashboard</Link>
        </section>
      </main>
    )
  }

  if (application?.status === 'pending') {
    return (
      <main className="seller-page">
        <section className="seller-status-card">
          <FileText size={42} />
          <span className="seller-eyebrow">APPLICATION UNDER REVIEW</span>
          <h1>Thanks for applying, {application.shopName}.</h1>
          <p>Our team will review your business information and submitted documents. Your account remains a buyer account while the application is being reviewed.</p>
          <p className="seller-status-note">You can continue shopping from your buyer account.</p>
          {testingAvailable && (
            <div className="seller-test-shortcut">
              <strong>For local testing only</strong>
              <p>Skip the application review and open a test seller dashboard for this account.</p>
              <button type="button" className="seller-primary-button" onClick={activateTestSeller} disabled={submitting}>
                {submitting ? 'Activating test seller...' : 'Skip application — activate test seller'}
              </button>
            </div>
          )}
          <Link className="seller-secondary-button" to="/buyer">Return to buyer home</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="seller-page">
      <Link to="/buyer" className="seller-back-link"><ArrowLeft size={17} /> Back to marketplace</Link>
      <header className="seller-page-heading">
        <span className="seller-eyebrow"><Store size={15} /> SELL ON ALT F4</span>
        <h1>{application?.status === 'rejected' ? 'Update your seller application' : 'Become a seller'}</h1>
        <p>Apply to open a local shop. You can keep using your existing account as a buyer while your application is reviewed.</p>
      </header>

      {application?.status === 'rejected' && (
        <div className="seller-alert" role="status">
          <strong>Changes requested:</strong> {application.reviewerNote || 'Please review your details and submit the application again.'}
        </div>
      )}

      {testingAvailable && (
        <aside className="seller-test-shortcut">
          <strong>Testing this account?</strong>
          <p>Skip the seller application and activate a sample seller dashboard locally. This option is disabled outside local development.</p>
          <button type="button" className="seller-primary-button" onClick={activateTestSeller} disabled={submitting}>
            {submitting ? 'Activating test seller...' : 'Skip application — activate test seller'}
          </button>
        </aside>
      )}

      <form className="seller-application-form" onSubmit={handleSubmit}>
        {sections.map(section => (
          <section className="seller-form-section" key={section.title}>
            <h2>{section.title}</h2>
            <div className="seller-form-grid">
              {section.fields.map(([name, label, type]) => (
                <label key={name}>
                  {label}
                  {type === 'select' ? (
                    <select name={name} value={form[name]} onChange={handleChange} required>
                      {categories.map(category => <option key={category}>{category}</option>)}
                    </select>
                  ) : type === 'registration' ? (
                    <select name={name} value={form[name]} onChange={handleChange} required>
                      <option value="dti">Sole proprietorship (DTI)</option>
                      <option value="sec">Partnership or corporation (SEC)</option>
                    </select>
                  ) : (
                    <input
                      name={name}
                      type={type}
                      value={form[name]}
                      onChange={handleChange}
                      required
                      maxLength={name === 'payoutAccountNumber' ? 120 : 255}
                      autoComplete={name.includes('Email') || name === 'shopEmail' ? 'email' : undefined}
                    />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="seller-form-section">
          <div className="seller-section-heading">
            <div>
              <h2>Business documents</h2>
              <p>Upload clear PDF, JPG, or PNG copies. Each file can be up to 10 MB. Some permits are conditional; upload those that apply to your business.</p>
            </div>
          </div>
          <div className="seller-document-grid">
            {documents.map(([name, label, required]) => (
              <label className="seller-file-field" key={name}>
                <span>{label}{required && <b> · Required for review</b>}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  required={required && !application?.documents?.[name]}
                  onChange={event => setFiles(current => ({
                    ...current,
                    [name]: event.target.files?.[0] || null
                  }))}
                />
                {files[name] && <small>{files[name].name}</small>}
                {application?.documents?.[name] && !files[name] && <small>Previously uploaded</small>}
              </label>
            ))}
          </div>
          <p className="seller-privacy-note">Documents and payout details are stored privately and are only available to you and authorized reviewers.</p>
        </section>

        {error && <p className="seller-alert" role="alert">{error}</p>}
        <div className="seller-submit-row">
          <span>Applications are reviewed before selling is enabled.</span>
          <button type="submit" className="seller-primary-button" disabled={submitting}>
            {submitting ? 'Submitting application...' : 'Submit seller application'}
          </button>
        </div>
      </form>
    </main>
  )
}
