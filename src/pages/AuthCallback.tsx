// src/pages/AuthCallback.tsx
// FIXED: Validates profile setup completion, handles race conditions

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

/**
 * OAuth and Magic Link callback handler with validation
 * 
 * FIXES:
 * - Validates profile setup completion
 * - Handles metadata propagation delays
 * - Provides clear error states
 */
export function AuthCallback() {
  const navigate = useNavigate()
  const { user, loading } = useAuthStore()
  const [validationState, setValidationState] = useState<'checking' | 'valid' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return

    // Wait for user to be set
    if (!user) {
      // No user after auth completed - something went wrong
      const timer = setTimeout(() => {
        setValidationState('error')
        setErrorMessage('Authentication failed. Please try again.')
      }, 3000)
      
      return () => clearTimeout(timer)
    }

    // User exists - validate profile setup
    validateProfileSetup()
  }, [loading, user, navigate])

  async function validateProfileSetup() {
    if (!user) return

    try {
      setValidationState('checking')

      // DEFENSIVE: Check if profile exists in database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('id', user.id)
        .single()

      if (error) {
        // Profile doesn't exist or query failed
        console.warn('[AuthCallback] Profile check failed:', error)
        
        // Wait a bit for profile creation trigger to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Try again
        const { data: retryProfile, error: retryError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (retryError) {
          setValidationState('error')
          setErrorMessage('Profile setup incomplete. Please contact support.')
          return
        }
      }

      // Profile exists - proceed
      setValidationState('valid')
      
      // Small delay to ensure all metadata is propagated
      await new Promise(resolve => setTimeout(resolve, 500))
      
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      console.error('[AuthCallback] Validation error:', error)
      setValidationState('error')
      setErrorMessage('An error occurred during sign in. Please try again.')
    }
  }

  // Show appropriate UI based on validation state
  if (validationState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sign In Error
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
        </div>
      </div>
    )
  }

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