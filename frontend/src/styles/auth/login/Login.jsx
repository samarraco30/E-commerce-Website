
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../../services/api'
import {
  clearAuthSession,
  getAuthStorage,
  getAuthToken,
  storeAuthSession
} from '../../../utils/auth'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShoppingBag,
  Leaf,
  Store,
  Heart,
  UserRound,
  ArrowRight
} from 'lucide-react'
import './Login.css'

function getDestination(user, returnTo) {
  const validReturnTo =
    typeof returnTo === 'string' &&
    returnTo.startsWith('/') &&
    !returnTo.startsWith('//')
      ? returnTo
      : null

  if (user.is_admin) {
    return validReturnTo?.startsWith('/admin/')
      ? validReturnTo
      : '/admin'
  }

  return validReturnTo && !validReturnTo.startsWith('/admin/')
    ? validReturnTo
    : '/buyer'
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoringSession, setIsRestoringSession] = useState(
    () => Boolean(getAuthToken())
  )

  useEffect(() => {
    if (!getAuthToken()) return

    let active = true
    api.get('/user')
      .then(({ data }) => {
        if (!active) return
        const storage = getAuthStorage()
        const token = storage?.getItem('altf4.auth.token')
        if (!storage || !token) return
        storeAuthSession(storage, token, data)
        navigate(getDestination(data, location.state?.from), { replace: true })
      })
      .catch(requestError => {
        if (!active) return
        if (requestError.response?.status === 401) {
          clearAuthSession()
        } else {
          setError('Unable to restore your saved sign-in. Please try again.')
        }
      })
      .finally(() => {
        if (active) setIsRestoringSession(false)
      })

    return () => {
      active = false
    }
  }, [location.state?.from, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim(),
        password
      })

      const storage = rememberMe ? window.localStorage : window.sessionStorage
      storeAuthSession(storage, data.token, data.user)

      navigate(getDestination(data.user, location.state?.from), { replace: true })

    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to sign in. Please check your email and password.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">

      <div className="login-layout">

        {/* LEFT BRANDING PANEL */}
        <section className="login-visual">

          <div className="visual-overlay"></div>

          <div className="visual-content">

            <Link to="/" className="visual-brand">
              <ShoppingBag size={49} strokeWidth={2.5} />

              <div>
                <h1>alt + f4</h1>
                <span>STA. MARIA MARKETPLACE</span>
              </div>
            </Link>

            <div className="visual-divider"></div>

            <div className="visual-description">
              <h2>Shop Local. Support Local.</h2>

              <p>
                Discover and support local products from
                Sta. Maria, Bulacan.
              </p>
            </div>

          </div>

          {/* BOTTOM FEATURES */}
          <div className="visual-features">

            <div className="visual-feature">
              <Leaf size={21} />
              <span>Local Products</span>
            </div>

            <div className="visual-feature">
              <Store size={21} />
              <span>Local Sellers</span>
            </div>

            <div className="visual-feature">
              <Heart size={21} />
              <span>Stronger Community</span>
            </div>

          </div>

        </section>

        {/* RIGHT LOGIN PANEL */}
        <section className="login-panel">

          <div className="login-panel-inner">

            {/* TOP HELP */}
            <div className="login-help">
              <Link to="/forgot-password">
                <UserRound size={15} />
                <span>Need help?</span>
              </Link>
            </div>

            {/* LOGIN CONTENT */}
            <div className="login-content">

              <div className="login-heading">
                <h2>Welcome Back!</h2>
                <p>Log in to your alt + f4 account</p>
              </div>

              <form onSubmit={handleSubmit}>

                {isRestoringSession && (
                  <div className="login-alert" role="status">
                    Restoring your saved sign-in...
                  </div>
                )}

                {location.state?.registered && (
                  <div className="login-alert success" role="status">
                    Your account has been created.
                    You can now log in.
                  </div>
                )}

                {error && (
                  <div className="login-alert error" role="alert">
                    {error}
                  </div>
                )}

                {/* EMAIL */}
                <div className="login-field">
                  <div className="login-input">
                    <Mail size={17} />

                    <input
                      type="email"
                      placeholder="Email address"
                      aria-label="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div className="login-field">
                  <div className="login-input">
                    <Lock size={17} />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      aria-label="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPassword
                        ? <EyeOff size={17} />
                        : <Eye size={17} />
                      }
                    </button>
                  </div>
                </div>

                {/* LOGIN OPTIONS */}
                <div className="login-options">

                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  <Link to="/forgot-password">
                    Forgot password?
                  </Link>

                </div>

                {/* SUBMIT */}
                <button
                  type="submit"
                  className="login-submit"
                  disabled={isSubmitting || isRestoringSession}
                >
                  {isSubmitting ? 'Logging in...' : 'Log In'}
                </button>

              </form>

              {/* SOCIAL LOGIN */}
              <div className="social-section">

                <div className="social-divider">
                  <span>or</span>
                </div>

                <div className="social-buttons">

                  <button
                    type="button"
                    className="social-button"
                    disabled
                    aria-label="Google login not configured"
                    title="Google login is not configured yet"
                  >
                    <svg viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.61l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.72 5.99c4.5-4.17 7.08-10.32 7.08-17.64Z"/>
                      <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19Z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.81l-7.72-5.99c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="social-button facebook"
                    disabled
                    aria-label="Facebook login not configured"
                    title="Facebook login is not configured yet"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.5 1.6-1.5h1.7V3.1c-.8-.1-1.7-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.2h2.8V21h3.4Z"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="social-button x-social"
                    disabled
                    aria-label="X login not configured"
                    title="X login is not configured yet"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.6 22H2.5l7.3-8.4L1.8 2h6.4l4.5 6.8L18.9 2Zm-1.1 18h1.7L7.2 3.9H5.4L17.8 20Z"/>
                    </svg>
                  </button>

                </div>

              </div>

            </div>

            {/* BOTTOM REGISTER */}
            <div className="login-bottom">
              <span>Don't have an account?</span>

              <Link to="/register" state={location.state}>
                Sign up <ArrowRight size={14} />
              </Link>
            </div>

          </div>

        </section>

      </div>

    </main>
  )
}

export default Login
