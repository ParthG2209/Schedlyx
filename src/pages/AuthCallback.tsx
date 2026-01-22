// src/pages/AuthCallback.tsx
// FIXED: Removed direct DB queries, rely on Supabase auth state only

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

/**
 * SIMPLIFIED OAuth and Magic Link Callback Handler
 * 
 * FIXES:
 * - No direct profile table queries
 * - Relies on Supabase auth session only
 * - Profile creation handled by DB trigger
 * - Clear error states without DB coupling
 */
export function AuthCallback() {
  const navigate = useNavigate()
  const { user, loading } = useAuthStore()
  const [validationState, setValidationState] = useState<'checking' | 'valid' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    validateAuthCallback()
  }, [])

  async function validateAuthCallback() {
    try {
      setValidationState('checking')

      // Check for auth hash in URL (OAuth callback)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const error = hashParams.get('error')
      const errorDescription = hashParams.get('error_description')

      // Handle OAuth errors
      if (error) {
        setValidationState('error')
        setErrorMessage(errorDescription || 'Authentication failed')
        return
      }

      // If we have an access token in URL, Supabase will handle it
      // Wait for auth state to update
      if (accessToken) {
        // Give Supabase client time to process the token
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Check session state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        setValidationState('error')
        setErrorMessage('Failed to retrieve session')
        return
      }

      if (!session) {
        setValidationState('error')
        setErrorMessage('No active session found')
        return
      }

      // Session exists - auth successful
      // Profile creation handled by database trigger
      setValidationState('valid')
      
      // Small delay to ensure auth store updates
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Redirect to dashboard
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      console.error('[AuthCallback] Validation error:', error)
      setValidationState('error')
      setErrorMessage('An unexpected error occurred during sign in')
    }
  }

  // Error state
  if (validationState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-4">
            <svg 
              className="mx-auto h-12 w-12 text-red-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-6">
            {errorMessage || 'Something went wrong during sign in.'}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary w-full"
            >
              Go Home
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            If the problem persists, please contact support
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600">
          {validationState === 'checking' ? 'Completing sign in...' : 'Redirecting...'}
        </p>
        <p className="mt-2 text-gray-500 text-sm">
          Please wait while we set up your account
        </p>
      </div>
    </div>
  )
}