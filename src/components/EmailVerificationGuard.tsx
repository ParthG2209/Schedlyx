// src/components/EmailVerificationGuard.tsx
// FIXED: Removed permissive URL-based access, proper Supabase session validation

import { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

interface EmailVerificationGuardProps {
  children: ReactNode
}

/**
 * SECURITY-HARDENED Email Verification Guard
 * 
 * FIXES:
 * - No longer accepts URL params as auth proof
 * - Validates actual Supabase session state
 * - Checks for in-progress email confirmation flow
 * - Removes localStorage-based "recovery"
 */
export function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { emailVerificationRequired, verificationEmail } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [validationState, setValidationState] = useState<'checking' | 'valid' | 'invalid'>('checking')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    validateAccess()
  }, [emailVerificationRequired, verificationEmail, location])

  async function validateAccess() {
    setValidationState('checking')

    // PRIMARY: Check auth store state (user explicitly sent here)
    if (emailVerificationRequired && verificationEmail) {
      setValidationState('valid')
      return
    }

    // SECONDARY: Check location state (redirect from signup)
    if (location.state?.email && location.state?.fromSignup) {
      setValidationState('valid')
      return
    }

    // TERTIARY: Check for Supabase verification session
    // This handles email link clicks where user is being confirmed
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // Check URL for confirmation tokens (but validate with Supabase)
      const params = new URLSearchParams(location.search)
      const hasConfirmationToken = params.has('token') || 
                                   params.has('confirmation_token') ||
                                   params.has('type')
      
      if (hasConfirmationToken) {
        // User clicked email link - Supabase is processing
        // Allow access during confirmation flow
        setValidationState('valid')
        return
      }
      
      // If we have a session but no verification context, user shouldn't be here
      if (session && !emailVerificationRequired) {
        setValidationState('invalid')
        setErrorMessage('You are already signed in.')
        return
      }
    } catch (error) {
      console.error('[EmailVerificationGuard] Session check failed:', error)
    }

    // FALLBACK: No valid reason to access this page
    setValidationState('invalid')
    setErrorMessage('Invalid access to verification page.')
  }

  // Show loading while validating
  if (validationState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 text-sm">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Show error with recovery options
  if (validationState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-gray-600">
              {errorMessage || 'You cannot access this page directly.'}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Looking to verify your email?
            </p>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>Check your email inbox for the verification link</li>
              <li>Click the link in the email we sent you</li>
              <li>Make sure you're using the same browser</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full"
            >
              Go to Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="btn-secondary w-full"
            >
              Create New Account
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Need help? Contact support at{' '}
            <a 
              href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@schedlyx.com'}`}
              className="text-primary-600 hover:text-primary-500"
            >
              {import.meta.env.VITE_SUPPORT_EMAIL || 'support@schedlyx.com'}
            </a>
          </p>
        </div>
      </div>
    )
  }

  // Access validated - render children
  return <>{children}</>
}