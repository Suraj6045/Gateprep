import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api, { AUTH_UNAUTHORIZED_EVENT, startTokenRefresh, stopTokenRefresh } from '../api/client'
import { mutate } from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    api.get('/auth/me')
      .then(r => {
        setUser(r.data)
        startTokenRefresh({ refreshNow: true })
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setSessionExpired(true)
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  useEffect(() => {
    return () => stopTokenRefresh()
  }, [])

  // Called after successful login or registration
  const saveUser = useCallback((userData) => {
    const u = {
      id: userData.id ?? userData.user_id,
      email: userData.email,
      role: userData.role,
      full_name: userData.full_name,
    }
    setUser(u)
    setSessionExpired(false)
    startTokenRefresh()
    return u
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch (err) { console.error('Logout API error:', err) }
    stopTokenRefresh()
    setUser(null)
    setSessionExpired(false)
    mutate(() => true, undefined, { revalidate: false })
    navigate('/login', { replace: true })
  }, [navigate])

  const confirmSessionExpired = useCallback(() => {
    stopTokenRefresh()
    setUser(null)
    setSessionExpired(false)
    mutate(() => true, undefined, { revalidate: false })
    navigate('/login', {
      replace: true,
      state: { from: `${location.pathname}${location.search}` },
    })
  }, [location.pathname, location.search, navigate])

  const value = useMemo(() => ({
    user,
    loading,
    saveUser,
    logout,
    sessionExpired,
  }), [user, loading, saveUser, logout, sessionExpired])

  return (
    <AuthContext.Provider value={value}>
      {children}
      {sessionExpired && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="presentation"
        >
          <Card
            className="w-full max-w-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="session-expired-title"
            aria-describedby="session-expired-description"
          >
            <CardContent className="p-5">
              <h2 id="session-expired-title" className="text-lg font-bold text-slate-900 dark:text-white">
                Session expired
              </h2>
              <p id="session-expired-description" className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Sign in again to continue.
              </p>
              <div className="mt-5 flex justify-end">
                <Button onClick={confirmSessionExpired} autoFocus>
                  Sign in
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
