import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute, GuestRoute } from './components/shared/ProtectedRoute'

import LoginPage        from './pages/Login'
import RegisterPage     from './pages/Register'
import PendingPage      from './pages/Pending'

import AdminDashboard   from './pages/AdminDashboard'
import AdminUsers       from './pages/AdminUsers'
import AdminTests       from './pages/AdminTests'
import AdminTestDetail  from './pages/AdminTestDetail'
import AdminChecklist   from './pages/AdminChecklist'

import Dashboard        from './pages/Dashboard'
import TestsPage        from './pages/Tests'
import TestEngine       from './pages/TestEngine'
import Result           from './pages/Result'
import MyResults        from './pages/MyResults'
import Leaderboard      from './pages/Leaderboard'
import Bookmarks        from './pages/Bookmarks'
import Checklist        from './pages/Checklist'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/pending"  element={<PendingPage />} />

          {/* Admin */}
          <Route path="/admin"                   element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users"             element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/tests"             element={<ProtectedRoute role="admin"><AdminTests /></ProtectedRoute>} />
          <Route path="/admin/tests/:testId"     element={<ProtectedRoute role="admin"><AdminTestDetail /></ProtectedRoute>} />
          <Route path="/admin/checklist"         element={<ProtectedRoute role="admin"><AdminChecklist /></ProtectedRoute>} />

          {/* Aspirant */}
          <Route path="/dashboard"               element={<ProtectedRoute role="aspirant"><Dashboard /></ProtectedRoute>} />
          <Route path="/tests"                   element={<ProtectedRoute role="aspirant"><TestsPage /></ProtectedRoute>} />
          <Route path="/tests/:testId"           element={<ProtectedRoute role="aspirant"><TestEngine /></ProtectedRoute>} />
          <Route path="/tests/:testId/leaderboard" element={<ProtectedRoute role="aspirant"><Leaderboard /></ProtectedRoute>} />
          <Route path="/results"                 element={<ProtectedRoute role="aspirant"><MyResults /></ProtectedRoute>} />
          <Route path="/results/:attemptId"      element={<ProtectedRoute><Result /></ProtectedRoute>} />
          <Route path="/bookmarks"               element={<ProtectedRoute role="aspirant"><Bookmarks /></ProtectedRoute>} />
          <Route path="/checklist"               element={<ProtectedRoute role="aspirant"><Checklist /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
