import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ClipboardList,
  Download,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  Store,
  Users
} from 'lucide-react'
import api from '../../services/api'
import './admin.css'

const navigation = [
  ['overview', 'Overview', BarChart3],
  ['sellers', 'Seller verification', Store],
  ['accounts', 'Accounts', Users],
  ['products', 'Products', Package],
  ['transactions', 'Transactions', ClipboardList],
  ['returns', 'Disputes & returns', AlertTriangle],
  ['settings', 'Platform settings', Settings]
]

const initialSettings = {
  default_shipping_fee: 60,
  buyer_verification_required: false,
  returns_enabled: true,
  return_window_days: 14,
  suspicious_order_amount: 10000,
  support_email: ''
}

const money = amount => `₱${Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`
const showDate = value => value ? new Date(value).toLocaleString() : '—'
const requestMessage = (error, fallback) => error.response?.data?.message || fallback

export default function AdminDashboard({ initialSection = 'overview' }) {
  const [section, setSection] = useState(initialSection)
  const [dashboard, setDashboard] = useState(null)
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState(null)
  const [settings, setSettings] = useState(initialSettings)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedFilter, setAppliedFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadDashboard = useCallback(async () => {
    const { data } = await api.get('/admin/dashboard')
    setDashboard(data.data)
  }, [])

  const loadSection = useCallback(async (targetSection = section, page = 1, append = false) => {
    const endpoints = {
      sellers: '/admin/seller-applications',
      accounts: '/admin/accounts',
      products: '/admin/products',
      transactions: '/admin/transactions',
      returns: '/admin/returns'
    }
    if (targetSection === 'overview') {
      await loadDashboard()
      return
    }
    if (targetSection === 'settings') {
      const { data } = await api.get('/admin/settings')
      setSettings({ ...initialSettings, ...data.data })
      return
    }
    const params = new URLSearchParams()
    if (page > 1) params.set('page', page)
    if (appliedSearch.trim() && ['accounts', 'products', 'transactions'].includes(targetSection)) params.set('search', appliedSearch.trim())
    if (appliedFilter && ['accounts', 'products', 'transactions', 'returns'].includes(targetSection)) params.set('status', appliedFilter)
    const query = params.toString()
    const { data } = await api.get(`${endpoints[targetSection]}${query ? `?${query}` : ''}`)
    if (targetSection === 'sellers') {
      setRecords(data.data)
      setPagination(null)
    } else {
      setRecords(current => append ? [...current, ...data.data.data] : data.data.data)
      setPagination({ currentPage: data.data.current_page, lastPage: data.data.last_page })
    }
  }, [appliedFilter, appliedSearch, loadDashboard, section])

  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => {
        if (active) {
          setLoading(true)
          setError('')
        }
        return loadSection(section)
      })
      .catch(requestError => {
        if (active) setError(requestMessage(requestError, 'Could not load this admin dashboard section.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadSection, section])

  const runAction = async (action, successMessage, refreshSection = section) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      await loadSection(refreshSection)
      await loadDashboard()
      setNotice(successMessage)
    } catch (requestError) {
      setError(requestMessage(requestError, 'The requested admin action could not be completed.'))
    } finally {
      setBusy(false)
    }
  }

  const reviewSeller = (application, status) => {
    const reviewerNote = window.prompt(
      status === 'rejected' ? 'Reason for requesting changes:' : 'Optional approval note:'
    )
    if (reviewerNote === null) return
    runAction(
      () => api.patch(`/admin/seller-applications/${application.id}`, { status, reviewerNote }),
      `Seller application ${status}.`,
      'sellers'
    )
  }

  const downloadDocument = async (application, key) => {
    try {
      const { data } = await api.get(`/admin/seller-applications/${application.id}/documents/${key}`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `${application.shopName}-${key}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestMessage(requestError, 'The document could not be downloaded.'))
    }
  }

  const updateAccount = (account, changes) => {
    let suspensionReason = account.suspensionReason || ''
    if (changes.suspended) {
      suspensionReason = window.prompt('Reason for suspension:', suspensionReason)
      if (suspensionReason === null) return
      if (!suspensionReason.trim()) {
        setError('Enter a reason before suspending an account.')
        return
      }
    } else if (account.suspended) {
      const confirmed = window.confirm(`Restore access for ${account.name}?`)
      if (!confirmed) return
    }
    runAction(
      () => api.patch(`/admin/accounts/${account.id}`, {
        verified: changes.verified ?? account.verified,
        suspended: changes.suspended ?? account.suspended,
        suspensionReason: changes.suspended ? suspensionReason.trim() : null
      }),
      `Account updated for ${account.email}.`,
      'accounts'
    )
  }

  const moderateProduct = product => {
    const suspended = !product.adminSuspended
    let reason = product.moderationReason || ''
    if (suspended) {
      reason = window.prompt(`Why are you restricting "${product.name}"?`, reason)
      if (reason === null) return
      if (!reason.trim()) {
        setError('Enter a reason before restricting a product.')
        return
      }
    } else if (!window.confirm(`Restore "${product.name}" to the marketplace?`)) {
      return
    }
    runAction(
      () => api.patch(`/admin/products/${product.id}/moderation`, { suspended, reason: suspended ? reason.trim() : null }),
      `Product ${suspended ? 'restricted' : 'restored'}.`,
      'products'
    )
  }

  const updateReturn = (item, status) => {
    const adminNote = window.prompt('Note for the buyer (optional):', item.adminNote || '')
    if (adminNote === null) return
    runAction(
      () => api.patch(`/admin/returns/${item.id}`, { status, adminNote }),
      `Return request marked ${status.replace('_', ' ')}.`,
      'returns'
    )
  }

  const saveSettings = event => {
    event.preventDefault()
    runAction(
      () => api.patch('/admin/settings', {
        ...settings,
        default_shipping_fee: Number(settings.default_shipping_fee),
        return_window_days: Number(settings.return_window_days),
        suspicious_order_amount: Number(settings.suspicious_order_amount)
      }).then(({ data }) => setSettings({ ...initialSettings, ...data.data })),
      'Platform settings saved.',
      'settings'
    )
  }

  const downloadReport = async () => {
    try {
      const { data } = await api.get('/admin/transactions/report.csv', { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `marketplace-transactions-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestMessage(requestError, 'The report could not be downloaded.'))
    }
  }

  const changeSection = nextSection => {
    setSection(nextSection)
    setSearch('')
    setFilter('')
    setAppliedSearch('')
    setAppliedFilter('')
    setRecords([])
    setPagination(null)
    setError('')
    setNotice('')
  }

  const searchRecords = event => {
    event.preventDefault()
    if (search === appliedSearch && filter === appliedFilter) {
      setLoading(true)
      loadSection(section)
        .catch(requestError => setError(requestMessage(requestError, 'Search failed.')))
        .finally(() => setLoading(false))
      return
    }
    setAppliedSearch(search)
    setAppliedFilter(filter)
    setRecords([])
    setPagination(null)
    setLoading(true)
  }

  const loadMore = async () => {
    if (!pagination || pagination.currentPage >= pagination.lastPage) return
    setBusy(true)
    try {
      await loadSection(section, pagination.currentPage + 1, true)
    } catch (requestError) {
      setError(requestMessage(requestError, 'Could not load additional records.'))
    } finally {
      setBusy(false)
    }
  }

  const sectionName = navigation.find(([key]) => key === section)?.[1] || 'Overview'
  const metrics = dashboard?.metrics

  return (
    <main className="admin-dashboard">
      <header className="admin-heading">
        <div><span className="admin-eyebrow"><ShieldCheck size={15} /> Administration</span><h1>Platform dashboard</h1><p>Review marketplace activity and manage platform operations.</p></div>
        <Link to="/buyer" className="admin-button secondary">Back to marketplace</Link>
      </header>
      <div className="admin-layout">
        <nav className="admin-nav" aria-label="Administrator sections">
          {navigation.map(([key, label, Icon]) => (
            <button type="button" className={section === key ? 'active' : ''} key={key} onClick={() => changeSection(key)}>
              <Icon size={17} /> {label}
              {key === 'sellers' && metrics?.pendingSellerApplications > 0 && <span>{metrics.pendingSellerApplications}</span>}
              {key === 'returns' && metrics?.pendingReturns > 0 && <span>{metrics.pendingReturns}</span>}
            </button>
          ))}
        </nav>
        <section className="admin-content">
          <div className="admin-section-heading"><h2>{sectionName}</h2><button type="button" className="admin-button secondary" onClick={() => loadSection(section).catch(requestError => setError(requestMessage(requestError, 'Refresh failed.')))}><RefreshCw size={15} /> Refresh</button></div>
          {error && <p className="admin-alert" role="alert">{error}</p>}
          {notice && <p className="admin-success" role="status">{notice}</p>}
          {loading ? <p className="admin-empty">Loading...</p> : null}

          {!loading && section === 'overview' && metrics && (
            <>
              <div className="admin-metrics">
                <article><span>Buyer & seller accounts</span><strong>{metrics.users}</strong><small>{metrics.verifiedUsers} verified · {metrics.suspendedUsers} suspended</small></article>
                <article><span>Pending seller reviews</span><strong>{metrics.pendingSellerApplications}</strong><small>{metrics.sellerApplications} total seller applications</small></article>
                <article><span>Marketplace products</span><strong>{metrics.activeProducts}</strong><small>{metrics.suspendedProducts} restricted · {metrics.products} total</small></article>
                <article><span>Transactions</span><strong>{metrics.orders}</strong><small>{metrics.pendingOrders} pending · {metrics.completedOrders} delivered</small></article>
                <article><span>Marketplace revenue</span><strong>{money(metrics.revenue)}</strong><small>Excludes cancelled, returned, and refunded orders</small></article>
                <article><span>Open return requests</span><strong>{metrics.pendingReturns}</strong><small>{metrics.reviews} product reviews submitted</small></article>
              </div>
              <section className="admin-panel">
                <h3>Monthly transaction activity</h3>
                <div className="admin-month-grid">{dashboard.monthlyOrders.map(month => <article key={month.month}><strong>{month.month}</strong><span>{month.orders} orders</span><b>{money(month.revenue)}</b></article>)}</div>
              </section>
              <p className="admin-info"><AlertTriangle size={17} /> Suspicious transaction flags are screening signals based on the configured amount and order-frequency thresholds. Review each flag; it is not proof of wrongdoing.</p>
            </>
          )}

          {!loading && section === 'sellers' && (
            <div className="admin-record-list">
              {records.map(application => (
                <article className="admin-record" key={application.id}>
                  <header><div><h3>{application.shopName}</h3><span>{application.applicant?.name} · {application.applicant?.email}</span></div><b>{application.category}</b></header>
                  <p><strong>Business:</strong> {application.details.businessName} · {application.details.registrationType?.toUpperCase()}</p>
                  <p><strong>Address:</strong> {application.details.businessAddress}, {application.details.businessBarangay}, {application.details.businessCity}</p>
                  <p><strong>Contact:</strong> {application.details.shopPhone} · {application.details.shopEmail}</p>
                  <div className="admin-documents"><strong>Documents:</strong>{Object.keys(application.documents || {}).length ? Object.keys(application.documents).map(key => <button key={key} type="button" onClick={() => downloadDocument(application, key)}><Download size={14} /> {key}</button>) : <span>None uploaded</span>}</div>
                  <footer><button type="button" className="admin-button danger" disabled={busy} onClick={() => reviewSeller(application, 'rejected')}>Request changes</button><button type="button" className="admin-button primary" disabled={busy} onClick={() => reviewSeller(application, 'approved')}><CheckCircle size={15} /> Approve seller</button></footer>
                </article>
              ))}
              {!records.length && <p className="admin-empty">No seller applications are waiting for review.</p>}
            </div>
          )}

          {!loading && ['accounts', 'products', 'transactions', 'returns'].includes(section) && (
            <>
              <form className="admin-filters" onSubmit={searchRecords}>
                {['accounts', 'products', 'transactions'].includes(section) && <input value={search} onChange={event => setSearch(event.target.value)} placeholder={section === 'accounts' ? 'Search name or email' : section === 'products' ? 'Search product, category, SKU' : 'Search order, buyer, shop'} />}
                <select value={filter} onChange={event => setFilter(event.target.value)}>
                  <option value="">All statuses</option>
                  {section === 'accounts' && <><option value="unverified">Unverified</option><option value="suspended">Suspended</option></>}
                  {section === 'products' && <><option value="inactive">Hidden by seller</option><option value="suspended">Admin restricted</option></>}
                  {section === 'transactions' && ['Order placed', 'Preparing', 'Ready to ship', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'].map(status => <option key={status}>{status}</option>)}
                  {section === 'returns' && ['pending', 'under_review', 'approved', 'rejected', 'resolved'].map(status => <option key={status}>{status.replace('_', ' ')}</option>)}
                </select>
                <button className="admin-button primary" type="submit">Apply</button>
                {section === 'transactions' && <button className="admin-button secondary" type="button" onClick={downloadReport}><Download size={15} /> CSV report</button>}
              </form>

              {section === 'accounts' && <div className="admin-record-list">{records.map(account => (
                <article className="admin-record admin-row-record" key={account.id}>
                  <div><h3>{account.name}</h3><span>{account.email}{account.phone ? ` · ${account.phone}` : ''}</span><small>Joined {showDate(account.createdAt)} · {account.ordersCount} orders</small>{account.sellerApplication && <small>{account.sellerApplication.shopName} · seller {account.sellerApplication.status}</small>}{account.suspensionReason && <small className="admin-danger-text">Reason: {account.suspensionReason}</small>}</div>
                  <div className="admin-actions"><button type="button" className="admin-button secondary" disabled={busy || account.suspended} onClick={() => updateAccount(account, { verified: !account.verified })}>{account.verified ? 'Unverify account' : 'Verify account'}</button><button type="button" className={`admin-button ${account.suspended ? 'primary' : 'danger'}`} disabled={busy} onClick={() => updateAccount(account, { suspended: !account.suspended })}>{account.suspended ? 'Restore access' : 'Suspend account'}</button></div>
                </article>
              ))}{!records.length && <p className="admin-empty">No accounts match your search.</p>}</div>}

              {section === 'products' && <div className="admin-record-list">{records.map(product => (
                <article className="admin-record admin-product-record" key={product.id}>
                  <img src={product.imageUrl} alt="" /><div><h3>{product.name}</h3><span>{product.shopName} · {product.category}{product.sku ? ` · SKU ${product.sku}` : ''}</span><small>{money(product.price)} · {product.stock} in stock · {product.isActive ? 'Seller listed' : 'Hidden by seller'}{product.sellerStatus !== 'approved' ? ` · seller ${product.sellerStatus}` : ''}</small>{product.moderationReason && <small className="admin-danger-text">Restriction reason: {product.moderationReason}</small>}</div><button type="button" className={`admin-button ${product.adminSuspended ? 'primary' : 'danger'}`} disabled={busy} onClick={() => moderateProduct(product)}>{product.adminSuspended ? 'Restore listing' : 'Restrict listing'}</button>
                </article>
              ))}{!records.length && <p className="admin-empty">No products match your search.</p>}</div>}

              {section === 'transactions' && <div className="admin-record-list">{records.map(order => (
                <article className={`admin-record ${order.suspicious ? 'admin-suspicious' : ''}`} key={order.id}>
                  <header><div><h3>Order {order.id}</h3><span>{showDate(order.placedAt)} · {order.status}</span></div><strong>{money(order.total)}</strong></header>
                  <p><strong>Buyer:</strong> {order.buyer.name} ({order.buyer.email}) · <strong>Shop:</strong> {order.shopName}</p>
                  <p>{order.items.map(item => `${item.name} × ${item.quantity}`).join(' · ')}</p>
                  <small>Subtotal {money(order.subtotal)} · shipping {money(order.shippingFee)} · discount {money(order.discountAmount)} · {order.paymentMethod}</small>
                  {order.returnStatus && <small>Return request: {order.returnStatus.replace('_', ' ')}</small>}
                  {order.suspicious && <div className="admin-warning"><AlertTriangle size={15} /> Review flag: {order.suspiciousReasons.join(' ')}</div>}
                </article>
              ))}{!records.length && <p className="admin-empty">No transactions match the selected filters.</p>}</div>}

              {section === 'returns' && <>
                <p className="admin-settings-hint">Approvals record the platform decision only; refunds and shipping-label processing are not automated.</p>
                <div className="admin-record-list">{records.map(item => (
                  <article className="admin-record" key={item.id}>
                    <header><div><h3>Return request · Order {item.order.id}</h3><span>{item.status.replace('_', ' ')} · {showDate(item.createdAt)}</span></div><strong>{money(item.order.total)}</strong></header>
                    <p><strong>{item.reason}</strong> · {item.description}</p>
                    <p>Buyer: {item.buyer.name} ({item.buyer.email}) · Shop: {item.order.shopName} · Order status: {item.order.status}</p>
                    <small>{item.order.items.map(product => `${product.name} × ${product.quantity}`).join(' · ')}</small>
                    {item.adminNote && <p className="admin-note">Previous note: {item.adminNote}</p>}
                    <footer>
                      {item.status === 'pending' && <button type="button" className="admin-button secondary" disabled={busy} onClick={() => updateReturn(item, 'under_review')}>Start review</button>}
                      {['pending', 'under_review'].includes(item.status) && <><button type="button" className="admin-button danger" disabled={busy} onClick={() => updateReturn(item, 'rejected')}>Reject</button><button type="button" className="admin-button primary" disabled={busy} onClick={() => updateReturn(item, 'approved')}>Approve</button></>}
                      {item.status === 'approved' && <button type="button" className="admin-button primary" disabled={busy} onClick={() => updateReturn(item, 'resolved')}>Mark resolved</button>}
                    </footer>
                  </article>
                ))}{!records.length && <p className="admin-empty">No return or dispute requests match the selected filter.</p>}</div>
              </>}
              {pagination && pagination.currentPage < pagination.lastPage && <button type="button" className="admin-button secondary admin-load-more" disabled={busy} onClick={loadMore}>{busy ? 'Loading…' : 'Load more'}</button>}
            </>
          )}

          {!loading && section === 'settings' && (
            <form className="admin-settings admin-panel" onSubmit={saveSettings}>
              <p>These controls are enforced by checkout, return-request, and transaction-review flows.</p>
              <label>Default shipping fee (₱)<input type="number" min="0" step="0.01" value={settings.default_shipping_fee} onChange={event => setSettings(current => ({ ...current, default_shipping_fee: event.target.value }))} /></label>
              <label>Suspicious order amount threshold (₱)<input type="number" min="0.01" step="0.01" value={settings.suspicious_order_amount} onChange={event => setSettings(current => ({ ...current, suspicious_order_amount: event.target.value }))} /></label>
              <label>Return request window (days)<input type="number" min="1" max="365" value={settings.return_window_days} onChange={event => setSettings(current => ({ ...current, return_window_days: event.target.value }))} /></label>
              <label>Marketplace support email<input type="email" maxLength="255" value={settings.support_email || ''} onChange={event => setSettings(current => ({ ...current, support_email: event.target.value }))} /></label>
              <label className="admin-checkbox"><input type="checkbox" checked={settings.buyer_verification_required} onChange={event => setSettings(current => ({ ...current, buyer_verification_required: event.target.checked }))} /> Require admin-verified buyer accounts at checkout</label>
              <label className="admin-checkbox"><input type="checkbox" checked={settings.returns_enabled} onChange={event => setSettings(current => ({ ...current, returns_enabled: event.target.checked }))} /> Accept buyer return requests</label>
              <button type="submit" className="admin-button primary" disabled={busy}>{busy ? 'Saving…' : 'Save platform settings'}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
