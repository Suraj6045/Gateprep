import axios from 'axios'

export const AUTH_UNAUTHORIZED_EVENT = 'gateprep:auth-unauthorized'

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const BASE_URL = import.meta.env.PROD
  ? '/api'
  : rawApiUrl.split(',')[0].trim()

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 30000,
  withCredentials: true,
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      const isAuthRoute = err.config?.url?.includes('/auth/')
      if (!isAuthRoute) {
        window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT))
      }
    }
    return Promise.reject(err)
  }
)

// ── Silent token refresh ─────────────────────────────────────────
// Refreshes the httpOnly auth cookie before it expires.
// Token lifetime is 3 hours; refresh fires every 2.5 hours.
const REFRESH_INTERVAL_MS = 2.5 * 60 * 60 * 1000 // 2.5 hours
let refreshTimer = null

export function startTokenRefresh({ refreshNow = false } = {}) {
  stopTokenRefresh()
  if (refreshNow) {
    // Reset the clock for existing sessions restored from /auth/me.
    api.post('/auth/refresh').catch(() => {})
  }
  refreshTimer = setInterval(async () => {
    try {
      await api.post('/auth/refresh')
    } catch {
      // 401 will be caught by the existing interceptor
    }
  }, REFRESH_INTERVAL_MS)
}

export function stopTokenRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

export default api
