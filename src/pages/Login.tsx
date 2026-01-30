// src/pages/Login.tsx
// FIXED: UX explanations for session persistence, error classification

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore, AuthErrorType } from '../stores/authStore'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    signIn, 
    signInWithGoogle, 
    error, 
    loading, 
    clearError,
    emailVerificationRequired,
    verificationEmail
  } = useAuthStore()
  
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showSessionInfo, setShowSessionInfo] = useState(false)

  // Check if user was redirected from a protected route
  const from = (location.state as any)?.from?.pathname || '/dashboard'

  // Show session persistence info if browser might clear storage
  useEffect(() => {
    const isPrivateBrowsing = checkIfPrivateBrowsing()
    setShowSessionInfo(isPrivateBrowsing)
  }, [])

  // DEFENSIVE: Detect private browsing mode
  function checkIfPrivateBrowsing(): boolean {
    try {
      // Try to use sessionStorage
      sessionStorage.setItem('__test', 'test')
      sessionStorage.removeItem('__test')
      return false
    } catch (e) {
      return true
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    try {
      await signIn(formData.email, formData.password)
      
      // Redirect to intended destination or dashboard
      navigate(from, { replace: true })
    } catch (error: any) {
      // Error is handled by the store with classification
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleGoogleSignIn = async () => {
    clearError()
    try {
      await signInWithGoogle()
    } catch (error: any) {
      // Error is handled by the store
    }
  }

  const handleGoToVerification = () => {
    navigate('/verify-email', { 
      state: { email: verificationEmail || formData.email } 
    })
  }

  // Get user-friendly error message and retry guidance
  const getErrorUI = () => {
    if (!error) return null

    const isRetryable = error.retryable
    const errorType = error.type

    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4">
        <div className="flex flex-col">
          <div>
            <h3 className="text-sm font-medium text-red-800">
              {errorType === AuthErrorType.NETWORK_ERROR && 'Connection Error'}
              {errorType === AuthErrorType.INVALID_CREDENTIALS && 'Invalid Credentials'}
              {errorType === AuthErrorType.EMAIL_NOT_VERIFIED && 'Email Not Verified'}
              {errorType === AuthErrorType.SESSION_EXPIRED && 'Session Expired'}
              {errorType === AuthErrorType.UNKNOWN && 'Sign In Error'}
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error.userMessage}</p>
            </div>
          </div>
          
          {/* Error-specific actions */}
          {emailVerificationRequired && (
            <div className="mt-3">
              <button
                onClick={handleGoToVerification}
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Go to verification page →
              </button>
            </div>
          )}

          {errorType === AuthErrorType.NETWORK_ERROR && (
            <div className="mt-3 text-xs text-red-600">
              <p>Tip: Check your internet connection and try again.</p>
            </div>
          )}

          {errorType === AuthErrorType.INVALID_CREDENTIALS && (
            <div className="mt-3 text-xs text-red-600">
              <p>
                Forgot your password?{' '}
                <Link to="/forgot-password" className="underline">
                  Reset it here
                </Link>
              </p>
            </div>
          )}

          {isRetryable && errorType !== AuthErrorType.EMAIL_NOT_VERIFIED && (
            <div className="mt-3">
              <button
                onClick={() => clearError()}
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <img 
            src="/images/Schedlyx Logo Design.svg" 
            alt="Schedlyx Logo" 
            className="h-16 w-auto mb-4" 
          />
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </Link>
          </p>
        </div>

        {/* Session persistence notice */}
        {showSessionInfo && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  About Session Persistence
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    We automatically keep you signed in using secure browser storage.
                    In private/incognito mode, you'll need to sign in again when you close the browser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {getErrorUI()}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-field mt-1"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="btn-primary w-full text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="ml-2">Google</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}