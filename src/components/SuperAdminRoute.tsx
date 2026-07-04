import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-ink" />
  }

  if (role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
