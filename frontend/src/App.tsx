import { lazy, Suspense } from 'react'
import { SWRConfig } from 'swr'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute, GuestRoute } from './components/shared/ProtectedRoute'
import Spinner from './components/shared/Spinner'
import Dashboard from './pages/Dashboard'
const LoginPage      = lazy(() => import('./pages/Login'))
const RegisterPage   = lazy(() => import('./pages/Register'))
const ForgotPassword   = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword    = lazy(() => import('./pages/ResetPassword'))
const PendingPage      = lazy(() => import('./pages/Pending'))



const AdminDashboard   = lazy(() => import('./pages/AdminDashboard'))



const AdminUsers       = lazy(() => import('./pages/AdminUsers'))
const AdminTests       = lazy(() => import('./pages/AdminTests'))
const AdminTestDetail  = lazy(() => import('./pages/AdminTestDetail'))



const TestsPage        = lazy(() => import('./pages/Tests'))
const TestEngine       = lazy(() => import('./pages/TestEngine'))
const Result           = lazy(() => import('./pages/Result'))
const MyResults        = lazy(() => import('./pages/MyResults'))
const Leaderboard      = lazy(() => import('./pages/Leaderboard'))
const Bookmarks        = lazy(() => import('./pages/Bookmarks'))

// Stop SWR refetching every key on each tab focus (students switch tabs during
// exams). Deliberately NOT raising dedupingInterval: AuthContext clears the SWR
// cache on logout/session expiry but not SWR's dedupe markers, so a long
// interval would leave a re-login within that window with no data fetched.
const SWR_DEFAULTS = { revalidateOnFocus: false } as const

export default function App() {
  return (
    <SWRConfig value={SWR_DEFAULTS}>
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={
          <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
            <div className="h-14 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }} />
            <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 3.5rem)' }}>
              <Spinner size={32} />
            </div>
          </div>
        }>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pending"  element={<ProtectedRoute><PendingPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin"                   element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users"             element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/tests"             element={<ProtectedRoute role="admin"><AdminTests /></ProtectedRoute>} />
            <Route path="/admin/tests/:testId"     element={<ProtectedRoute role="admin"><AdminTestDetail /></ProtectedRoute>} />

            {/* Aspirant */}
            <Route path="/dashboard"               element={<ProtectedRoute role="aspirant"><Dashboard /></ProtectedRoute>} />
            <Route path="/tests"                   element={<ProtectedRoute role="aspirant"><TestsPage /></ProtectedRoute>} />
            <Route path="/tests/:testId"           element={<ProtectedRoute role="aspirant"><TestEngine /></ProtectedRoute>} />
            <Route path="/tests/:testId/leaderboard" element={<ProtectedRoute role="aspirant"><Leaderboard /></ProtectedRoute>} />
            <Route path="/results"                 element={<ProtectedRoute role="aspirant"><MyResults /></ProtectedRoute>} />
            <Route path="/results/:attemptId"      element={<ProtectedRoute><Result /></ProtectedRoute>} />
            <Route path="/bookmarks"               element={<ProtectedRoute role="aspirant"><Bookmarks /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
    </SWRConfig>
  )
}
