import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from './Spinner'

type RouteRole = 'admin' | 'aspirant'

interface RouteProps {
  children: React.ReactNode
  role?: RouteRole
}

export function ProtectedRoute({ children, role }: RouteProps) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  if (role === 'aspirant' && !['admin', 'aspirant'].includes(user.role)) return <Navigate to="/pending" replace />
  return children
}

export function GuestRoute({ children }: Pick<RouteProps, 'children'>) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'aspirant') return <Navigate to="/dashboard" replace />
    return <Navigate to="/pending" replace />
  }
  return children
}
