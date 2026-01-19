// src/components/ProtectedRoute.tsx
// FIXED: Hard guards against partial auth state, prevents redirect loops

import { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Protected route with hard guards against partial auth state
 * 
 * Prevents:
 * - Redirect loops
 * - UI flicker on cold loads
 * - Rendering with partial auth state
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // HARD GUARD: Only mark ready when we have definitive auth state
    // Prevents partial state rendering
    if (!loading) {
      // Additional check: if we think we're authenticated but have no user
      // This is a partial state - wait a bit longer
      if (isAuthenticated && !user) {
        console.warn('[ProtectedRoute] Partial auth state detected, waiting...')
        const timer = setTimeout(() => {
          setIsReady(true)
        }, 500)
        return () => clearTimeout(timer)
      }
      
      setIsReady(true)
    }
  }, [loading, isAuthenticated, user])

  // Show loading while:
  // 1. Auth is initializing
  // 2. We're not ready (waiting for complete state)
  if (loading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // HARD GUARD: Explicit check for invalid state combinations
  // Prevents rendering with partial auth state
  if (!isAuthenticated || !user) {
    // Save the attempted location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Only render children when we have complete, valid auth state
  return <>{children}</>
}