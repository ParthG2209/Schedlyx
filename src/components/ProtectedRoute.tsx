// src/components/ProtectedRoute.tsx
// FIXED: Removed setTimeout hacks, deterministic auth state validation

import { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * DETERMINISTIC Protected Route Guard
 * 
 * FIXES:
 * - No setTimeout or timing-based auth checks
 * - Clear invalid state handling
 * - Deterministic behavior based on store state only
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user, initialized } = useAuth()
  const location = useLocation()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  useEffect(() => {
    // Mark as checked once auth is initialized
    if (initialized && !loading) {
      setHasCheckedAuth(true)
    }
  }, [initialized, loading])

  // INVARIANT: If auth says authenticated but no user, this is INVALID state
  // Do not try to "wait" for user - treat as unauthenticated
  const isValidAuthState = !isAuthenticated || (isAuthenticated && user)

  // Show loading only while auth is initializing
  if (!hasCheckedAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // HARD GUARD: Invalid state combination detected
  if (!isValidAuthState) {
    console.error('[ProtectedRoute] Invalid auth state: authenticated but no user')
    
    return <Navigate to="/login" state={{ from: location, error: 'invalid_session' }} replace />
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Valid authenticated state - render protected content
  return <>{children}</>
}

