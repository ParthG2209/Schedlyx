// src/components/EmailVerificationGuard.tsx
// FIXED: Prevents dead-ends, provides recovery path for lost state

import { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'

interface EmailVerificationGuardProps {
  children: ReactNode
}

/**
 * Guard for email verification page with recovery mechanisms
 * 
 * FIXES:
 * - Allows access from verification links even after state loss
 * - Provides recovery path for page refreshes
 * - Prevents dead-ends
 */
export function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { emailVerificationRequired, verificationEmail } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [allowAccess, setAllowAccess] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // RECOVERY MECHANISM: Check for verification-related URL parameters
    const params = new URLSearchParams(location.search)
    const hasVerificationToken = params.has('token') || params.has('confirmation_token')
    const hasEmailParam = params.has('email')
    
    // Allow access if:
    // 1. Email verification is required from auth flow
    const fromAuthFlow = emailVerificationRequired || !!verificationEmail
    
    // 2. Email is passed in location state (from signup redirect)
    const fromLocationState = !!location.state?.email
    
    // 3. URL has verification token (email link clicked)
    const fromVerificationLink = hasVerificationToken
    
    // 4. Email parameter in URL (fallback for email links)
    const hasEmailInUrl = hasEmailParam
    
    // 5. Check localStorage for recent signup (fallback for page refresh)
    const recentSignup = checkRecentSignup()
    
    const canAccess = fromAuthFlow || 
                     fromLocationState || 
                     fromVerificationLink || 
                     hasEmailInUrl ||
                     recentSignup
    
    setAllowAccess(canAccess)
    setIsChecking(false)
    
    // If no valid access reason but user came from verification link,
    // extract email from URL and allow access
    if (!canAccess && hasVerificationToken && hasEmailParam) {
      setAllowAccess(true)
    }
  }, [emailVerificationRequired, verificationEmail, location])

  // RECOVERY: Check if user signed up recently (within 10 minutes)
  function checkRecentSignup(): boolean {
    try {
      const signupTimestamp = localStorage.getItem('schedlyx_signup_timestamp')
      if (!signupTimestamp) return false
      
      const timestamp = parseInt(signupTimestamp, 10)
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000)
      
      return timestamp > tenMinutesAgo
    } catch (error) {
      return false
    }
  }

  // Show loading while checking access
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 text-sm">Verifying access...</p>
        </div>
      </div>
    )
  }

  // If no valid reason to access this page, show recovery UI instead of redirect
  if (!allowAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Email Verification
            </h2>
            <p className="mt-2 text-gray-600">
              Unable to verify your email at this time.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <p className="text-sm text-yellow-800">
              If you clicked a verification link in your email, please try:
            </p>
            <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Opening the link in the same browser where you signed up</li>
              <li>Checking if the link has expired (valid for 24 hours)</li>
              <li>Requesting a new verification email</li>
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
        </div>
      </div>
    )
  }

  return <>{children}</>
}