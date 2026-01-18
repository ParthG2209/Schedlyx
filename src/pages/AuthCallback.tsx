// src/pages/AuthCallback.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

/**
 * OAuth callback handler
 * 
 * FIXED: Removed setTimeout - navigate immediately after auth state is confirmed
 * The auth state listener in authStore.ts handles session hydration
 */
export function AuthCallback() {
  const navigate = useNavigate()
  const { user, loading } = useAuthStore()

  useEffect(() => {
    // Wait for auth state to be determined (loading = false)
    if (!loading) {
      // If user exists, auth was successful - redirect to dashboard
      // If no user, something went wrong - redirect to login
      const destination = user ? '/dashboard' : '/login'
      navigate(destination, { replace: true })
    }
  }, [loading, user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
        <p className="mt-2 text-gray-500 text-sm">Please wait while we set up your account</p>
      </div>
    </div>
  )
}