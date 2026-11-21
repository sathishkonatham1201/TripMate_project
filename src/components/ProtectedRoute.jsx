import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function LoadingPage() {
  return <main className="auth-page"><p className="auth-loading">Loading TripMate...</p></main>
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingPage />
  return user ? children : <Navigate to="/login" replace />
}

export function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingPage />
  return user ? <Navigate to="/" replace /> : children
}
