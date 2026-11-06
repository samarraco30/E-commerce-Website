import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import api from '../../services/api'
import {
  clearAuthSession,
  getAuthUser,
  hasAuthToken,
  storeAuthSession
} from '../../utils/auth'

export default function RequireAuth({ children, adminOnly = false }) {
  const location = useLocation()
  const [user, setUser] = useState(getAuthUser)
  const [checkingUser, setCheckingUser] = useState(
    adminOnly && hasAuthToken() && !getAuthUser()
  )
  const [verificationError, setVerificationError] = useState('')

  useEffect(() => {
    if (!adminOnly || !hasAuthToken() || user) return

    let active = true
    setCheckingUser(true)
    api.get('/user')
      .then(({ data }) => {
        if (!active) return
        const storage = window.localStorage.getItem('altf4.auth.token')
          ? window.localStorage
          : window.sessionStorage
        storeAuthSession(storage, storage.getItem('altf4.auth.token'), data)
        setUser(data)
      })
      .catch(requestError => {
        if (!active) return
        if (requestError.response?.status === 401) {
          clearAuthSession()
          setUser(null)
        } else {
          setVerificationError('Unable to verify your account. Please try again.')
        }
      })
      .finally(() => {
        if (active) setCheckingUser(false)
      })

    return () => {
      active = false
    }
  }, [adminOnly, user])

  if (!hasAuthToken()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`
        }}
      />
    )
  }

  if (adminOnly && checkingUser) {
    return <p role="status">Verifying administrator access...</p>
  }

  if (adminOnly && verificationError) {
    return <p role="alert">{verificationError}</p>
  }

  if (adminOnly && !user?.is_admin) {
    return <Navigate to="/buyer" replace />
  }

  return children
}
