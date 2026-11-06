import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Package,
  MessageSquareText,
  Plus,
  Percent,
  Store
} from 'lucide-react'
import api from '../../services/api'
import './seller.css'

const categorySubcategories = {
  Agriculture: ['Rice', 'Vegetables', 'Fruits', 'Root crops', 'Eggs', 'Poultry', 'Livestock'],
  Pasalubong: ['Chicharon', 'Kakanin', 'Sweets', 'Pastries', 'Delicacies'],
  Handicrafts: ['Bamboo', 'Wood', 'Rattan', 'Woven', 'Pottery', 'Souvenirs'],
  'Local Livelihood': ['Handmade soaps', 'Candles', 'Bags', 'Home products'],
  'Native Products': ['Traditional kitchenware', 'Household items', 'Farming tools'],
  Gardening: ['Seeds', 'Seedlings', 'Fertilizer', 'Soil', 'Gardening tools'],
  'Processed Products': ['Dried goods', 'Bottled products', 'Preserved food'],
  'Agricultural Products': ['Rice', 'Vegetables', 'Fruits', 'Root crops', 'Eggs', 'Poultry', 'Livestock'],
  'Food & Beverages': ['Local delicacies', 'Beverages', 'Pastries', 'Preserved food'],
  'Local Delicacies': ['Chicharon', 'Kakanin', 'Sweets', 'Pastries', 'Delicacies'],
  'Poultry & Chicken': ['Eggs', 'Chicken', 'Poultry']
}
const categories = Object.keys(categorySubcategories)
const makeVariationKey = options => JSON.stringify([...options].sort((left, right) => left.name.localeCompare(right.name)))
const makeVariationCombinations = (groups, existing = [], basePrice = '') => {
  if (!groups.length) return []
  const combinations = groups.reduce((prefixes, group) => prefixes.flatMap(prefix =>
    group.options.map(value => [...prefix, { name: group.name, value }])
  ), [[]])
  return combinations.map(options => {
    const saved = existing.find(item => makeVariationKey(item.options) === makeVariationKey(options))
    return {
      options,
      price: saved?.price ?? basePrice,
      stock: saved?.stock ?? 0,
      sku: saved?.sku ?? '',
      imageIndex: saved?.imageIndex ?? ''
    }
  })
}
const compressImage = async file => {
  const bitmap = await createImageBitmap(file)
  if (bitmap.width < 300 || bitmap.height < 300 || bitmap.width > 6000 || bitmap.height > 6000) {
    bitmap.close()
    throw new Error('Photos must be at least 300x300 and no larger than 6000x6000 pixels.')
  }
  if (file.size <= 1024 * 1024) {
    bitmap.close()
    return file
  }
  const scale = Math.min(1, 1920 / bitmap.width, 1920 / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Photo compression is unavailable in this browser.')
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const compressed = await new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob
      ? resolve(blob)
      : reject(new Error('The selected photo could not be compressed.')), 'image/webp', 0.82)
  })
  if (compressed.size > 5 * 1024 * 1024) {
    throw new Error('A photo is still larger than 5 MB after compression. Choose a smaller image.')
  }
  return new File([compressed], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp', lastModified: file.lastModified })
}

const emptyProduct = {
  name: '',
  category: categories[0],
  description: '',
  price: '',
  unit: 'per piece',
  stock: '0',
  imageUrl: '',
  variations: [],
  variationCombinations: [],
  subcategory: '',
  sku: '',
  details: {
    productType: '',
    brand: '',
    originBarangay: '',
    barcode: '',
    weight: '',
    weightUnit: 'kg',
    dimensions: { length: '', width: '', height: '' },
    packagingType: '',
    minimumOrder: '1',
    maximumOrder: '',
    expirationDate: '',
    shelfLife: '',
    shippingNotes: '',
    producerName: '',
    productSource: '',
    locallyProduced: true,
    productionMethod: '',
    productStory: '',
    videoCoverIndex: ''
  },
  isActive: true
}

const sections = [
  ['overview', 'Dashboard', LayoutDashboard],
  ['products', 'My Products', Package],
  ['inventory', 'Inventory', Boxes],
  ['orders', 'Orders', ClipboardList],
  ['discounts', 'Discounts', Percent],
  ['feedback', 'Feedback', MessageSquareText],
  ['wallet', 'Wallet', CircleDollarSign],
  ['analytics', 'Analytics', BarChart3],
  ['settings', 'Shop Settings', Store]
]

const formatPeso = amount => `₱${Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`
const discountLabel = discount => {
  if (discount.type === 'fixed_amount') return `${formatPeso(discount.amount)} off`
  if (discount.type === 'minimum_spend') return `${formatPeso(discount.amount)} off on spends of ${formatPeso(discount.minimum_spend)} or more`
  return `${discount.percentage}% off`
}

export default function SellerDashboard() {
  const [section, setSection] = useState('overview')
  const [dashboard, setDashboard] = useState(null)
  const [application, setApplication] = useState(null)
  const [sellerOrders, setSellerOrders] = useState([])
  const [discounts, setDiscounts] = useState([])
  const [reviews, setReviews] = useState([])
  const [productForm, setProductForm] = useState(emptyProduct)
  const [productImageFiles, setProductImageFiles] = useState([])
  const [producerImageFiles, setProducerImageFiles] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [galleryDragIndex, setGalleryDragIndex] = useState(null)
  const [existingImages, setExistingImages] = useState([])
  const [existingProducerImages, setExistingProducerImages] = useState([])
  const [existingVideoUrl, setExistingVideoUrl] = useState('')
  const [mediaWarning, setMediaWarning] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const [discountForm, setDiscountForm] = useState({
    name: '',
    code: '',
    type: 'percentage',
    value: '',
    minimumSpend: '',
    maxUses: '',
    startsAt: '',
    endsAt: ''
  })
  const [reviewResponses, setReviewResponses] = useState({})
  const [trackingNumbers, setTrackingNumbers] = useState({})
  const [orderStatusFilter, setOrderStatusFilter] = useState('All')
  const [shopForm, setShopForm] = useState(null)
  const [error, setError] = useState('')
  const [ordersRefreshError, setOrdersRefreshError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const productImagePreviews = useMemo(
    () => productImageFiles.map(file => URL.createObjectURL(file)),
    [productImageFiles]
  )
  const producerImagePreviews = useMemo(
    () => producerImageFiles.map(file => URL.createObjectURL(file)),
    [producerImageFiles]
  )
  const videoPreviewUrl = useMemo(
    () => videoFile ? URL.createObjectURL(videoFile) : '',
    [videoFile]
  )

  useEffect(() => () => {
    productImagePreviews.forEach(url => URL.revokeObjectURL(url))
    producerImagePreviews.forEach(url => URL.revokeObjectURL(url))
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
  }, [productImagePreviews, producerImagePreviews, videoPreviewUrl])

  const loadSellerData = useCallback(async () => {
    const [dashboardResponse, applicationResponse, ordersResponse, discountsResponse, reviewsResponse] = await Promise.all([
      api.get('/seller/dashboard'),
      api.get('/seller/application'),
      api.get('/seller/orders'),
      api.get('/seller/discounts'),
      api.get('/seller/reviews')
    ])
    setDashboard(dashboardResponse.data)
    setApplication(applicationResponse.data.data)
    setShopForm(applicationResponse.data.data?.details || {})
    setSellerOrders(ordersResponse.data.data)
    setDiscounts(discountsResponse.data.data)
    setReviews(reviewsResponse.data.data)
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/seller/dashboard'),
      api.get('/seller/application'),
      api.get('/seller/orders'),
      api.get('/seller/discounts'),
      api.get('/seller/reviews')
    ])
      .then(([dashboardResponse, applicationResponse, ordersResponse, discountsResponse, reviewsResponse]) => {
        if (!active) return
        setDashboard(dashboardResponse.data)
        setApplication(applicationResponse.data.data)
        setShopForm(applicationResponse.data.data?.details || {})
        setSellerOrders(ordersResponse.data.data)
        setDiscounts(discountsResponse.data.data)
        setReviews(reviewsResponse.data.data)
      })
      .catch(requestError => {
        if (active) {
          setError(requestError.response?.data?.message || 'We could not load your seller dashboard.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (loading) return undefined

    let active = true
    let requestInFlight = false
    const refreshOrders = async () => {
      if (requestInFlight || document.visibilityState === 'hidden') return
      requestInFlight = true
      try {
        const { data } = await api.get('/seller/orders')
        if (active) {
          setSellerOrders(data.data)
          setOrdersRefreshError('')
        }
      } catch (requestError) {
        if (active) {
          setOrdersRefreshError(requestError.response?.data?.message || 'We could not refresh your seller orders.')
        }
      } finally {
        requestInFlight = false
      }
    }

    const intervalId = window.setInterval(refreshOrders, 3000)
    document.addEventListener('visibilitychange', refreshOrders)
    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', refreshOrders)
    }
  }, [loading])

  useEffect(() => {
    if (loading) return undefined

    let active = true
    const refreshInsights = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const [dashboardResponse, reviewsResponse] = await Promise.all([
          api.get('/seller/dashboard'),
          api.get('/seller/reviews')
        ])
        if (active) {
          setDashboard(dashboardResponse.data)
          setReviews(reviewsResponse.data.data)
        }
      } catch (requestError) {
        if (active) setOrdersRefreshError(requestError.response?.data?.message || 'We could not refresh seller reports.')
      }
    }

    const intervalId = window.setInterval(refreshInsights, 15000)
    document.addEventListener('visibilitychange', refreshInsights)
    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', refreshInsights)
    }
  }, [loading])

  const sales = dashboard?.metrics.revenue || 0

  const clearFeedback = () => {
    setError('')
    setNotice('')
  }

  const saveProduct = async event => {
    event.preventDefault()
    setSaving(true)
    clearFeedback()
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      variations: productForm.variations.filter(variation => variation.name && variation.options.length),
      variationCombinations: productForm.variationCombinations.map(combination => ({
        ...combination,
        price: Number(combination.price),
        stock: Number(combination.stock),
        imageIndex: combination.imageIndex === '' ? null : Number(combination.imageIndex)
      }))
    }

    try {
      let productId = editingProduct?.id
      if (editingProduct) {
        await api.patch(`/seller/products/${editingProduct.id}`, payload)
      } else {
        const { data } = await api.post('/seller/products', payload)
        productId = data.data.id
        setEditingProduct(data.data)
      }
      if (productImageFiles.length) {
        const form = new FormData()
        productImageFiles.forEach((file, index) => form.append(`images[${index}]`, file))
        const { data } = await api.post(`/seller/products/${productId}/media`, form)
        setExistingImages(data.data.images)
        setProductImageFiles([])
      }
      if (producerImageFiles.length) {
        const form = new FormData()
        producerImageFiles.forEach((file, index) => form.append(`images[${index}]`, file))
        const { data } = await api.post(`/seller/products/${productId}/producer-media`, form)
        setExistingProducerImages(data.data.producerImages)
        setProducerImageFiles([])
      }
      if (videoFile) {
        const form = new FormData()
        form.append('video', videoFile)
        const { data } = await api.post(`/seller/products/${productId}/video`, form)
        setExistingVideoUrl(data.data.videoUrl || '')
        setVideoFile(null)
      }
      setEditingProduct(null)
      setProductForm(emptyProduct)
      setProductImageFiles([])
      setProducerImageFiles([])
      setVideoFile(null)
      setExistingImages([])
      setExistingProducerImages([])
      setExistingVideoUrl('')
      setMediaWarning('')
      await loadSellerData()
      setNotice(editingProduct ? 'Product updated.' : 'Product added to your shop.')
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors
      setError(validationErrors
        ? Object.values(validationErrors).flat()[0]
        : requestError.response?.data?.message || 'We could not save this product.')
    } finally {
      setSaving(false)
    }
  }

  const editProduct = product => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      category: product.category,
      description: product.description,
      price: String(product.price),
      unit: product.unit,
      stock: String(product.stock),
      imageUrl: product.imageUrl || '',
      variations: product.variations || [],
      variationCombinations: (product.variationCombinations || []).map(combination => ({
        ...combination,
        price: String(combination.price),
        stock: String(combination.stock),
        imageIndex: combination.imageIndex == null ? '' : String(combination.imageIndex)
      })),
      subcategory: product.subcategory || '',
      sku: product.sku || '',
      details: { ...emptyProduct.details, ...(product.details || {}) },
      isActive: product.isActive
    })
    setProductImageFiles([])
    setProducerImageFiles([])
    setVideoFile(null)
    setExistingImages(product.mediaCount ? product.images || [] : [])
    setExistingProducerImages(product.producerImages || [])
    setExistingVideoUrl(product.videoUrl || '')
    setSection('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const uploadSelectedImages = async (event, mediaType) => {
    const files = Array.from(event.target.files || [])
    const currentCount = mediaType === 'product' ? existingImages.length + productImageFiles.length : existingProducerImages.length + producerImageFiles.length
    const limit = 10
    try {
      const accepted = files.filter(file => /^image\/(jpeg|png|webp)$/.test(file.type))
      if (files.length !== accepted.length) {
        setMediaWarning('Only JPG, PNG, or WebP photos are accepted.')
      } else {
        setMediaWarning('')
      }
      const existingFiles = mediaType === 'product' ? productImageFiles : producerImageFiles
      const hashes = new Set(await Promise.all(existingFiles.map(async file =>
        Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())))
          .map(byte => byte.toString(16).padStart(2, '0')).join('')
      )))
      const uniqueFiles = []
      for (const file of accepted) {
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())))
          .map(byte => byte.toString(16).padStart(2, '0')).join('')
        if (hashes.has(hash)) {
          setMediaWarning('Duplicate photos were skipped.')
          continue
        }
        hashes.add(hash)
        uniqueFiles.push(await compressImage(file))
      }
      const availableSlots = Math.max(0, limit - currentCount)
      if (uniqueFiles.length > availableSlots) {
        setMediaWarning(`Only ${availableSlots} more photo(s) can be added; each gallery allows up to 10.`)
      }
      const nextFiles = uniqueFiles.slice(0, availableSlots)
      if (mediaType === 'product') {
        setProductImageFiles(current => [...current, ...nextFiles])
      } else {
        setProducerImageFiles(current => [...current, ...nextFiles])
      }
    } catch (requestError) {
      setError(requestError.message || 'We could not process the selected photos.')
    } finally {
      event.target.value = ''
    }
  }

  const reorderProductImages = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    const order = existingImages.map((_, index) => index)
    const [moved] = order.splice(fromIndex, 1)
    order.splice(toIndex, 0, moved)
    try {
      const { data } = await api.patch(`/seller/products/${editingProduct.id}/media/order`, { order })
      setExistingImages(data.data.mediaCount ? data.data.images : [])
      await loadSellerData()
      setNotice('Product photo order updated.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not reorder product photos.')
    }
  }

  const removeProductImage = async index => {
    try {
      const { data } = await api.delete(`/seller/products/${editingProduct.id}/media/${index}`)
      setExistingImages(data.data.mediaCount ? data.data.images : [])
      await loadSellerData()
      setNotice('Product photo removed.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not remove this photo.')
    }
  }

  const removeProducerImage = async index => {
    try {
      const { data } = await api.delete(`/seller/products/${editingProduct.id}/producer-media/${index}`)
      setExistingProducerImages(data.data.producerImages)
      await loadSellerData()
      setNotice('Producer gallery photo removed.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not remove this producer photo.')
    }
  }

  const updateVariationGroups = value => {
    const groups = value.split('\n').flatMap(line => {
      const [name, ...options] = line.split(':')
      return name?.trim() && options.join(':').trim()
        ? [{ name: name.trim(), options: options.join(':').split(',').map(option => option.trim()).filter(Boolean) }]
        : []
    })
    setProductForm(current => ({
      ...current,
      variations: groups,
      variationCombinations: makeVariationCombinations(groups, current.variationCombinations, current.price)
    }))
  }

  const updateCombination = (index, field, value) => {
    setProductForm(current => ({
      ...current,
      variationCombinations: current.variationCombinations.map((combination, currentIndex) =>
        currentIndex === index ? { ...combination, [field]: value } : combination
      )
    }))
  }

  const removeProductVideo = async () => {
    try {
      await api.delete(`/seller/products/${editingProduct.id}/video`)
      setExistingVideoUrl('')
      setVideoFile(null)
      await loadSellerData()
      setNotice('Product video removed.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not remove this video.')
    }
  }

  const deleteProduct = async product => {
    if (!window.confirm(`Remove "${product.name}" from your products?`)) return
    clearFeedback()
    try {
      await api.delete(`/seller/products/${product.id}`)
      setNotice('Product removed.')
      await loadSellerData()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not remove this product.')
    }
  }

  const saveShop = async event => {
    event.preventDefault()
    setSaving(true)
    clearFeedback()
    try {
      const { data } = await api.patch('/seller/shop', {
        shopName: shopForm.shopName,
        category: shopForm.category,
        shopPhone: shopForm.shopPhone,
        shopEmail: shopForm.shopEmail,
        pickupAddress: shopForm.pickupAddress,
        pickupBarangay: shopForm.pickupBarangay,
        pickupCity: shopForm.pickupCity,
        description: shopForm.description || '',
        logoUrl: shopForm.logoUrl || '',
        bannerUrl: shopForm.bannerUrl || '',
        shippingPolicy: shopForm.shippingPolicy || '',
        returnPolicy: shopForm.returnPolicy || '',
        payoutAccountName: shopForm.payoutAccountName || '',
        payoutBank: shopForm.payoutBank || '',
        payoutAccountNumber: shopForm.payoutAccountNumber || '',
        shippingFee: Number(shopForm.shippingFee ?? 60)
      })
      setApplication(data.data)
      setShopForm(data.data.details)
      setNotice('Shop settings saved.')
      await loadSellerData()
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors
      setError(
        validationErrors ? Object.values(validationErrors).flat()[0] :
          requestError.response?.data?.message || 'We could not save your shop settings.'
      )
    } finally {
      setSaving(false)
    }
  }

  const advanceOrder = async order => {
    const stages = ['Order placed', 'Preparing', 'Ready to ship', 'Shipped', 'Out for delivery', 'Delivered']
    const next = stages[stages.indexOf(order.status) + 1]
    if (!next) return
    try {
      await api.patch(`/seller/orders/${order.id}/status`, {
        status: next,
        trackingNumber: trackingNumbers[order.id] || order.trackingNumber || ''
      })
      await loadSellerData()
      setNotice(`Order ${order.id} updated to ${next}.`)
      setError('')
    } catch (updateError) {
      setError(updateError.response?.data?.message || updateError.message)
    }
  }

  const cancelSellerOrder = async order => {
    if (!window.confirm(`Cancel order ${order.id}? Inventory will be returned to stock.`)) return
    try {
      await api.patch(`/seller/orders/${order.id}/status`, { status: 'Cancelled' })
      await loadSellerData()
      setNotice(`Order ${order.id} cancelled.`)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not cancel this order.')
    }
  }

  const saveDiscount = async event => {
    event.preventDefault()
    clearFeedback()
    try {
      await api.post('/seller/discounts', {
        name: discountForm.name,
        code: discountForm.code,
        type: discountForm.type,
        ...(discountForm.type === 'percentage'
          ? { percentage: Number(discountForm.value) }
          : { amount: Number(discountForm.value) }),
        ...(discountForm.type === 'minimum_spend' ? { minimumSpend: Number(discountForm.minimumSpend) } : {}),
        maxUses: discountForm.maxUses ? Number(discountForm.maxUses) : null,
        startsAt: discountForm.startsAt || null,
        endsAt: discountForm.endsAt || null
      })
      setDiscountForm({
        name: '',
        code: '',
        type: 'percentage',
        value: '',
        minimumSpend: '',
        maxUses: '',
        startsAt: '',
        endsAt: ''
      })
      await loadSellerData()
      setNotice('Discount code created.')
    } catch (requestError) {
      const validationMessage = Object.values(requestError.response?.data?.errors || {}).flat()[0]
      setError(validationMessage || requestError.response?.data?.message || 'We could not create this discount.')
    }
  }

  const deleteDiscount = async discount => {
    try {
      await api.delete(`/seller/discounts/${discount.id}`)
      await loadSellerData()
      setNotice(`Discount ${discount.code} deleted.`)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not delete this discount.')
    }
  }

  const respondToReview = async review => {
    const response = reviewResponses[review.id]?.trim()
    if (!response) return
    try {
      await api.post(`/seller/reviews/${review.id}/response`, { response })
      await loadSellerData()
      setNotice('Your response was posted.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not post your response.')
    }
  }

  const downloadReport = async () => {
    try {
      const { data } = await api.get('/seller/reports/sales.csv', { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `seller-sales-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not download the report.')
    }
  }

  if (loading) return <main className="seller-page"><p className="seller-loading">Loading seller dashboard...</p></main>

  if (error && !dashboard) {
    return (
      <main className="seller-page">
        <div className="seller-status-card">
          <Store size={38} />
          <h1>Seller dashboard unavailable</h1>
          <p>{error}</p>
          <Link className="seller-primary-button" to="/buyer/become-seller">View application</Link>
        </div>
      </main>
    )
  }

  const products = dashboard?.products || []
  const displayedOrders = orderStatusFilter === 'All'
    ? sellerOrders
    : sellerOrders.filter(order => order.status === orderStatusFilter)
  const activeSection = sections.find(([key]) => key === section)?.[1]

  return (
    <main className="seller-dashboard-page">
      <header className="seller-dashboard-heading">
        <div>
          <h1>{dashboard?.shop?.name || 'Your shop'}</h1>
        </div>
        <Link to="/buyer" className="seller-secondary-button">Switch to Buyer</Link>
      </header>

      <div className="seller-dashboard-layout">
        <nav className="seller-sidebar" aria-label="Seller dashboard">
          {sections.map(([key, label, Icon]) => (
            <button key={key} className={section === key ? 'active' : ''} onClick={() => {
              setSection(key)
              clearFeedback()
            }}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>

        <section className="seller-dashboard-content">
          <div className="seller-content-title">
            <div><h2>{activeSection}</h2></div>
            {section === 'products' && <button className="seller-primary-button" onClick={() => {
              setEditingProduct(null)
              setProductForm(emptyProduct)
                setProductImageFiles([])
                setProducerImageFiles([])
                setVideoFile(null)
                setExistingImages([])
                setExistingProducerImages([])
                setExistingVideoUrl('')
              }}><Plus size={17} /> Add product</button>}
          </div>

          {notice && <p className="seller-success" role="status">{notice}</p>}
          {error && <p className="seller-alert" role="alert">{error}</p>}
          {ordersRefreshError && <p className="seller-alert" role="alert">{ordersRefreshError}</p>}

          {section === 'overview' && (
            <>
              <div className="seller-metric-grid">
                <article><span>Total sales revenue</span><strong>{formatPeso(sales)}</strong><CircleDollarSign size={20} /></article>
                <article><span>Total orders</span><strong>{dashboard?.metrics.orders || 0}</strong><ClipboardList size={20} /></article>
                <article><span>Pending orders</span><strong>{dashboard?.metrics.pendingOrders || 0}</strong><Boxes size={20} /></article>
                <article><span>Completed orders</span><strong>{dashboard?.metrics.completedOrders || 0}</strong><Package size={20} /></article>
                <article><span>Cancelled orders</span><strong>{dashboard?.metrics.cancelledOrders || 0}</strong><Store size={20} /></article>
                <article><span>Total products listed</span><strong>{dashboard?.metrics.products || 0}</strong><Package size={20} /></article>
                <article><span>Low-stock products (≤5)</span><strong>{dashboard?.metrics.lowStockProducts || 0}</strong><Boxes size={20} /></article>
                <article><span>Customers</span><strong>{dashboard?.metrics.customers || 0}</strong><Store size={20} /></article>
              </div>
              <div className="seller-panel seller-sales-chart">
                <div className="seller-chart-heading"><div><h3>Monthly sales performance</h3><p>Order value before delivery fees</p></div><button className="seller-secondary-button" onClick={downloadReport}>Download CSV report</button></div>
                <div className="seller-chart-bars">
                  {(dashboard?.metrics.monthlySales || []).map(month => (
                    <div className="seller-chart-bar-column" key={month.month} title={`${month.month}: ${formatPeso(month.revenue)}`}>
                      <span>{formatPeso(month.revenue)}</span>
                      <div style={{ height: `${Math.max(4, month.revenue / Math.max(...(dashboard?.metrics.monthlySales || []).map(item => item.revenue), 1) * 100)}%` }} />
                      <small>{month.month}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="seller-panel">
                <h3>Recent orders</h3>
                {sellerOrders.length ? sellerOrders.slice(0, 5).map(order => (
                  <div className="seller-order-row" key={order.id}>
                    <div><strong>Order {order.id}</strong><span>{order.buyer?.name || order.customer?.fullName} · {order.items.length} item(s) · {order.status}</span></div>
                    <button className="seller-secondary-button" onClick={() => setSection('orders')}>Review</button>
                  </div>
                )) : <p className="seller-empty">New orders for your shop will appear here.</p>}
              </div>
            </>
          )}

          {section === 'products' && (
            <div className="seller-panel">
              <form className="seller-product-form" onSubmit={saveProduct}>
                <h3>{editingProduct ? 'Edit product' : 'Add a product'}</h3>
                <div className="seller-form-grid">
                  <label>Product name<input required maxLength={180} value={productForm.name} onChange={event => setProductForm(current => ({ ...current, name: event.target.value }))} /></label>
                  <label>Main category<select required value={productForm.category} onChange={event => setProductForm(current => ({ ...current, category: event.target.value, subcategory: '' }))}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
                  <label>Subcategory<select value={productForm.subcategory} onChange={event => setProductForm(current => ({ ...current, subcategory: event.target.value }))}><option value="">Choose a subcategory</option>{(categorySubcategories[productForm.category] || []).map(subcategory => <option key={subcategory}>{subcategory}</option>)}</select></label>
                  <label>Product type<select value={productForm.details.productType} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, productType: event.target.value } }))}><option value="">Choose a product type</option>{['Fresh', 'Processed', 'Handmade'].map(type => <option key={type}>{type}</option>)}</select></label>
                  <label>Price (₱)<input type="number" min="0.01" step="0.01" required value={productForm.price} onChange={event => setProductForm(current => ({ ...current, price: event.target.value }))} /></label>
                  <label>Unit (e.g. per bundle)<input required maxLength={80} value={productForm.unit} onChange={event => setProductForm(current => ({ ...current, unit: event.target.value }))} /></label>
                  <label>{productForm.variations.length ? 'Base stock (combination stock is saved)' : 'Available stock'}<input type="number" min="0" step="1" required value={productForm.stock} disabled={productForm.variations.length > 0} onChange={event => setProductForm(current => ({ ...current, stock: event.target.value }))} /></label>
                  <label>SKU<input maxLength={120} value={productForm.sku} onChange={event => setProductForm(current => ({ ...current, sku: event.target.value }))} /></label>
                  <label>Barcode<input maxLength={120} value={productForm.details.barcode} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, barcode: event.target.value } }))} /></label>
                  <label>Product image URL (optional)<input type="url" maxLength={2048} value={productForm.imageUrl} onChange={event => setProductForm(current => ({ ...current, imageUrl: event.target.value }))} /></label>
                  <label>Brand / producer<input maxLength={120} value={productForm.details.brand} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, brand: event.target.value } }))} /></label>
                  <label>Product weight<input type="number" min="0" step="0.01" value={productForm.details.weight} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, weight: event.target.value } }))} /></label>
                  <label>Weight unit<select value={productForm.details.weightUnit} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, weightUnit: event.target.value } }))}>{['g', 'kg', 'ml', 'L'].map(unit => <option key={unit}>{unit}</option>)}</select></label>
                  <label>Packaging type<input maxLength={80} value={productForm.details.packagingType} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, packagingType: event.target.value } }))} /></label>
                  <label>Minimum order<input type="number" min="1" value={productForm.details.minimumOrder} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, minimumOrder: event.target.value } }))} /></label>
                  <label>Maximum order (optional)<input type="number" min="1" value={productForm.details.maximumOrder} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, maximumOrder: event.target.value } }))} /></label>
                  <label>Expiration date<input type="date" value={productForm.details.expirationDate} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, expirationDate: event.target.value } }))} /></label>
                  <label>Shelf life<input maxLength={120} value={productForm.details.shelfLife} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, shelfLife: event.target.value } }))} /></label>
                  <label>Origin barangay<input maxLength={120} value={productForm.details.originBarangay} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, originBarangay: event.target.value } }))} /></label>
                  <label>Producer name<input maxLength={180} value={productForm.details.producerName} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, producerName: event.target.value } }))} /></label>
                  <label>Product source<select value={productForm.details.productSource} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, productSource: event.target.value } }))}><option value="">Choose a source</option>{['Farmer', 'Cooperative', 'Home-based producer', 'Manufacturer', 'Artisan', 'Other'].map(source => <option key={source}>{source}</option>)}</select></label>
                  <label>Production method<input maxLength={1000} value={productForm.details.productionMethod} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, productionMethod: event.target.value } }))} /></label>
                  <label className="seller-checkbox-field"><input type="checkbox" checked={productForm.details.locallyProduced} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, locallyProduced: event.target.checked } }))} /> Locally produced</label>
                  <label className="seller-checkbox-field"><input type="checkbox" checked={productForm.isActive} onChange={event => setProductForm(current => ({ ...current, isActive: event.target.checked }))} /> Show this listing in the marketplace</label>
                </div>
                <label className="seller-description-field">Description<textarea required maxLength={5000} rows="4" value={productForm.description} onChange={event => setProductForm(current => ({ ...current, description: event.target.value }))} /></label>
                <div className="seller-form-grid seller-dimensions-grid">
                  <label>Length<input type="number" min="0" step="0.01" value={productForm.details.dimensions.length} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, dimensions: { ...current.details.dimensions, length: event.target.value } } }))} /></label>
                  <label>Width<input type="number" min="0" step="0.01" value={productForm.details.dimensions.width} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, dimensions: { ...current.details.dimensions, width: event.target.value } } }))} /></label>
                  <label>Height<input type="number" min="0" step="0.01" value={productForm.details.dimensions.height} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, dimensions: { ...current.details.dimensions, height: event.target.value } } }))} /></label>
                </div>
                <label className="seller-description-field">Shipping notes<textarea maxLength={1000} rows="2" value={productForm.details.shippingNotes} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, shippingNotes: event.target.value } }))} /></label>
                <label className="seller-description-field">Product story<textarea maxLength={3000} rows="3" value={productForm.details.productStory} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, productStory: event.target.value } }))} /></label>
                <label className="seller-description-field">Variation groups (one per line, e.g. <code>Size: Small, Large</code>)<textarea rows="3" value={productForm.variations.map(variation => `${variation.name}: ${variation.options.join(', ')}`).join('\n')} onChange={event => updateVariationGroups(event.target.value)} /></label>
                {productForm.variationCombinations.length > 0 && (
                  <section className="seller-combination-list">
                    <h4>Price, stock, SKU and photo for each variation</h4>
                    {productForm.variationCombinations.map((combination, index) => (
                      <div className="seller-combination-row" key={makeVariationKey(combination.options)}>
                        <strong>{combination.options.map(option => `${option.name}: ${option.value}`).join(' / ')}</strong>
                        <label>Price<input type="number" min="0.01" step="0.01" required value={combination.price} onChange={event => updateCombination(index, 'price', event.target.value)} /></label>
                        <label>Stock<input type="number" min="0" required value={combination.stock} onChange={event => updateCombination(index, 'stock', event.target.value)} /></label>
                        <label>Variant SKU<input maxLength={120} value={combination.sku} onChange={event => updateCombination(index, 'sku', event.target.value)} /></label>
                        <label>Photo<select value={combination.imageIndex} onChange={event => updateCombination(index, 'imageIndex', event.target.value)}><option value="">Default photo</option>{Array.from({ length: Math.min(10, existingImages.length + productImageFiles.length) }, (_, photoIndex) => <option key={photoIndex} value={photoIndex}>Photo {photoIndex + 1}</option>)}</select></label>
                      </div>
                    ))}
                  </section>
                )}
                <section className="seller-media-section">
                  <h4>Product photos (up to 10)</h4>
                  <p>Photos are optional. Supported formats: JPG, PNG, WebP. Images over 1 MB are compressed before upload.</p>
                  <label className="seller-media-picker">Add product photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" disabled={existingImages.length + productImageFiles.length >= 10} onChange={event => uploadSelectedImages(event, 'product')} /></label>
                  {mediaWarning && <p className="seller-media-warning" role="status">{mediaWarning}</p>}
                  <div className="seller-media-grid">
                    {existingImages.map((image, index) => <figure key={`${image}-${index}`} draggable onDragStart={() => setGalleryDragIndex(index)} onDragOver={event => event.preventDefault()} onDrop={() => {
                      if (galleryDragIndex != null) reorderProductImages(galleryDragIndex, index)
                      setGalleryDragIndex(null)
                    }}><img src={image} alt={`Product photo ${index + 1}`} /><figcaption>Photo {index + 1} · drag to reorder</figcaption><button type="button" className="seller-danger-button" onClick={() => removeProductImage(index)}>Remove</button></figure>)}
                    {productImageFiles.map((file, index) => <figure key={`${file.name}-${file.lastModified}`}><img src={productImagePreviews[index]} alt={`New product photo ${existingImages.length + index + 1}`} /><figcaption>New photo {index + 1}</figcaption><button type="button" className="seller-danger-button" onClick={() => setProductImageFiles(current => current.filter((_, fileIndex) => fileIndex !== index))}>Remove</button></figure>)}
                  </div>
                </section>
                <section className="seller-media-section">
                  <h4>Product video (optional)</h4>
                  <label className="seller-media-picker">Upload a video (MP4, MOV, WebM; up to 50 MB)<input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={event => {
                    const selected = event.target.files?.[0] || null
                    if (selected && selected.size > 50 * 1024 * 1024) {
                      setError('Product videos must be 50 MB or smaller.')
                    } else {
                      setVideoFile(selected)
                      setError('')
                    }
                    event.target.value = ''
                  }} /></label>
                  {(videoPreviewUrl || existingVideoUrl) && <div className="seller-video-preview"><video controls preload="metadata" src={videoPreviewUrl || existingVideoUrl} /><button type="button" className="seller-danger-button" onClick={videoPreviewUrl ? () => setVideoFile(null) : removeProductVideo}>{videoPreviewUrl ? 'Discard video' : 'Remove saved video'}</button></div>}
                  <label>Video cover photo<select value={productForm.details.videoCoverIndex} onChange={event => setProductForm(current => ({ ...current, details: { ...current.details, videoCoverIndex: event.target.value } }))}><option value="">Use default cover</option>{Array.from({ length: Math.min(10, existingImages.length + productImageFiles.length) }, (_, photoIndex) => <option key={photoIndex} value={photoIndex}>Photo {photoIndex + 1}</option>)}</select></label>
                </section>
                <section className="seller-media-section">
                  <h4>Producer and origin photos (up to 10)</h4>
                  <label className="seller-media-picker">Add producer photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" disabled={existingProducerImages.length + producerImageFiles.length >= 10} onChange={event => uploadSelectedImages(event, 'producer')} /></label>
                  <div className="seller-media-grid">
                    {existingProducerImages.map((image, index) => <figure key={`${image}-${index}`}><img src={image} alt={`Producer photo ${index + 1}`} /><figcaption>Producer photo {index + 1}</figcaption><button type="button" className="seller-danger-button" onClick={() => removeProducerImage(index)}>Remove</button></figure>)}
                    {producerImageFiles.map((file, index) => <figure key={`${file.name}-${file.lastModified}`}><img src={producerImagePreviews[index]} alt={`New producer photo ${index + 1}`} /><figcaption>New producer photo {index + 1}</figcaption><button type="button" className="seller-danger-button" onClick={() => setProducerImageFiles(current => current.filter((_, fileIndex) => fileIndex !== index))}>Remove</button></figure>)}
                  </div>
                </section>
                <div className="seller-form-actions">
                  {editingProduct && <button type="button" className="seller-secondary-button" onClick={() => {
                    setEditingProduct(null)
                    setProductForm(emptyProduct)
                    setProductImageFiles([])
                    setProducerImageFiles([])
                    setVideoFile(null)
                    setExistingImages([])
                    setExistingProducerImages([])
                    setExistingVideoUrl('')
                  }}>Cancel edit</button>}
                  <button type="submit" className="seller-primary-button" disabled={saving}>{saving ? 'Saving...' : editingProduct ? 'Save changes' : 'Add product'}</button>
                </div>
              </form>
              <div className="seller-product-list">
                {products.length ? products.map(product => (
                  <article className="seller-product-row" key={product.id}>
                    <img src={product.imageUrl || '/images/handwoven-basket.svg'} alt="" />
                    <div className="seller-product-copy"><strong>{product.name}</strong><span>{product.category} · {formatPeso(product.price)} {product.unit}</span><small>{product.isActive ? 'Published' : 'Hidden'} · {product.stock} in stock</small></div>
                    <div className="seller-row-actions">
                      <button className="seller-secondary-button" onClick={() => editProduct(product)}>Edit</button>
                      <button className="seller-danger-button" onClick={() => deleteProduct(product)}>Remove</button>
                    </div>
                  </article>
                )) : <p className="seller-empty">You have not listed any products yet.</p>}
              </div>
            </div>
          )}

          {section === 'inventory' && (
            <div className="seller-panel">
              <h3>Inventory</h3>
              {products.length ? (
                <div className="seller-inventory-list">{products.map(product => (
                  <div className="seller-inventory-row" key={product.id}>
                    <div><strong>{product.name}</strong><span>{product.isActive ? 'Active listing' : 'Hidden listing'}</span></div>
                    <label>Stock<input type="number" min="0" value={product.stock} disabled={product.variationCombinations?.length > 0} onChange={event => setDashboard(current => ({
                      ...current,
                      products: current.products.map(item => item.id === product.id ? { ...item, stock: Number(event.target.value) } : item)
                    }))} onBlur={async event => {
                      try {
                        await api.patch(`/seller/products/${product.id}`, { ...product, stock: Number(event.target.value), imageUrl: product.imageUrl || '' })
                        await loadSellerData()
                        setNotice(`${product.name} stock updated.`)
                      } catch (requestError) {
                        setError(requestError.response?.data?.message || 'Could not update inventory.')
                      }
                    }} />{product.variationCombinations?.length > 0 && <small>Edit variation combinations to adjust stock by option.</small>}</label>
                  </div>
                ))}</div>
              ) : <p className="seller-empty">Add products before managing stock.</p>}
            </div>
          )}

          {section === 'orders' && (
            <div className="seller-panel">
              <h3>Order processing</h3>
              <p className="seller-panel-intro">Review item quantities, customer delivery details, and cash-on-delivery status before preparing each order.</p>
              <label className="seller-order-filter">Filter orders
                <select value={orderStatusFilter} onChange={event => setOrderStatusFilter(event.target.value)}>
                  {['All', 'Order placed', 'Preparing', 'Ready to ship', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'].map(status => <option key={status}>{status}</option>)}
                </select>
              </label>
              {displayedOrders.length ? displayedOrders.map(order => (
                <article className="seller-order-card" key={order.id}>
                  <div className="seller-order-heading"><div><strong>Order {order.id}</strong><span>{new Date(order.placedAt).toLocaleString()}</span></div><b>{order.status}</b></div>
                  <div className="seller-order-details">
                    {order.items.map((item, index) => <span key={`${item.id}-${index}`}>{item.name}{item.variations?.length ? ` (${item.variations.map(variation => `${variation.name}: ${variation.value}`).join(', ')})` : ''} × {item.quantity} · {formatPeso(item.price * item.quantity)}</span>)}
                  </div>
                  <p><strong>{order.buyer?.name || order.customer?.fullName}</strong> · {order.buyer?.email || order.customer?.email} · {order.buyer?.phone || order.customer?.phone}<br />{order.customer?.address}, {order.customer?.barangay}, {order.customer?.city} {order.customer?.postalCode}</p>
                  {order.trackingNumber && <p>Tracking: <strong>{order.trackingNumber}</strong></p>}
                  {['Preparing', 'Ready to ship'].includes(order.status) && (
                    <label className="seller-tracking-input">Carrier tracking number<input value={trackingNumbers[order.id] ?? order.trackingNumber ?? ''} onChange={event => setTrackingNumbers(current => ({ ...current, [order.id]: event.target.value }))} placeholder="Optional until shipment" /></label>
                  )}
                  <div className="seller-order-footer">
                    <span>Payment: {order.paymentMethod || 'Cash on delivery'} · {order.status === 'Delivered' ? 'Collected on delivery' : 'Awaiting payment on delivery'}</span>
                    {!['Delivered', 'Cancelled', 'Returned', 'Refunded'].includes(order.status) && (
                      <>
                        <button className="seller-primary-button" onClick={() => advanceOrder(order)}>
                          {order.status === 'Order placed' ? 'Confirm & prepare' : order.status === 'Preparing' ? 'Mark ready to ship' : order.status === 'Ready to ship' ? 'Mark shipped' : order.status === 'Shipped' ? 'Out for delivery' : 'Mark delivered'}
                        </button>
                        {['Order placed', 'Preparing', 'Ready to ship'].includes(order.status) && (
                          <button className="seller-danger-button" onClick={() => cancelSellerOrder(order)}>Cancel order</button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              )) : <p className="seller-empty">{sellerOrders.length ? 'No orders match this status.' : 'New buyer orders for your shop will appear here.'}</p>}
            </div>
          )}

          {section === 'discounts' && (
            <div className="seller-panel">
              <h3>Create a discount code</h3>
              <p className="seller-panel-intro">Codes apply to eligible items from this shop. Choose a percentage, fixed amount, or minimum-spend promotion.</p>
              <form className="seller-form-grid seller-discount-form" onSubmit={saveDiscount}>
                <label>Promotion name<input required maxLength={120} value={discountForm.name} onChange={event => setDiscountForm(current => ({ ...current, name: event.target.value }))} placeholder="e.g. Weekend Farm Savings" /></label>
                <label>Code<input required maxLength={40} pattern="[A-Za-z0-9_-]+" value={discountForm.code} onChange={event => setDiscountForm(current => ({ ...current, code: event.target.value.toUpperCase() }))} /></label>
                <label>Promotion type<select value={discountForm.type} onChange={event => setDiscountForm(current => ({ ...current, type: event.target.value, value: '', minimumSpend: '' }))}>
                  <option value="percentage">Percentage discount</option>
                  <option value="fixed_amount">Fixed amount discount</option>
                  <option value="minimum_spend">Discount by minimum spend</option>
                </select></label>
                <label>{discountForm.type === 'percentage' ? 'Discount (%)' : 'Discount amount (₱)'}<input type="number" min="0.01" max={discountForm.type === 'percentage' ? '90' : '99999999.99'} step="0.01" required value={discountForm.value} onChange={event => setDiscountForm(current => ({ ...current, value: event.target.value }))} /></label>
                {discountForm.type === 'minimum_spend' && <label>Minimum spend (₱)<input type="number" min="0.01" max="99999999.99" step="0.01" required value={discountForm.minimumSpend} onChange={event => setDiscountForm(current => ({ ...current, minimumSpend: event.target.value }))} /></label>}
                <label>Usage limit (optional)<input type="number" min="1" value={discountForm.maxUses} onChange={event => setDiscountForm(current => ({ ...current, maxUses: event.target.value }))} /></label>
                <label>Starts at (optional)<input type="datetime-local" value={discountForm.startsAt} onChange={event => setDiscountForm(current => ({ ...current, startsAt: event.target.value }))} /></label>
                <label>Ends at (optional)<input type="datetime-local" value={discountForm.endsAt} onChange={event => setDiscountForm(current => ({ ...current, endsAt: event.target.value }))} /></label>
                <button className="seller-primary-button" type="submit">Create code</button>
              </form>
              {discounts.length ? discounts.map(discount => (
                <article className="seller-order-row" key={discount.id}>
                  <div><strong>{discount.name || discount.code} · {discount.code} · {discountLabel(discount)}</strong><span>{discount.uses} used{discount.max_uses ? ` / ${discount.max_uses}` : ''} · {discount.starts_at ? `Starts ${new Date(discount.starts_at).toLocaleString()}` : 'Available now'}{discount.ends_at ? ` · Ends ${new Date(discount.ends_at).toLocaleString()}` : ''}</span></div>
                  <button className="seller-danger-button" onClick={() => deleteDiscount(discount)}>Delete</button>
                </article>
              )) : <p className="seller-empty">You have not created discount codes.</p>}
            </div>
          )}

          {section === 'feedback' && (
            <div className="seller-panel">
              <h3>Customer reviews and feedback</h3>
              {reviews.length ? reviews.map(review => (
                <article className="seller-review-card" key={review.id}>
                  <div><strong>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} · {review.product}</strong><span>{review.buyer} · {new Date(review.createdAt).toLocaleDateString()}</span></div>
                  {review.title && <h4>{review.title}</h4>}
                  <p>{review.body}</p>
                  {review.sellerResponse && <p className="seller-review-response"><strong>Your response:</strong> {review.sellerResponse}</p>}
                  {!review.sellerResponse && <div className="seller-review-reply"><textarea aria-label={`Reply to review by ${review.buyer}`} value={reviewResponses[review.id] || ''} onChange={event => setReviewResponses(current => ({ ...current, [review.id]: event.target.value }))} maxLength={2000} placeholder="Write a public reply" /><button className="seller-primary-button" onClick={() => respondToReview(review)}>Reply</button></div>}
                </article>
              )) : <p className="seller-empty">Customer reviews will appear after a delivered order is rated.</p>}
            </div>
          )}

          {section === 'wallet' && (
            <div className="seller-panel seller-wallet-panel">
              <CircleDollarSign size={35} />
              <h3>Seller earnings</h3>
              <strong>{formatPeso(sales)}</strong>
              <div className="seller-finance-grid">
                <span>Pending COD collection<strong>{formatPeso(dashboard?.metrics.pendingPayments)}</strong></span>
                <span>Available balance<strong>{formatPeso(dashboard?.metrics.availableBalance)}</strong></span>
                <span>Completed payouts<strong>{formatPeso(dashboard?.metrics.completedPayouts)}</strong></span>
                <span>Platform fees<strong>{formatPeso(dashboard?.metrics.platformFees)}</strong></span>
              </div>
              <p>Orders currently use cash on delivery. Payment processor, platform fees, payout transfers, and transaction statuses are not connected, so payout figures stay at zero and the values above are estimates, not withdrawable funds.</p>
              <span>Registered payout account: {application?.details?.payoutBank || 'Not available'}</span>
              <button className="seller-secondary-button" onClick={downloadReport}>Download transactions report (CSV)</button>
            </div>
          )}

          {section === 'analytics' && (
            <>
              <div className="seller-metric-grid seller-analytics-grid">
                <article><span>Daily sales</span><strong>{formatPeso(dashboard?.metrics.dailySales)}</strong><BarChart3 size={20} /></article>
                <article><span>Weekly sales</span><strong>{formatPeso(dashboard?.metrics.weeklySales)}</strong><BarChart3 size={20} /></article>
                <article><span>Monthly sales</span><strong>{formatPeso(dashboard?.metrics.currentMonthSales)}</strong><BarChart3 size={20} /></article>
                <article><span>Average order value</span><strong>{formatPeso(dashboard?.metrics.averageOrderValue)}</strong><CircleDollarSign size={20} /></article>
                <article><span>Customers</span><strong>{dashboard?.metrics.customers || 0}</strong><Store size={20} /></article>
                <article><span>Total revenue</span><strong>{formatPeso(sales)}</strong><CircleDollarSign size={20} /></article>
              </div>
              <div className="seller-panel seller-analytics-columns">
                <div><h3>Best-selling products</h3>{(dashboard?.metrics.bestSellingProducts || []).map(product => <p key={product.name}>{product.name} · {product.sold} sold</p>)}</div>
                <div><h3>Least-selling products</h3>{(dashboard?.metrics.leastSellingProducts || []).map(product => <p key={product.name}>{product.name} · {product.sold} sold</p>)}</div>
              </div>
            </>
          )}

          {section === 'settings' && shopForm && (
            <form className="seller-panel seller-settings-form" onSubmit={saveShop}>
              <h3>Shop information</h3>
              <div className="seller-form-grid">
                <label>Shop name<input required value={shopForm.shopName || ''} onChange={event => setShopForm(current => ({ ...current, shopName: event.target.value }))} /></label>
                <label>Main category<select value={shopForm.category || categories[0]} onChange={event => setShopForm(current => ({ ...current, category: event.target.value }))}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
                <label>Shop phone<input required value={shopForm.shopPhone || ''} onChange={event => setShopForm(current => ({ ...current, shopPhone: event.target.value }))} /></label>
                <label>Shop email<input type="email" required value={shopForm.shopEmail || ''} onChange={event => setShopForm(current => ({ ...current, shopEmail: event.target.value }))} /></label>
                <label>Pickup address<input required value={shopForm.pickupAddress || ''} onChange={event => setShopForm(current => ({ ...current, pickupAddress: event.target.value }))} /></label>
                <label>Pickup barangay<input required value={shopForm.pickupBarangay || ''} onChange={event => setShopForm(current => ({ ...current, pickupBarangay: event.target.value }))} /></label>
                <label>Pickup city<input required value={shopForm.pickupCity || ''} onChange={event => setShopForm(current => ({ ...current, pickupCity: event.target.value }))} /></label>
                <label>Flat shipping fee (₱)<input type="number" min="0" max="99999" step="0.01" value={shopForm.shippingFee ?? 60} onChange={event => setShopForm(current => ({ ...current, shippingFee: event.target.value }))} /></label>
                <label>Store logo URL<input type="url" value={shopForm.logoUrl || ''} onChange={event => setShopForm(current => ({ ...current, logoUrl: event.target.value }))} /></label>
                <label>Store banner URL<input type="url" value={shopForm.bannerUrl || ''} onChange={event => setShopForm(current => ({ ...current, bannerUrl: event.target.value }))} /></label>
                <label>Payout account name<input value={shopForm.payoutAccountName || ''} onChange={event => setShopForm(current => ({ ...current, payoutAccountName: event.target.value }))} /></label>
                <label>Bank or wallet<input value={shopForm.payoutBank || ''} onChange={event => setShopForm(current => ({ ...current, payoutBank: event.target.value }))} /></label>
                <label>Account number<input value={shopForm.payoutAccountNumber || ''} onChange={event => setShopForm(current => ({ ...current, payoutAccountNumber: event.target.value }))} /></label>
              </div>
              <label className="seller-description-field">Store description<textarea rows="3" maxLength={2000} value={shopForm.description || ''} onChange={event => setShopForm(current => ({ ...current, description: event.target.value }))} /></label>
              <label className="seller-description-field">Shipping policy<textarea rows="3" maxLength={2000} value={shopForm.shippingPolicy || ''} onChange={event => setShopForm(current => ({ ...current, shippingPolicy: event.target.value }))} /></label>
              <label className="seller-description-field">Returns policy<textarea rows="3" maxLength={2000} value={shopForm.returnPolicy || ''} onChange={event => setShopForm(current => ({ ...current, returnPolicy: event.target.value }))} /></label>
              <button className="seller-primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save shop settings'}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
