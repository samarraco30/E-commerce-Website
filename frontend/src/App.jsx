
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Login from './styles/auth/login/Login.jsx'
import Register from './styles/auth/register/Register'
import PasswordReset from './pages/auth/PasswordReset'
import BuyerLayout from './layouts/BuyerLayout'
import RequireAuth from './components/auth/RequireAuth'
import { requireLogin } from './utils/auth'
import BuyerDashboard from './pages/buyer/BuyerDashboard'
import BuyerProductsPage from './pages/buyer/Products'
import ProductDetails from './pages/buyer/ProductDetails'
import CartPage from './pages/buyer/CartPage'
import CheckoutPage from './pages/buyer/CheckoutPage'
import OrderReceipt from './pages/buyer/OrderReceipt'
import OrderHistory from './pages/buyer/OrderHistory'
import OrderTracking from './pages/buyer/OrderTracking'
import AddressBookPage from './pages/buyer/AddressBookPage'
import SellerApplication from './pages/seller/SellerApplication'
import SellerDashboard from './pages/seller/SellerDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import { useCart } from './context/useCart'
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  ShoppingBag,
  ShoppingCart,
  Menu,
  X,
  MapPin,
  ShieldCheck,
  Truck,
  HeartHandshake,
  Store,
  Sprout,
  Utensils,
  Palette,
  Package,
  Drumstick,
  Gift,
  Star,
  CheckCircle2,
  BadgeCheck,
  Mail,
  Cookie
} from 'lucide-react'
import { FaFacebook, FaInstagram } from 'react-icons/fa'
import './App.css'

// ============================================
// IMAGE HELPER
// ============================================

const currentYear = new Date().getFullYear()
const termsUpdatedDate = new Date().toLocaleDateString('en-PH', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})
const cookieConsentKey = 'altf4.cookie-consent'
const cookieSettingsEvent = 'altf4:cookie-settings'

const image = (id, width = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`

// ============================================
// CATEGORIES
// ============================================

const categories = [
  {
    name: 'Fresh Produce',
    detail: 'Fresh harvests and farm goods',
    icon: Sprout,
    count: 'Farm finds',
    image: image('photo-1500382017468-9049fed747ef', 700)
  },
  {
    name: 'Food & Beverages',
    detail: 'Everyday local favorites',
    icon: Utensils,
    count: 'Local flavors',
    image: image('photo-1547592180-85f173990554', 700)
  },
  {
    name: 'Local Delicacies',
    detail: 'Treats made close to home',
    icon: Package,
    count: 'Sweet & savory',
    image: image('photo-1608198093002-ad4e005484a0', 700)
  },
  {
    name: 'Handicrafts',
    detail: 'Handmade pieces and crafts',
    icon: Palette,
    count: 'Made by hand',
    image: image('photo-1452860606245-08befc0ff44b', 700)
  },
  {
    name: 'Poultry & Chicken',
    detail: 'Fresh local poultry and eggs',
    icon: Drumstick,
    count: 'Farm fresh',
    image: image('photo-1506976785307-8732e854ad03', 700)
  },
  {
    name: 'Pasalubong',
    detail: 'Local treats and gifts to bring home',
    icon: Gift,
    count: 'Local favorites',
    image: image('photo-1608198093002-ad4e005484a0', 700)
  }
]

// ============================================
// SAMPLE PRODUCTS
// ============================================

const products = [
  {
    id: 1,
    name: 'Fresh Farm Vegetables',
    category: 'Agricultural Products',
    price: '₱85',
    unit: 'per bundle',
    seller: 'Sample Farm Store',
    rating: '4.9',
    image: image('photo-1540420773420-3366772f4999'),
    tag: 'Farm fresh'
  },
  {
    id: 2,
    name: 'Traditional Rice Cakes',
    category: 'Local Delicacies',
    price: '₱120',
    unit: 'per box',
    seller: 'Sample Kakanin House',
    rating: '4.8',
    image: image('photo-1490645935967-10de6ba17061'),
    tag: 'Local favorite'
  },
  {
    id: 3,
    name: 'Handwoven Basket',
    category: 'Handicrafts',
    price: '₱250',
    unit: 'per piece',
    seller: 'Sample Craft Corner',
    rating: '5.0',
    image: '/images/handwoven-basket.svg',
    tag: 'Handmade'
  },
  {
    id: 4,
    name: 'Fresh Local Eggs',
    category: 'Poultry & Chicken',
    price: '₱110',
    unit: 'per tray',
    seller: 'Sample Poultry Shop',
    rating: '4.9',
    image: image('photo-1506976785307-8732e854ad03'),
    tag: 'Daily essentials'
  }
]

// ============================================
// SAMPLE SELLERS
// ============================================

const sellers = [
  {
    name: 'Sample Farm Store',
    type: 'Agricultural products',
    image: image('photo-1500382017468-9049fed747ef', 500),
    initials: 'SF'
  },
  {
    name: 'Sample Kakanin House',
    type: 'Local delicacies',
    image: image('photo-1608198093002-ad4e005484a0', 500),
    initials: 'KH'
  },
  {
    name: 'Sample Craft Corner',
    type: 'Handmade crafts',
    image: image('photo-1452860606245-08befc0ff44b', 500),
    initials: 'CC'
  }
]

// ============================================
// HERO CAROUSEL SLIDES
// ============================================

const heroSlides = [
  {
    eyebrow: 'FROM STA. MARIA, BULACAN',
    title: 'Discover the best of Sta. Maria.',
    description:
      'Explore locally produced products, discover unique finds, and support the hardworking entrepreneurs of our community.',
    image: image('photo-1500382017468-9049fed747ef', 1600),
    alt: 'Agricultural fields and green countryside',
    label: 'Explore local products',
    link: '#products'
  },
  {
    eyebrow: 'SUPPORT LOCAL ENTREPRENEURS',
    title: 'Every local product has a story.',
    description:
      'Meet the people behind the products and discover the creativity, passion, and hard work of local businesses.',
    image: image('photo-1556761175-b413da4baf72', 1600),
    alt: 'Small business owners working together',
    label: 'Meet our local sellers',
    link: '#sellers'
  },
  {
    eyebrow: 'FRESH FINDS, LOCAL FLAVORS',
    title: 'Bring local goodness closer to home.',
    description:
      'From agricultural products to local delicacies, find something special from the community.',
    image: image('photo-1540420773420-3366772f4999', 1600),
    alt: 'Fresh vegetables and local produce',
    label: 'Discover the marketplace',
    link: '#categories'
  }
]

// ============================================
// HEADER AND SEARCH BAR
// ============================================

function Header({ onSearch }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeSection, setActiveSection] = useState('')
  const navigate = useNavigate()
  const { itemCount } = useCart()

  useEffect(() => {
    const sectionIds = ['categories', 'products', 'sellers', 'about']

    const updateActiveSection = () => {
      const header = document.querySelector('.header')
      const activationPoint =
        window.scrollY + (header?.getBoundingClientRect().height || 0) + 24
      let nextSection = ''

      for (const sectionId of sectionIds) {
        const section = document.getElementById(sectionId)
        const sectionTop =
          section && section.getBoundingClientRect().top + window.scrollY
        if (section && sectionTop <= activationPoint) {
          nextSection = sectionId
        }
      }

      setActiveSection(nextSection)
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)
    window.addEventListener('hashchange', updateActiveSection)

    return () => {
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
      window.removeEventListener('hashchange', updateActiveSection)
    }
  }, [])

  const close = () => setMenuOpen(false)

  const submitSearch = e => {
    e.preventDefault()
    onSearch(query.trim())
    close()

    document.getElementById('products')?.scrollIntoView({
      behavior: 'smooth'
    })
  }

  return (
    <>
      <div className="announcement">
        <span>
          Celebrating the makers and growers of Sta. Maria, Bulacan
        </span>

        <a href="#about">
          Discover our community <ArrowRight size={13} />
        </a>
      </div>

      <header className="header">
        <div className="container nav-wrap">

          <Link to="/" className="brand" onClick={close}>
            <span className="brand-mark">A4</span>

            <span>
              <b>ALT F4</b>
              <small>LOCAL MARKETPLACE</small>
            </span>
          </Link>

          <form className="navbar-search" onSubmit={submitSearch}>
            <Search size={19} />

            <input
              type="search"
              placeholder="Search products, categories, or sellers..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search products"
            />

            <button type="submit">Search</button>
          </form>

          <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
            <a
              href="#categories"
              className={activeSection === 'categories' ? 'active' : ''}
              aria-current={activeSection === 'categories' ? 'location' : undefined}
              onClick={close}
            >
              Categories
            </a>

            <a
              href="#products"
              className={activeSection === 'products' ? 'active' : ''}
              aria-current={activeSection === 'products' ? 'location' : undefined}
              onClick={close}
            >
              Products
            </a>

            <a
              href="#sellers"
              className={activeSection === 'sellers' ? 'active' : ''}
              aria-current={activeSection === 'sellers' ? 'location' : undefined}
              onClick={close}
            >
              Local Sellers
            </a>

            <a
              href="#about"
              className={activeSection === 'about' ? 'active' : ''}
              aria-current={activeSection === 'about' ? 'location' : undefined}
              onClick={close}
            >
              About Us
            </a>

            <div className="mobile-actions">
              <button
                className="btn btn-outline"
                onClick={() => {
                  navigate('/login')
                  close()
                }}
              >
                Log in
              </button>

              <button
                className="btn btn-primary"
                onClick={() => {
                  navigate('/register')
                  close()
                }}
              >
                Sign up
              </button>
            </div>
          </nav>

          <div className="nav-actions">
            <button
              className="icon-btn cart-btn"
              aria-label="Shopping cart"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart size={19} />
              {itemCount > 0 && (
                <span className="cart-dot">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            <button
              className="btn btn-outline login-btn"
              onClick={() => navigate('/login')}
            >
              Log in
            </button>

            <button
              className="btn btn-primary signup-btn"
              onClick={() => navigate('/register')}
            >
              Sign up
            </button>
          </div>

          <button
            className="mobile-menu"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen && (
          <form className="mobile-search" onSubmit={submitSearch}>
            <Search size={18} />

            <input
              type="search"
              placeholder="Search products..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />

            <button type="submit">Search</button>
          </form>
        )}
      </header>
    </>
  )
}

// ============================================
// AUTOMATIC HERO CAROUSEL
// ============================================

function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(previous =>
        (previous + 1) % heroSlides.length
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const slide = heroSlides[currentSlide]

  return (
    <section className="hero-carousel">

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          className="hero-slide"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(4, 12, 35, 0.88) 0%, rgba(4, 12, 35, 0.65) 48%, rgba(4, 12, 35, 0.12) 100%), url("${slide.image}")`
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="container hero-slide-content">
            <motion.div
              key={`content-${currentSlide}`}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="hero-kicker">
                <MapPin size={15} />
                {slide.eyebrow}
              </span>

              <h1>{slide.title}</h1>

              <p>{slide.description}</p>

              <a href={slide.link} className="btn btn-accent">
                {slide.label}
                <ArrowRight size={17} />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="hero-indicators">
        {heroSlides.map((item, index) => (
          <span
            key={index}
            className={
              currentSlide === index ? 'active' : ''
            }
          />
        ))}
      </div>

    </section>
  )
}

// ============================================
// SECTION TITLE
// ============================================

function SectionTitle({
  eyebrow,
  title,
  description,
  link,
  href
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {link && (
        <a className="text-link" href={href}>
          {link} <ArrowRight size={16} />
        </a>
      )}
    </div>
  )
}

// ============================================
// CATEGORIES
// ============================================


function Categories({ onCategory }) {
  return (
    <section className="section" id="categories">
      <div className="container">

        <SectionTitle
          eyebrow="Explore the marketplace"
          title="Shop by category"
          description="Find what you need from our local marketplace."
          link="Browse all products"
          href="#products"
        />

        <div className="category-icon-grid">
          {categories.map((cat, i) => (
            <motion.button
              className="category-icon-card"
              key={cat.name}
              onClick={() => {
                onCategory(cat.name)

                document.getElementById('products')?.scrollIntoView({
                  behavior: 'smooth'
                })
              }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              title={cat.name}
              aria-label={`Shop ${cat.name}`}
            >
              <span className="category-icon-circle">
                <cat.icon size={27} strokeWidth={1.8} />
              </span>

              <span className="category-icon-label">
                {cat.name}
              </span>
            </motion.button>
          ))}
        </div>

      </div>
    </section>
  )
}

// ============================================
// PRODUCTS AND SEARCH FILTER
// ============================================

function HomeProducts({
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm
}) {
  const [activeProduct, setActiveProduct] = useState(null)
  const { addItem } = useCart()
  const navigate = useNavigate()

  const openProduct = product => {
    if (!requireLogin(navigate, `/buyer/products/${product.id}`)) return
    setActiveProduct(product)
  }

  const addProductToCart = product => {
    if (!requireLogin(navigate, `/buyer/products/${product.id}`)) return
    addItem(product)
  }

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchesCategory =
        selectedCategory === 'All' ||
        p.category === selectedCategory

      const searchableText =
        `${p.name} ${p.category} ${p.seller} ${p.tag}`.toLowerCase()

      const matchesSearch =
        searchableText.includes(searchTerm.toLowerCase())

      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchTerm])

  return (
    <section className="section section-soft" id="products">
      <div className="container">

        <SectionTitle
          eyebrow="Handpicked for you"
          title="Featured local finds"
          description="A preview of the kinds of products you can discover from local sellers in Sta. Maria."
          link="Meet local sellers"
          href="#sellers"
        />

        <div className="product-toolbar">
          <div className="filter-pills">
            {['All', ...categories.map(c => c.name)].map(c => (
              <button
                key={c}
                className={
                  selectedCategory === c
                    ? 'filter-pill active'
                    : 'filter-pill'
                }
                onClick={() => setSelectedCategory(c)}
              >
                {c === 'Agricultural Products'
                  ? 'Agriculture'
                  : c === 'Household Products'
                    ? 'Home'
                    : c}
              </button>
            ))}
          </div>

          <span className="result-count">
            {filtered.length} sample products
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="product-grid">
            {filtered.map((p, i) => (
              <motion.article
                className="product-card"
                key={p.id}
                onClick={event => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest('button')
                  ) return
                  openProduct(p)
                }}
                onKeyDown={event => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest('button')
                  ) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openProduct(p)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View ${p.name}`}
                layout
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <button
                  className="product-image"
                  onClick={() => openProduct(p)}
                  aria-label={`View ${p.name}`}
                >
                  <img src={p.image} alt={p.name} />

                  <span className="product-tag">
                    {p.tag}
                  </span>

                  <span className="quick-view">
                    Quick view <ArrowUpRight size={14} />
                  </span>
                </button>

                <div className="product-info">
                  <span className="product-category">
                    {p.category}
                  </span>

                  <button
                    className="product-name"
                    onClick={() => openProduct(p)}
                  >
                    {p.name}
                  </button>

                  <div className="seller-name">
                    <Store size={13} />
                    {p.seller}
                  </div>

                  <div className="product-bottom">
                    <div>
                      <b>{p.price}</b>
                      <small>{p.unit}</small>
                    </div>

                    <div className="product-bottom-actions">
                      <span className="rating">
                        <Star size={13} fill="currentColor" />
                        {p.rating}
                      </span>
                      <button
                        type="button"
                        className="home-add-cart"
                        onClick={event => {
                          event.stopPropagation()
                          addProductToCart(p)
                        }}
                        aria-label={`Add ${p.name} to cart`}
                        title={`Add ${p.name} to cart`}
                      >
                        <ShoppingCart size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={28} />

            <b>No sample products found</b>

            <span>
              Try another keyword or category.
            </span>

            <button
              className="btn btn-outline"
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('All')
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        <p className="sample-note">
          Product names, seller names, and prices shown are demonstration
          content for the landing page.
        </p>
      </div>

      <AnimatePresence>
        {activeProduct && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveProduct(null)}
          >
            <motion.div
              className="product-modal"
              initial={{ y: 20, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setActiveProduct(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>

              <img
                src={activeProduct.image}
                alt={activeProduct.name}
              />

              <div>
                <span className="product-category">
                  {activeProduct.category}
                </span>

                <h3>{activeProduct.name}</h3>

                <p>
                  Listed by {activeProduct.seller}. Add this local find
                  to your cart to review it with your other products.
                </p>

                <b className="modal-price">
                  {activeProduct.price}{' '}
                  <small>{activeProduct.unit}</small>
                </b>

                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (!requireLogin(
                      navigate,
                      `/buyer/products/${activeProduct.id}`
                    )) return
                    addItem(activeProduct)
                    setActiveProduct(null)
                  }}
                >
                  <ShoppingCart size={16} />
                  Add to Cart
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ============================================
// LOCAL SELLERS
// ============================================

function Sellers() {
  return (
    <section className="section" id="sellers">
      <div className="container">

        <SectionTitle
          eyebrow="People behind the products"
          title="Meet our local sellers"
          description="Every local business has a story. Discover the people and small enterprises behind the products."
          link="Become a seller"
          href="/register"
        />

        <div className="seller-grid">
          {sellers.map((s, i) => (
            <motion.div
              className="seller-card"
              key={s.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <img src={s.image} alt={s.type} />

              <div className="seller-avatar">
                {s.initials}
              </div>

              <div className="seller-details">
                <span className="verified">
                  <BadgeCheck size={14} />
                  Sample profile
                </span>

                <h3>{s.name}</h3>
                <p>{s.type}</p>

                <a href="/register" className="text-link">
                  View shop <ArrowRight size={15} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="seller-cta">
          <div>
            <span className="eyebrow">
              For local entrepreneurs
            </span>

            <h3>
              Have products to share with the community?
            </h3>

            <p>
              Bring your local business online and introduce your
              products to more people.
            </p>
          </div>

          <Link className="btn btn-accent" to="/register">
            Become a Seller <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ============================================
// WHY CHOOSE ALT F4
// ============================================

function WhyUs() {
  const features = [
    {
      icon: MapPin,
      title: 'Truly local',
      text: 'A marketplace focused on products and entrepreneurs from Sta. Maria, Bulacan.'
    },
    {
      icon: ShieldCheck,
      title: 'A more confident way to shop',
      text: 'Clear product and seller information helps shoppers make informed choices.'
    },
    {
      icon: HeartHandshake,
      title: 'Community support',
      text: 'Discover small businesses and help local entrepreneurs reach more customers.'
    },
    {
      icon: Truck,
      title: 'Convenient discovery',
      text: 'Explore a variety of local finds in one accessible online marketplace.'
    }
  ]

  return (
    <section className="section why-section" id="why">
      <div className="container why-layout">

        <div className="why-intro">
          <span className="eyebrow">
            The ALT F4 difference
          </span>

          <h2>
            Good finds. Local roots. Stronger community.
          </h2>

          <p>
            ALT F4 brings local products and shoppers closer together
            through one convenient digital marketplace.
          </p>

          <a className="btn btn-primary" href="#about">
            Learn about ALT F4 <ArrowRight size={16} />
          </a>
        </div>

        <div className="feature-grid">
          {features.map((f, i) => (
            <motion.div
              className="feature-card"
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <span className="feature-icon">
                <f.icon size={22} />
              </span>

              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// PROMOTIONAL SECTION
// ============================================

function Promo() {
  return (
    <section className="promo-wrap">
      <div className="container">

        <div className="promo">
          <div className="promo-content">
            <span className="promo-label">
              LOCAL BUSINESS, BIGGER POSSIBILITIES
            </span>

            <h2>
              Your products deserve to be discovered.
            </h2>

            <p>
              Join a growing online space made to showcase the products
              and creativity of Sta. Maria's local entrepreneurs.
            </p>

            <Link to="/register" className="btn btn-accent">
              Start selling with ALT F4 <ArrowRight size={16} />
            </Link>
          </div>

          <div className="promo-image">
            <img
              src={image('photo-1556761175-b413da4baf72', 900)}
              alt="Small business owners working together"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// HOW IT WORKS
// ============================================

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Explore local finds',
      text: 'Browse categories and discover products from local sellers.',
      icon: Search
    },
    {
      n: '02',
      title: 'Choose your favorites',
      text: 'Review product details and find something that suits your needs.',
      icon: ShoppingBag
    },
    {
      n: '03',
      title: 'Support local businesses',
      text: 'Connect with the community by choosing locally offered products.',
      icon: HeartHandshake
    }
  ]

  return (
    <section className="section section-soft" id="how">
      <div className="container">

        <SectionTitle
          eyebrow="Simple by design"
          title="How ALT F4 works"
          description="A simple way to discover local products and connect with the people who make or grow them."
        />

        <div className="steps-grid">
          {steps.map((s, i) => (
            <motion.div
              className="step-card"
              key={s.n}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="step-top">
                <span>{s.n}</span>
                <s.icon size={23} />
              </div>

              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// ABOUT ALT F4
// ============================================

function About() {
  return (
    <section className="section" id="about">
      <div className="container about-grid">

        <div className="about-image">
          <img
            src={image('photo-1464226184884-fa280b87c399', 1000)}
            alt="Fresh produce displayed at a local market"
          />

          <div className="about-stamp">
            <b>ALT F4</b>
            <span>Discover local</span>
          </div>
        </div>

        <div className="about-copy">
          <span className="eyebrow">Our purpose</span>

          <h2>
            Bringing Sta. Maria's local products closer to everyone.
          </h2>

          <p>
            ALT F4 is an e-commerce platform designed to promote and
            sell locally produced products from Sta. Maria, Bulacan.
            It aims to give buyers an easier way to discover local goods
            while helping community-based sellers showcase their
            offerings online.
          </p>

          <p>
            More than a place to shop, ALT F4 is a digital space that
            celebrates local enterprise, creativity, and community.
          </p>

          <div className="about-points">
            <span>
              <CheckCircle2 size={17} />
              Local product discovery
            </span>

            <span>
              <CheckCircle2 size={17} />
              A platform for local sellers
            </span>

            <span>
              <CheckCircle2 size={17} />
              Community-centered marketplace
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// FOOTER
// ============================================

function Footer() {
  return (
    <footer className="footer">
      <div className="container">

        <div className="footer-main">

          <div className="footer-brand">
            <Link to="/" className="brand brand-light">
              <span className="brand-mark">A4</span>

              <span>
                <b>ALT F4</b>
                <small>LOCAL MARKETPLACE</small>
              </span>
            </Link>

            <p>
              Discover Local. Support Local. Shop Local.
              <br />
              A digital marketplace for Sta. Maria, Bulacan.
            </p>

            <div className="socials">
              <a href="#about" aria-label="Facebook">
                <FaFacebook size={17} />
              </a>

              <a href="#about" aria-label="Instagram">
                <FaInstagram size={17} />
              </a>

              <a href="mailto:hello@altf4.local" aria-label="Email">
                <Mail size={17} />
              </a>
            </div>
          </div>

          <div className="footer-col">
            <b>Marketplace</b>
            <a href="#categories">Categories</a>
            <a href="#products">Featured products</a>
            <a href="#sellers">Local sellers</a>
          </div>

          <div className="footer-col">
            <b>About ALT F4</b>
            <a href="#about">Our platform</a>
            <a href="#why">Why choose us</a>
            <a href="#how">How it works</a>
          </div>

          <div className="footer-col">
            <b>Get started</b>
            <Link to="/login">Buyer login</Link>
            <Link to="/register">Create an account</Link>
            <Link to="/register">Become a seller</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
            <button
              className="footer-cookie-settings"
              onClick={() => window.dispatchEvent(new Event(cookieSettingsEvent))}
              type="button"
            >
              Cookie settings
            </button>
          </div>

        </div>

        <div className="footer-bottom">
          <span>
            © {currentYear} ALT F4. All rights reserved.
          </span>

          <span>
            <MapPin size={14} />
            Sta. Maria, Bulacan, Philippines
          </span>
        </div>
      </div>
    </footer>
  )
}

// ============================================
// MAIN APP
// ============================================

function BuyerComingSoon() {
  return (
    <div style={{
      minHeight: '55vh',
      display: 'grid',
      placeItems: 'center',
      padding: '30px'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '450px' }}>
        <h2 style={{ color: '#202A44' }}>
          Buyer feature coming soon
        </h2>

        <p style={{ color: '#77819A', lineHeight: 1.7 }}>
          This section will be developed in the next stage of ALT F4.
        </p>

        <Link
          to="/buyer"
          className="btn btn-primary"
          style={{ textDecoration: 'none' }}
        >
          Back to Buyer Home
        </Link>
      </div>
    </div>
  )
}

function TermsAndConditions() {
  return (
    <>
      <main className="terms-page">
        <div className="terms-container">
          <Link to="/" className="terms-back-link">
            <ArrowRight size={16} aria-hidden="true" />
            Back to ALT F4
          </Link>

          <header className="terms-header">
            <span className="eyebrow">ALT F4 Marketplace</span>
            <h1>Terms &amp; Conditions</h1>
            <p>
              These terms explain the basic rules for using ALT F4, a
              marketplace connecting buyers with local sellers in Sta. Maria,
              Bulacan.
            </p>
            <span className="terms-updated">Last updated: {termsUpdatedDate}</span>
          </header>

          <div className="terms-notice">
            This page is a general draft for the ALT F4 marketplace. Have it
            reviewed by a qualified Philippine lawyer before launch.
          </div>

          <article className="terms-content">
            <section>
              <h2>1. Using ALT F4</h2>
              <p>
                By visiting or using this website, you agree to these terms.
                If you do not agree, please do not use the marketplace. You
                must be legally able to enter into an agreement to use the
                services. If you are under the age of majority, use the
                marketplace with the involvement of a parent or legal
                guardian.
              </p>
            </section>

            <section>
              <h2>2. Accounts</h2>
              <p>
                Keep your registration details accurate and your sign-in
                credentials secure. You are responsible for activity carried
                out through your account. Contact ALT F4 promptly if you
                believe your account has been accessed without permission.
                We may restrict or suspend an account when reasonably needed
                to protect users, the marketplace, or comply with law.
              </p>
            </section>

            <section>
              <h2>3. Marketplace and seller listings</h2>
              <p>
                ALT F4 provides a platform for buyers to discover products
                offered by local sellers. Sellers are responsible for the
                accuracy and legality of their listings, product quality,
                and fulfilling their obligations to buyers. Product images,
                availability, and descriptions are provided by sellers and
                may change.
              </p>
            </section>

            <section>
              <h2>4. Orders, payment, and delivery</h2>
              <p>
                Product prices, applicable charges, available payment
                methods, and delivery details are shown during the purchase
                process where available. An order may depend on seller
                confirmation and product availability. Please review your
                order details before submitting it. Questions about an order,
                delivery, cancellation, or a return should be raised through
                the contact or support options provided by ALT F4. Your
                rights under applicable consumer protection laws are not
                limited by these terms.
              </p>
            </section>

            <section>
              <h2>5. Acceptable use</h2>
              <p>
                Do not use ALT F4 to break the law, mislead or harm another
                person, interfere with the website, access accounts or data
                without permission, or post material that you do not have
                the right to use. We may remove content or restrict access
                when necessary to address misuse or meet legal obligations.
              </p>
            </section>

            <section>
              <h2>6. Content and intellectual property</h2>
              <p>
                ALT F4 and its original website content are owned by or
                licensed to their respective rights holders. Sellers retain
                responsibility for the content they submit and must have the
                rights needed to publish it. By submitting listing content,
                you allow ALT F4 to display it as needed to operate and
                promote the marketplace.
              </p>
            </section>

            <section>
              <h2>7. Website availability</h2>
              <p>
                We work to keep the marketplace available and accurate, but
                cannot promise uninterrupted or error-free access. To the
                extent permitted by law, ALT F4 is not responsible for
                indirect losses arising from use of the website or
                transactions between buyers and sellers. Nothing in these
                terms excludes a right or responsibility that cannot legally
                be excluded.
              </p>
            </section>

            <section>
              <h2>8. Privacy and cookies</h2>
              <p>
                ALT F4 uses essential browser storage to support site
                functionality and remember your cookie preference. Optional
                cookies or similar technologies, if used, should only be
                enabled with your choice. You can update your preference
                using “Cookie settings” in the site footer. Do not enter
                information you do not want processed through the
                marketplace.
              </p>
            </section>

            <section>
              <h2>9. Changes and contact</h2>
              <p>
                We may update these terms as the marketplace changes. The
                updated version will appear on this page with a revised date.
                Continued use after an update means you accept the revised
                terms, to the extent allowed by law. For questions, contact
                ALT F4 at{' '}
                <a href="mailto:hello@altf4.local">hello@altf4.local</a>.
              </p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}

function CookieConsent() {
  const [isVisible, setIsVisible] = useState(() => {
    const savedChoice = window.localStorage.getItem(cookieConsentKey)
    return savedChoice !== 'all' && savedChoice !== 'necessary'
  })

  useEffect(() => {
    const showCookieSettings = () => setIsVisible(true)
    window.addEventListener(cookieSettingsEvent, showCookieSettings)
    return () => window.removeEventListener(cookieSettingsEvent, showCookieSettings)
  }, [])

  const saveChoice = choice => {
    window.localStorage.setItem(cookieConsentKey, choice)
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          aria-labelledby="cookie-consent-title"
          className="cookie-consent"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22 }}
        >
          <div className="cookie-consent-copy">
            <span className="cookie-consent-icon" aria-hidden="true">
              <Cookie size={21} />
            </span>
            <div>
              <h2 id="cookie-consent-title">Cookies at ALT F4</h2>
              <p>
                We use essential browser storage to make the marketplace work
                and remember your choice. Choose whether to allow optional
                cookies.{' '}
                <Link to="/terms">Read our terms</Link>.
              </p>
            </div>
          </div>
          <div className="cookie-consent-actions">
            <button
              className="btn btn-outline"
              onClick={() => saveChoice('necessary')}
              type="button"
            >
              Only necessary
            </button>
            <button
              className="btn btn-primary"
              onClick={() => saveChoice('all')}
              type="button"
            >
              Accept cookies
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function AppContent() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')

  const location = useLocation()
  const currentPath = location.pathname

  if (currentPath === '/terms') {
    return <TermsAndConditions />
  }

  // Authentication pages
  if (currentPath === '/login') {
    return <Login />
  }

  if (currentPath === '/register') {
    return <Register />
  }

  if (currentPath === '/forgot-password' || currentPath === '/reset-password') {
    return <PasswordReset />
  }

  // Cart page
  if (currentPath === '/cart') {
    return (
      <RequireAuth>
        <BuyerLayout>
          <CartPage />
        </BuyerLayout>
      </RequireAuth>
    )
  }

  if (currentPath === '/checkout' || currentPath === '/buyer/checkout') {
    return (
      <RequireAuth>
        <BuyerLayout>
          <CheckoutPage />
        </BuyerLayout>
      </RequireAuth>
    )
  }

  const receiptMatch = currentPath.match(/^\/buyer\/receipt\/([^/]+)$/)
  if (receiptMatch) {
    return (
      <RequireAuth>
        <BuyerLayout>
          <OrderReceipt orderId={receiptMatch[1]} />
        </BuyerLayout>
      </RequireAuth>
    )
  }

  if (currentPath === '/buyer/orders') {
    return (
      <RequireAuth>
        <BuyerLayout>
          <OrderHistory />
        </BuyerLayout>
      </RequireAuth>
    )
  }

  const trackingMatch = currentPath.match(/^\/buyer\/orders\/([^/]+)\/tracking$/)
  if (trackingMatch) {
    return (
      <RequireAuth>
        <BuyerLayout>
          <OrderTracking orderId={trackingMatch[1]} />
        </BuyerLayout>
      </RequireAuth>
    )
  }

  if (currentPath === '/buyer/addresses') {
    return (
      <RequireAuth>
        <BuyerLayout>
          <AddressBookPage />
        </BuyerLayout>
      </RequireAuth>
    )
  }

  if (currentPath === '/buyer/become-seller') {
    return (
      <RequireAuth>
        <BuyerLayout>
          <SellerApplication />
        </BuyerLayout>
      </RequireAuth>
    )
  }

  if (currentPath === '/seller') {
    return (
      <RequireAuth>
        <SellerDashboard />
      </RequireAuth>
    )
  }

  if (currentPath === '/admin' || currentPath === '/admin/seller-applications') {
    return (
      <RequireAuth adminOnly>
        <AdminDashboard initialSection={currentPath === '/admin/seller-applications' ? 'sellers' : 'overview'} />
      </RequireAuth>
    )
  }

  if (currentPath === '/buyer') {
    return (
      <BuyerLayout>
        {searchTerm => <BuyerDashboard searchTerm={searchTerm} />}
      </BuyerLayout>
    )
  }

  if (currentPath === '/buyer/products') {
    return (
      <BuyerLayout>
        {buyerSearchTerm => (
          <BuyerProductsPage
            key={location.search}
            searchTerm={buyerSearchTerm}
          />
        )}
      </BuyerLayout>
    )
  }

  if (currentPath === '/buyer/cart') {
    return (
      <RequireAuth>
        <BuyerLayout>
          <CartPage />
        </BuyerLayout>
      </RequireAuth>
    )
  }

  const productDetailsMatch = currentPath.match(/^\/buyer\/products\/([^/]+)$/)
  if (productDetailsMatch) {
    return (
      <BuyerLayout>
        <ProductDetails key={productDetailsMatch[1]} productId={productDetailsMatch[1]} />
      </BuyerLayout>
    )
  }

  if (currentPath.startsWith('/buyer/')) {
    return (
      <BuyerLayout>
        <BuyerComingSoon />
      </BuyerLayout>
    )
  }

  // Main marketplace homepage
  return (
    <>
      <Header onSearch={setSearchTerm} />

      <main>
        <Hero />

        <Categories
          onCategory={setSelectedCategory}
        />

        <HomeProducts
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        <Sellers />

        <WhyUs />

        <Promo />

        <HowItWorks />

        <About />
      </main>

      <Footer />
    </>
  )
}

export default function App() {
  return (
    <>
      <AppContent />
      <CookieConsent />
    </>
  )
}
