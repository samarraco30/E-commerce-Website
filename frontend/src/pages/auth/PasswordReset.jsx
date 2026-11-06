import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, Mail, ShoppingBag } from 'lucide-react'
import api from '../../services/api'
import './PasswordReset.css'

export default function PasswordReset() {
  const location = useLocation()
  const navigate = useNavigate()
  const resetMode = location.pathname === '/reset-password'
  const query = new URLSearchParams(location.search)
  const token = query.get('token') || ''
  const [email, setEmail] = useState(query.get('email') || '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      if (resetMode) {
        const { data } = await api.post('/auth/reset-password', {
          token,
          email: email.trim(),
          password,
          password_confirmation: passwordConfirmation
        })
        setMessage(data.message)
      } else {
        const { data } = await api.post('/auth/forgot-password', {
          email: email.trim()
        })
        setMessage(data.message)
      }
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors
      setError(
        validationErrors
          ? Object.values(validationErrors).flat().join(' ')
          : requestError.response?.data?.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="password-reset-page">
      <section className="password-reset-card">
        <Link to="/" className="password-reset-brand">
          <ShoppingBag size={26} />
          <span>ALT F4</span>
        </Link>

        <div className="password-reset-icon">
          {resetMode ? <KeyRound size={25} /> : <Mail size={25} />}
        </div>
        <h1>{resetMode ? 'Choose a new password' : 'Forgot your password?'}</h1>
        <p>
          {resetMode
            ? 'Enter a new password for your account.'
            : 'Enter the email address linked to your account and we will send you a reset link.'}
        </p>

        {error && <div className="password-reset-alert error" role="alert">{error}</div>}
        {message && (
          <div className="password-reset-alert success" role="status">
            {message}
          </div>
        )}

        {!(resetMode && !token) && !(resetMode && message) && (
          <form onSubmit={handleSubmit}>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            {resetMode && (
              <>
                <label>
                  New password
                  <input
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    type="password"
                    value={passwordConfirmation}
                    onChange={event => setPasswordConfirmation(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
              </>
            )}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait...'
                : resetMode
                  ? 'Reset password'
                  : 'Send reset link'}
            </button>
          </form>
        )}

        {resetMode && !token && (
          <div className="password-reset-alert error" role="alert">
            This reset link is missing its token. Request a new link to continue.
          </div>
        )}

        {resetMode && message ? (
          <button
            className="password-reset-secondary"
            type="button"
            onClick={() => navigate('/login')}
          >
            Go to sign in
          </button>
        ) : null}

        <Link to="/login" className="password-reset-back">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </section>
    </main>
  )
}
