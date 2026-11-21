import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const TOKEN_KEY = 'tripmate-token'

async function readResponse(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.error || 'The request could not be completed.')
    error.status = response.status
    throw error
  }
  return body
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))
  const [authError, setAuthError] = useState('')

  const authFetch = useCallback((path, options = {}) => {
    const headers = new Headers(options.headers || {})
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(path, { ...options, headers })
  }, [token])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setLoading(false)
    setAuthError('')
  }, [])

  useEffect(() => {
    let active = true
    if (!token) {
      return () => { active = false }
    }

    authFetch('/api/auth/me')
      .then(readResponse)
      .then(({ user: currentUser }) => {
        if (active) {
          setUser(currentUser)
          setAuthError('')
        }
      })
      .catch((error) => {
        if (!active) return
        if (error.status === 401) {
          logout()
        } else {
          setAuthError(error.message)
          setUser(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [authFetch, logout, token])

  async function authenticate(path, credentials) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
    const result = await readResponse(response)
    localStorage.setItem(TOKEN_KEY, result.token)
    setToken(result.token)
    setUser(result.user)
    setAuthError('')
    return result.user
  }

  const register = (credentials) => authenticate('/api/auth/register', credentials)
  const login = (credentials) => authenticate('/api/auth/login', credentials)

  const value = useMemo(
    () => ({ user, loading, authError, register, login, logout, authFetch }),
    [user, loading, authError, logout, authFetch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
