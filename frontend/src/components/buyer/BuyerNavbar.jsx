
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Search,
  ShoppingCart,
  Heart,
  UserRound,
  ChevronDown,
  Menu,
  X,
  Package,
  MapPin,
  Settings,
  LogOut,
  Store,
  ShoppingBag
} from 'lucide-react'
import { useCart } from '../../context/useCart'
import api from '../../services/api'
import { clearAuthSession, getAuthUser } from '../../utils/auth'
import '../../styles/buyer/buyer-navbar.css'

export default function BuyerNavbar({ onSearch }) {
  const { itemCount } = useCart()
  const [search, setSearch] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const profileRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const firstName = getAuthUser()?.name?.trim().split(/\s+/)[0] || 'Buyer'
  const isProductsActive = location.pathname.startsWith('/buyer/products')
  const isOrdersActive = location.pathname.startsWith('/buyer/orders')
  const isCategoriesActive =
    location.pathname === '/buyer' && location.hash === '#buyer-categories'
  const isSellersActive =
    location.pathname === '/buyer' && location.hash === '#buyer-sellers'
  const isHomeActive =
    location.pathname === '/buyer' &&
    !isCategoriesActive &&
    !isSellersActive
  const isCartActive =
    location.pathname === '/cart' ||
    location.pathname.startsWith('/buyer/cart') ||
    location.pathname.includes('/checkout')
  const isAccountActive = [
    '/buyer/profile',
    '/buyer/addresses',
    '/buyer/account',
    '/buyer/wishlist'
  ].includes(location.pathname)

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const handleSearch = event => {
  event.preventDefault()

  const keyword = search.trim()

  onSearch(keyword)

  navigate(
    keyword
      ? `/buyer/products?q=${encodeURIComponent(keyword)}`
      : '/buyer/products'
  )

  setMobileOpen(false)
}
  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError('')

    try {
      await api.post('/auth/logout')
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        setLogoutError('Unable to sign out. Please check your connection and try again.')
        setIsLoggingOut(false)
        return
      }
    }

    clearAuthSession()
    setProfileOpen(false)
    setLogoutConfirmOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className="buyer-topbar">
        <div className="buyer-topbar-inner">
          <span>
            Discover Local. Support Local. Shop Local.
          </span>

          <div className="buyer-topbar-links">
            <Link to="/buyer">Buyer Home</Link>
            <Link to="/buyer/orders">My Orders</Link>
            <Link to="/seller">Seller Center</Link>
            <Link to="/buyer/become-seller">Become a Seller</Link>
          </div>
        </div>
      </div>

      <header className="buyer-header">
        <div className="buyer-header-main">

          <Link to="/buyer" className="buyer-brand">
            <span className="buyer-brand-logo">A4</span>

            <span className="buyer-brand-text">
              <strong>ALT F4</strong>
              <small>LOCAL MARKETPLACE</small>
            </span>
          </Link>

          <form
            className="buyer-search"
            onSubmit={handleSearch}
          >
            <Search size={19} />

            <input
              type="search"
              placeholder="Search products, categories, or sellers..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              aria-label="Search marketplace"
            />

            <button type="submit">Search</button>
          </form>

          <div className="buyer-header-actions">

            <button
              className="buyer-action-button"
              onClick={() => navigate('/buyer/wishlist')}
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart size={21} />
            </button>

            <button
              className={`buyer-action-button buyer-cart-button ${
                isCartActive ? 'active' : ''
              }`}
              onClick={() => navigate('/buyer/cart')}
              aria-label="Shopping cart"
              title="Shopping cart"
              aria-current={isCartActive ? 'page' : undefined}
            >
              <ShoppingCart size={22} />
              <span className="buyer-cart-count">{itemCount}</span>
            </button>

            <div className="buyer-profile-wrapper" ref={profileRef}>
              <button
                className={`buyer-profile-button ${
                  profileOpen || isAccountActive ? 'active' : ''
                }`}
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                <span className="buyer-profile-avatar">
                  <UserRound size={19} />
                </span>

                <span className="buyer-profile-name">
                  My Account
                </span>

                <ChevronDown
                  size={15}
                  className={profileOpen ? 'rotated' : ''}
                />
              </button>

              {profileOpen && (
                <div className="buyer-profile-dropdown">
                  <div className="buyer-dropdown-heading">
                    <span className="buyer-dropdown-avatar">
                      <UserRound size={21} />
                    </span>

                    <div>
                      <strong>Welcome, {firstName}!</strong>
                      <small>Manage your account</small>
                    </div>
                  </div>

                  <div className="buyer-dropdown-divider" />

                  <Link
                    to="/buyer/profile"
                    onClick={() => setProfileOpen(false)}
                  >
                    <UserRound size={17} />
                    My Profile
                  </Link>

                  <Link
                    to="/buyer/orders"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Package size={17} />
                    My Orders
                  </Link>

                  <Link
                    to="/seller"
                    onClick={() => setProfileOpen(false)}
                  >
                    Seller Center
                  </Link>

                  <Link
                    to="/buyer/addresses"
                    onClick={() => setProfileOpen(false)}
                  >
                    <MapPin size={17} />
                    My Addresses
                  </Link>

                  <Link
                    to="/buyer/wishlist"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Heart size={17} />
                    My Wishlist
                  </Link>

                  <Link
                    to="/buyer/account"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings size={17} />
                    Account Settings
                  </Link>

                  <Link
                    to="/buyer/become-seller"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Store size={17} />
                    Become a Seller
                  </Link>

                  <div className="buyer-dropdown-divider" />

                  {logoutError && (
                    <p role="alert">{logoutError}</p>
                  )}

                  <button
                    className="buyer-logout-button"
                    onClick={() => {
                      setLogoutError('')
                      setLogoutConfirmOpen(true)
                    }}
                  >
                    <LogOut size={17} />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            className="buyer-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>

        <div className="buyer-navigation">
          <nav className="buyer-navigation-inner">
            <Link
              to="/buyer"
              className={`buyer-nav-link ${isHomeActive ? 'active' : ''}`}
              aria-current={isHomeActive ? 'page' : undefined}
            >
              <ShoppingBag size={16} />
              Home
            </Link>

            <Link
              to="/buyer#buyer-categories"
              className={`buyer-nav-link ${isCategoriesActive ? 'active' : ''}`}
              aria-current={isCategoriesActive ? 'page' : undefined}
            >
              Categories
            </Link>

            <Link
              to="/buyer/products"
              className={`buyer-nav-link ${isProductsActive ? 'active' : ''}`}
              aria-current={isProductsActive ? 'page' : undefined}
            >
              Products
            </Link>

            <Link
              to="/buyer#buyer-sellers"
              className={`buyer-nav-link ${isSellersActive ? 'active' : ''}`}
              aria-current={isSellersActive ? 'page' : undefined}
            >
              Local Sellers
            </Link>

            <Link
              to="/buyer/orders"
              className={`buyer-nav-link ${isOrdersActive ? 'active' : ''}`}
              aria-current={isOrdersActive ? 'page' : undefined}
            >
              My Orders
            </Link>

            <Link
              to="/buyer/become-seller"
              className={`buyer-nav-link seller-link ${
                location.pathname.startsWith('/buyer/become-seller') ? 'active' : ''
              }`}
              aria-current={
                location.pathname.startsWith('/buyer/become-seller')
                  ? 'page'
                  : undefined
              }
            >
              Start Selling
            </Link>
          </nav>
        </div>

        {mobileOpen && (
          <div className="buyer-mobile-menu">
            <form
              className="buyer-mobile-search"
              onSubmit={handleSearch}
            >
              <Search size={18} />

              <input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />

              <button type="submit">Search</button>
            </form>

            <Link
              to="/buyer"
              className={isHomeActive ? 'active' : ''}
              aria-current={isHomeActive ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>

            <Link
              to="/buyer#buyer-categories"
              className={isCategoriesActive ? 'active' : ''}
              aria-current={isCategoriesActive ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              Categories
            </Link>

            <Link
              to="/buyer/products"
              className={isProductsActive ? 'active' : ''}
              aria-current={isProductsActive ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              Products
            </Link>

            <Link
              to="/buyer/orders"
              className={isOrdersActive ? 'active' : ''}
              aria-current={isOrdersActive ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              My Orders
            </Link>

            <Link
              to="/seller"
              onClick={() => setMobileOpen(false)}
            >
              Seller Center
            </Link>

            <Link
              to="/buyer/profile"
              className={isAccountActive ? 'active' : ''}
              aria-current={isAccountActive ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              My Profile
            </Link>

            <Link
              to="/buyer/become-seller"
              className={
                location.pathname.startsWith('/buyer/become-seller') ? 'active' : ''
              }
              aria-current={
                location.pathname.startsWith('/buyer/become-seller')
                  ? 'page'
                  : undefined
              }
              onClick={() => setMobileOpen(false)}
            >
              Become a Seller
            </Link>
          </div>
        )}
      </header>

      {logoutConfirmOpen && (
        <div
          className="buyer-logout-modal-overlay"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !isLoggingOut) {
              setLogoutConfirmOpen(false)
              setLogoutError('')
            }
          }}
        >
          <section
            className="buyer-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="buyer-logout-modal-title"
            aria-describedby="buyer-logout-modal-description"
          >
            <span className="buyer-logout-modal-icon">
              <LogOut size={22} />
            </span>
            <h2 id="buyer-logout-modal-title">Log out?</h2>
            <p id="buyer-logout-modal-description">
              Are you sure you want to log out of your account?
            </p>
            {logoutError && <p className="buyer-logout-modal-error" role="alert">{logoutError}</p>}
            <div className="buyer-logout-modal-actions">
              <button
                type="button"
                className="buyer-logout-cancel"
                onClick={() => {
                  setLogoutConfirmOpen(false)
                  setLogoutError('')
                }}
                disabled={isLoggingOut}
              >
                No, stay logged in
              </button>
              <button
                type="button"
                className="buyer-logout-confirm"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Yes, log out'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
