// src/pages/EmailVerification.tsx
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/authStore'

/**
 * Get configurable support email
 * FIXED: Support email is now configurable via environment variable
 * Falls back to a generic placeholder for open-source deployments
 */
const getSupportEmail = (): string => {
  return import.meta.env.VITE_SUPPORT_EMAIL || 'support@example.com'
}

/**
 * Get app name from environment
 */
const getAppName = (): string => {
  return import.meta.env.VITE_APP_NAME || 'Schedlyx'
}

export function EmailVerification() {
  const location = useLocation()
  const email = location.state?.email || useAuthStore(state => state.verificationEmail)
  const { resendVerificationEmail, loading, error, clearError } = useAuthStore()
  const [resendSuccess, setResendSuccess] = useState(false)
  
  const supportEmail = getSupportEmail()
  const appName = getAppName()

  const handleResendEmail = async () => {
    if (!email) return
    
    clearError()
    setResendSuccess(false)
    
    try {
      await resendVerificationEmail(email)
      setResendSuccess(true)
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false)
      }, 5000)
    } catch (error) {
      console.error('Failed to resend email:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4">
            <EnvelopeIcon className="h-8 w-8 text-primary-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900">
            Check your email
          </h2>
          
          <p className="mt-4 text-base text-gray-600">
            We've sent a verification link to
          </p>
          
          {email && (
            <p className="mt-2 text-base font-semibold text-gray-900">
              {email}
            </p>
          )}
          
          <p className="mt-4 text-sm text-gray-600">
            Click the link in the email to verify your account and complete your registration.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                What's next?
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Check your inbox (and spam folder)</li>
                  <li>Click the verification link</li>
                  <li>You'll be redirected to sign in</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {resendSuccess && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Verification email sent! Check your inbox.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Didn't receive the email?
            </p>
            <button
              onClick={handleResendEmail}
              disabled={loading || !email}
              className="mt-2 text-primary-600 hover:text-primary-500 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <Link 
              to="/login" 
              className="text-sm text-gray-600 hover:text-primary-600"
            >
              Already verified? Sign in
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            If you continue to have issues, please contact{' '}
            <a 
              href={`mailto:${supportEmail}`} 
              className="text-primary-600 hover:text-primary-500"
            >
              {supportEmail}
            </a>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {appName} • Open Source Scheduling Platform
          </p>
        </div>
      </div>
    </div>
  )
}