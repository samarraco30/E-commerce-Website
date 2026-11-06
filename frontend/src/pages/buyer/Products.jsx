
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import products from '../../data/products'
import ProductCard from '../../components/buyer/ProductCard'
import { requireLogin } from '../../utils/auth'
import api from '../../services/api'
import '../../styles/buyer/buyer-products.css'
import '../seller/seller.css'

const categories = [
  'All',
  'Agricultural Products',
  'Food & Beverages',
  'Local Delicacies',
  'Handicrafts',
  'Poultry & Chicken',
  'Pasalubong'
]

export default function Products({ searchTerm = '' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState('recommended')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [wishlist, setWishlist] = useState([])
  const [sellerProducts, setSellerProducts] = useState([])
  const [sellerProductsError, setSellerProductsError] = useState('')
  const [vouchers, setVouchers] = useState([])
  const [vouchersLoading, setVouchersLoading] = useState(true)
  const [voucherError, setVoucherError] = useState('')
  const [voucherNotice, setVoucherNotice] = useState('')

  const [localSearch, setLocalSearch] = useState(() => searchParams.get('q') || '')

  const activeSearch = searchTerm || localSearch

  useEffect(() => {
    api.get('/marketplace/products')
      .then(({ data }) => {
        setSellerProducts(data.data.map(product => ({
          ...product,
          images: product.images?.length ? product.images : [product.imageUrl],
          image: product.imageUrl || product.images?.[0],
          unit: product.unit || 'per item'
        })))
      })
      .catch(requestError => {
        setSellerProductsError(
          requestError.response?.data?.message ||
          'Seller listings could not be loaded. Please refresh to try again.'
        )
      })
  }, [])

  useEffect(() => {
    let active = true
    api.get('/buyer/vouchers')
      .then(({ data }) => {
        if (active) setVouchers(data.data)
      })
      .catch(requestError => {
        if (active) {
          setVoucherError(requestError.response?.status === 401
            ? 'Sign in to claim seller vouchers.'
            : requestError.response?.data?.message || 'Seller vouchers could not be loaded.')
        }
      })
      .finally(() => {
        if (active) setVouchersLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filteredProducts = useMemo(() => {
    let result = [...products, ...sellerProducts].filter(product => {
      const keyword = activeSearch.toLowerCase()

      const matchesSearch =
        !keyword ||
        `${product.name} ${product.category} ${product.seller} ${product.tag}`
          .toLowerCase()
          .includes(keyword)

      const matchesCategory =
        category === 'All' || product.category === category

      const matchesMin =
        minPrice === '' || product.price >= Number(minPrice)

      const matchesMax =
        maxPrice === '' || product.price <= Number(maxPrice)

      return (
        matchesSearch &&
        matchesCategory &&
        matchesMin &&
        matchesMax
      )
    })

    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price)
    } else if (sortBy === 'newest') {
      result.sort(
        (a, b) =>
          new Date(b.dateAdded) - new Date(a.dateAdded)
      )
    } else if (sortBy === 'popular') {
      result.sort((a, b) => b.sold - a.sold)
    }

    return result
  }, [activeSearch, category, minPrice, maxPrice, sortBy, sellerProducts])

  const handleSearch = event => {
    event.preventDefault()
    setSearchParams(localSearch.trim()
      ? { q: localSearch.trim() }
      : {})
  }

  const toggleWishlist = productId => {
    setWishlist(current =>
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId]
    )
  }

  const clearFilters = () => {
    setCategory('All')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('recommended')
    setLocalSearch('')
    setSearchParams({})
  }

  const openProduct = product => {
    navigate(`/buyer/products/${product.id}`)
  }

  const claimVoucher = async voucher => {
    if (!requireLogin(navigate, '/buyer/products')) return
    setVoucherError('')
    setVoucherNotice('')
    try {
      await api.post(`/buyer/vouchers/${voucher.id}/claim`)
      setVouchers(current => current.map(item => item.id === voucher.id ? { ...item, claimed: true } : item))
      setVoucherNotice(`${voucher.name || voucher.code} claimed. It will be applied automatically at checkout when eligible.`)
    } catch (requestError) {
      setVoucherError(requestError.response?.data?.message || 'This voucher could not be claimed.')
    }
  }

  const formatVoucher = voucher => {
    if (voucher.type === 'fixed_amount') return `₱${Number(voucher.amount).toLocaleString('en-PH')} off`
    if (voucher.type === 'minimum_spend') return `₱${Number(voucher.amount).toLocaleString('en-PH')} off when you spend ₱${Number(voucher.minimumSpend).toLocaleString('en-PH')}`
    return `${Number(voucher.percentage).toLocaleString('en-PH')}% off`
  }

  return (
    <div className="buyer-products-page">
      <div className="buyer-products-heading">
        <div>
          <span className="buyer-eyebrow">ALT F4 MARKETPLACE</span>
          <h1>Explore Products</h1>
          <p>
            Discover products offered by local businesses in
            Sta. Maria, Bulacan.
          </p>
        </div>
      </div>

      <form className="buyer-products-search" onSubmit={handleSearch}>
        <Search size={19} />

        <input
          type="search"
          value={localSearch}
          onChange={event => setLocalSearch(event.target.value)}
          placeholder="Search products, categories, or sellers..."
        />

        <button type="submit">Search</button>
      </form>

      <section className="buyer-vouchers" aria-labelledby="buyer-vouchers-title">
        <div className="buyer-vouchers-heading">
          <div>
            <span className="buyer-eyebrow">CLAIM BEFORE CHECKOUT</span>
            <h2 id="buyer-vouchers-title">Seller vouchers</h2>
            <p>Claim a voucher and we’ll apply the best eligible claimed voucher automatically at checkout. You can also enter another code there.</p>
          </div>
        </div>
        {voucherError && <p className="buyer-voucher-message" role="alert">
          {voucherError === 'Sign in to claim seller vouchers.'
            ? <> <Link to="/login" state={{ from: '/buyer/products' }}>Sign in</Link> to view and claim seller vouchers.</>
            : voucherError}
        </p>}
        {voucherNotice && <p className="buyer-voucher-message buyer-voucher-success" role="status">{voucherNotice}</p>}
        {vouchersLoading ? <p className="buyer-voucher-empty">Loading vouchers...</p> : vouchers.length ? (
          <div className="buyer-voucher-list">
            {vouchers.map(voucher => (
              <article className="buyer-voucher-card" key={voucher.id}>
                <div>
                  <strong>{voucher.name || voucher.code}</strong>
                  <span>{formatVoucher(voucher)} · {voucher.shop}</span>
                  <small>Code: {voucher.code}{voucher.endsAt ? ` · Ends ${new Date(voucher.endsAt).toLocaleDateString()}` : ''}</small>
                </div>
                <button type="button" disabled={voucher.claimed} onClick={() => claimVoucher(voucher)}>
                  {voucher.claimed ? 'Claimed' : 'Claim voucher'}
                </button>
              </article>
            ))}
          </div>
        ) : !voucherError ? <p className="buyer-voucher-empty">No seller vouchers are available right now.</p> : null}
      </section>

      <div className="buyer-products-content">
        <aside className="buyer-filter-sidebar">
          <div className="buyer-filter-heading">
            <h3>
              <SlidersHorizontal size={17} />
              Filters
            </h3>

            <button onClick={clearFilters}>Clear all</button>
          </div>

          <div className="buyer-filter-group">
            <h4>Categories</h4>

            {categories.map(item => (
              <button
                key={item}
                className={
                  category === item ? 'selected' : ''
                }
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="buyer-filter-group">
            <h4>Price Range</h4>

            <div className="buyer-price-inputs">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={minPrice}
                onChange={event => setMinPrice(event.target.value)}
              />

              <span>—</span>

              <input
                type="number"
                min="0"
                placeholder="Max"
                value={maxPrice}
                onChange={event => setMaxPrice(event.target.value)}
              />
            </div>

            <button
              className="buyer-apply-filter"
              onClick={() => {}}
            >
              Apply Price
            </button>
          </div>
        </aside>

        <section className="buyer-products-results">
          <div className="buyer-results-toolbar">
            <div>
              <h2>
                {activeSearch
                  ? `Results for "${activeSearch}"`
                  : category === 'All'
                    ? 'All Products'
                    : category}
              </h2>

              <p>{filteredProducts.length} products found</p>
            </div>

            <label className="buyer-sort-control">
              Sort by:

              <select
                value={sortBy}
                onChange={event => setSortBy(event.target.value)}
              >
                <option value="recommended">Recommended</option>
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </label>
          </div>

          {sellerProductsError && <p className="seller-alert" role="alert">{sellerProductsError}</p>}

          {filteredProducts.length > 0 ? (
            <div className="buyer-product-grid">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  wishlist={wishlist}
                  onToggleWishlist={toggleWishlist}
                  onQuickView={openProduct}
                />
              ))}
            </div>
          ) : (
            <div className="buyer-empty-products">
              <Search size={30} />

              <h3>No products found</h3>

              <p>
                Try another keyword or adjust your filters.
              </p>

              <button onClick={clearFilters}>
                <X size={15} />
                Clear Filters
              </button>
            </div>
          )}

          <p className="buyer-demo-note">
            Marketplace listings include approved seller products and sample products.
          </p>
            </section>
          </div>
    </div>
  )
}
