import { createContext, useContext, useState, useCallback } from 'react'
import BASE from './api'

const AuthContext = createContext(null)

async function safeJson(res) {
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    throw new Error('Backend server is not running. Start the backend on port 5000.')
  }
  return res.json()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('translatify_user')) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('translatify_token') || null)

  const login = useCallback(async (email, password) => {
    let res
    try {
      res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    } catch {
      throw new Error('Cannot reach backend. Make sure the server is running on port 5000.')
    }
    const data = await safeJson(res)
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem('translatify_token', data.token)
    localStorage.setItem('translatify_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (name, email, password) => {
    let res
    try {
      res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
    } catch {
      throw new Error('Cannot reach backend. Make sure the server is running on port 5000.')
    }
    const data = await safeJson(res)
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    localStorage.setItem('translatify_token', data.token)
    localStorage.setItem('translatify_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('translatify_token')
    localStorage.removeItem('translatify_user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
