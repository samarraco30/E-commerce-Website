const TOKEN_KEY = 'altf4.auth.token'
const USER_KEY = 'altf4.auth.user'
const AUTH_SESSION_CHANGED = 'altf4:auth-session-changed'

export function getAuthStorage() {
  if (window.localStorage.getItem(TOKEN_KEY)) return window.localStorage
  if (window.sessionStorage.getItem(TOKEN_KEY)) return window.sessionStorage
  return null
}

export function getAuthToken() {
  return getAuthStorage()?.getItem(TOKEN_KEY) || null
}

export function hasAuthToken() {
  return Boolean(getAuthToken())
}

export function getAuthUser() {
  const serializedUser =
    window.localStorage.getItem(USER_KEY) ||
    window.sessionStorage.getItem(USER_KEY)

  if (!serializedUser) return null

  try {
    return JSON.parse(serializedUser)
  } catch {
    return null
  }
}

export function storeAuthSession(storage, token, user) {
  window.localStorage.removeItem(TOKEN_KEY)
  window.sessionStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
  window.sessionStorage.removeItem(USER_KEY)
  storage.setItem(TOKEN_KEY, token)
  storage.setItem(USER_KEY, JSON.stringify(user))
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED))
}

export function clearAuthSession() {
  window.localStorage.removeItem(TOKEN_KEY)
  window.sessionStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
  window.sessionStorage.removeItem(USER_KEY)
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED))
}

export function getAuthSessionChangedEventName() {
  return AUTH_SESSION_CHANGED
}

export function requireLogin(navigate, from) {
  if (hasAuthToken()) return true

  navigate('/login', {
    state: { from }
  })
  return false
}
