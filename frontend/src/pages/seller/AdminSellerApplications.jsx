import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react'
import api from '../../services/api'
import './seller.css'

const documentLabels = {
  governmentId: 'Government ID',
  proofBusinessAddress: 'Proof of business address',
  leaseContract: 'Lease contract',
  locationSketch: 'Location sketch',
  businessRegistration: 'DTI / SEC registration',
  mayorPermit: 'Mayor’s permit',
  barangayClearance: 'Barangay clearance',
  zoningClearance: 'Zoning clearance',
  fireSafetyCertificate: 'Fire safety certificate',
  occupancyPermit: 'Occupancy permit',
  sanitaryPermit: 'Sanitary permit'
}

export default function AdminSellerApplications() {
  const [applications, setApplications] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadApplications = async () => {
    const { data } = await api.get('/admin/seller-applications')
    setApplications(data.data)
  }

  useEffect(() => {
    let active = true
    api.get('/admin/seller-applications')
      .then(({ data }) => {
        if (active) setApplications(data.data)
      })
      .catch(requestError => {
        if (active) {
          setError(requestError.response?.data?.message || 'You cannot access seller application reviews.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const review = async (application, status) => {
    const reviewerNote = window.prompt(
      status === 'rejected' ? 'Reason for requesting changes:' : 'Optional approval note:'
    )
    if (reviewerNote === null) return
    setError('')
    try {
      await api.patch(`/admin/seller-applications/${application.id}`, {
        status,
        reviewerNote: reviewerNote || ''
      })
      await loadApplications()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The application could not be updated.')
    }
  }

  const downloadDocument = async (application, key) => {
    setError('')
    try {
      const { data } = await api.get(
        `/admin/seller-applications/${application.id}/documents/${key}`,
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `${application.shopName}-${key}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The document could not be downloaded.')
    }
  }

  return (
    <main className="seller-page seller-admin-page">
      <Link to="/buyer" className="seller-back-link"><ArrowLeft size={17} /> Marketplace</Link>
      <header className="seller-page-heading">
        <span className="seller-eyebrow"><ShieldCheck size={15} /> ADMIN REVIEW</span>
        <h1>Seller applications</h1>
        <p>Check shop details and submitted business documents before approving a seller.</p>
      </header>

      {error && <p className="seller-alert" role="alert">{error}</p>}
      {loading ? <p className="seller-loading">Loading applications...</p> : null}
      {!loading && !error && !applications.length && <p className="seller-empty">There are no seller applications waiting for review.</p>}

      <div className="seller-admin-list">
        {applications.map(application => (
          <article className="seller-admin-card" key={application.id}>
            <header>
              <div><h2>{application.shopName}</h2><p>{application.applicant?.name} · {application.applicant?.email}</p></div>
              <span>{application.category}</span>
            </header>
            <div className="seller-admin-details">
              <p><strong>Business:</strong> {application.details.businessName} ({application.details.registrationType?.toUpperCase()})</p>
              <p><strong>Address:</strong> {application.details.businessAddress}, {application.details.businessBarangay}, {application.details.businessCity}</p>
              <p><strong>Pickup:</strong> {application.details.pickupAddress}, {application.details.pickupBarangay}, {application.details.pickupCity}</p>
              <p><strong>Contact:</strong> {application.details.shopPhone} · {application.details.shopEmail}</p>
              <p><strong>Payout:</strong> {application.details.payoutBank} · {application.details.payoutAccountName} · {application.details.payoutAccountNumber}</p>
              {application.details.shopeeAccount && <p><strong>Shopee account:</strong> {application.details.shopeeAccount}</p>}
            </div>
            <div className="seller-admin-documents">
              <strong>Documents</strong>
              {Object.entries(application.documents || {}).length ? Object.entries(application.documents).map(([key]) => (
                <button type="button" key={key} onClick={() => downloadDocument(application, key)}>
                  <FileText size={15} /> {documentLabels[key] || key}
                </button>
              )) : <span>No documents uploaded</span>}
            </div>
            <footer>
              <button className="seller-danger-button" onClick={() => review(application, 'rejected')}>Request changes</button>
              <button className="seller-primary-button" onClick={() => review(application, 'approved')}>Approve seller</button>
            </footer>
          </article>
        ))}
      </div>
    </main>
  )
}
