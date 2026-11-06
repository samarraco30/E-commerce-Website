
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  ShoppingCart,
  Heart,
  Star,
  Sprout,
  Utensils,
  Package,
  Palette,
  Drumstick,
  Gift,
  MapPin
} from 'lucide-react'
import { useCart } from '../../context/useCart'
import { requireLogin } from '../../utils/auth'
import api from '../../services/api'
import products from '../../data/products'
import '../../styles/buyer/buyer-dashboard.css'

const categories = [
  { name: 'Agricultural Products', icon: Sprout },
  { name: 'Food & Beverages', icon: Utensils },
  { name: 'Local Delicacies', icon: Package },
  { name: 'Handicrafts', icon: Palette },
  { name: 'Poultry & Chicken', icon: Drumstick },
  { name: 'Pasalubong', icon: Gift }
]

const heroSlides = [
  {
    eyebrow: 'FROM STA. MARIA, BULACAN',
    title: 'Discover the best of Sta. Maria.',
    description: 'Explore local products and support the people who make them.',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=85'
  },
  {
    eyebrow: 'SUPPORT LOCAL ENTREPRENEURS',
    title: 'Every local product has a story.',
    description: 'Meet the people and small businesses behind your favorite finds.',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=85'
  },
  {
    eyebrow: 'FRESH FINDS, LOCAL FLAVORS',
    title: 'Bring local goodness closer to home.',
    description: 'Find fresh produce, local delicacies, and handmade goods.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1600&q=85'
  }
]

export default function BuyerDashboard({ searchTerm = '' }) {
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [wishlist, setWishlist] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [sellerProducts, setSellerProducts] = useState([])
  const [sellerProductsError, setSellerProductsError] = useState('')

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide(previous => (previous + 1) % heroSlides.length)
    }, 3000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true

    api.get('/marketplace/products')
      .then(({ data }) => {
        if (!active) return
        setSellerProducts(data.data.map(product => ({
          ...product,
          images: product.images?.length
            ? product.images
            : [product.imageUrl || '/images/product-image-unavailable.svg'],
          image: product.imageUrl || product.images?.[0] || '/images/product-image-unavailable.svg',
          unit: product.unit || 'per item'
        })))
      })
      .catch(requestError => {
        if (active) {
          setSellerProductsError(
            requestError.response?.data?.message ||
            'Seller listings could not be loaded. Please refresh to try again.'
          )
        }
      })

    return () => {
      active = false
    }
  }, [])

  const featuredProducts = useMemo(
    () => [...sellerProducts, ...products].slice(0, Math.max(4, sellerProducts.length)),
    [sellerProducts]
  )

  const filteredProducts = useMemo(() => {
    return featuredProducts.filter(product => {
      const matchesCategory =
        selectedCategory === 'All' ||
        product.category === selectedCategory

      const search = searchTerm.toLowerCase()

      const matchesSearch =
        `${product.name} ${product.category} ${product.seller} ${product.tag}`
          .toLowerCase()
          .includes(search)

      return matchesCategory && matchesSearch
    })
  }, [featuredProducts, selectedCategory, searchTerm])

  const toggleWishlist = productId => {
    setWishlist(current =>
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId]
    )
  }

  const formatPrice = price =>
    `₱${price.toLocaleString('en-PH')}`

  const openProduct = product => navigate(`/buyer/products/${product.id}`)

  const addProductToCart = (event, product) => {
    event.stopPropagation()
    if (!requireLogin(navigate, `/buyer/products/${product.id}`)) return
    addItem(product)
  }

  return (
    <div className="buyer-dashboard">

      {/* HERO BANNER */}
      <section className="buyer-hero" aria-label="Marketplace highlights">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="buyer-hero-slide"
            style={{ backgroundImage: `url("${heroSlides[currentSlide].image}")` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            aria-hidden="true"
          >
            <div className="buyer-hero-overlay" />
          </motion.div>
        </AnimatePresence>

        <div className="buyer-hero-content">
          <span className="buyer-hero-label">
            <MapPin size={15} />
            {heroSlides[currentSlide].eyebrow}
          </span>

          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-content-${currentSlide}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <h1>{heroSlides[currentSlide].title}</h1>
              <p>{heroSlides[currentSlide].description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="buyer-hero-indicators" aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <span
              key={slide.eyebrow}
              className={index === currentSlide ? 'active' : ''}
            />
          ))}
        </div>
      </section>

      {/* CATEGORY SECTION */}
      <section className="buyer-section" id="buyer-categories">
        <div className="buyer-section-heading">
          <div>
            <span className="buyer-eyebrow">EXPLORE THE MARKETPLACE</span>
            <h2>Shop by Category</h2>
            <p>Find something you love from local businesses.</p>
          </div>

          <Link to="/buyer/products" className="buyer-section-link">
            View Products <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="buyer-category-grid">
          {categories.map(category => {
            const Icon = category.icon

            return (
              <button
                key={category.name}
                className={`buyer-category-card ${
                  selectedCategory === category.name ? 'selected' : ''
                }`}
                onClick={() => {
                  setSelectedCategory(category.name)

                  document.getElementById('buyer-products')?.scrollIntoView({
                    behavior: 'smooth'
                  })
                }}
              >
                <span className="buyer-category-icon">
                  <Icon size={27} strokeWidth={1.8} />
                </span>

                <strong>{category.name}</strong>
              </button>
            )
          })}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="buyer-section buyer-products-section" id="buyer-products">
        <div className="buyer-section-heading">
          <div>
            <span className="buyer-eyebrow">DISCOVER LOCAL FINDS</span>
            <h2>Featured Products</h2>
            <p>Explore products offered by our local marketplace sellers.</p>
          </div>
        </div>

        <div className="buyer-product-toolbar">
          <div className="buyer-product-filters">
            <button
              className={selectedCategory === 'All' ? 'active' : ''}
              onClick={() => setSelectedCategory('All')}
            >
              All Products
            </button>

            {categories.map(category => (
              <button
                key={category.name}
                className={
                  selectedCategory === category.name ? 'active' : ''
                }
                onClick={() => setSelectedCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <span className="buyer-product-count">
            {filteredProducts.length} products
          </span>
        </div>

        {sellerProductsError && (
          <p className="buyer-demo-note" role="alert">{sellerProductsError}</p>
        )}

        {filteredProducts.length > 0 ? (
          <div className="buyer-product-grid">
            {filteredProducts.map(product => (
              <article
                className="buyer-product-card buyer-clickable-product"
                key={product.id}
                onClick={event => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest('button, a')
                  ) return
                  openProduct(product)
                }}
                onKeyDown={event => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest('button, a')
                  ) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openProduct(product)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View ${product.name}`}
              >
                <div className="buyer-product-image">
                  <img src={product.image} alt={product.name} />

                  <span className="buyer-product-tag">
                    {product.tag}
                  </span>

                  <button
                    className={`buyer-wishlist-button ${
                      wishlist.includes(product.id) ? 'liked' : ''
                    }`}
                    onClick={event => {
                      event.stopPropagation()
                      toggleWishlist(product.id)
                    }}
                    aria-label="Toggle wishlist"
                  >
                    <Heart
                      size={19}
                      fill={
                        wishlist.includes(product.id)
                          ? 'currentColor'
                          : 'none'
                      }
                    />
                  </button>
                </div>

                <div className="buyer-product-info">
                  <span className="buyer-product-category">
                    {product.category}
                  </span>

                  <h3>{product.name}</h3>

                  <p className="buyer-product-seller">
                    {product.seller}
                  </p>

                  <div className="buyer-product-rating">
                    <Star size={14} fill="currentColor" />
                    {product.rating}
                  </div>

                  <div className="buyer-product-bottom">
                    <div>
                      <strong>{formatPrice(product.price)}</strong>
                      <small>{product.unit}</small>
                    </div>

                    <button
                      className="buyer-add-cart"
                      onClick={event => addProductToCart(event, product)}
                      aria-label={`Add ${product.name} to cart`}
                      title={`Add ${product.name} to cart`}
                    >
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="buyer-empty-products">
            <Search size={30} />
            <h3>No products found</h3>
            <p>Try a different search keyword or category.</p>

            <button
              onClick={() => setSelectedCategory('All')}
            >
              Clear category filter
            </button>
          </div>
        )}

        <p className="buyer-demo-note">
          Seller listings are loaded from the marketplace database. Sample products are shown when space is available.
        </p>
      </section>

      {/* LOCAL SELLER SECTION */}
      <section className="buyer-seller-banner" id="buyer-sellers">
        <div>
          <span className="buyer-eyebrow">FOR LOCAL ENTREPRENEURS</span>
          <h2>Have products to share?</h2>
          <p>
            Bring your local business online and introduce your products
            to more people in Sta. Maria.
          </p>
        </div>

        <Link to="/buyer/become-seller">
          Start Selling <ArrowRight size={17} />
        </Link>
      </section>

    </div>
  )
}
