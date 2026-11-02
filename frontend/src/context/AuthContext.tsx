import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api, { AUTH_UNAUTHORIZED_EVENT, startTokenRefresh, stopTokenRefresh } from '../api/client'
import { mutate } from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { MeResponse, AuthUserResponse } from '../types/api'

type AuthUser = {
  id: number
  email: string
  role: string
  full_name: string
} & Partial<Pick<MeResponse, 'is_active' | 'profile_photo' | 'created_at'>>

type SaveUserInput = AuthUserResponse & { user_id?: number }

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  saveUser: (userData: SaveUserInput) => AuthUser
  logout: () => Promise<void>
  sessionExpired: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    api.get<MeResponse>('/auth/me')
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
  const saveUser = useCallback((userData: SaveUserInput): AuthUser => {
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
        <div className="fixed inset-x-0 top-0 z-[100] p-4" role="alert">
          <Card className="mx-auto max-w-xl border-amber-500/40 bg-[var(--bg-card)] shadow-lg">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h2 id="session-expired-title" className="font-bold text-slate-900 dark:text-white">
                  Session expired
                </h2>
                <p id="session-expired-description" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your latest changes may not have been saved. Sign in again when you’re ready.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={() => setSessionExpired(false)}>
                  Continue
                </Button>
                <Button onClick={confirmSessionExpired}>
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
