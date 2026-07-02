import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-ink" />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
