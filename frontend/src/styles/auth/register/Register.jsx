
import { useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../../services/api'
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Phone,
  ShoppingBag,
  Leaf,
  Store,
  Heart,
  Check,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'
import './Register.css'

function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const formRef = useRef(null)

  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  })

  const steps = [
    {
      number: 1,
      title: 'Personal Information',
      description: 'Tell us your name.'
    },
    {
      number: 2,
      title: 'Contact Information',
      description: 'How can we reach you?'
    },
    {
      number: 3,
      title: 'Account Security',
      description: 'Secure your ALT F4 account.'
    }
  ]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }))

    setError('')
  }

  // VALIDATE CURRENT STEP AND PROCEED
  const handleNext = () => {
    if (!formRef.current?.reportValidity()) {
      return
    }

    setError('')
    setStep((previous) => Math.min(previous + 1, 3))
  }

  // GO BACK TO PREVIOUS STEP
  const handleBack = () => {
    setError('')
    setStep((previous) => Math.max(previous - 1, 1))
  }

  // SUBMIT REGISTRATION
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please try again.')
      return
    }

    if (!formData.agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.')
      return
    }

    setIsSubmitting(true)

    try {
      await api.post('/auth/register', {
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password
      })

      navigate('/login', {
        replace: true,
        state: {
          registered: true,
          from: location.state?.from
        }
      })

    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to create your account. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="register-page">

      <div className="register-layout">

        {/* LEFT BRANDING PANEL */}
        <section className="register-visual">

          <div className="register-visual-overlay"></div>

          <div className="register-visual-content">

            <Link to="/" className="register-visual-brand">
              <ShoppingBag size={49} strokeWidth={2.5} />

              <div>
                <h1>alt + f4</h1>
                <span>STA. MARIA MARKETPLACE</span>
              </div>
            </Link>

            <div className="register-visual-divider"></div>

            <div className="register-visual-description">
              <h2>Be Part of Something Local.</h2>

              <p>
                Create your account and discover products
                made and offered by local businesses
                in Sta. Maria, Bulacan.
              </p>
            </div>

          </div>

          {/* MARKETPLACE FEATURES */}
          <div className="register-visual-features">

            <div className="register-visual-feature">
              <Leaf size={21} />
              <span>Local Products</span>
            </div>

            <div className="register-visual-feature">
              <Store size={21} />
              <span>Local Sellers</span>
            </div>

            <div className="register-visual-feature">
              <Heart size={21} />
              <span>Stronger Community</span>
            </div>

          </div>

        </section>

        {/* RIGHT REGISTRATION PANEL */}
        <section className="register-panel">

          <div className="register-panel-inner">

            {/* LIVE STEP INDICATOR */}
            <div className="register-progress">

              <div className="register-progress-heading">
                <span>CREATE YOUR ACCOUNT</span>
                <span>STEP {step} OF 3</span>
              </div>

              <div className="register-step-track">

                {steps.map((item, index) => (
                  <div
                    key={item.number}
                    className={`register-step ${
                      step >= item.number ? 'active' : ''
                    } ${
                      step > item.number ? 'completed' : ''
                    }`}
                  >

                    <div className="register-step-circle">
                      {step > item.number
                        ? <Check size={16} strokeWidth={3} />
                        : item.number
                      }
                    </div>

                    <span className="register-step-label">
                      {item.title}
                    </span>

                    {index !== 2 && (
                      <div className="register-step-line">
                        <div
                          className="register-step-line-fill"
                          style={{
                            width: step > item.number ? '100%' : '0%'
                          }}
                        />
                      </div>
                    )}

                  </div>
                ))}

              </div>

            </div>

            {/* DYNAMIC HEADING */}
            <div className="register-heading">
              <h2>
                {step === 1 && 'Personal Information'}
                {step === 2 && 'Contact Information'}
                {step === 3 && 'Create Your Password'}
              </h2>

              <p>
                {steps[step - 1].description}
              </p>
            </div>

            {/* REGISTRATION FORM */}
            <form
              ref={formRef}
              onSubmit={handleSubmit}
            >

              {error && (
                <div className="register-alert" role="alert">
                  {error}
                </div>
              )}

              {/* =================================
                  STEP 1 - PERSONAL INFORMATION
              ================================== */}
              {step === 1 && (
                <div className="register-step-content">

                  <div className="register-field">
                    <label htmlFor="firstName">
                      First Name
                    </label>

                    <div className="register-input">
                      <User size={18} />

                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="Enter your first name"
                        value={formData.firstName}
                        onChange={handleChange}
                        autoComplete="given-name"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="register-field">
                    <label htmlFor="lastName">
                      Last Name
                    </label>

                    <div className="register-input">
                      <User size={18} />

                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Enter your last name"
                        value={formData.lastName}
                        onChange={handleChange}
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  </div>

                  <div className="register-step-note">
                    <User size={17} />
                    <span>
                      Let's start with your basic personal information.
                    </span>
                  </div>

                </div>
              )}

              {/* =================================
                  STEP 2 - CONTACT INFORMATION
              ================================== */}
              {step === 2 && (
                <div className="register-step-content">

                  <div className="register-field">
                    <label htmlFor="register-email">
                      Email Address
                    </label>

                    <div className="register-input">
                      <Mail size={18} />

                      <input
                        id="register-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="register-field">
                    <label htmlFor="register-phone">
                      Phone Number
                    </label>

                    <div className="register-input">
                      <Phone size={18} />

                      <input
                        id="register-phone"
                        name="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        autoComplete="tel"
                        required
                      />
                    </div>
                  </div>

                  <div className="register-step-note">
                    <Lock size={17} />
                    <span>
                      Your contact details will be used for
                      account-related communication.
                    </span>
                  </div>

                </div>
              )}

              {/* =================================
                  STEP 3 - ACCOUNT SECURITY
              ================================== */}
              {step === 3 && (
                <div className="register-step-content">

                  <div className="register-field">
                    <label htmlFor="register-password">
                      Password
                    </label>

                    <div className="register-input">
                      <Lock size={18} />

                      <input
                        id="register-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create your password"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        autoFocus
                      />

                      <button
                        type="button"
                        className="register-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword
                          ? <EyeOff size={18} />
                          : <Eye size={18} />
                        }
                      </button>
                    </div>
                    <span className="register-field-hint">
                      Use at least 8 characters.
                    </span>
                  </div>

                  <div className="register-field">
                    <label htmlFor="confirmPassword">
                      Confirm Password
                    </label>

                    <div className="register-input">
                      <Lock size={18} />

                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={
                          showConfirmPassword ? 'text' : 'password'
                        }
                        placeholder="Re-enter your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />

                      <button
                        type="button"
                        className="register-password-toggle"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        aria-label={
                          showConfirmPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        {showConfirmPassword
                          ? <EyeOff size={18} />
                          : <Eye size={18} />
                        }
                      </button>
                    </div>
                  </div>

                  {/* TERMS AND PRIVACY */}
                  <div className="register-terms">

                    <label>
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        required
                      />

                      <span>
                        I agree to the{' '}
                        <Link to="/terms" target="_blank">
                          Terms of Service
                        </Link>
                        {' '}and{' '}
                        <Link to="/privacy" target="_blank">
                          Privacy Policy
                        </Link>.
                      </span>
                    </label>

                  </div>

                </div>
              )}

              {/* =================================
                  NAVIGATION BUTTONS
              ================================== */}
              <div className="register-navigation">

                {step > 1 ? (
                  <button
                    type="button"
                    className="register-back-button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft size={17} />
                    Back
                  </button>
                ) : (
                  <Link to="/login" className="register-login-link">
                    Already have an account?
                    <span>Sign In</span>
                  </Link>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    className="register-next-button"
                    onClick={handleNext}
                  >
                    Next
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="register-next-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Creating Account...'
                      : 'Create Account'
                    }

                    {!isSubmitting && <ArrowRight size={17} />}
                  </button>
                )}

              </div>

            </form>

            {/* FOOTER */}
            <div className="register-footer">
              <span>© 2026 ALT F4 Marketplace</span>
              <span>Sta. Maria, Bulacan</span>
            </div>

          </div>

        </section>

      </div>

    </main>
  )
}

export default Register
